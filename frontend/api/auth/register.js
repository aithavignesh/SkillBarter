import { createClient } from '@insforge/sdk';
import { normalizePhone, parseRequestBody, sendJson, verifyPhoneVerificationToken } from './phone/_utils.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, { ok: true }, 200);
  if (req.method !== 'POST') return sendJson(res, { error: 'Method Not Allowed. Use POST.' }, 405);

  try {
    const body = await parseRequestBody(req);
    const fullName = String(body?.full_name || '').trim();
    const username = String(body?.username || '').trim().toLowerCase();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const phone = normalizePhone(String(body?.phone || ''));
    const verificationToken = String(body?.phone_verification_token || '');

    if (!fullName || !username || !email || !password) {
      return sendJson(res, { error: 'Full name, username, email and password are required.', code: 'MISSING_FIELDS' }, 400);
    }
    if (!verifyPhoneVerificationToken(phone, verificationToken)) {
      return sendJson(res, { error: 'Mobile OTP verification is required before account creation.', code: 'PHONE_NOT_VERIFIED' }, 403);
    }

    const insforgeUrl = String(process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL || '').trim();
    const anonKey = String(process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY || '').trim();
    if (!insforgeUrl || !anonKey) {
      return sendJson(res, { error: 'Authentication service is not configured.', code: 'AUTH_CONFIG_MISSING' }, 500);
    }

    const client = createClient({ baseUrl: insforgeUrl, anonKey });
    const { data, error } = await client.auth.signUp({ email, password, name: fullName });
    if (error) {
      const message = String(error.message || 'Registration failed');
      if (/already|exist|registered/i.test(message)) {
        return sendJson(res, { error: 'An account with this email already exists. Please log in instead.', code: 'EMAIL_EXISTS' }, 409);
      }
      return sendJson(res, { error: message, code: 'REGISTRATION_FAILED' }, 400);
    }

    return sendJson(res, {
      success: true,
      user: data?.user || null,
      accessToken: data?.accessToken || null,
      phone,
      username,
      full_name: fullName,
    }, 200);
  } catch (err) {
    console.error('[Signup Auth Failed]', err.message);
    return sendJson(res, { error: err.message || 'Registration failed.', code: err.code || 'REGISTRATION_FAILED' }, err.statusCode || 400);
  }
}
