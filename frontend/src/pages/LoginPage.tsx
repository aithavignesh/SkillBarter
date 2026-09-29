import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { trackEvent } from '../services/analytics';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Repeat, Lock, Mail, ArrowRight, ShieldCheck, RotateCcw, KeyRound, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailPasswordMode, setEmailPasswordMode] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  const { login, requestEmailOtp, verifyEmailOtp, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleEmailOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      if (!emailOtpSent) {
        await requestEmailOtp(email.trim());
        setEmailOtpSent(true);
        setCooldown(30);
        setSuccessMessage('Verification code sent to your email. Check your inbox.');
        return;
      }

      if (!/^\d{6}$/.test(emailOtp.trim())) {
        setError('Enter the complete 6-digit email OTP.');
        return;
      }

      await verifyEmailOtp(email.trim(), emailOtp.trim());
      trackEvent('login_completed', { method: 'email_otp' });
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Unable to verify email OTP.');
      if (err.waitSeconds) setCooldown(err.waitSeconds);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await login(email.trim(), password);
      trackEvent('login_completed', { method: 'email_password' });
      navigate('/feed');
    } catch (err: any) {
      const message = String(err.message || 'Invalid credentials');
      if (/compromised|breach|found in.*records|change.*password|password.*(leak|leaked|compromised)/i.test(message)) {
        setError('For your security, this password cannot be used. Use “Forgot password?” to create a new password.');
      } else {
        setError(message);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address first, then choose Forgot password.');
      return;
    }

    try {
      setResetSending(true);
      setError(null);
      await api.sendResetPasswordEmail(email);
      setSuccessMessage('Password reset instructions were sent to your email. Check your inbox and follow the link.');
    } catch (err: any) {
      setError(err.message || 'Unable to send password reset email.');
    } finally {
      setResetSending(false);
    }
  };

  return (
    <div className="login-page min-h-[85vh] bg-[#f7f7f5] px-5 pb-12 pt-36 sm:px-8 sm:pb-16 sm:pt-40">
      <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-16">
        <div className="login-intro lg:sticky lg:top-10">
          <Link to="/" className="login-brand inline-flex items-center gap-3" aria-label="SkillBarter home">
            <span className="flex h-10 w-10 items-center justify-center bg-[#17233b] text-white"><Repeat className="h-5 w-5" /></span>
            <span className="text-[18px] font-bold tracking-[-0.04em] text-[#17233b]">Skill<span className="text-[#d31d24]">Barter</span></span>
          </Link>
          <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d31d24]">Peer learning, one exchange at a time</p>
          <h1 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#17233b] sm:text-4xl">Welcome back to your learning network.</h1>
          <p className="mt-4 max-w-md text-[13px] leading-6 text-[#707884]">Sign in with a one-time email code, or continue with your email and password.</p>
          <div className="mt-8 border-l-2 border-[#d31d24] pl-4 text-[12px] leading-5 text-[#707884]">
            <p className="font-semibold text-[#17233b]">Secure, passwordless sign-in.</p>
            <p className="mt-1">Use the email address linked to your SkillBarter account and verify the one-time code we send you.</p>
          </div>
        </div>

        <div className="w-full max-w-xl lg:justify-self-end">
          <Card className="login-email-card p-5 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-[#edf0f2] pb-4">
              <span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#17233b]">OTP-first sign in</span>
                <span className="mt-1 block text-[12px] text-[#707884]">Email OTP is the primary login method</span>
              </span>
              <Mail className="h-5 w-5 text-[#d31d24]" />
            </div>

            {error && <div role="alert" className="login-error mb-5">{error}</div>}

            {successMessage && !error && (
              <div className="login-success mb-5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d31d24]" />
                <span>{successMessage}</span>
              </div>
            )}

            {emailOtpSent ? (
              <form onSubmit={handleEmailOtp} className="space-y-5">
                <div>
                  <label className="login-label" htmlFor="login-email-otp">6-Digit Email OTP</label>
                  <div className="relative mt-1.5">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                    <input
                      id="login-email-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="login-input w-full pl-9 pr-3 text-center font-mono text-lg tracking-[0.5em]"
                      required
                    />
                  </div>
                  <p className="login-help">Code sent to <span className="font-semibold text-[#17233b]">{email.trim()}</span>. It expires after 5 minutes.</p>
                </div>

                <Button type="submit" loading={loading} className="login-primary-button w-full" icon={<ArrowRight className="h-4 w-4" />}>
                  Verify Email OTP &amp; Sign In
                </Button>

                <div className="flex items-center justify-center gap-4">
                  <button type="button" disabled={cooldown > 0 || loading} onClick={() => handleEmailOtp()} className="login-secondary-action disabled:opacity-50">
                    <span className="inline-flex items-center gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" />
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                    </span>
                  </button>
                  <button type="button" onClick={() => { setEmailOtpSent(false); setEmailOtp(''); setError(null); setSuccessMessage(null); }} className="login-secondary-action">
                    Change email
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleEmailOtp} className="space-y-4">
                <div>
                  <label className="login-label" htmlFor="login-email">Email Address</label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                    <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="login-input w-full pl-9 pr-3" required />
                  </div>
                  <p className="login-help">Use the email address associated with your SkillBarter account.</p>
                </div>

                <Button type="submit" loading={loading} disabled={loading || cooldown > 0} className="login-primary-button w-full" icon={<ArrowRight className="h-4 w-4" />}>
                  {cooldown > 0 ? `Resend Available in ${cooldown}s` : 'Send OTP to Email'}
                </Button>

                <button type="button" onClick={() => { setEmailPasswordMode(true); setError(null); setSuccessMessage(null); }} className="login-secondary-action w-full">
                  Use email &amp; password instead
                </button>
              </form>
            )}

            {emailPasswordMode && (
              <form onSubmit={handleEmailLogin} className="mt-5 space-y-4 border-t border-[#edf0f2] pt-5">
                <div>
                  <label className="login-label" htmlFor="login-password">Password</label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                    <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="login-input w-full pl-9 pr-3" required />
                  </div>
                </div>

                <Button type="submit" loading={loading} className="login-primary-button w-full">Sign In with Password</Button>
                <button type="button" onClick={handleForgotPassword} disabled={resetSending || loading} className="login-reset-action w-full disabled:opacity-50">
                  {resetSending ? 'Sending reset instructions...' : 'Forgot password?'}
                </button>
                <button type="button" onClick={() => { setEmailPasswordMode(false); setError(null); }} className="login-secondary-action w-full">
                  Back to Email OTP
                </button>
              </form>
            )}
          </Card>

          <div className="mt-7 flex items-center justify-center gap-2 text-[11px] text-[#8a92a0]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#d31d24]" />
            <span>Secure sign-in for your peer-learning account</span>
          </div>

          <p className="mt-5 text-center text-xs text-[#8a92a0]">
            Don&apos;t have an account yet?{' '}
            <Link to="/signup" className="font-semibold text-[#d31d24] hover:text-[#b8171d] hover:underline">Join your community</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
