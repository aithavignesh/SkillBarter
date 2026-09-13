import crypto from 'node:crypto';
import { createClient } from '@insforge/sdk';

const rateLimitMap = new Map();
const COOLDOWN_SECONDS = 30;

export function sendJson(res, data, status = 200) {
  if (res && typeof res.status === 'function') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(status).json(data);
  }
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}

export async function parseRequestBody(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  if (typeof req.json === 'function') { try { return await req.json(); } catch { return {}; } }
  if (typeof req.on === 'function') return new Promise((resolve) => { let data = ''; req.on('data', (chunk) => { data += chunk; }); req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } }); req.on('error', () => resolve({})); });
  return {};
}

export function sanitizeEnvValue(val) {
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/^["'`]|["'`]$/g, '').replace(/[\r\n\t\0]/g, '').replace(/^\uFEFF/, '').trim();
}

export function getEnvConfig() {
  const rawAccountSid = process.env.TWILIO_ACCOUNT_SID, rawAuthToken = process.env.TWILIO_AUTH_TOKEN, rawApiKeySid = process.env.TWILIO_API_KEY_SID, rawApiKeySecret = process.env.TWILIO_API_KEY_SECRET, rawFromNumber = process.env.TWILIO_FROM_NUMBER, rawPhoneAuthSecret = process.env.PHONE_AUTH_SECRET, rawInsforgeUrl = process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL, rawInsforgeAnonKey = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY;
  const twilioAccountSid = sanitizeEnvValue(rawAccountSid), twilioAuthToken = sanitizeEnvValue(rawAuthToken), twilioApiKeySid = sanitizeEnvValue(rawApiKeySid), twilioApiKeySecret = sanitizeEnvValue(rawApiKeySecret), twilioFromNumber = sanitizeEnvValue(rawFromNumber), phoneAuthSecret = sanitizeEnvValue(rawPhoneAuthSecret), insforgeUrl = sanitizeEnvValue(rawInsforgeUrl), insforgeAnonKey = sanitizeEnvValue(rawInsforgeAnonKey);
  return { twilioAccountSid, twilioAuthToken, twilioApiKeySid, twilioApiKeySecret, twilioFromNumber, phoneAuthSecret, insforgeUrl, insforgeAnonKey, hasWhitespaceOrQuotes: Boolean((rawAccountSid && rawAccountSid !== twilioAccountSid) || (rawAuthToken && rawAuthToken !== twilioAuthToken) || (rawApiKeySid && rawApiKeySid !== twilioApiKeySid) || (rawApiKeySecret && rawApiKeySecret !== twilioApiKeySecret) || (rawFromNumber && rawFromNumber !== twilioFromNumber) || (rawPhoneAuthSecret && rawPhoneAuthSecret !== phoneAuthSecret)) };
}

export function getTwilioAuthCredentials() {
  const c = getEnvConfig();
  if (!c.twilioAccountSid) throw new Error('TWILIO_ACCOUNT_SID environment variable is missing.');
  if (!c.twilioFromNumber) throw new Error('TWILIO_FROM_NUMBER environment variable is missing.');
  if (c.twilioApiKeySid && c.twilioApiKeySecret) return { authType: 'api_key', accountSid: c.twilioAccountSid, authHeader: 'Basic ' + Buffer.from(`${c.twilioApiKeySid}:${c.twilioApiKeySecret}`).toString('base64'), credentialLength: c.twilioApiKeySecret.length, credentialPrefix: c.twilioApiKeySid.slice(0, 2), fromNumber: c.twilioFromNumber };
  if (c.twilioAuthToken) return { authType: 'auth_token', accountSid: c.twilioAccountSid, authHeader: 'Basic ' + Buffer.from(`${c.twilioAccountSid}:${c.twilioAuthToken}`).toString('base64'), credentialLength: c.twilioAuthToken.length, credentialPrefix: c.twilioAccountSid.slice(0, 2), fromNumber: c.twilioFromNumber };
  throw new Error('Missing Twilio credentials: Configure TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET or TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.');
}

export async function checkTwilioAuthentication() {
  const config = getEnvConfig(); let credentials;
  try { credentials = getTwilioAuthCredentials(); } catch (err) { return { authOk: false, httpStatus: 500, twilioCode: null, twilioMessage: err.message, diagnostics: { accountSidPrefix: config.twilioAccountSid?.slice(0, 2) || '', accountSidLength: config.twilioAccountSid?.length || 0, authCredentialLength: config.twilioApiKeySecret?.length || config.twilioAuthToken?.length || 0, authCredentialType: config.twilioApiKeySid ? 'api_key' : 'auth_token', fromNumberPrefix: config.twilioFromNumber?.slice(0, 2) || '', fromNumberLength: config.twilioFromNumber?.length || 0, fromNumberType: config.twilioFromNumber?.startsWith('MG') ? 'messaging_service' : 'phone_number', hasWhitespaceOrQuotes: config.hasWhitespaceOrQuotes } }; }
  const { accountSid, authHeader, authType, credentialLength, fromNumber } = credentials; const diagnostics = { accountSidPrefix: accountSid.slice(0, 2), accountSidLength: accountSid.length, authCredentialLength: credentialLength, authCredentialType: authType, fromNumberPrefix: fromNumber.slice(0, 2), fromNumberLength: fromNumber.length, fromNumberType: fromNumber.startsWith('MG') ? 'messaging_service' : 'phone_number', hasWhitespaceOrQuotes: config.hasWhitespaceOrQuotes };
  const controller = new AbortController(), timeoutId = setTimeout(() => controller.abort(), 6000);
  try { const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`, { method: 'GET', headers: { Authorization: authHeader, Accept: 'application/json' }, signal: controller.signal }); clearTimeout(timeoutId); const text = await res.text(); let data = {}; try { data = JSON.parse(text); } catch {} if (res.ok) return { authOk: true, httpStatus: res.status, twilioCode: null, twilioMessage: 'Twilio authentication successful', diagnostics: { ...diagnostics, senderSmsCapable: true } }; return { authOk: false, httpStatus: res.status, twilioCode: data?.code || null, twilioMessage: data?.message || 'Twilio authentication failed', diagnostics }; } catch (err) { clearTimeout(timeoutId); return { authOk: false, httpStatus: err.name === 'AbortError' ? 504 : 500, twilioCode: err.name === 'AbortError' ? 'SMS_GATEWAY_TIMEOUT' : 'AUTH_CHECK_FAILED', twilioMessage: err.message || 'Twilio authentication check failed', diagnostics }; }
}

export function mapTwilioErrorToSafeMessage(code, status, rawMsg, diagnostics) {
  if (code === 20003 || status === 401) { const hint = diagnostics?.accountSidPrefix && diagnostics.accountSidPrefix !== 'AC' ? ` TWILIO_ACCOUNT_SID starts with '${diagnostics.accountSidPrefix}' (expected 'AC').` : diagnostics?.accountSidLength && diagnostics.accountSidLength !== 34 ? ` TWILIO_ACCOUNT_SID length is ${diagnostics.accountSidLength} (expected 34).` : diagnostics?.authCredentialType === 'auth_token' && diagnostics.authCredentialLength !== 32 ? ` TWILIO_AUTH_TOKEN length is ${diagnostics.authCredentialLength} (expected 32).` : rawMsg ? ` Detail: ${rawMsg}.` : ''; return `Twilio authentication failed (20003). Check the production Twilio credentials.${hint}`; }
  if ([21212, 21606, 21659, 21660].includes(code)) return 'Twilio sender is invalid or not SMS-enabled.';
  if (code === 21408 || code === 21614) return 'SMS delivery to this destination is not permitted.';
  if (code === 21608 || code === 572002 || rawMsg?.toLowerCase().includes('verified recipient')) return 'This number must be verified in the Twilio trial account.';
  if (code === 21211) return 'The mobile number is not valid or cannot receive SMS.';
  if (code === 20429) return 'Too many requests to SMS service. Please wait a few moments and try again.';
  if (code >= 30000 && code <= 30010) return 'Carrier network error delivering SMS. Please try again.';
  return rawMsg ? `Twilio SMS error (${code || status}): ${rawMsg.slice(0, 150)}` : `Twilio SMS error (${code || status || 'unknown'}). Please try again.`;
}

export function normalizePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') throw new Error('Enter a valid mobile number with country code, e.g. +917028554230');
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = '+91' + cleaned.slice(1); else if (/^\d{10}$/.test(cleaned)) cleaned = '+91' + cleaned; else if (/^91\d{10}$/.test(cleaned)) cleaned = '+' + cleaned; else if (/^\d{11,15}$/.test(cleaned)) cleaned = '+' + cleaned;
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) throw new Error('Enter a valid mobile number with country code, e.g. +917028554230');
  return cleaned;
}

export function checkRateLimit(phone) { const lastRequest = rateLimitMap.get(phone), now = Date.now(); if (lastRequest) { const elapsedSeconds = Math.floor((now - lastRequest) / 1000); if (elapsedSeconds < COOLDOWN_SECONDS) return { allowed: false, waitSeconds: COOLDOWN_SECONDS - elapsedSeconds, error: `Please wait ${COOLDOWN_SECONDS - elapsedSeconds} seconds before requesting another OTP.` }; } rateLimitMap.set(phone, now); return { allowed: true }; }
export function generateSecureOtp() { return String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }

export function createOtpChallenge(phone, customOtp = null, customSecret = null) { const secret = customSecret || getEnvConfig().phoneAuthSecret; if (!secret) throw new Error('PHONE_AUTH_SECRET environment variable is missing.'); const otp = customOtp || generateSecureOtp(); const expiresAt = Date.now() + 10 * 60 * 1000; const salt = crypto.randomBytes(16).toString('hex'); const otpHash = crypto.createHmac('sha256', secret).update(`otp:${phone}|${otp}|${salt}|${expiresAt}`).digest('hex'); const sig = crypto.createHmac('sha256', secret).update(`sig:${phone}|${expiresAt}|${salt}|${otpHash}`).digest('hex'); return { otp, token: Buffer.from(JSON.stringify({ phone, expiresAt, salt, otpHash, sig })).toString('base64url') }; }

export function verifyOtpChallenge(phone, enteredOtp, token, customSecret = null) { if (!token) return false; let payload; try { payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')); } catch { return false; } const { phone: challengePhone, expiresAt, salt, otpHash, sig } = payload; if (!challengePhone || !expiresAt || !salt || !otpHash || !sig || phone !== challengePhone || Date.now() > expiresAt) return false; const secret = customSecret || getEnvConfig().phoneAuthSecret; if (!secret) return false; const expectedSig = crypto.createHmac('sha256', secret).update(`sig:${phone}|${expiresAt}|${salt}|${otpHash}`).digest('hex'); if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return false; const expectedOtpHash = crypto.createHmac('sha256', secret).update(`otp:${phone}|${String(enteredOtp).trim()}|${salt}|${expiresAt}`).digest('hex'); return otpHash.length === expectedOtpHash.length && crypto.timingSafeEqual(Buffer.from(otpHash), Buffer.from(expectedOtpHash)); }

export async function sendSmsOtp(phone, otp) { const authTest = await checkTwilioAuthentication(); if (!authTest.authOk) { const e = new Error(mapTwilioErrorToSafeMessage(authTest.twilioCode, authTest.httpStatus, authTest.twilioMessage, authTest.diagnostics)); e.code = authTest.twilioCode ? `TWILIO_${authTest.twilioCode}` : 'TWILIO_20003'; e.statusCode = authTest.httpStatus >= 500 ? 502 : 400; throw e; } const { accountSid, authHeader, fromNumber } = getTwilioAuthCredentials(); const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`; const body = new URLSearchParams({ To: phone, Body: `Your SkillBarter verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`, ...(fromNumber.startsWith('MG') ? { MessagingServiceSid: fromNumber } : { From: fromNumber }) }); const controller = new AbortController(), timeoutId = setTimeout(() => controller.abort(), 8000); try { const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: body.toString(), signal: controller.signal }); clearTimeout(timeoutId); const text = await response.text(); let data = {}; try { data = JSON.parse(text); } catch {} if (!response.ok) { const e = new Error(mapTwilioErrorToSafeMessage(data?.code, response.status, data?.message || '', authTest.diagnostics)); e.code = data?.code ? `TWILIO_${data.code}` : 'TWILIO_ERROR'; e.statusCode = response.status >= 500 ? 502 : 400; throw e; } return { sid: data?.sid, status: data?.status || 'queued' }; } catch (err) { clearTimeout(timeoutId); if (err.name === 'AbortError') { const e = new Error('Twilio SMS service timed out. Please try again.'); e.code = 'SMS_GATEWAY_TIMEOUT'; e.statusCode = 504; throw e; } throw err; } }

export async function createOrSignInPhoneUser(phone) {
  const config = getEnvConfig(); const { insforgeUrl, insforgeAnonKey, phoneAuthSecret } = config;
  if (!phoneAuthSecret) throw new Error('PHONE_AUTH_SECRET environment variable is missing.');
  if (!insforgeUrl || !insforgeAnonKey) throw new Error('INSFORGE_URL or INSFORGE_ANON_KEY environment variable is missing.');
  const insforgeClient = createClient({ baseUrl: insforgeUrl, anonKey: insforgeAnonKey });
  const phoneDigits = phone.replace(/[^\d]/g, ''), phoneEmail = `${phoneDigits}@phone.skillbarter.local`;
  const derivedPassword = crypto.createHmac('sha256', phoneAuthSecret).update(`skillbarter:phone:pwd:${phone}`).digest('hex') + 'Aa1!';
  let accessToken = null, authUser = null;

  const { data: signInData, error: signInError } = await insforgeClient.auth.signInWithPassword({ email: phoneEmail, password: derivedPassword });
  if (!signInError && signInData?.accessToken) { accessToken = signInData.accessToken; authUser = signInData.user; }
  else {
    const { data: signUpData, error: signUpError } = await insforgeClient.auth.signUp({ email: phoneEmail, password: derivedPassword, name: 'SkillBarter Member' });
    const alreadyExists = Boolean(signUpError?.message) && /already\s*(registered|exists)|user\s*already\s*exists|email.*already.*(registered|exists)/i.test(signUpError.message);
    if (signUpError && !alreadyExists) { console.error('[InsForge Auth Error]', signUpError.message); throw new Error(signUpError.message || 'Failed to authenticate phone user'); }
    accessToken = signUpData?.accessToken || null; authUser = signUpData?.user || null;
    if (!accessToken) {
      const retrySignIn = await insforgeClient.auth.signInWithPassword({ email: phoneEmail, password: derivedPassword });
      if (retrySignIn.error) throw new Error(retrySignIn.error.message || 'Unable to sign in existing phone user');
      accessToken = retrySignIn.data?.accessToken || null; authUser = retrySignIn.data?.user || null;
    }
  }

  const { data: existingProfile } = await insforgeClient.database.from('users').select('*').ilike('email', phoneEmail).maybeSingle();
  let userProfile = existingProfile;
  if (!userProfile) {
    const newUser = { email: phoneEmail, password_hash: 'insforge-managed', full_name: 'SkillBarter Member', address_display: 'Local Neighborhood', latitude: 17.4485, longitude: 78.3748, primary_intent: 'EXCHANGE', trust_score: 85, reliability_score: 90, response_rate: 95, skill_quality_score: 90, completed_exchanges_count: 0, reviews_count: 0, badges: ['Verified Member', 'Mobile Verified'], is_active: true, is_admin: false, onboarding_completed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data: inserted, error: insertError } = await insforgeClient.database.from('users').insert([newUser]).select().single();
    if (!insertError && inserted) userProfile = inserted; else { const { data: recheck } = await insforgeClient.database.from('users').select('*').ilike('email', phoneEmail).maybeSingle(); userProfile = recheck || { id: 0, email: phoneEmail, full_name: 'SkillBarter Member' }; }
  }
  return { accessToken: accessToken || 'phone_session_verified', user: { id: userProfile.id, email: userProfile.email, full_name: userProfile.full_name, phone, trust_score: userProfile.trust_score ?? 85, reliability_score: userProfile.reliability_score ?? 90, response_rate: userProfile.response_rate ?? 95, skill_quality_score: userProfile.skill_quality_score ?? 90, completed_exchanges_count: userProfile.completed_exchanges_count ?? 0, reviews_count: userProfile.reviews_count ?? 0, badges: userProfile.badges ?? ['Verified Member', 'Mobile Verified'], is_active: userProfile.is_active !== false, is_admin: userProfile.is_admin === true, onboarding_completed: userProfile.onboarding_completed ?? false, primary_intent: userProfile.primary_intent ?? 'EXCHANGE' } };
}
