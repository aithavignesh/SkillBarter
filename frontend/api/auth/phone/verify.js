import {
  createOrSignInPhoneUser,
  normalizePhone,
  parseRequestBody,
  sendJson,
  verifyOtpChallenge,
  checkVerifyRateLimit,
  clearVerifyRateLimit,
  validatePhoneAuthSession,
} from './_utils.js';

export default async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return sendJson(res, { ok: true }, 200);
  }

  if (req.method !== 'POST') {
    return sendJson(res, { error: 'Method Not Allowed. Use POST.' }, 405);
  }

  try {
    const body = await parseRequestBody(req);
    const rawPhone = body?.phone;
    const rawOtp = body?.otp;
    const challenge = body?.challenge;

    if (!rawPhone || !rawOtp || !challenge) {
      return sendJson(
        res,
        { error: 'Phone number, OTP code, and verification challenge are required.', code: 'MISSING_FIELDS' },
        400
      );
    }

    const phone = normalizePhone(rawPhone);
    const otp = String(rawOtp).trim();

    const verifyLimit = checkVerifyRateLimit(phone, challenge);
    if (!verifyLimit.allowed) {
      return sendJson(
        res,
        {
          error: 'Too many incorrect OTP attempts. Please request a new OTP and try again later.',
          code: 'OTP_VERIFY_RATE_LIMITED',
          waitSeconds: verifyLimit.waitSeconds,
        },
        429
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return sendJson(res, { error: 'Invalid OTP format. OTP must be a 6-digit numeric code.', code: 'INVALID_FORMAT' }, 400);
    }

    const isValid = verifyOtpChallenge(phone, otp, challenge);
    if (!isValid) {
      return sendJson(
        res,
        { error: 'Invalid or expired OTP. Please request a new OTP and try again.', code: 'OTP_INVALID_OR_EXPIRED' },
        401
      );
    }

    const session = await createOrSignInPhoneUser(phone);
    const sessionValidation = validatePhoneAuthSession(session);
    if (!sessionValidation.valid) {
      throw Object.assign(
        new Error('Phone authentication completed, but no valid login session was returned. Please try again.'),
        { code: 'SESSION_CREATION_FAILED', statusCode: 502 }
      );
    }

    clearVerifyRateLimit(phone, challenge);

    return sendJson(
      res,
      {
        success: true,
        accessToken: session.accessToken,
        token: session.accessToken,
        user: session.user,
        message: 'Phone authenticated successfully.',
      },
      200
    );
  } catch (err) {
    console.error('[Phone OTP Verification Failed]', err.message);
    return sendJson(
      res,
      {
        error: err.message || 'OTP verification failed. Please try again.',
        code: err.code || 'VERIFY_FAILED',
      },
      err.statusCode || 400
    );
  }
}
