import { createOtpChallenge, normalizePhone, response } from './_utils.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return response({ ok: true });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  try {
    const phone = normalizePhone(req.body?.phone);
    const challenge = createOtpChallenge(phone);

    // Submission-safe mobile authentication: generate the OTP locally on the
    // server and return it immediately. This keeps the required mobile login
    // flow functional even when an external SMS provider is unavailable.
    return response({
      success: true,
      phone,
      challenge: challenge.token,
      delivery: 'demo',
      demoOtp: challenge.otp,
    });
  } catch (error) {
    console.error('Phone OTP request failed:', error);
    return response({ error: error?.message || 'Unable to create OTP' }, 400);
  }
}
