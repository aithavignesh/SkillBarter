import {
  normalizePhone,
  parseRequestBody,
  sendJson,
  verifyPhoneVerificationToken,
  getPhoneIdentity,
} from './_utils.js';
import {
  findSkillBarterProfile,
  normalizeEmail,
  insforgeRequest,
} from '../email/_utils.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return sendJson(res, { success: false, error: 'Method not allowed.' }, 405);
  }

  try {
    const body = await parseRequestBody(req);
    const phone = normalizePhone(body?.phone);
    const verificationToken = String(body?.verificationToken || '');

    if (!phone || !verificationToken) {
      return sendJson(res, { success: false, error: 'Phone and SMS verification token are required.' }, 400);
    }

    if (!verifyPhoneVerificationToken(phone, verificationToken)) {
      return sendJson(res, { success: false, error: 'SMS verification expired. Please verify your phone again.' }, 401);
    }

    const identity = await getPhoneIdentity(phone);
    if (!identity?.email) {
      return sendJson(res, { success: false, error: 'No registered email is linked to this phone number.' }, 404);
    }

    const email = normalizeEmail(identity.email);
    const profile = await findSkillBarterProfile(email);
    if (!profile) {
      return sendJson(res, { success: false, error: 'SkillBarter profile not found for this account.' }, 404);
    }

    const { response } = await insforgeRequest(
      '/api/auth/email/send-otp',
      'POST',
      { email }
    );

    if (!response.ok) {
      return sendJson(res, {
        success: false,
        error: 'Could not send the email verification code. Please try again.',
      }, response.status >= 400 && response.status < 600 ? response.status : 502);
    }

    return sendJson(res, {
      success: true,
      email,
      message: 'SMS verified. Email verification code sent.',
    }, 200);
  } catch (error) {
    console.error('Phone-to-email OTP request failed:', error);
    return sendJson(res, {
      success: false,
      error: 'Unable to start email verification. Please try again.',
    }, 500);
  }
}
