import {
  createOrSignInPhoneUser,
  createPhoneVerificationToken,
  normalizePhone,
  parseRequestBody,
  sendJson,
  verifyOtpChallenge,
  checkVerifyRateLimit,
  clearVerifyRateLimit,
  validatePhoneAuthSession,
  getPhoneIdentity,
  createInsforgeSessionToken,
} from './_utils.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, { ok: true }, 200);
  if (req.method !== 'POST') return sendJson(res, { error: 'Method Not Allowed. Use POST.' }, 405);

  try {
    const body = await parseRequestBody(req);
    const rawPhone = body?.phone;
    const rawOtp = body?.otp;
    const challenge = body?.challenge;
    const purpose = body?.purpose === 'register' || body?.purpose === 'verify_only' ? body.purpose : 'login';

    if (!rawPhone || !rawOtp || !challenge) {
      return sendJson(res, { error: 'Phone number, OTP code, and verification challenge are required.', code: 'MISSING_FIELDS' }, 400);
    }

    const phone = normalizePhone(rawPhone);
    const otp = String(rawOtp).trim();

    const verifyLimit = checkVerifyRateLimit(phone, challenge);
    if (!verifyLimit.allowed) {
      return sendJson(res, {
        error: 'Too many incorrect OTP attempts. Please request a new OTP and try again later.',
        code: 'OTP_VERIFY_RATE_LIMITED',
        waitSeconds: verifyLimit.waitSeconds,
      }, 429);
    }

    if (!/^\d{6}$/.test(otp)) {
      return sendJson(res, { error: 'Invalid OTP format. OTP must be a 6-digit numeric code.', code: 'INVALID_FORMAT' }, 400);
    }

    const isValid = verifyOtpChallenge(phone, otp, challenge);
    if (!isValid) {
      return sendJson(res, { error: 'Invalid or expired OTP. Please request a new OTP and try again.', code: 'OTP_INVALID_OR_EXPIRED' }, 401);
    }

    clearVerifyRateLimit(phone, challenge);

    // Registration verification proves ownership of the mobile number without
    // creating a passwordless phone-only account. The actual SkillBarter account
    // is created only after the user submits name, email, username and password.
    if (purpose === 'register' || purpose === 'verify_only') {
      return sendJson(res, {
        success: true,
        verified: true,
        phone,
        verificationToken: createPhoneVerificationToken(phone),
        message: 'Mobile number verified. Continue registration.',
      }, 200);
    }

    const identity = await getPhoneIdentity(phone);
    if (!identity?.auth_user_id || !identity?.email) {
      return sendJson(res, {
        error: 'This mobile number is not linked to a SkillBarter account. Please sign up first or use email login.',
        code: 'PHONE_NOT_REGISTERED',
      }, 404);
    }

    const accessToken = await createInsforgeSessionToken(identity.auth_user_id, identity.email);
    return sendJson(res, {
      success: true,
      accessToken,
      token: accessToken,
      user: {
        id: identity.auth_user_id,
        email: identity.email,
      },
      message: 'Mobile OTP verified. Login successful.',
    }, 200);
  } catch (err) {
    console.error('[Phone OTP Verification Failed]', err.message);
    return sendJson(res, {
      error: err.message || 'OTP verification failed. Please try again.',
      code: err.code || 'VERIFY_FAILED',
    }, err.statusCode || 400);
  }
}
