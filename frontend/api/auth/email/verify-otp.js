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
    const otp = String(body?.otp || '').trim();

    if (!/^\d{6}$/.test(otp)) {
      return sendJson(res, {
        error: 'Enter the complete 6-digit email OTP.',
        code: 'INVALID_OTP_FORMAT',
      }, 400);
    }

    // Check the SkillBarter profile again immediately before exchanging the OTP.
    // InsForge's OTP session endpoint can create a new passwordless user for an
    // unknown email, so never call it unless our application profile exists.
    const profile = await findSkillBarterProfile(email);
    if (!profile) {
      return sendJson(res, {
        error: 'No SkillBarter account exists for this email. Please sign up first.',
        code: 'EMAIL_NOT_REGISTERED',
      }, 404);
    }

    const { response, data, text } = await insforgeRequest(
      '/api/auth/sessions?client_type=web',
      'POST',
      { method: 'otp', email, otp },
    );

    if (!response.ok || !data?.accessToken) {
      return sendJson(res, {
        error: data?.message || data?.error || text || 'Invalid or expired email OTP.',
        code: 'EMAIL_OTP_VERIFY_FAILED',
      }, response.status >= 500 ? 502 : 401);
    }

    return sendJson(res, {
      success: true,
      accessToken: data.accessToken,
      user: data.user,
      profile,
    }, 200);
  } catch (err) {
    console.error('[Email OTP Verification Failed]', err.message);
    return sendJson(res, {
      error: err.message || 'Unable to verify email OTP.',
      code: err.code || 'EMAIL_OTP_VERIFY_FAILED',
    }, err.statusCode || 400);
  }
}
