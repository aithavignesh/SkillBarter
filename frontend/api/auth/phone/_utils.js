import crypto from 'node:crypto';

const rateLimitMap = new Map();
const verifyAttemptMap = new Map();
const COOLDOWN_SECONDS = 30;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_MS = 10 * 60 * 1000;

export function sendJson(res, data, status = 200) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
  if (res && typeof res.status === 'function') { Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v)); return res.status(status).json(data); }
  return new Response(JSON.stringify(data), { status, headers });
}

export async function parseRequestBody(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  if (typeof req.json === 'function') { try { return await req.json(); } catch { return {}; } }
  if (typeof req.on === 'function') return new Promise(resolve => { let data=''; req.on('data', c => { data += c; }); req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } }); req.on('error', () => resolve({})); });
  return {};
}

export function sanitizeEnvValue(value) { if (!value || typeof value !== 'string') return ''; return value.trim().replace(/^["'`]|["'`]$/g,'').replace(/[\r\n\t\0]/g,'').replace(/^\uFEFF/,'').trim(); }

export function getEnvConfig() {
  return {
    phoneAuthSecret: sanitizeEnvValue(process.env.PHONE_AUTH_SECRET),
    insforgeUrl: sanitizeEnvValue(process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL),
    insforgeAnonKey: sanitizeEnvValue(process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY),
    insforgeServiceKey: sanitizeEnvValue(process.env.INSFORGE_SERVICE_KEY || process.env.INSFORGE_API_KEY),
    insforgeJwtSecret: sanitizeEnvValue(process.env.INSFORGE_JWT_SECRET),
  };
}

export function normalizePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') throw new Error('Enter a valid mobile number with country code, e.g. +917028554230');
  let cleaned = rawPhone.trim().replace(/[^\d+]/g,'');
  if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = '+91' + cleaned.slice(1);
  else if (/^\d{10}$/.test(cleaned)) cleaned = '+91' + cleaned;
  else if (/^91\d{10}$/.test(cleaned)) cleaned = '+' + cleaned;
  else if (/^\d{11,15}$/.test(cleaned)) cleaned = '+' + cleaned;
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) throw new Error('Enter a valid mobile number with country code, e.g. +917028554230');
  return cleaned;
}

export function checkRateLimit(phone) {
  const last = rateLimitMap.get(phone), now = Date.now();
  if (last) {
    const elapsed = Math.floor((now-last)/1000);
    if (elapsed < COOLDOWN_SECONDS) {
      return {
        allowed:false,
        waitSeconds:COOLDOWN_SECONDS-elapsed,
        error:`Please wait ${COOLDOWN_SECONDS-elapsed} seconds before requesting another OTP.`
      };
    }
  }
  rateLimitMap.set(phone, now);
  return { allowed:true };
}

export function checkVerifyRateLimit(phone, challenge) {
  const key = crypto.createHash('sha256').update(`${phone}:${challenge}`).digest('hex');
  const now = Date.now();
  const current = verifyAttemptMap.get(key);
  if (!current || now - current.startedAt >= VERIFY_WINDOW_MS) {
    verifyAttemptMap.set(key, { startedAt: now, attempts: 1 });
    return { allowed: true, attemptsRemaining: MAX_VERIFY_ATTEMPTS - 1 };
  }

  if (current.attempts >= MAX_VERIFY_ATTEMPTS) {
    return {
      allowed: false,
      waitSeconds: Math.max(1, Math.ceil((VERIFY_WINDOW_MS - (now - current.startedAt)) / 1000)),
      attemptsRemaining: 0,
    };
  }

  current.attempts += 1;
  verifyAttemptMap.set(key, current);
  return { allowed: true, attemptsRemaining: MAX_VERIFY_ATTEMPTS - current.attempts };
}

export function clearVerifyRateLimit(phone, challenge) {
  const key = crypto.createHash('sha256').update(`${phone}:${challenge}`).digest('hex');
  verifyAttemptMap.delete(key);
}

export function validatePhoneAuthSession(session) {
  const accessToken = typeof session?.accessToken === 'string' ? session.accessToken.trim() : '';
  const email = typeof session?.user?.email === 'string' ? session.user.email.trim().toLowerCase() : '';
  if (!accessToken) return { valid: false, reason: 'MISSING_ACCESS_TOKEN' };
  if (!email) return { valid: false, reason: 'MISSING_USER_EMAIL' };
  return { valid: true, accessToken, email };
}

export function generateSecureOtp() { return String(crypto.randomInt(0,1000000)).padStart(6,'0'); }

export function createOtpChallenge(phone, customOtp=null, customSecret=null) {
  const secret = customSecret || getEnvConfig().phoneAuthSecret; if (!secret) throw new Error('PHONE_AUTH_SECRET environment variable is missing.');
  const otp = customOtp || generateSecureOtp(), expiresAt = Date.now()+10*60*1000, salt = crypto.randomBytes(16).toString('hex');
  const otpHash = crypto.createHmac('sha256',secret).update(`otp:${phone}|${otp}|${salt}|${expiresAt}`).digest('hex');
  const sig = crypto.createHmac('sha256',secret).update(`sig:${phone}|${expiresAt}|${salt}|${otpHash}`).digest('hex');
  return { otp, token: Buffer.from(JSON.stringify({phone,expiresAt,salt,otpHash,sig})).toString('base64url') };
}

export function verifyOtpChallenge(phone, enteredOtp, token, customSecret=null) {
  if (!token) return false; let p; try { p=JSON.parse(Buffer.from(token,'base64url').toString('utf8')); } catch { return false; }
  const {phone: cp, expiresAt, salt, otpHash, sig}=p; if(!cp||!expiresAt||!salt||!otpHash||!sig||cp!==phone||Date.now()>expiresAt) return false;
  const secret=customSecret||getEnvConfig().phoneAuthSecret; if(!secret) return false;
  const es=crypto.createHmac('sha256',secret).update(`sig:${phone}|${expiresAt}|${salt}|${otpHash}`).digest('hex');
  if(sig.length!==es.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(es))) return false;
  const eh=crypto.createHmac('sha256',secret).update(`otp:${phone}|${String(enteredOtp).trim()}|${salt}|${expiresAt}`).digest('hex');
  return otpHash.length===eh.length&&crypto.timingSafeEqual(Buffer.from(otpHash),Buffer.from(eh));
}


export function createPhoneVerificationToken(phone, customSecret=null) {
  const secret = customSecret || getEnvConfig().phoneAuthSecret;
  if (!secret) throw new Error('PHONE_AUTH_SECRET environment variable is missing.');
  const verifiedAt = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = { phone, verifiedAt, expiresAt: verifiedAt + 15 * 60 * 1000, nonce };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('hex');
  return encoded + '.' + sig;
}

export function verifyPhoneVerificationToken(phone, token, customSecret=null) {
  if (!token || typeof token !== 'string') return false;
  const secret = customSecret || getEnvConfig().phoneAuthSecret;
  if (!secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const encoded = parts[0], sig = parts[1];
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  if (!payload?.phone || payload.phone !== phone || !payload.expiresAt || Date.now() > Number(payload.expiresAt)) return false;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('hex');
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function dbServiceRequest(baseUrl, serviceKey, table, method, query='', body) {
  if (!baseUrl || !serviceKey) {
    const error = new Error('InsForge service key is not configured for phone authentication.');
    error.code = 'INSFORGE_SERVICE_KEY_MISSING';
    error.statusCode = 500;
    throw error;
  }
  const url = baseUrl.replace(/\/+$/,'') + '/api/database/records/' + table + query;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const nestedError = data?.error;
    const message =
      (typeof data?.message === 'string' && data.message) ||
      (typeof nestedError === 'string' && nestedError) ||
      (typeof nestedError?.message === 'string' && nestedError.message) ||
      (typeof nestedError?.error === 'string' && nestedError.error) ||
      text ||
      'InsForge request failed (' + response.status + ')';
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

export async function createInsforgeSessionToken(authUserId, email) {
  const { insforgeJwtSecret } = getEnvConfig();
  if (!insforgeJwtSecret) {
    const error = new Error('INSFORGE_JWT_SECRET environment variable is missing.');
    error.code = 'INSFORGE_JWT_SECRET_MISSING';
    error.statusCode = 500;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: String(authUserId),
    email,
    role: 'authenticated',
    aud: 'insforge-api',
    iat: now,
    exp: now + 60 * 60,
  })).toString('base64url');
  const unsigned = header + '.' + payload;
  const signature = crypto.createHmac('sha256', insforgeJwtSecret).update(unsigned).digest('base64url');
  return unsigned + '.' + signature;
}

export async function getPhoneIdentity(phone) {
  const { insforgeUrl, insforgeServiceKey } = getEnvConfig();
  const rows = await dbServiceRequest(
    insforgeUrl,
    insforgeServiceKey,
    'phone_identities',
    'GET',
    '?phone=eq.' + encodeURIComponent(phone) + '&limit=1',
  );
  return Array.isArray(rows) ? rows[0] || null : rows || null;
}

export function requireRegisteredPhoneProfile(profile) {
  if (profile) return profile;
  const error = new Error('No SkillBarter account is registered with this mobile number. Please sign up first.');
  error.code = 'PHONE_NOT_REGISTERED';
  error.statusCode = 404;
  throw error;
}

