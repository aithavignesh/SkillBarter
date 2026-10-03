import {
  createPhoneVerificationToken,
  normalizePhone,
  parseRequestBody,
  sendJson,
  verifyOtpChallenge,
  checkVerifyRateLimit,
  clearVerifyRateLimit,
  getPhoneIdentity,
  dbServiceRequest,
  createInsforgeSessionToken,
} from './_utils.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, { ok: true }, 200);
  if (req.method !== 'POST') return sendJson(res, { error: 'Method Not Allowed. Use POST.' }, 405);

  try {
    const body = await parseRequestBody(req);
    const rawPhone = body?.phone;
    const rawOtp = body?.otp;
    const challenge = body?.challenge;
    const purpose = body?.purpose === 'register' || body?.purpose === 'verify_only' ? body.purpose : 'login';

    if (!rawPhone || !rawOtp || !challenge) {
      return sendJson(res, { error: 'Phone number, OTP code, and verification challenge are required.', code: 'MISSING_FIELDS' }, 400);
    }

    const phone = normalizePhone(rawPhone);
    const otp = String(rawOtp).trim();

    const verifyLimit = checkVerifyRateLimit(phone, challenge);
    if (!verifyLimit.allowed) {
      return sendJson(res, {
        error: 'Too many incorrect OTP attempts. Please request a new OTP and try again later.',
        code: 'OTP_VERIFY_RATE_LIMITED',
        waitSeconds: verifyLimit.waitSeconds,
      }, 429);
    }

    if (!/^\d{6}$/.test(otp)) {
      return sendJson(res, { error: 'Invalid OTP format. OTP must be a 6-digit numeric code.', code: 'INVALID_FORMAT' }, 400);
    }

    const isValid = verifyOtpChallenge(phone, otp, challenge);
    if (!isValid) {
      return sendJson(res, { error: 'Invalid or expired OTP. Please request a new OTP and try again.', code: 'OTP_INVALID_OR_EXPIRED' }, 401);
    }

    clearVerifyRateLimit(phone, challenge);

    // Registration verification proves ownership of the mobile number without
    // creating a passwordless phone-only account. The actual SkillBarter account
    // is created only after the user submits name, email, username and password.
    if (purpose === 'register' || purpose === 'verify_only') {
      return sendJson(res, {
        success: true,
        verified: true,
        phone,
        verificationToken: createPhoneVerificationToken(phone),
        message: 'Mobile number verified. Continue registration.',
      }, 200);
    }

    const identity = await getPhoneIdentity(phone);
    if (!identity?.auth_user_id || !identity?.email) {
      return sendJson(res, {
        error: 'This mobile number is not linked to a SkillBarter account. Please sign up first or use email login.',
        code: 'PHONE_NOT_REGISTERED',
      }, 404);
    }

    const accessToken = await createInsforgeSessionToken(identity.auth_user_id, identity.email);

    // Return the application profile as well as the auth identity. The phone
    // login flow uses a short-lived access token without a refresh cookie, so
    // the browser needs a stable application-user id/profile for onboarding.
    const { insforgeUrl, insforgeServiceKey } = {
      insforgeUrl: process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL,
      insforgeServiceKey: process.env.INSFORGE_SERVICE_KEY || process.env.INSFORGE_API_KEY,
    };
    let appProfile = null;
    if (insforgeUrl && insforgeServiceKey) {
      const rows = await dbServiceRequest(
        insforgeUrl,
        insforgeServiceKey,
        'users',
        'GET',
        '?email=eq.' + encodeURIComponent(identity.email) + '&limit=1',
      );
      // InsForge database responses may be returned either as a raw row array
      // or wrapped in a data/records property depending on the API runtime.
      const profileRows = Array.isArray(rows)
        ? rows
        : Array.isArray(rows?.data)
          ? rows.data
          : Array.isArray(rows?.records)
            ? rows.records
            : (rows?.data && typeof rows.data === 'object' ? [rows.data] : []);
      appProfile = profileRows[0] || null;

      // A valid phone identity can exist even when the legacy application
      // profile was never provisioned (for example, after an older signup
      // flow). Provision the minimal users row so phone onboarding can proceed.
      if (!appProfile) {
        const createdRows = await dbServiceRequest(
          insforgeUrl,
          insforgeServiceKey,
          'users',
          'POST',
          '',
          [{
            email: identity.email,
            password_hash: 'insforge-managed',
            full_name: identity.email.split('@')[0] || 'SkillBarter Member',
            primary_intent: 'EXCHANGE',
            onboarding_completed: false,
            is_active: true,
          }],
        );
        const createdList = Array.isArray(createdRows)
          ? createdRows
          : Array.isArray(createdRows?.data)
            ? createdRows.data
            : Array.isArray(createdRows?.records)
              ? createdRows.records
              : (createdRows?.data && typeof createdRows.data === 'object' ? [createdRows.data] : []);
        appProfile = createdList[0] || null;
      }
    }

    const applicationUserId = Number(appProfile?.id);
    if (!Number.isFinite(applicationUserId) || applicationUserId <= 0) {
      return sendJson(res, {
        error: 'Application profile could not be loaded for this mobile account. Please use email login or contact support.',
        code: 'APPLICATION_PROFILE_NOT_FOUND',
      }, 404);
    }

    return sendJson(res, {
      success: true,
      accessToken,
      token: accessToken,
      user: {
        id: applicationUserId,
        email: appProfile?.email ?? identity.email,
        full_name: appProfile?.full_name ?? '',
        avatar_url: appProfile?.avatar_url ?? null,
        bio: appProfile?.bio ?? null,
        trust_score: appProfile?.trust_score ?? 0,
        reliability_score: appProfile?.reliability_score ?? 0,
        response_rate: appProfile?.response_rate ?? 0,
        skill_quality_score: appProfile?.skill_quality_score ?? 0,
        completed_exchanges_count: appProfile?.completed_exchanges_count ?? 0,
        reviews_count: appProfile?.reviews_count ?? 0,
        badges: Array.isArray(appProfile?.badges) ? appProfile.badges : [],
        is_active: appProfile?.is_active !== false,
        is_admin: appProfile?.is_admin === true,
        onboarding_completed: appProfile?.onboarding_completed ?? false,
        primary_intent: appProfile?.primary_intent ?? 'EXCHANGE',
      },
      message: 'Mobile OTP verified. Login successful.',
    }, 200);
  } catch (err) {
    console.error('[Phone OTP Verification Failed]', err.message);
    return sendJson(res, {
      error: err.message || 'OTP verification failed. Please try again.',
      code: err.code || 'VERIFY_FAILED',
    }, err.statusCode || 400);
  }
}
