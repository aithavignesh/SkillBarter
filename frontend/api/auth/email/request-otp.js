import {
  findSkillBarterProfile,
  normalizeEmail,
  parseRequestBody,
  sendJson,
  insforgeRequest,
} from './_utils.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, { ok: true }, 200);
  if (req.method !== 'POST') return sendJson(res, { error: 'Method Not Allowed. Use POST.' }, 405);

  try {
    const body = await parseRequestBody(req);
    const email = normalizeEmail(body?.email);

    const profile = await findSkillBarterProfile(email);
    if (!profile) {
      return sendJson(res, {
        error: 'No SkillBarter account exists for this email. Please sign up first.',
        code: 'EMAIL_NOT_REGISTERED',
      }, 404);
    }

    const { response, data, text } = await insforgeRequest('/api/auth/email/send-otp', 'POST', { email });
    if (!response.ok) {
      return sendJson(res, {
        error: data?.message || data?.error || text || 'Unable to send email OTP.',
        code: 'EMAIL_OTP_SEND_FAILED',
      }, response.status >= 500 ? 502 : 400);
    }

    return sendJson(res, {
      success: true,
      message: 'Verification code sent to your email.',
    }, 200);
  } catch (err) {
    console.error('[Email OTP Request Failed]', err.message);
    return sendJson(res, {
      error: err.message || 'Unable to send email OTP.',
      code: err.code || 'EMAIL_OTP_REQUEST_FAILED',
    }, err.statusCode || 400);
  }
}
