import {
  checkRateLimit,
  createOtpChallenge,
  getEnvConfig,
  normalizePhone,
  parseRequestBody,
  sendJson,
  sendSmsOtp,
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

    if (!rawPhone) {
      return sendJson(res, { error: 'Mobile phone number is required.' }, 400);
    }

    const phone = normalizePhone(rawPhone);

    // Rate limiting check
    const rateLimit = checkRateLimit(phone);
    if (!rateLimit.allowed) {
      return sendJson(
        res,
        {
          error: rateLimit.error,
          waitSeconds: rateLimit.waitSeconds,
          code: 'RATE_LIMITED',
        },
        429
      );
    }

    // Check Twilio environment configuration
    const config = getEnvConfig();
    if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromNumber) {
      console.error('[Configuration Error] Missing Twilio environment variables.');
      return sendJson(
        res,
        {
          error: 'SMS service configuration error. Required server variables are missing.',
          code: 'TWILIO_NOT_CONFIGURED',
        },
        500
      );
    }

    // Generate secure OTP & cryptographic challenge token
    const challenge = createOtpChallenge(phone);

    // Send real Twilio SMS (strictly awaited)
    await sendSmsOtp(phone, challenge.otp);

    // Return success with challenge token (NEVER returns plaintext OTP)
    return sendJson(
      res,
      {
        success: true,
        phone,
        challenge: challenge.token,
        delivery: 'sms',
      },
      200
    );
  } catch (err) {
    console.error('[Phone OTP Request Failed]', err.message);
    const statusCode = err.statusCode || (err.code === 'SMS_GATEWAY_TIMEOUT' ? 504 : 400);
    return sendJson(
      res,
      {
        error: err.message || 'Unable to send OTP via SMS. Please try again.',
        code: err.code || 'REQUEST_FAILED',
      },
      statusCode
    );
  }
}
