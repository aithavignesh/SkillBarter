import crypto from 'node:crypto';
import https from 'node:https';

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

async function twilioRequest(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'POST',
        headers: {
          Authorization: `Basic ${twilioCredentials()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body.toString()),
          Accept: 'application/json',
          Connection: 'close',
        },
        timeout: 2500,
      },
      (result) => {
        let raw = '';
        result.setEncoding('utf8');
        result.on('data', (chunk) => { raw += chunk; });
        result.on('end', () => {
          let data = {};
          try { data = raw ? JSON.parse(raw) : {}; } catch {}
          if (result.statusCode && result.statusCode >= 200 && result.statusCode < 300) {
            resolve(data);
            return;
          }
          const code = data?.code ? ` (${data.code})` : '';
          reject(new Error(`${data?.message || data?.error_message || 'Twilio request failed'}${code}`));
        });
      },
    );
    request.on('timeout', () => request.destroy(new Error('Twilio SMS timed out')));
    request.on('error', reject);
    request.write(body.toString());
    request.end();
  });
}

function otpHash(phone, otp, expiresAt) {
  return crypto
    .createHmac('sha256', requireEnv('PHONE_AUTH_SECRET'))
    .update(`otp:${phone}|${otp}|${expiresAt}`)
    .digest('base64url');
}

export function createOtpChallenge(phone) {
  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const signature = otpHash(phone, otp, expiresAt);
  return { otp, token: `${expiresAt}.${signature}` };
}

export function verifyOtpChallenge(phone, otp, token) {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 2) return false;
  const expiresAt = Number(parts[0]);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expected = otpHash(phone, otp, expiresAt);
  const a = Buffer.from(expected);
  const b = Buffer.from(parts[1]);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function sendSmsOtp(phone, otp) {
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const fromNumber = requireEnv('TWILIO_FROM_NUMBER');
  const body = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Body: `Your SkillBarter OTP is ${otp}. It expires in 10 minutes. Do not share this code.`,
  });
  return twilioRequest(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    body,
  );
}

export function phoneIdentity(phone) {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@phone.skillbarter.local`;
}

export function phonePassword(phone) {
  return crypto.createHmac('sha256', requireEnv('PHONE_AUTH_SECRET')).update(`skillbarter:${phone}`).digest('hex');
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
