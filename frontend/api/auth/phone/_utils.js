import crypto from 'node:crypto';

const rateLimitMap = new Map();
const COOLDOWN_SECONDS = 30;

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
  if (last) { const elapsed = Math.floor((now-last)/1000); if (elapsed < COOLDOWN_SECONDS) return { allowed:false, waitSeconds:COOLDOWN_SECONDS-elapsed, error:`Please wait ${COOLDOWN_SECONDS-elapsed} seconds before requesting another OTP.` }; }
  rateLimitMap.set(phone, now); return { allowed:true };
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
  const {phone: cp, expiresAt, salt, otpHash, sig}=p; if (!cp||!expiresAt||!salt||!otpHash||!sig||cp!==phone||Date.now()>expiresAt) return false;
  const secret=customSecret||getEnvConfig().phoneAuthSecret; if(!secret) return false;
  const es=crypto.createHmac('sha256',secret).update(`sig:${phone}|${expiresAt}|${salt}|${otpHash}`).digest('hex');
  if(sig.length!==es.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(es))) return false;
  const eh=crypto.createHmac('sha256',secret).update(`otp:${phone}|${String(enteredOtp).trim()}|${salt}|${expiresAt}`).digest('hex');
  return otpHash.length===eh.length&&crypto.timingSafeEqual(Buffer.from(otpHash),Buffer.from(eh));
}

function invalidCredentials(error) { const s=Number(error?.statusCode??error?.status??0), c=String(error?.error??error?.code??'').toUpperCase(), m=String(error?.message??'').toLowerCase(); return s===401||c==='INVALID_CREDENTIALS'||m.includes('invalid login credentials'); }

async function dbRequest(baseUrl, anonKey, method, query='', body) {
  const url=`${baseUrl.replace(/\/+$/,'')}/api/database/records/users${query}`;
  const r=await fetch(url,{method,headers:{Authorization:`Bearer ${anonKey}`,'Content-Type':'application/json',Accept:'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text(); let data=null; try{data=text?JSON.parse(text):null;}catch{}
  if(!r.ok) throw new Error(data?.message||data?.error||text||`InsForge database request failed (${r.status})`);
  return data;
}

async function authSession(client,email,password) {
  const signIn=await client.auth.signInWithPassword({email,password});
  if(!signIn.error&&signIn.data?.accessToken) return signIn.data;
  if(signIn.error&&!invalidCredentials(signIn.error)) throw new Error(signIn.error.message||'Unable to authenticate phone user');
  const signUp=await client.auth.signUp({email,password,name:'SkillBarter Member'});
  const exists=/already\s*(registered|exists)|email.*already.*(registered|exists)/i.test(signUp.error?.message||'');
  if(signUp.error&&!exists) throw new Error(signUp.error.message||'Unable to create phone authentication account');
  if(signUp.data?.accessToken) return signUp.data;
  const retry=await client.auth.signInWithPassword({email,password});
  if(retry.error||!retry.data?.accessToken) throw new Error(retry.error?.message||'Unable to sign in phone authentication account');
  return retry.data;
}

export async function createOrSignInPhoneUser(phone) {
  const {insforgeUrl,insforgeAnonKey,phoneAuthSecret}=getEnvConfig();
  if(!phoneAuthSecret) throw new Error('PHONE_AUTH_SECRET environment variable is missing.');
  if(!insforgeUrl||!insforgeAnonKey) throw new Error('INSFORGE_URL or INSFORGE_ANON_KEY environment variable is missing.');
  const {createClient}=await import('@insforge/sdk');
  const client=createClient({baseUrl:insforgeUrl,anonKey:insforgeAnonKey});
  const digits=phone.replace(/[^\d]/g,''), email=`${digits}@phone.skillbarter.com`;
  const password=crypto.createHmac('sha256',phoneAuthSecret).update(`skillbarter:phone:pwd:${phone}`).digest('hex')+'Aa1!';
  const session=await authSession(client,email,password);
  let rows=await dbRequest(insforgeUrl,insforgeAnonKey,'GET',`?email=eq.${encodeURIComponent(email)}&limit=1`);
  let profile=Array.isArray(rows)?rows[0]:rows;
  if(!profile){
    const legacy=`${digits}@phone.skillbarter.local`;
    const legacyRows=await dbRequest(insforgeUrl,insforgeAnonKey,'GET',`?email=eq.${encodeURIComponent(legacy)}&limit=1`);
    const old=Array.isArray(legacyRows)?legacyRows[0]:legacyRows;
    if(old){ const updated=await dbRequest(insforgeUrl,insforgeAnonKey,'PATCH',`?id=eq.${encodeURIComponent(old.id)}`,{email,updated_at:new Date().toISOString()}); profile=Array.isArray(updated)?updated[0]:updated; }
  }
  if(!profile){
    const now=new Date().toISOString();
    const newUser={email,password_hash:'insforge-managed',full_name:'SkillBarter Member',address_display:'Local Neighborhood',latitude:17.4485,longitude:78.3748,primary_intent:'EXCHANGE',trust_score:85,reliability_score:90,response_rate:95,skill_quality_score:90,completed_exchanges_count:0,reviews_count:0,badges:['Verified Member','Mobile Verified'],is_active:true,is_admin:false,onboarding_completed:false,created_at:now,updated_at:now};
    const created=await dbRequest(insforgeUrl,insforgeAnonKey,'POST','', [newUser]); profile=Array.isArray(created)?created[0]:created;
  }
  if(!profile) throw new Error('InsForge created the authentication session but returned no SkillBarter profile.');
  return {accessToken:session.accessToken,user:{id:profile.id,email:profile.email,full_name:profile.full_name,phone,trust_score:profile.trust_score??85,reliability_score:profile.reliability_score??90,response_rate:profile.response_rate??95,skill_quality_score:profile.skill_quality_score??90,completed_exchanges_count:profile.completed_exchanges_count??0,reviews_count:profile.reviews_count??0,badges:profile.badges??['Verified Member','Mobile Verified'],is_active:profile.is_active!==false,is_admin:profile.is_admin===true,onboarding_completed:profile.onboarding_completed??false,primary_intent:profile.primary_intent??'EXCHANGE'},authUser:session.user};
}
