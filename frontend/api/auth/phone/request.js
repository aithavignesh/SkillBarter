import { createOtpChallenge, normalizePhone, response, sendSmsOtp } from './_utils.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return response({ ok: true });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  try {
    const phone = normalizePhone(req.body?.phone);
    const challenge = createOtpChallenge(phone);
    await sendSmsOtp(phone, challenge);
    return response({ success: true, phone, challenge: challenge.token });
  } catch (error) {
    console.error('Phone OTP request failed:', error);
    return response({ error: error?.message || 'Unable to send OTP' }, 400);
  }
}
