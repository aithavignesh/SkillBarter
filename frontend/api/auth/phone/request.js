import { createOtpChallenge, normalizePhone, response, sendSmsOtp } from './_utils.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return response({ ok: true });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  try {
    const phone = normalizePhone(req.body?.phone);
    const challenge = createOtpChallenge(phone);

    // The OTP is generated server-side and is sent only through Twilio SMS.
    // The signed challenge contains the OTP hash and never exposes the code.
    await sendSmsOtp(phone, challenge.otp);

    return response({
      success: true,
      phone,
      challenge: challenge.token,
      delivery: 'sms',
    });
  } catch (error) {
    console.error('Phone OTP request failed:', error);
    return response({ error: error?.message || 'Unable to send OTP by SMS' }, 400);
  }
}
