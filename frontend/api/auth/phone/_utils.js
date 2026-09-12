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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(status).json(data);
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
 * Robust sanitizer for environment variables to strip quotes, trailing whitespace, and control chars
 */
export function sanitizeEnvValue(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/^["'`]|["'`]$/g, '') // remove surrounding quotes/backticks
    .replace(/[\r\n\t\0]/g, '')    // remove control characters
    .replace(/^\uFEFF/, '')        // remove UTF-8 BOM
    .trim();
}

/**
 * Get required environment variables with validation & sanitization (NO hardcoded secrets or fallbacks)
 */
export function getEnvConfig() {
  const rawAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const rawAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const rawApiKeySid = process.env.TWILIO_API_KEY_SID;
  const rawApiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const rawFromNumber = process.env.TWILIO_FROM_NUMBER;
  const rawPhoneAuthSecret = process.env.PHONE_AUTH_SECRET;
  const rawInsforgeUrl = process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL;
  const rawInsforgeAnonKey = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY;

  const twilioAccountSid = sanitizeEnvValue(rawAccountSid);
  const twilioAuthToken = sanitizeEnvValue(rawAuthToken);
  const twilioApiKeySid = sanitizeEnvValue(rawApiKeySid);
  const twilioApiKeySecret = sanitizeEnvValue(rawApiKeySecret);
  const twilioFromNumber = sanitizeEnvValue(rawFromNumber);
  const phoneAuthSecret = sanitizeEnvValue(rawPhoneAuthSecret);
  const insforgeUrl = sanitizeEnvValue(rawInsforgeUrl);
  const insforgeAnonKey = sanitizeEnvValue(rawInsforgeAnonKey);

  const hasWhitespaceOrQuotes = Boolean(
    (rawAccountSid && rawAccountSid !== twilioAccountSid) ||
    (rawAuthToken && rawAuthToken !== twilioAuthToken) ||
    (rawApiKeySid && rawApiKeySid !== twilioApiKeySid) ||
    (rawApiKeySecret && rawApiKeySecret !== twilioApiKeySecret) ||
    (rawFromNumber && rawFromNumber !== twilioFromNumber) ||
    (rawPhoneAuthSecret && rawPhoneAuthSecret !== phoneAuthSecret)
  );

  return {
    twilioAccountSid,
    twilioAuthToken,
    twilioApiKeySid,
    twilioApiKeySecret,
    twilioFromNumber,
    phoneAuthSecret,
    insforgeUrl,
    insforgeAnonKey,
    hasWhitespaceOrQuotes,
  };
}

/**
 * Resolves active Twilio credentials with priority (STEP 5):
 * 1. TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET
 * 2. TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN
 * Endpoint always targets /Accounts/${accountSid}/...
 */
export function getTwilioAuthCredentials() {
  const config = getEnvConfig();
  const {
    twilioAccountSid,
    twilioAuthToken,
    twilioApiKeySid,
    twilioApiKeySecret,
    twilioFromNumber,
  } = config;

  if (!twilioAccountSid) {
    throw new Error('TWILIO_ACCOUNT_SID environment variable is missing.');
  }
  if (!twilioFromNumber) {
    throw new Error('TWILIO_FROM_NUMBER environment variable is missing.');
  }

  // Priority 1: API Key authentication
  if (twilioApiKeySid && twilioApiKeySecret) {
    return {
      authType: 'api_key',
      accountSid: twilioAccountSid,
      authHeader: 'Basic ' + Buffer.from(`${twilioApiKeySid}:${twilioApiKeySecret}`).toString('base64'),
      credentialLength: twilioApiKeySecret.length,
      credentialPrefix: twilioApiKeySid.slice(0, 2),
      fromNumber: twilioFromNumber,
    };
  }

  // Priority 2: Account SID + Auth Token fallback
  if (twilioAuthToken) {
    return {
      authType: 'auth_token',
      accountSid: twilioAccountSid,
      authHeader: 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
      credentialLength: twilioAuthToken.length,
      credentialPrefix: twilioAccountSid.slice(0, 2),
      fromNumber: twilioFromNumber,
    };
  }

  throw new Error('Missing Twilio credentials: Configure TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET or TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.');
}

/**
 * Safe server-side Twilio authentication check (STEP 3 & STEP 4).
 * Queries Twilio Account resource (GET https://api.twilio.com/2010-04-01/Accounts/{accountSid}.json)
 * Verifies credentials authenticate WITHOUT sending an SMS.
 * Never leaks full credentials or secrets.
 */
export async function checkTwilioAuthentication() {
  const config = getEnvConfig();
  let credentials;
  try {
    credentials = getTwilioAuthCredentials();
  } catch (err) {
    return {
      authOk: false,
      httpStatus: 500,
      twilioCode: null,
      twilioMessage: err.message,
      diagnostics: {
        accountSidPrefix: config.twilioAccountSid ? config.twilioAccountSid.slice(0, 2) : '',
        accountSidLength: config.twilioAccountSid ? config.twilioAccountSid.length : 0,
        authCredentialLength: config.twilioApiKeySecret ? config.twilioApiKeySecret.length : (config.twilioAuthToken ? config.twilioAuthToken.length : 0),
        authCredentialType: config.twilioApiKeySid ? 'api_key' : 'auth_token',
        fromNumberPrefix: config.twilioFromNumber ? config.twilioFromNumber.slice(0, 2) : '',
        fromNumberLength: config.twilioFromNumber ? config.twilioFromNumber.length : 0,
        fromNumberType: config.twilioFromNumber ? (config.twilioFromNumber.startsWith('MG') ? 'messaging_service' : 'phone_number') : 'unknown',
        hasWhitespaceOrQuotes: config.hasWhitespaceOrQuotes,
      },
    };
  }

  const { accountSid, authHeader, authType, credentialLength, fromNumber } = credentials;
  const accountSidPrefix = accountSid.slice(0, 2);
  const accountSidLength = accountSid.length;
  const fromNumberPrefix = fromNumber.slice(0, 2);
  const fromNumberLength = fromNumber.length;
  const fromNumberType = fromNumber.startsWith('MG') ? 'messaging_service' : 'phone_number';

  const diagnostics = {
    accountSidPrefix,
    accountSidLength,
    authCredentialLength: credentialLength,
    authCredentialType: authType,
    fromNumberPrefix,
    fromNumberLength,
    fromNumberType,
    hasWhitespaceOrQuotes: config.hasWhitespaceOrQuotes,
  };

  const testEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }

    if (res.ok) {
      // Safe check on sender if phone number (STEP 4)
      let senderSmsCapable = true;
      if (!fromNumber.startsWith('MG')) {
        try {
          const phoneRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(fromNumber)}`,
            {
              method: 'GET',
              headers: { 'Authorization': authHeader, 'Accept': 'application/json' },
            }
          );
          if (phoneRes.ok) {
            const phoneData = await phoneRes.json();
            const numbers = phoneData?.incoming_phone_numbers || [];
            if (numbers.length > 0) {
              const numObj = numbers[0];
              senderSmsCapable = Boolean(numObj?.capabilities?.sms);
            }
          }
        } catch {
          // Non-blocking
        }
      }

      return {
        authOk: true,
        httpStatus: res.status,
        twilioCode: null,
        twilioMessage: 'Twilio authentication successful',
        diagnostics: {
          ...diagnostics,
          senderSmsCapable,
        },
      };
    }

    return {
      authOk: false,
      httpStatus: res.status,
      twilioCode: data?.code || null,
      twilioMessage: data?.message || 'Twilio authentication failed',
      diagnostics,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      authOk: false,
      httpStatus: err.name === 'AbortError' ? 504 : 500,
      twilioCode: err.name === 'AbortError' ? 'SMS_GATEWAY_TIMEOUT' : 'AUTH_CHECK_FAILED',
      twilioMessage: err.message || 'Twilio authentication check failed',
      diagnostics,
    };
  }
}

/**
 * Safe error message translator providing exact diagnostics without secrets (STEP 6)
 */
export function mapTwilioErrorToSafeMessage(code, status, rawMsg, diagnostics) {
  const sidPrefix = diagnostics?.accountSidPrefix;
  const sidLength = diagnostics?.accountSidLength;
  const credLen = diagnostics?.authCredentialLength;
  const credType = diagnostics?.authCredentialType;
  const hasWhitespace = diagnostics?.hasWhitespaceOrQuotes;

  if (code === 20003 || status === 401) {
    let hint = '';
    if (sidPrefix && sidPrefix !== 'AC') {
      hint = ` TWILIO_ACCOUNT_SID starts with '${sidPrefix}' (expected 'AC').`;
    } else if (sidLength && sidLength !== 34) {
      hint = ` TWILIO_ACCOUNT_SID length is ${sidLength} (expected 34).`;
    } else if (credType === 'auth_token' && credLen !== 32) {
      hint = ` TWILIO_AUTH_TOKEN length is ${credLen} (expected 32).`;
    } else if (credType === 'api_key' && credLen !== 32) {
      hint = ` TWILIO_API_KEY_SECRET length is ${credLen} (expected 32).`;
    } else if (hasWhitespace) {
      hint = ' Unexpected quotes or whitespace detected in credentials.';
    } else if (rawMsg) {
      hint = ` Detail: ${rawMsg}.`;
    }
    return `Twilio authentication failed (20003). Check the production Twilio credentials.${hint}`;
  }

  if (code === 21212 || code === 21606 || code === 21659 || code === 21660) {
    return 'Twilio sender is invalid or not SMS-enabled.';
  }

  if (code === 21408 || code === 21614) {
    return 'SMS delivery to this destination is not permitted.';
  }

  if (code === 21608) {
    return 'This number must be verified in the Twilio trial account.';
  }

  if (code === 21211) {
    return 'The mobile number is not valid or cannot receive SMS.';
  }

  if (code === 20429) {
    return 'Too many requests to SMS service. Please wait a few moments and try again.';
  }

  if (code >= 30000 && code <= 30010) {
    return 'Carrier network error delivering SMS. Please try again.';
  }

  if (rawMsg) {
    return `Twilio SMS error (${code || status}): ${rawMsg.slice(0, 150)}`;
  }

  return `Twilio SMS error (${code || status || 'unknown'}). Please try again.`;
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
  if (!secret) {
    throw new Error('PHONE_AUTH_SECRET environment variable is missing.');
  }
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
  if (!secret) return false;

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
  // 1. Safe pre-flight authentication test without sending SMS (STEP 3)
  const authTest = await checkTwilioAuthentication();
  if (!authTest.authOk) {
    const safeMsg = mapTwilioErrorToSafeMessage(
      authTest.twilioCode,
      authTest.httpStatus,
      authTest.twilioMessage,
      authTest.diagnostics
    );
    const error = new Error(safeMsg);
    error.code = authTest.twilioCode ? `TWILIO_${authTest.twilioCode}` : 'TWILIO_20003';
    error.statusCode = authTest.httpStatus >= 500 ? 502 : 400;
    error.details = {
      ...authTest.diagnostics,
      twilioHttpStatus: authTest.httpStatus,
      twilioErrorCode: authTest.twilioCode,
      twilioSafeMessage: authTest.twilioMessage,
    };
    throw error;
  }

  const credentials = getTwilioAuthCredentials();
  const { accountSid, authHeader, fromNumber } = credentials;

  const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;

  const bodyRecord = {
    To: phone,
    Body: `Your SkillBarter verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
  };

  if (fromNumber.startsWith('MG')) {
    bodyRecord.MessagingServiceSid = fromNumber;
  } else {
    bodyRecord.From = fromNumber;
  }

  const bodyParams = new URLSearchParams(bodyRecord);
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

      console.error(`[Twilio SMS Error] HTTP ${response.status}, Code ${twilioCode || 'N/A'}: ${twilioMsg}`);

      const safeMsg = mapTwilioErrorToSafeMessage(
        twilioCode,
        response.status,
        twilioMsg,
        authTest.diagnostics
      );
      const error = new Error(safeMsg);
      error.code = twilioCode ? `TWILIO_${twilioCode}` : 'TWILIO_ERROR';
      error.statusCode = response.status >= 500 ? 502 : 400;
      error.details = {
        ...authTest.diagnostics,
        twilioHttpStatus: response.status,
        twilioErrorCode: twilioCode,
        twilioSafeMessage: twilioMsg,
      };
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

  if (!phoneAuthSecret) {
    throw new Error('PHONE_AUTH_SECRET environment variable is missing.');
  }
  if (!insforgeUrl || !insforgeAnonKey) {
    throw new Error('INSFORGE_URL or INSFORGE_ANON_KEY environment variable is missing.');
  }

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
