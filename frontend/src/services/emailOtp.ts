import { insforge } from '../lib/insforge';

const getBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_INSFORGE_URL?.replace(/\/+$/, '');
  if (!baseUrl) throw new Error('InsForge is not configured for this deployment.');
  return baseUrl;
};

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

export async function requestEmailOtp(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');

  // SkillBarter requires new users to complete the full signup flow first.
  // InsForge Email OTP can create a passwordless user for an unknown email,
  // so guard this login-only path with the existing SkillBarter profile.
  // Use a bounded list instead of maybeSingle(). The InsForge database
  // endpoint can return 400 for single-row negotiation on this public lookup.
  // We only need to know whether at least one SkillBarter profile exists.
  const { data: profiles, error: profileError } = await insforge.database
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1);
  if (profileError) throw new Error('Unable to verify your SkillBarter account. Please try again.');
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error('No SkillBarter account exists for this email. Please sign up first.');
  }
  const response = await fetch(`${getBaseUrl()}/api/auth/email/send-otp`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || 'Unable to send email OTP.');
  sessionStorage.setItem('skillbarter_email_otp', email);
}

export async function verifyEmailOtp(emailInput: string, otpInput: string) {
  const email = emailInput.trim().toLowerCase();
  const otp = otpInput.trim();
  if (!/^\d{6}$/.test(otp)) throw new Error('Enter the complete 6-digit email OTP.');

  const response = await fetch(`${getBaseUrl()}/api/auth/sessions?client_type=web`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({ method: 'otp', email, otp }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.accessToken) {
    throw new Error(data?.message || data?.error || 'Invalid or expired email OTP.');
  }

  insforge.setAccessToken(data.accessToken);
  sessionStorage.setItem('skillbarter_token', data.accessToken);
  // Email OTP sessions return an access token but no browser refresh cookie.
  // Mark this session so the app restores it through the access-token path
  // instead of calling InsForge /auth/refresh, which returns 403 for this flow.
  sessionStorage.setItem('skillbarter_email_session', '1');
  sessionStorage.setItem('skillbarter_email', email);
  sessionStorage.removeItem('skillbarter_email_otp');
}
