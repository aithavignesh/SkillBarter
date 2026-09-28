import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestPhoneOtp, verifyPhoneOtp, normalizePhone } from '../services/phoneAuth';
import { trackEvent } from '../services/analytics';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Repeat, Lock, Mail, User, Phone, ArrowRight, Eye, EyeOff, KeyRound, RotateCcw, CheckCircle2 } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const { register, loading } = useAuth();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => value > 1 ? value - 1 : 0), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);
  const navigate = useNavigate();
  const referralSource = new URLSearchParams(window.location.search).get('ref') || 'direct';

  useEffect(() => {
    if (referralSource !== 'direct') sessionStorage.setItem('skillbarter_referral_source', referralSource);
  }, [referralSource]);

  useEffect(() => {
    trackEvent('signup_started', { referral_source: referralSource });
  }, [referralSource]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      if (password !== confirmPassword) return setError('Passwords do not match.');
      if (password.length < 8) return setError('Password must be at least 8 characters.');
      if (!fullName.trim() || !username.trim() || !email.trim() || !phone.trim()) {
        return setError('Please complete your full name, username, email, and mobile number.');
      }

      const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        return setError('Username must be 3–30 characters and use only letters, numbers, or underscores.');
      }

      const cleanPhone = normalizePhone(phone);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Please enter a valid email address.');

      if (!phoneVerified) {
        if (!otpSent) {
          const normalized = await requestPhoneOtp(cleanPhone);
          setPhone(normalized);
          setOtpSent(true);
          setCooldown(30);
          setError(null);
          return;
        }

        if (!/^\d{6}$/.test(otp.trim())) return setError('Enter the complete 6-digit OTP sent to your mobile number.');
        await verifyPhoneOtp(cleanPhone, otp.trim(), 'register');
        setPhoneVerified(true);
        setOtpSent(false);
        setOtp('');
        setError(null);
        return;
      }

      await register({
        full_name: fullName.trim(),
        username: cleanUsername,
        email: email.trim(),
        phone: cleanPhone,
        password,
      });
      trackEvent('signup_completed', { referral_source: referralSource });
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const categories = [
    'Technology',
    'AI / Machine Learning',
    'Web Development',
    'Data Science',
    'Design',
    'Education',
    'Photography',
    'Video Editing',
    'Communication',
    'Other'
  ];

  return (
    <div className="signup-page min-h-[85vh] bg-[#f7f7f5] px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto w-full max-w-[560px]">
        <header className="text-center">
          <Link to="/" className="signup-brand inline-flex items-center gap-2" aria-label="SkillBarter home">
            <span className="flex h-10 w-10 items-center justify-center bg-[#17233b] text-white">
              <Repeat className="h-5 w-5" />
            </span>
            <span className="text-[18px] font-bold tracking-[-0.04em] text-[#17233b]">Skill<span className="text-[#d31d24]">Barter</span></span>
          </Link>
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d31d24]">Create your SkillBarter account</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#17233b] sm:text-4xl">Start with the basics.</h1>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-6 text-[#707884]">Your learning profile comes next.</p>
        </header>

        <div className="signup-progress mt-8 flex items-center justify-center gap-3 text-[10px] font-bold tracking-[0.14em]">
          <span className="text-[#d31d24]">01 ACCOUNT</span>
          <span aria-hidden="true" className="h-px w-16 bg-[#d31d24]/35 sm:w-24" />
          <span className="text-[#9aa1ac]">02 PROFILE</span>
        </div>

        <Card className="signup-card mt-8 p-5 sm:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-[#edf0f2] pb-4">
            <span className="h-2 w-2 bg-[#d31d24]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#17233b]">Your account</span>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div role="alert" className="border border-[#f1c8ca] bg-[#fff7f7] px-3 py-2.5 text-xs text-[#8f1a20]">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="signup-full-name" className="mb-1.5 block text-xs font-semibold text-[#17233b]">Full Name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                <input id="signup-full-name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ramesh Kumar" className="signup-input w-full pl-9 pr-3" required />
              </div>
            </div>

            <div>
              <label htmlFor="signup-username" className="mb-1.5 block text-xs font-semibold text-[#17233b]">Username</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                <input id="signup-username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30))} placeholder="e.g. vignesh_aitha" className="signup-input w-full pl-9 pr-3" minLength={3} maxLength={30} required />
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-[#8a92a0]">Your unique public name for search and your profile.</p>
            </div>

            <div>
              <label htmlFor="signup-phone" className="mb-1.5 block text-xs font-semibold text-[#17233b]">Mobile Number</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                <input id="signup-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\s-]/g, ''))} placeholder="+91 98765 43210" className="signup-input w-full pl-9 pr-3" required />
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-[#8a92a0]">Your mobile number must be verified by OTP before the account is created.</p>
              {phoneVerified ? (
                <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-[#237a43]"><CheckCircle2 className="h-4 w-4" /> Mobile number verified</div>
              ) : otpSent ? (
                <div className="mt-3 space-y-2">
                  <label htmlFor="signup-otp" className="mb-1.5 block text-xs font-semibold text-[#17233b]">Mobile OTP</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                    <input id="signup-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="6-digit OTP" className="signup-input w-full pl-9 pr-3 text-center font-mono tracking-[0.35em]" />
                  </div>
                  <button type="button" disabled={cooldown > 0 || loading} onClick={async () => { try { const normalized = await requestPhoneOtp(phone); setPhone(normalized); setCooldown(30); setError(null); } catch (err: any) { setError(err.message || 'Unable to resend OTP.'); } }} className="login-secondary-action inline-flex items-center gap-1.5 disabled:opacity-50">
                    <RotateCcw className="h-3.5 w-3.5" /> {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="signup-email" className="mb-1.5 block text-xs font-semibold text-[#17233b]">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ramesh@example.com" className="signup-input w-full pl-9 pr-3" required />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-1.5 block text-xs font-semibold text-[#17233b]">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                <input id="signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" className="signup-input w-full pl-9 pr-11" required minLength={8} />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="signup-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-[#8a92a0]">Use at least 8 characters.</p>
            </div>

            <div>
              <label htmlFor="signup-confirm-password" className="mb-1.5 block text-xs font-semibold text-[#17233b]">Confirm Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                <input id="signup-confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className="signup-input w-full pl-9 pr-11" required minLength={8} />
                <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="signup-password-toggle" aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>

            <div className="signup-next-step flex items-start gap-3">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#d31d24]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#17233b]">Next</p>
                <p className="mt-1 text-[13px] font-semibold text-[#17233b]">Build your learning profile <span className="text-[#d31d24]">→</span></p>
                <p className="mt-1.5 text-[11px] leading-5 text-[#707884]">After creating your account, we’ll ask what you can teach, what you want to learn, your area, and your learning preferences.</p>
              </div>
            </div>

            <p className="text-[11px] leading-5 text-[#8a92a0]">Your learning profile is completed in the next step. You can change your preferences later, and exact GPS coordinates are never shown publicly.</p>

            <Button type="submit" loading={loading} disabled={loading || (!phoneVerified && cooldown > 0 && !otpSent)} className="signup-submit w-full" icon={<ArrowRight className="h-4 w-4" />}>
              {!phoneVerified && !otpSent ? 'Verify Mobile & Continue' : !phoneVerified ? 'Verify OTP & Create Account' : 'Continue to learning profile'}
            </Button>
          </form>

          <div className="mt-7 border-t border-[#edf0f2] pt-5 text-center text-xs text-[#8a92a0]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#d31d24] hover:text-[#b8171d] hover:underline">Log in</Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
