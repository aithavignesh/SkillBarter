import {
  createOrSignInPhoneUser,
  normalizePhone,
  response,
  verifyOtpChallenge,
} from './_utils.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return response({ ok: true });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  try {
    const phone = normalizePhone(req.body?.phone);
    const otp = String(req.body?.otp ?? '').trim();
    const challenge = String(req.body?.challenge ?? '');
    if (!/^\d{6}$/.test(otp)) return response({ error: 'Enter the 6-digit OTP' }, 400);
    if (!verifyOtpChallenge(phone, otp, challenge)) return response({ error: 'Invalid or expired OTP' }, 401);

    const session = await createOrSignInPhoneUser(phone);
    return response({ accessToken: session.accessToken, user: session.user });
  } catch (error) {
    console.error('Phone OTP verification failed:', error);
    return response({ error: error?.message || 'Invalid or expired OTP' }, 400);
  }
}
