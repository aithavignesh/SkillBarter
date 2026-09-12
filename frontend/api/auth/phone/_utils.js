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

export async function twilioVerifyRequest(phone) {
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const authToken = requireEnv('TWILIO_AUTH_TOKEN');
  const serviceSid = requireEnv('TWILIO_VERIFY_SERVICE_SID');
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const body = new URLSearchParams({ To: phone, Channel: 'sms' });
  const result = await fetch(
    `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/Verifications`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );

  const data = await result.json().catch(() => ({}));
  if (!result.ok) {
    throw new Error(data?.message || data?.error_message || 'Unable to send OTP');
  }
  return data;
}

export async function twilioVerifyCheck(phone, code) {
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const authToken = requireEnv('TWILIO_AUTH_TOKEN');
  const serviceSid = requireEnv('TWILIO_VERIFY_SERVICE_SID');
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const body = new URLSearchParams({ To: phone, Code: code });
  const result = await fetch(
    `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/VerificationCheck`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );

  const data = await result.json().catch(() => ({}));
  if (!result.ok) {
    throw new Error(data?.message || data?.error_message || 'Unable to verify OTP');
  }
  return data;
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
    headers: {
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await result.json().catch(() => ({}));
  return { ok: result.ok, data };
}

export async function createOrSignInPhoneUser(phone) {
  const email = phoneIdentity(phone);
  const password = phonePassword(phone);

  // Existing phone users sign in directly.
  const signedIn = await insforgeAuth('/api/auth/sessions', { email, password });
  if (signedIn.ok && signedIn.data?.accessToken && signedIn.data?.user) {
    return signedIn.data;
  }

  // First-time phone users are created only after Twilio has verified the number.
  const created = await insforgeAuth('/api/auth/users', {
    email,
    password,
    name: 'SkillBarter Member',
  });

  if (created.ok && created.data?.accessToken && created.data?.user) {
    return created.data;
  }

  // Handle a race where another request created the account between the two calls.
  const retry = await insforgeAuth('/api/auth/sessions', { email, password });
  if (retry.ok && retry.data?.accessToken && retry.data?.user) {
    return retry.data;
  }

  const message =
    created.data?.message ||
    created.data?.error ||
    retry.data?.message ||
    'Unable to create the SkillBarter phone account';
  throw new Error(typeof message === 'string' ? message : 'Unable to create the SkillBarter phone account');
}
