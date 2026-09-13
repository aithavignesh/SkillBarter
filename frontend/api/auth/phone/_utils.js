import crypto from 'node:crypto';

const rateLimitMap = new Map();
const COOLDOWN_SECONDS = 30;

export function sendJson(res, data, status = 200) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (res && typeof res.status === 'function') {
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(status).json(data);
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export async function parseRequestBody(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  if (typeof req.json === 'function') {
    try { return await req.json(); } catch { return {}; }
  }
  if (typeof req.on === 'function') {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
      });
      req.on('error', () => resolve({}));
    });
  }
  return {};
}

export function sanitizeEnvValue(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .trim()
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/[\r\n\t\0]/g, '')
    .replace(/^\uFEFF/, '')
    .trim();
}

export function getEnvConfig() {
  const rawPhoneAuthSecret = process.env.PHONE_AUTH_SECRET;
  const rawInsforgeUrl = process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL;
  const rawInsforgeAnonKey = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY;
  return {
    phoneAuthSecret: sanitizeEnvValue(rawPhoneAuthSecret),
    insforgeUrl: sanitizeEnvValue(rawInsforgeUrl),
    insforgeAnonKey: sanitizeEnvValue(rawInsforgeAnonKey),
  };
}

export function normalizePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new Error('Enter a valid mobile number with country code, e.g. +917028554230');
  }
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = '+91' + cleaned.slice(1);
  else if (/^\d{10}$/.test(cleaned)) cleaned = '+91' + cleaned;
  else if (/^91\d{10}$/.test(cleaned)) cleaned = '+' + cleaned;
  else if (/^\d{11,15}$/.test(cleaned)) cleaned = '+' + cleaned;
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    throw new Error('Enter a valid mobile number with country code, e.g. +917028554230');
  }
  return cleaned;
}

export function checkRateLimit(phone) {
  const lastRequest = rateLimitMap.get(phone);
  const now = Date.now();
  if (lastRequest) {
    const elapsedSeconds = Math.floor((now - lastRequest) / 1000);
    if (elapsedSeconds < COOLDOWN_SECONDS) {
      return {
        allowed: false,
        waitSeconds: COOLDOWN_SECONDS - elapsedSeconds,
        error: `Please wait ${COOLDOWN_SECONDS - elapsedSeconds} seconds before requesting another OTP.`,
      };
    }
  }
  rateLimitMap.set(phone, now);
  return { allowed: true };
}

export function generateSecureOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export function createOtpChallenge(phone, customOtp = null, customSecret = null) {
  const secret = customSecret || getEnvConfig().phoneAuthSecret;
  if (!secret) throw new Error('PHONE_AUTH_SECRET environment variable is missing.');
  const otp = customOtp || generateSecureOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const salt = crypto.randomBytes(16).toString('hex');
  const otpHash = crypto.createHmac('sha256', secret)
    .update(`otp:${phone}|${otp}|${salt}|${expiresAt}`)
    .digest('hex');
  const sig = crypto.createHmac('sha256', secret)
    .update(`sig:${phone}|${expiresAt}|${salt}|${otpHash}`)
    .digest('hex');
  return {
    otp,
    token: Buffer.from(JSON.stringify({ phone, expiresAt, salt, otpHash, sig })).toString('base64url'),
  };
}

export function verifyOtpChallenge(phone, enteredOtp, token, customSecret = null) {
  if (!token) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')); } catch { return false; }
  const { phone: challengePhone, expiresAt, salt, otpHash, sig } = payload;
  if (!challengePhone || !expiresAt || !salt || !otpHash || !sig || phone !== challengePhone || Date.now() > expiresAt) return false;
  const secret = customSecret || getEnvConfig().phoneAuthSecret;
  if (!secret) return false;
  const expectedSig = crypto.createHmac('sha256', secret)
    .update(`sig:${phone}|${expiresAt}|${salt}|${otpHash}`)
    .digest('hex');
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return false;
  const expectedOtpHash = crypto.createHmac('sha256', secret)
    .update(`otp:${phone}|${String(enteredOtp).trim()}|${salt}|${expiresAt}`)
    .digest('hex');
  return otpHash.length === expectedOtpHash.length && crypto.timingSafeEqual(Buffer.from(otpHash), Buffer.from(expectedOtpHash));
}

function isInvalidCredentials(error) {
  if (!error) return false;
  const status = Number(error.statusCode ?? error.status ?? 0);
  const code = String(error.error ?? error.code ?? '').toUpperCase();
  const message = String(error.message ?? '').toLowerCase();
  return status === 401 || code === 'INVALID_CREDENTIALS' || message.includes('invalid login credentials');
}

async function signIn(client, email, password) {
  return client.auth.signInWithPassword({ email, password });
}

async function signUp(client, email, password) {
  return client.auth.signUp({ email, password, name: 'SkillBarter Member' });
}

export async function createOrSignInPhoneUser(phone) {
  const config = getEnvConfig();
  const { insforgeUrl, insforgeAnonKey, phoneAuthSecret } = config;
  if (!phoneAuthSecret) throw new Error('PHONE_AUTH_SECRET environment variable is missing.');
  if (!insforgeUrl || !insforgeAnonKey) throw new Error('INSFORGE_URL or INSFORGE_ANON_KEY environment variable is missing.');

  const { createClient } = await import('@insforge/sdk');
  const insforgeClient = createClient({ baseUrl: insforgeUrl, anonKey: insforgeAnonKey });
  const phoneDigits = phone.replace(/[^\d]/g, '');

  // Use a syntactically valid synthetic email. InsForge validates the email
  // format before authentication, so .local/.local.v2 addresses are rejected.
  const legacyEmail = `${phoneDigits}@phone.skillbarter.local`;
  const migratedEmail = `${phoneDigits}@phone.skillbarter.com`;
  const derivedPassword = crypto.createHmac('sha256', phoneAuthSecret)
    .update(`skillbarter:phone:pwd:${phone}`)
    .digest('hex') + 'Aa1!';

  let accessToken = null;
  let authUser = null;
  let authEmail = legacyEmail;

  // Normal path for a phone account created with the current secret and the
  // valid synthetic email format.
  const primary = await signIn(insforgeClient, migratedEmail, derivedPassword);
  if (!primary.error && primary.data?.accessToken) {
    accessToken = primary.data.accessToken;
    authUser = primary.data.user;
    authEmail = migratedEmail;
  } else if (primary.error && !isInvalidCredentials(primary.error)) {
    throw new Error(primary.error.message || 'Unable to authenticate phone user');
  }

  // Recovery path for accounts created by an older deployment.
  if (!accessToken) {
    const created = await signUp(insforgeClient, migratedEmail, derivedPassword);
    const alreadyExists = Boolean(created.error?.message) && /already\s*(registered|exists)|email.*already.*(registered|exists)/i.test(created.error.message);
    if (created.error && !alreadyExists) {
      throw new Error(created.error.message || 'Unable to create phone authentication account');
    }
    if (created.data?.accessToken) {
      accessToken = created.data.accessToken;
      authUser = created.data.user;
      authEmail = migratedEmail;
    } else {
      const retry = await signIn(insforgeClient, migratedEmail, derivedPassword);
      if (retry.error || !retry.data?.accessToken) {
        throw new Error(retry.error?.message || 'Unable to sign in phone authentication account');
      }
      accessToken = retry.data.accessToken;
      authUser = retry.data.user;
      authEmail = migratedEmail;
    }
  }

  // Preserve an existing application profile, including profiles from the
  // original .local synthetic email implementation.
  let { data: userProfile } = await insforgeClient.database
    .from('users')
    .select('*')
    .eq('email', authEmail)
    .maybeSingle();

  if (!userProfile && authEmail === migratedEmail) {
    const { data: legacyProfile } = await insforgeClient.database
      .from('users')
      .select('*')
      .eq('email', legacyEmail)
      .maybeSingle();
    if (legacyProfile) {
      const { data: migratedProfile, error: migrationError } = await insforgeClient.database
        .from('users')
        .update({ email: migratedEmail, updated_at: new Date().toISOString() })
        .eq('id', legacyProfile.id)
        .select('*')
        .single();
      if (migrationError) throw new Error(`Phone profile migration failed: ${migrationError.message}`);
      userProfile = migratedProfile;
    }
  }

  if (!userProfile) {
    const newUser = {
      email: authEmail,
      password_hash: 'insforge-managed',
      full_name: 'SkillBarter Member',
      address_display: 'Local Neighborhood',
      latitude: 17.4485,
      longitude: 78.3748,
      primary_intent: 'EXCHANGE',
      trust_score: 85,
      reliability_score: 90,
      response_rate: 95,
      skill_quality_score: 90,
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
    if (insertError) throw new Error(`Unable to create SkillBarter profile: ${insertError.message}`);
    userProfile = inserted;
  }

  return {
    accessToken,
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
    authUser,
  };
}
