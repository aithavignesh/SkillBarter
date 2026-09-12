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

async function twilioRequest(url, body) {
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const authToken = requireEnv('TWILIO_AUTH_TOKEN');
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const result = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: controller.signal,
    });
    const data = await result.json().catch(() => ({}));
    if (!result.ok) {
      const code = data?.code ? ` (${data.code})` : '';
      throw new Error(`${data?.message || data?.error_message || 'Twilio request failed'}${code}`);
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Twilio did not respond within 12 seconds. Check your Twilio sender and trial recipient.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function createOtpChallenge(phone) {
  const secret = requireEnv('PHONE_AUTH_SECRET');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const payload = `${phone}|${code}|${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return { code, token: `${expiresAt}.${signature}` };
}

export function verifyOtpChallenge(phone, code, token) {
  const secret = requireEnv('PHONE_AUTH_SECRET');
  const parts = String(token ?? '').split('.');
  if (parts.length !== 2) return false;
  const expiresAt = Number(parts[0]);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const payload = `${phone}|${code}|${expiresAt}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts[1]);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function sendSmsOtp(phone, challenge) {
  const from = requireEnv('TWILIO_FROM_NUMBER');
  const body = new URLSearchParams({
    To: phone,
    From: from,
    Body: `SkillBarter login OTP: ${challenge.code}. It expires in 5 minutes. Do not share this code.`,
  });
  return twilioRequest(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(requireEnv('TWILIO_ACCOUNT_SID'))}/Messages.json`,
    body,
  );
}

export function phoneIdentity(phone) {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@phone.skillbarter.local`;
}

export function phonePassword(phone) {
  const secret = requireEnv('PHONE_AUTH_SECRET');
  return crypto.createHmac('sha256', secret).update(`skillbarter:${phone}`).digest('hex');
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
