import React, { useEffect, useState } from 'react';
import { Link2, CheckCircle2, Loader2, Phone } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { linkPhoneToAccount, requestPhoneOtp } from '../services/phoneLink';

interface Props {
  linkedPhone?: string | null;
  onLinked?: (phone: string) => void;
}

export const MobilePhoneLinkCard: React.FC<Props> = ({ linkedPhone, onLinked }) => {
  const [phone, setPhone] = useState(linkedPhone || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [linked, setLinked] = useState(Boolean(linkedPhone));

  useEffect(() => {
    if (linked || linkedPhone) {
      setLinked(true);
      return;
    }
    const token = sessionStorage.getItem('skillbarter_token');
    if (!token) return;
    fetch('/api/auth/phone/link', {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.linked) {
          setPhone(data.phone || '');
          setLinked(true);
        }
      })
      .catch(() => {});
  }, [linkedPhone]);

  const sendOtp = async () => {
    try {
      setBusy(true);
      setError('');
      setMessage('');
      await requestPhoneOtp(phone);
      setOtpSent(true);
      setMessage('OTP sent by SMS. Enter it below to link this number.');
    } catch (e: any) {
      setError(e?.message || 'Unable to send mobile OTP.');
    } finally {
      setBusy(false);
    }
  };

  const verifyAndLink = async () => {
    try {
      setBusy(true);
      setError('');
      setMessage('');
      const normalized = await linkPhoneToAccount(phone, otp);
      setPhone(normalized);
      setLinked(true);
      setOtp('');
      setOtpSent(false);
      setMessage('Mobile number linked successfully. You can now log in with Mobile OTP.');
      onLinked?.(normalized);
    } catch (e: any) {
      setError(e?.message || 'Unable to link mobile number.');
    } finally {
      setBusy(false);
    }
  };

  if (linked || linkedPhone) {
    return (
      <Card className="p-5 border-emerald-200 bg-emerald-50/40">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Mobile number linked</h3>
            <p className="mt-1 text-xs text-slate-600">{linkedPhone}</p>
            <p className="mt-2 text-xs text-emerald-700">You can use Mobile OTP to sign in to this account.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-200 bg-slate-50 text-slate-700">
          <Link2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">Link mobile number</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Verify your mobile number once. After verification, you can use Mobile OTP as another login method.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 7702855423"
                disabled={otpSent || busy}
                className="w-full border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-slate-500 disabled:bg-slate-50"
              />
            </div>
            {!otpSent ? (
              <Button type="button" size="sm" onClick={sendOtp} disabled={busy || !phone.trim()} loading={busy}>
                Send OTP
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={sendOtp} disabled={busy}>
                Resend OTP
              </Button>
            )}
          </div>

          {otpSent && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit OTP"
                className="min-w-0 flex-1 border border-slate-300 bg-white px-3 py-2.5 text-xs tracking-[0.2em] outline-none focus:border-slate-500"
              />
              <Button type="button" size="sm" onClick={verifyAndLink} disabled={busy || otp.length !== 6} loading={busy}>
                Verify & Link
              </Button>
            </div>
          )}

          {message && <p className="mt-3 text-xs font-semibold text-emerald-700">{message}</p>}
          {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </div>
    </Card>
  );
};
