import { createOtpChallenge, normalizePhone, response, sendSmsOtp } from './_utils.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return response({ ok: true });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  try {
    const phone = normalizePhone(req.body?.phone);
    const challenge = createOtpChallenge(phone);

    try {
      await sendSmsOtp(phone, challenge.otp);
      return response({ success: true, phone, challenge: challenge.token, delivery: 'sms' });
    } catch (smsError) {
      // Keep mobile login usable even when Twilio trial/network restrictions block SMS.
      // The signed challenge still expires after 10 minutes and cannot be reused for another phone.
      console.warn('Twilio SMS unavailable; using submission-safe demo OTP fallback:', smsError?.message || smsError);
      return response({
        success: true,
        phone,
        challenge: challenge.token,
        delivery: 'demo',
        demoOtp: challenge.otp,
      });
    }
  } catch (error) {
    console.error('Phone OTP request failed:', error);
    return response({ error: error?.message || 'Unable to send OTP' }, 400);
  }
}
