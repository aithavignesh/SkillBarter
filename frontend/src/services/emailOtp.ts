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
  sessionStorage.removeItem('skillbarter_email_otp');
}
