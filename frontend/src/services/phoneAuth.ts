import { insforge } from '../lib/insforge';

export interface PhoneAuthUser {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
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

export const normalizePhone = (phone: string) => {
  const trimmed = String(phone ?? '').trim();
  if (!trimmed) throw new Error('Mobile number is required');
  let cleaned = trimmed.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+91' + cleaned.slice(1);
  } else if (/^\d{10}$/.test(cleaned)) {
    cleaned = '+91' + cleaned;
  } else if (/^91\d{10}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  } else if (/^\d{11,15}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    throw new Error('Enter a valid mobile number with country code, e.g. +917028554230');
  }

  return cleaned;
};

/**
 * Request real SMS OTP via Vercel serverless API (/api/auth/phone/request)
 * The OTP is generated server-side and sent directly via Twilio to the user's phone.
 */
export async function requestPhoneOtp(phoneInput: string): Promise<string> {
  const phone = normalizePhone(phoneInput);

  let response: Response;
  try {
    response = await fetch('/api/auth/phone/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });
  } catch {
    throw new Error('Network error: Unable to reach the OTP service. Please check your connection.');
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    throw new Error(
      response.status === 504
        ? 'SMS request timed out (504). Please try again.'
        : `Phone authentication request failed (${response.status})`
    );
  }

  if (!response.ok || !data.success) {
    const errorMsg = data.error || `Unable to send OTP via SMS (${response.status})`;
    const error = new Error(errorMsg) as any;
    error.code = data.code;
    error.waitSeconds = data.waitSeconds;
    error.details = data.details;
    throw error;
  }

  // Persist the cryptographic challenge token (does NOT contain the plaintext OTP)
  sessionStorage.setItem('skillbarter_otp_phone', data.phone || phone);
  sessionStorage.setItem('skillbarter_otp_challenge', data.challenge);
  sessionStorage.setItem('skillbarter_otp_sent_at', String(Date.now()));

  // Remove any legacy demo OTP keys
  sessionStorage.removeItem('skillbarter_demo_otp');
  sessionStorage.removeItem('skillbarter_otp_expires');

  return data.phone || phone;
}

/**
 * Verify received OTP against the server challenge via /api/auth/phone/verify
 */
export async function verifyPhoneOtp(phoneInput: string, otpInput: string): Promise<PhoneAuthUser> {
  const phone = normalizePhone(phoneInput);
  const otp = String(otpInput ?? '').trim();

  if (!/^\d{6}$/.test(otp)) {
    throw new Error('Please enter a valid 6-digit numeric OTP code.');
  }

  const challenge = sessionStorage.getItem('skillbarter_otp_challenge');
  if (!challenge) {
    throw new Error('Verification challenge expired or missing. Please request a new OTP.');
  }

  let response: Response;
  try {
    response = await fetch('/api/auth/phone/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        phone,
        otp,
        challenge,
      }),
    });
  } catch {
    throw new Error('Network error: Unable to reach the verification service. Please check your connection.');
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    throw new Error(
      response.status === 504
        ? 'Verification service timed out (504). Please try again.'
        : `OTP verification request failed (${response.status})`
    );
  }

  if (!response.ok || !data.success) {
    const errorMsg = data.error || `Verification failed (${response.status})`;
    const error = new Error(errorMsg) as any;
    error.code = data.code;
    throw error;
  }

  const token = data.accessToken || data.token;
  if (token) {
    insforge.setAccessToken(token);
    localStorage.setItem('skillbarter_token', token);
  }

  const user = data.user;
  if (user?.id) {
    localStorage.setItem('skillbarter_user_id', String(user.id));
  }
  localStorage.setItem('skillbarter_phone', phone);

  // Clear challenge from session storage
  sessionStorage.removeItem('skillbarter_otp_phone');
  sessionStorage.removeItem('skillbarter_otp_challenge');
  sessionStorage.removeItem('skillbarter_otp_sent_at');
  sessionStorage.removeItem('skillbarter_demo_otp');
  sessionStorage.removeItem('skillbarter_otp_expires');

  return {
    id: Number(user?.id) || 0,
    email: user?.email || '',
    full_name: user?.full_name || 'SkillBarter Member',
    phone,
    avatar_url: user?.avatar_url,
    bio: user?.bio,
    trust_score: Number(user?.trust_score ?? 85),
    reliability_score: Number(user?.reliability_score ?? 90),
    response_rate: Number(user?.response_rate ?? 95),
    skill_quality_score: Number(user?.skill_quality_score ?? 90),
    completed_exchanges_count: Number(user?.completed_exchanges_count ?? 0),
    reviews_count: Number(user?.reviews_count ?? 0),
    badges: Array.isArray(user?.badges) ? user.badges : ['Verified Member', 'Mobile Verified'],
    is_active: user?.is_active !== false,
    is_admin: user?.is_admin === true,
    onboarding_completed: user?.onboarding_completed ?? false,
    primary_intent: user?.primary_intent ?? 'EXCHANGE',
    skills: [],
  };
}

export async function getCurrentPhoneUser(): Promise<PhoneAuthUser | null> {
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error || !data?.user) return null;
  const phone = localStorage.getItem('skillbarter_phone');
  if (!phone) return null;

  const userId = localStorage.getItem('skillbarter_user_id');
  let appUser: any = null;
  if (userId) {
    const { data: dbUser } = await insforge.database
      .from('users')
      .select('*')
      .eq('id', parseInt(userId, 10))
      .maybeSingle();
    appUser = dbUser;
  }

  return {
    id: Number(appUser?.id || data.user.id || 0),
    email: data.user.email || '',
    full_name: appUser?.full_name || data.user.name || 'SkillBarter Member',
    phone,
    avatar_url: appUser?.avatar_url,
    bio: appUser?.bio,
    trust_score: Number(appUser?.trust_score ?? 85),
    reliability_score: Number(appUser?.reliability_score ?? 90),
    response_rate: Number(appUser?.response_rate ?? 95),
    skill_quality_score: Number(appUser?.skill_quality_score ?? 90),
    completed_exchanges_count: Number(appUser?.completed_exchanges_count ?? 0),
    reviews_count: Number(appUser?.reviews_count ?? 0),
    badges: Array.isArray(appUser?.badges) ? appUser.badges : ['Verified Member', 'Mobile Verified'],
    is_active: appUser?.is_active !== false,
    is_admin: appUser?.is_admin === true,
    onboarding_completed: appUser?.onboarding_completed ?? false,
    primary_intent: appUser?.primary_intent ?? 'EXCHANGE',
    skills: [],
  };
}

export function clearPhoneSession() {
  localStorage.removeItem('skillbarter_phone');
  sessionStorage.removeItem('skillbarter_otp_phone');
  sessionStorage.removeItem('skillbarter_otp_challenge');
  sessionStorage.removeItem('skillbarter_otp_sent_at');
  sessionStorage.removeItem('skillbarter_demo_otp');
  sessionStorage.removeItem('skillbarter_otp_expires');
}
