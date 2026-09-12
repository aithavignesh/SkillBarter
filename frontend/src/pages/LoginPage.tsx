import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Repeat, Lock, Mail, ArrowRight, Phone, ShieldCheck, RotateCcw, KeyRound, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [emailFallback, setEmailFallback] = useState(false);

  const { login, requestPhoneOtp, verifyPhoneOtp, demoSwitchUser, loading } = useAuth();
  const navigate = useNavigate();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Step 1: Send real OTP via Twilio SMS
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter your mobile phone number.');
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      const normalizedPhone = await requestPhoneOtp(phone.trim());
      setPhone(normalizedPhone);
      setOtpSent(true);
      setCooldown(30);
      setSuccessMessage(`Verification SMS sent to ${normalizedPhone}. Check your phone.`);
    } catch (err: any) {
      setError(err.message || 'Unable to send OTP via SMS. Please try again.');
      if (err.waitSeconds) {
        setCooldown(err.waitSeconds);
      }
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit OTP received via SMS.');
      return;
    }

    try {
      setError(null);
      await verifyPhoneOtp(phone.trim(), otp.trim());
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP. Please check the code and try again.');
    }
  };

  // Email/Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await login(email.trim(), password);
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    }
  };

  // Persona fast switcher
  const handleQuickLogin = async (userId: number) => {
    try {
      setError(null);
      await demoSwitchUser(userId);
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Repeat className="w-5 h-5" />
            </div>
          </Link>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome to SkillBarter</h2>
          <p className="text-xs text-slate-500 mt-1">Log in securely with your mobile phone and real SMS OTP</p>
        </div>

        {/* 1-Click Fast Login for Demonstration */}
        <Card className="p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border-emerald-200/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Fast 1-Click Demo Login</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => handleQuickLogin(1)}
              className="text-xs justify-start bg-white border-emerald-300 hover:bg-emerald-50"
            >
              <strong>Arjun Sharma</strong> (Web)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => handleQuickLogin(2)}
              className="text-xs justify-start bg-white border-emerald-300 hover:bg-emerald-50"
            >
              <strong>Ravi Kumar</strong> (Plumber)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => handleQuickLogin(3)}
              className="text-xs justify-start bg-white border-slate-300 hover:bg-slate-50"
            >
              <strong>Ananya Rao</strong> (Design)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => handleQuickLogin(5)}
              className="text-xs justify-start bg-white border-amber-300 hover:bg-amber-50 text-amber-900"
            >
              <strong>Admin User</strong>
            </Button>
          </div>
        </Card>

        {/* Mobile SMS OTP Primary Form */}
        <Card className="p-6 border-emerald-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-800">Mobile SMS OTP Login</span>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          {successMessage && !error && (
            <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  disabled={otpSent}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 font-mono"
                  required
                  autoFocus={!otpSent}
                />
              </div>
              {!otpSent && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter your mobile number. A real 6-digit SMS will be sent via Twilio.
                </p>
              )}
            </div>

            {otpSent && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">6-Digit OTP</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-emerald-600 hover:underline font-medium"
                  >
                    Change mobile number
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] font-mono text-lg py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sent via Twilio SMS to <span className="font-semibold text-slate-700">{phone}</span>. Valid for 10 minutes.
                </p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={loading || (!otpSent && cooldown > 0)}
              className="w-full mt-2"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {otpSent
                ? 'Verify OTP & Sign In'
                : cooldown > 0
                ? `Resend Available in ${cooldown}s`
                : 'Send OTP via SMS'}
            </Button>

            {otpSent && (
              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => handleSendOtp()}
                  className={`inline-flex items-center gap-1.5 text-xs ${
                    cooldown > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-emerald-600 hover:underline font-medium'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            )}
          </form>
        </Card>

        {/* Divider */}
        <div className="relative flex items-center">
          <div className="flex-1 border-t border-slate-200" />
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">or</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        {/* Secondary: Email & Password */}
        <Card className="p-5">
          <button
            type="button"
            onClick={() => {
              setEmailFallback(!emailFallback);
              setError(null);
            }}
            className="w-full text-left text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-between"
          >
            <span>Use email & password instead</span>
            <span>{emailFallback ? '−' : '+'}</span>
          </button>

          {emailFallback && (
            <form onSubmit={handleEmailLogin} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="arjun@skillbarter.com"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full">
                Sign In with Email
              </Button>
            </form>
          )}
        </Card>

        <div className="text-center text-xs text-slate-500">
          Don't have an account yet?{' '}
          <Link to="/signup" className="text-emerald-600 font-semibold hover:underline">
            Join your community
          </Link>
        </div>
      </div>
    </div>
  );
};
