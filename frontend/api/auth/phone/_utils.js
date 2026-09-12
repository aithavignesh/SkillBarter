import crypto from 'node:crypto';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const response = json;

export function normalizePhone(phone) {
  const normalized = String(phone ?? '').trim().replace(/[\s()-]/g, '');
  if (!/^\+?[1-9]\d{9,14}$/.test(normalized)) {
    throw new Error('Enter a valid mobile number with country code, e.g. +917050062084');
  }
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing Vercel environment variable: ${name}`);
  return value;
}

function twilioCredentials() {
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const authToken = requireEnv('TWILIO_AUTH_TOKEN');
  return Buffer.from(`${accountSid}:${authToken}`).toString('base64');
}

async function twilioRequest(url, method = 'POST', body = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const result = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${twilioCredentials()}`,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        Accept: 'application/json',
      },
      ...(body ? { body } : {}),
      signal: controller.signal,
    });
    const data = await result.json().catch(() => ({}));
    if (!result.ok) {
      const code = data?.code ? ` (${data.code})` : '';
      throw new Error(`${data?.message || data?.error_message || 'Twilio request failed'}${code}`);
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Twilio verification service timed out. Check the Twilio account and verified recipient.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

let cachedVerifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || '';

async function getVerifyServiceSid() {
  if (cachedVerifyServiceSid) return cachedVerifyServiceSid;

  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const listUrl = `https://verify.twilio.com/v2/Services?PageSize=50`;
  const listed = await twilioRequest(listUrl, 'GET');
  const existing = Array.isArray(listed?.services)
    ? listed.services.find((service) => service?.friendly_name === 'SkillBarter OTP')
    : null;

  if (existing?.sid) {
    cachedVerifyServiceSid = existing.sid;
    return cachedVerifyServiceSid;
  }

  const body = new URLSearchParams({ FriendlyName: 'SkillBarter OTP', CodeLength: '6' });
  const created = await twilioRequest('https://verify.twilio.com/v2/Services', 'POST', body);
  if (!created?.sid) throw new Error('Twilio Verify service could not be created');
  cachedVerifyServiceSid = created.sid;
  return cachedVerifyServiceSid;
}

function challengeSecret() {
  return requireEnv('PHONE_AUTH_SECRET');
}

export function createOtpChallenge(phone) {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const payload = `${phone}|${expiresAt}`;
  const signature = crypto.createHmac('sha256', challengeSecret()).update(payload).digest('base64url');
  return { token: `${expiresAt}.${signature}` };
}

export function verifyOtpChallenge(phone, token) {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 2) return false;
  const expiresAt = Number(parts[0]);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const payload = `${phone}|${expiresAt}`;
  const expected = crypto.createHmac('sha256', challengeSecret()).update(payload).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts[1]);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function sendSmsOtp(phone) {
  const serviceSid = await getVerifyServiceSid();
  const body = new URLSearchParams({ To: phone, Channel: 'sms' });
  return twilioRequest(
    `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/Verifications`,
    'POST',
    body,
  );
}

export async function checkSmsOtp(phone, code) {
  const serviceSid = await getVerifyServiceSid();
  const body = new URLSearchParams({ To: phone, Code: code });
  return twilioRequest(
    `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/VerificationCheck`,
    'POST',
    body,
  );
}

export function phoneIdentity(phone) {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@phone.skillbarter.local`;
}

export function phonePassword(phone) {
  return crypto.createHmac('sha256', challengeSecret()).update(`skillbarter:${phone}`).digest('hex');
}

function insforgeConfig() {
  const baseUrl = String(process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL || '').replace(/\/+$/, '');
  const anonKey = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) throw new Error('Missing InsForge server environment configuration');
  return { baseUrl, anonKey };
}

async function insforgeAuth(path, payload) {
  const { baseUrl, anonKey } = insforgeConfig();
  const result = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await result.json().catch(() => ({}));
  return { ok: result.ok, data };
}

export async function createOrSignInPhoneUser(phone) {
  const email = phoneIdentity(phone);
  const password = phonePassword(phone);
  const signedIn = await insforgeAuth('/api/auth/sessions', { email, password });
  if (signedIn.ok && signedIn.data?.accessToken && signedIn.data?.user) return signedIn.data;

  const created = await insforgeAuth('/api/auth/users', { email, password, name: 'SkillBarter Member' });
  if (created.ok && created.data?.accessToken && created.data?.user) return created.data;

  const retry = await insforgeAuth('/api/auth/sessions', { email, password });
  if (retry.ok && retry.data?.accessToken && retry.data?.user) return retry.data;

  const message = created.data?.message || created.data?.error || retry.data?.message || 'Unable to create the SkillBarter phone account';
  throw new Error(typeof message === 'string' ? message : 'Unable to create the SkillBarter phone account');
}
