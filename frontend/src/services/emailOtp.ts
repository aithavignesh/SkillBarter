import { insforge } from '../lib/insforge';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

export async function requestEmailOtp(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');

  // Account existence is checked server-side. This avoids the browser-side
  // InsForge database lookup that was returning 400 and keeps unknown emails
  // from reaching InsForge's passwordless user-creation OTP flow.
  const response = await fetch('/api/auth/email/request-otp', {
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

  const response = await fetch('/api/auth/email/verify-otp', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, otp }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.accessToken) {
    throw new Error(data?.message || data?.error || 'Invalid or expired email OTP.');
  }

  insforge.setAccessToken(data.accessToken);
  sessionStorage.setItem('skillbarter_token', data.accessToken);
  // Email OTP sessions return an access token but no browser refresh cookie.
  // Mark this session so the app restores it through the access-token path
  // instead of calling InsForge /auth/refresh.
  sessionStorage.setItem('skillbarter_email_session', '1');
  sessionStorage.setItem('skillbarter_email', email);
  if (data.profile) sessionStorage.setItem('skillbarter_email_profile', JSON.stringify(data.profile));
  sessionStorage.removeItem('skillbarter_email_otp');
  return data.profile;
}
