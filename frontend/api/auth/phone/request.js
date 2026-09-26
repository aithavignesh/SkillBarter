import {
  checkRateLimit,
  createOtpChallenge,
  normalizePhone,
  parseRequestBody,
  sendJson,
} from './_utils.js';
import { getSmsProviderConfig, sendSmsOtpViaProvider } from './smsProvider.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, { ok: true }, 200);
  if (req.method !== 'POST') return sendJson(res, { error: 'Method Not Allowed. Use POST.' }, 405);

  try {
    const body = await parseRequestBody(req);
    const rawPhone = body?.phone;
    if (!rawPhone) return sendJson(res, { error: 'Mobile phone number is required.' }, 400);

    const phone = normalizePhone(rawPhone);
    const rateLimit = checkRateLimit(phone);
    if (!rateLimit.allowed) {
      return sendJson(res, { error: rateLimit.error, waitSeconds: rateLimit.waitSeconds, code: 'RATE_LIMITED' }, 429);
    }

    const provider = getSmsProviderConfig();
    if (provider.provider === '2factor' || provider.provider === '2factor.in') {
      if (!provider.twoFactorApiKey) {
        return sendJson(res, {
          error: 'SMS service is not configured in the Vercel serverless runtime.',
          code: 'TWOFACTOR_NOT_CONFIGURED',
          runtime: 'otp-handler-v2',
          provider: provider.provider,
          configured: false,
          templateConfigured: Boolean(provider.twoFactorTemplate),
        }, 500);
      }
    }

    const challenge = createOtpChallenge(phone);
    await sendSmsOtpViaProvider(phone, challenge.otp);

    return sendJson(res, {
      success: true,
      phone,
      challenge: challenge.token,
      delivery: 'sms',
      provider: provider.provider,
    }, 200);
  } catch (err) {
    console.error('[Phone OTP Request Failed]', err.message);
    const statusCode = err.statusCode || (err.code === 'SMS_GATEWAY_TIMEOUT' ? 504 : 400);
    return sendJson(res, {
      error: err.message || 'Unable to send OTP via SMS. Please try again.',
      code: err.code || 'REQUEST_FAILED',
      runtime: 'otp-handler-v2',
    }, statusCode);
  }
}
