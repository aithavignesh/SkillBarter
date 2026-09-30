import { createClient } from '@insforge/sdk';
import {
  checkVerifyRateLimit,
  clearVerifyRateLimit,
  dbServiceRequest,
  getEnvConfig,
  normalizePhone,
  parseRequestBody,
  sendJson,
  verifyOtpChallenge,
} from './phone/_utils.js';

function getBearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization || '';
  if (typeof header !== 'string' || !/^Bearer\s+/i.test(header)) return '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, { ok: true }, 200);
  if (req.method !== 'POST') return sendJson(res, { error: 'Method Not Allowed. Use POST.' }, 405);

  try {
    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return sendJson(res, { error: 'You must be logged in to link a mobile number.', code: 'AUTH_REQUIRED' }, 401);
    }

    const body = await parseRequestBody(req);
    const phone = normalizePhone(String(body?.phone || ''));
    const otp = String(body?.otp || '').trim();
    const challenge = String(body?.challenge || '');

    if (!/^\d{6}$/.test(otp) || !challenge) {
      return sendJson(res, { error: 'Mobile number, OTP and verification challenge are required.', code: 'MISSING_FIELDS' }, 400);
    }

    const { insforgeUrl, insforgeAnonKey, insforgeServiceKey } = getEnvConfig();
    if (!insforgeUrl || !insforgeAnonKey) {
      return sendJson(res, { error: 'Authentication service is not configured.', code: 'AUTH_CONFIG_MISSING' }, 500);
    }

    // Let InsForge validate the existing login token. We never trust an email
    // or user id supplied by the browser.
    const client = createClient({
      baseUrl: insforgeUrl,
      anonKey: insforgeAnonKey,
      accessToken,
    });
    const { data: authData, error: authError } = await client.auth.getCurrentUser();
    const authUser = authData?.user;
    if (authError || !authUser?.id || !authUser?.email) {
      return sendJson(res, { error: 'Your login session is invalid or expired. Please log in again.', code: 'AUTH_INVALID' }, 401);
    }

    const verifyLimit = checkVerifyRateLimit(phone, challenge);
    if (!verifyLimit.allowed) {
      return sendJson(res, {
        error: 'Too many incorrect OTP attempts. Please request a new OTP and try again later.',
        code: 'OTP_VERIFY_RATE_LIMITED',
        waitSeconds: verifyLimit.waitSeconds,
      }, 429);
    }

    if (!verifyOtpChallenge(phone, otp, challenge)) {
      return sendJson(res, { error: 'Invalid or expired OTP. Please request a new OTP and try again.', code: 'OTP_INVALID_OR_EXPIRED' }, 401);
    }
    clearVerifyRateLimit(phone, challenge);

    if (!insforgeServiceKey) {
      return sendJson(res, { error: 'InsForge server API key is not configured for mobile linking.', code: 'INSFORGE_SERVICE_KEY_MISSING' }, 500);
    }

    const existingByPhone = await dbServiceRequest(
      insforgeUrl,
      insforgeServiceKey,
      'phone_identities',
      'GET',
      '?phone=eq.' + encodeURIComponent(phone) + '&limit=1',
    );
    const phoneIdentity = Array.isArray(existingByPhone) ? existingByPhone[0] || null : existingByPhone || null;

    if (phoneIdentity && String(phoneIdentity.auth_user_id) !== String(authUser.id)) {
      return sendJson(res, {
        error: 'This mobile number is already linked to another SkillBarter account.',
        code: 'PHONE_ALREADY_LINKED',
      }, 409);
    }

    const existingByEmail = await dbServiceRequest(
      insforgeUrl,
      insforgeServiceKey,
      'phone_identities',
      'GET',
      '?email=eq.' + encodeURIComponent(String(authUser.email).trim().toLowerCase()) + '&limit=1',
    );
    const emailIdentity = Array.isArray(existingByEmail) ? existingByEmail[0] || null : existingByEmail || null;

    if (emailIdentity && String(emailIdentity.phone) !== phone) {
      return sendJson(res, {
        error: 'This account already has a different mobile number linked.',
        code: 'ACCOUNT_PHONE_ALREADY_LINKED',
      }, 409);
    }

    if (phoneIdentity) {
      return sendJson(res, {
        success: true,
        linked: true,
        phone,
        email: String(authUser.email).trim().toLowerCase(),
        message: 'Mobile number is already linked to your account.',
      }, 200);
    }

    await dbServiceRequest(
      insforgeUrl,
      insforgeServiceKey,
      'phone_identities',
      'POST',
      '',
      [{
        phone,
        email: String(authUser.email).trim().toLowerCase(),
        auth_user_id: String(authUser.id),
      }],
    );

    return sendJson(res, {
      success: true,
      linked: true,
      phone,
      email: String(authUser.email).trim().toLowerCase(),
      message: 'Mobile number linked successfully. You can now log in with Mobile OTP.',
    }, 200);
  } catch (err) {
    console.error('[Phone Link Failed]', err.message);
    return sendJson(res, {
      error: err.message || 'Unable to link mobile number.',
      code: err.code || 'PHONE_LINK_FAILED',
    }, err.statusCode || 400);
  }
}
