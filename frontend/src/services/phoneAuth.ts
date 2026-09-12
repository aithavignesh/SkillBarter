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
  if (!/^\+?[1-9]\d{9,14}$/.test(normalized)) {
    throw new Error('Enter a valid mobile number with country code, e.g. +917050062084');
  }
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
};

async function syncPhoneUser(authUser: any, phone: string, profile: any = {}) {
  const email = authUser?.email;
  if (!email) throw new Error('Phone login session has no account email');

  const existing = await insforge.database.from('users').select('*').eq('email', email).maybeSingle();
  if (existing.error) throw new Error(existing.error.message || 'Unable to load application profile');

  if (existing.data) {
    return existing.data;
  }

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
  const response = await fetch('/api/auth/phone/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Unable to send OTP');
  return phone;
}

export async function verifyPhoneOtp(phoneInput: string, otp: string) {
  const phone = normalizePhone(phoneInput);
  const code = otp.trim();
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit OTP');

  const response = await fetch('/api/auth/phone/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: code }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Invalid or expired OTP');
  if (!data?.user || !data?.accessToken) {
    throw new Error('OTP verified but no user session was returned');
  }

  // The server has already authenticated the user with InsForge. Push the
  // returned token into the browser SDK so database calls use the same session.
  insforge.setAccessToken(data.accessToken);
  localStorage.setItem('skillbarter_token', data.accessToken);
  localStorage.setItem('skillbarter_phone', phone);

  const appUser = await syncPhoneUser(data.user, phone, data.user?.profile ?? {});
  return toLegacyUser(data.user, appUser);
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
}
