import crypto from 'node:crypto';
import { createClient } from '@insforge/sdk';

// Cooldown tracker: phone -> timestamp of last OTP request
const rateLimitMap = new Map();
const COOLDOWN_SECONDS = 30;

/**
 * Universal JSON response sender supporting both Node.js (res.status.json) and Web API (Response)
 */
export function sendJson(res, data, status = 200) {
  if (res && typeof res.status === 'function') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(status).json(data);
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Universal request body parser supporting Node.js parsed bodies, strings, streams, and Edge requests
 */
export async function parseRequestBody(req) {
  if (!req) return {};

  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  if (typeof req.json === 'function') {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }

  if (typeof req.on === 'function') {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });
  }

  return {};
}

/**
 * Get required environment variables with validation
 */
export function getEnvConfig() {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFromNumber = process.env.TWILIO_FROM_NUMBER?.trim();
  const phoneAuthSecret = process.env.PHONE_AUTH_SECRET?.trim() || 'skillbarter_dev_phone_secret_fallback_key';

  const insforgeUrl = (process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL || 'https://ju9c3u2p.us-east.insforge.app').trim();
  const insforgeAnonKey = (process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY || 'anon_e3dcf1e52fe1ae002bc9861d496dd401834536158c30477adc2ab779cae75edf').trim();

  return {
    twilioAccountSid,
    twilioAuthToken,
    twilioFromNumber,
    phoneAuthSecret,
    insforgeUrl,
    insforgeAnonKey,
  };
}

/**
 * Normalize phone number to standard E.164 format.
 * Accurately handles Indian numbers (+91, 10-digit mobile, leading 0) and international numbers.
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new Error('Enter a valid mobile number with country code, e.g. +917028554230');
  }

  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+91' + cleaned.slice(1);
  } else if (/^\d{10}$/.test(cleaned)) {
    cleaned = '+91' + cleaned;
  } else if (/^91\d{10}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  } else if (/^\d{11,15}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }

  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(cleaned)) {
    throw new Error('Enter a valid mobile number with country code, e.g. +917028554230');
  }

  return cleaned;
}

/**
 * Rate limit check: enforces a 30s cooldown between OTP requests for the same number
 */
export function checkRateLimit(phone) {
  const lastRequest = rateLimitMap.get(phone);
  const now = Date.now();

  if (lastRequest) {
    const elapsedSeconds = Math.floor((now - lastRequest) / 1000);
    if (elapsedSeconds < COOLDOWN_SECONDS) {
      const waitSeconds = COOLDOWN_SECONDS - elapsedSeconds;
      return {
        allowed: false,
        waitSeconds,
        error: `Please wait ${waitSeconds} second${waitSeconds > 1 ? 's' : ''} before requesting another OTP.`,
      };
    }
  }

  rateLimitMap.set(phone, now);
  return { allowed: true };
}

/**
 * Generate cryptographically secure 6-digit OTP
 */
export function generateSecureOtp() {
  const code = crypto.randomInt(0, 1000000);
  return String(code).padStart(6, '0');
}

/**
 * Create a signed challenge token containing expiration, salt, and OTP hash.
 * Plaintext OTP is NEVER included in the token.
 */
export function createOtpChallenge(phone, customOtp = null, customSecret = null) {
  const secret = customSecret || getEnvConfig().phoneAuthSecret;
  const otp = customOtp || generateSecureOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const salt = crypto.randomBytes(16).toString('hex');

  const otpHash = crypto
    .createHmac('sha256', secret)
    .update(`otp:${phone}|${otp}|${salt}|${expiresAt}`)
    .digest('hex');

  const sig = crypto
    .createHmac('sha256', secret)
    .update(`sig:${phone}|${expiresAt}|${salt}|${otpHash}`)
    .digest('hex');

  const payload = {
    phone,
    expiresAt,
    salt,
    otpHash,
    sig,
  };

  const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { otp, token };
}

/**
 * Verify submitted OTP against signed challenge
 */
export function verifyOtpChallenge(phone, enteredOtp, token, customSecret = null) {
  if (!token || typeof token !== 'string') return false;

  let payload;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    payload = JSON.parse(decoded);
  } catch {
    return false;
  }

  const { phone: challengePhone, expiresAt, salt, otpHash, sig } = payload;
  if (!challengePhone || !expiresAt || !salt || !otpHash || !sig) return false;

  if (phone !== challengePhone) return false;
  if (Date.now() > expiresAt) return false;

  const secret = customSecret || getEnvConfig().phoneAuthSecret;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`sig:${phone}|${expiresAt}|${salt}|${otpHash}`)
    .digest('hex');

  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return false;
  }

  const cleanOtp = String(enteredOtp).trim();
  const expectedOtpHash = crypto
    .createHmac('sha256', secret)
    .update(`otp:${phone}|${cleanOtp}|${salt}|${expiresAt}`)
    .digest('hex');

  if (
    otpHash.length !== expectedOtpHash.length ||
    !crypto.timingSafeEqual(Buffer.from(otpHash), Buffer.from(expectedOtpHash))
  ) {
    return false;
  }

  return true;
}

/**
 * Send real SMS OTP via official Twilio REST API.
 * Strict 8-second timeout prevents Vercel 504 gateway timeout.
 */
export async function sendSmsOtp(phone, otp) {
  const config = getEnvConfig();
  const { twilioAccountSid, twilioAuthToken, twilioFromNumber } = config;

  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    throw new Error('Twilio SMS service is not configured. Missing required Vercel environment variables.');
  }

  const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioAccountSid)}/Messages.json`;

  const bodyParams = new URLSearchParams({
    To: phone,
    From: twilioFromNumber,
    Body: `Your SkillBarter verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
  });

  const authHeader = 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second strict timeout

  try {
    const response = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: bodyParams.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = {};
    }

    if (!response.ok) {
      const twilioCode = data?.code;
      const twilioMsg = data?.message || '';

      let userMsg = 'Unable to send SMS. Please try again.';
      if (twilioCode === 21211) {
        userMsg = 'Invalid phone number. The number cannot receive SMS.';
      } else if (twilioCode === 21608) {
        userMsg = 'This phone number is unverified on the Twilio trial account. Please verify it or upgrade.';
      } else if (twilioCode === 21408) {
        userMsg = 'SMS permission to this country or region is not enabled in Twilio.';
      } else if (twilioCode === 20003) {
        userMsg = 'SMS service authentication failed. Please check Twilio credentials.';
      } else if (twilioCode === 21614) {
        userMsg = 'The recipient number cannot receive SMS messages.';
      } else if (twilioCode === 20429) {
        userMsg = 'Too many requests to SMS service. Please wait and try again.';
      } else if (twilioCode >= 30000 && twilioCode <= 30010) {
        userMsg = 'Carrier network error delivering SMS. Please try again.';
      }

      console.error(`[Twilio SMS Error] HTTP ${response.status}, Code ${twilioCode || 'N/A'}: ${twilioMsg.slice(0, 120)}`);
      const error = new Error(userMsg);
      error.code = twilioCode ? `TWILIO_${twilioCode}` : 'TWILIO_ERROR';
      error.statusCode = response.status >= 500 ? 502 : 400;
      throw error;
    }

    return {
      sid: data?.sid,
      status: data?.status || 'queued',
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      console.error('[Twilio SMS Error] Request timed out after 8 seconds');
      const timeoutError = new Error('Twilio SMS service timed out. Please try again.');
      timeoutError.code = 'SMS_GATEWAY_TIMEOUT';
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    throw err;
  }
}

/**
 * Authenticate or provision the phone user in InsForge
 */
export async function createOrSignInPhoneUser(phone) {
  const config = getEnvConfig();
  const { insforgeUrl, insforgeAnonKey, phoneAuthSecret } = config;

  const insforgeClient = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey,
  });

  const phoneDigits = phone.replace(/[^\d]/g, '');
  const phoneEmail = `${phoneDigits}@phone.skillbarter.local`;

  // Deterministically derive a secure password for this phone using secret HMAC
  const derivedPassword =
    crypto.createHmac('sha256', phoneAuthSecret).update(`skillbarter:phone:pwd:${phone}`).digest('hex') + 'Aa1!';

  let accessToken = null;
  let authUser = null;

  // 1. Try to sign in with password
  const { data: signInData, error: signInError } = await insforgeClient.auth.signInWithPassword({
    email: phoneEmail,
    password: derivedPassword,
  });

  if (!signInError && signInData?.accessToken) {
    accessToken = signInData.accessToken;
    authUser = signInData.user;
  } else {
    // 2. Sign up if user doesn't exist
    const { data: signUpData, error: signUpError } = await insforgeClient.auth.signUp({
      email: phoneEmail,
      password: derivedPassword,
      name: 'SkillBarter Member',
    });

    if (signUpError && !signUpError.message?.toLowerCase().includes('already registered')) {
      console.error('[InsForge Auth Error]', signUpError.message);
      throw new Error(signUpError.message || 'Failed to authenticate phone user');
    }

    accessToken = signUpData?.accessToken || null;
    authUser = signUpData?.user || null;

    if (!accessToken) {
      const retrySignIn = await insforgeClient.auth.signInWithPassword({
        email: phoneEmail,
        password: derivedPassword,
      });
      if (retrySignIn.data?.accessToken) {
        accessToken = retrySignIn.data.accessToken;
        authUser = retrySignIn.data.user;
      }
    }
  }

  // 3. Ensure user profile exists in database
  const { data: existingProfile } = await insforgeClient.database
    .from('users')
    .select('*')
    .ilike('email', phoneEmail)
    .maybeSingle();

  let userProfile = existingProfile;

  if (!userProfile) {
    const newUser = {
      email: phoneEmail,
      password_hash: 'insforge-managed',
      full_name: 'SkillBarter Member',
      address_display: 'Local Neighborhood',
      latitude: 17.4485,
      longitude: 78.3748,
      primary_intent: 'EXCHANGE',
      trust_score: 85.0,
      reliability_score: 90.0,
      response_rate: 95.0,
      skill_quality_score: 90.0,
      completed_exchanges_count: 0,
      reviews_count: 0,
      badges: ['Verified Member', 'Mobile Verified'],
      is_active: true,
      is_admin: false,
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await insforgeClient.database
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (!insertError && inserted) {
      userProfile = inserted;
    } else {
      const { data: recheck } = await insforgeClient.database
        .from('users')
        .select('*')
        .ilike('email', phoneEmail)
        .maybeSingle();
      userProfile = recheck || { id: 0, email: phoneEmail, full_name: 'SkillBarter Member' };
    }
  }

  return {
    accessToken: accessToken || 'phone_session_verified',
    user: {
      id: userProfile.id,
      email: userProfile.email,
      full_name: userProfile.full_name,
      phone,
      trust_score: userProfile.trust_score ?? 85,
      reliability_score: userProfile.reliability_score ?? 90,
      response_rate: userProfile.response_rate ?? 95,
      skill_quality_score: userProfile.skill_quality_score ?? 90,
      completed_exchanges_count: userProfile.completed_exchanges_count ?? 0,
      reviews_count: userProfile.reviews_count ?? 0,
      badges: userProfile.badges ?? ['Verified Member', 'Mobile Verified'],
      is_active: userProfile.is_active !== false,
      is_admin: userProfile.is_admin === true,
      onboarding_completed: userProfile.onboarding_completed ?? false,
      primary_intent: userProfile.primary_intent ?? 'EXCHANGE',
    },
  };
}
