import { insforge } from '../lib/insforge';

export interface PhoneAuthUser {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  trust_score: number;
  reliability_score: number;
  response_rate: number;
  skill_quality_score: number;
  completed_exchanges_count: number;
  reviews_count: number;
  badges: string[];
  is_active: boolean;
  is_admin: boolean;
  onboarding_completed: boolean;
  primary_intent: string;
  skills: any[];
}

const normalizePhone = (phone: string) => {
  const trimmed = phone.trim();
  if (!trimmed) throw new Error('Mobile number is required');
  const normalized = trimmed.replace(/[\s()-]/g, '');
  if (!/^\+?[1-9]\d{9,14}$/.test(normalized)) throw new Error('Enter a valid mobile number with country code, e.g. +917050062084');
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
};

const phoneIdentity = (phone: string) => `${phone.replace(/\D/g, '')}@phone.skillbarter.local`;
const phonePassword = (phone: string) => {
  let hash = 2166136261;
  for (const char of phone) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `SB${(hash >>> 0).toString(16)}${phone.replace(/\D/g, '')}Aa9!`;
};

async function syncPhoneUser(authUser: any, phone: string, profile: any = {}) {
  const email = authUser?.email;
  if (!email) throw new Error('Phone login session has no account email');
  const existing = await insforge.database.from('users').select('*').eq('email', email).maybeSingle();
  if (existing.error) throw new Error(existing.error.message || 'Unable to load application profile');
  if (existing.data) return existing.data;
  const { data, error } = await insforge.database.from('users').insert({
    email,
    password_hash: 'insforge-managed',
    full_name: profile.full_name ?? authUser?.name ?? 'SkillBarter Member',
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    primary_intent: profile.primary_intent ?? 'EXCHANGE',
    onboarding_completed: false,
    is_active: true,
  }).select('*').single();
  if (error) throw new Error(error.message || 'Unable to create application profile');
  return data;
}

function toLegacyUser(authUser: any, appUser: any): PhoneAuthUser {
  const metadata = authUser?.profile ?? authUser?.metadata ?? {};
  return {
    id: Number(appUser?.id) || 0,
    email: authUser?.email ?? '',
    full_name: appUser?.full_name ?? authUser?.name ?? metadata.full_name ?? 'SkillBarter Member',
    avatar_url: appUser?.avatar_url ?? metadata.avatar_url,
    bio: appUser?.bio ?? metadata.bio,
    trust_score: Number(appUser?.trust_score ?? 85),
    reliability_score: Number(appUser?.reliability_score ?? 90),
    response_rate: Number(appUser?.response_rate ?? 95),
    skill_quality_score: Number(appUser?.skill_quality_score ?? 90),
    completed_exchanges_count: Number(appUser?.completed_exchanges_count ?? 0),
    reviews_count: Number(appUser?.reviews_count ?? 0),
    badges: Array.isArray(appUser?.badges) ? appUser.badges : ['Verified Member'],
    is_active: appUser?.is_active !== false,
    is_admin: appUser?.is_admin === true,
    onboarding_completed: appUser?.onboarding_completed !== false && metadata.onboarding_completed !== false,
    primary_intent: appUser?.primary_intent ?? metadata.primary_intent ?? 'EXCHANGE',
    skills: [],
  };
}

export async function requestPhoneOtp(phoneInput: string) {
  const phone = normalizePhone(phoneInput);
  const otp = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  sessionStorage.setItem('skillbarter_otp_phone', phone);
  sessionStorage.setItem('skillbarter_demo_otp', otp);
  sessionStorage.setItem('skillbarter_otp_expires', String(Date.now() + 10 * 60 * 1000));
  return phone;
}

export async function verifyPhoneOtp(phoneInput: string, otp: string) {
  const phone = normalizePhone(phoneInput);
  const code = otp.trim();
  const savedPhone = sessionStorage.getItem('skillbarter_otp_phone');
  const savedOtp = sessionStorage.getItem('skillbarter_demo_otp');
  const expires = Number(sessionStorage.getItem('skillbarter_otp_expires') || 0);
  if (savedPhone !== phone || !savedOtp || Date.now() > expires) throw new Error('OTP expired. Request a new OTP.');
  if (savedOtp !== code) throw new Error('Invalid OTP. Please check the code and try again.');

  const email = phoneIdentity(phone);
  const password = phonePassword(phone);
  let authData: any = null;

  const signedIn = await insforge.auth.signInWithPassword({ email, password });
  if (!signedIn.error && signedIn.data?.user) {
    authData = signedIn.data;
  } else {
    const created = await insforge.auth.signUp({ email, password, name: 'SkillBarter Member' });
    if (created.error) throw new Error(created.error.message || 'Unable to create mobile account');
    if (!created.data?.user) throw new Error('Mobile account creation failed');
    authData = created.data;
  }

  if (!authData?.user) throw new Error('Mobile login succeeded but no user was returned');
  if (authData.accessToken) {
    insforge.setAccessToken(authData.accessToken);
    localStorage.setItem('skillbarter_token', authData.accessToken);
  }
  localStorage.setItem('skillbarter_phone', phone);
  sessionStorage.removeItem('skillbarter_otp_phone');
  sessionStorage.removeItem('skillbarter_demo_otp');
  sessionStorage.removeItem('skillbarter_otp_expires');
  const appUser = await syncPhoneUser(authData.user, phone, authData.user?.profile ?? {});
  return toLegacyUser(authData.user, appUser);
}

export async function getCurrentPhoneUser() {
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error || !data?.user) return null;
  const phone = localStorage.getItem('skillbarter_phone');
  if (!phone) return null;
  const appUser = await syncPhoneUser(data.user, phone, data.user?.profile ?? {});
  return toLegacyUser(data.user, appUser);
}

export function clearPhoneSession() {
  localStorage.removeItem('skillbarter_phone');
  sessionStorage.removeItem('skillbarter_otp_phone');
  sessionStorage.removeItem('skillbarter_demo_otp');
  sessionStorage.removeItem('skillbarter_otp_expires');
}
