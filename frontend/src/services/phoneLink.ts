import { requestPhoneOtp, normalizePhone } from './phoneAuth';

export async function linkPhoneToAccount(phoneInput: string, otpInput: string): Promise<string> {
  const phone = normalizePhone(phoneInput);
  const otp = String(otpInput ?? '').trim();
  if (!/^\d{6}$/.test(otp)) throw new Error('Please enter a valid 6-digit numeric OTP code.');

  const challenge = localStorage.getItem('skillbarter_otp_challenge');
  if (!challenge) throw new Error('Verification challenge expired or missing. Please request a new OTP.');
  const token = localStorage.getItem('skillbarter_token');
  if (!token) throw new Error('Please log in before linking a mobile number.');

  const response = await fetch('/api/auth/phone/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ phone, otp, challenge }),
  });

  let data: any = {};
  try { data = await response.json(); } catch {}
  if (!response.ok || !data.success) {
    const rawError = data?.error;
    const message =
      (typeof rawError === 'string' && rawError) ||
      (typeof rawError?.message === 'string' && rawError.message) ||
      (typeof rawError?.error === 'string' && rawError.error) ||
      ('Unable to link mobile number (' + response.status + ')');
    const error: any = new Error(message);
    error.code = data?.code;
    error.status = response.status;
    throw error;
  }

  localStorage.removeItem('skillbarter_otp_phone');
  localStorage.removeItem('skillbarter_otp_challenge');
  localStorage.removeItem('skillbarter_otp_sent_at');
  localStorage.removeItem('skillbarter_demo_otp');
  localStorage.removeItem('skillbarter_otp_expires');
  return data.phone || phone;
}

export { requestPhoneOtp };

