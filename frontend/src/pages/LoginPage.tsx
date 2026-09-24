import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { trackEvent } from '../services/analytics';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Repeat, Lock, Mail, ArrowRight, Phone, ShieldCheck, RotateCcw, KeyRound, CheckCircle2, ChevronDown } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');
  const countries = [
    ['IN','India','+91'],['US','United States','+1'],['CA','Canada','+1'],['GB','United Kingdom','+44'],['AU','Australia','+61'],
    ['AE','United Arab Emirates','+971'],['SA','Saudi Arabia','+966'],['SG','Singapore','+65'],['MY','Malaysia','+60'],['SG','Singapore','+65'],
    ['DE','Germany','+49'],['FR','France','+33'],['IT','Italy','+39'],['ES','Spain','+34'],['NL','Netherlands','+31'],
    ['CH','Switzerland','+41'],['SE','Sweden','+46'],['NO','Norway','+47'],['DK','Denmark','+45'],['FI','Finland','+358'],
    ['IE','Ireland','+353'],['PT','Portugal','+351'],['BE','Belgium','+32'],['AT','Austria','+43'],['PL','Poland','+48'],
    ['CZ','Czechia','+420'],['RO','Romania','+40'],['GR','Greece','+30'],['TR','Türkiye','+90'],['UA','Ukraine','+380'],
    ['RU','Russia','+7'],['IL','Israel','+972'],['EG','Egypt','+20'],['ZA','South Africa','+27'],['NG','Nigeria','+234'],
    ['KE','Kenya','+254'],['GH','Ghana','+233'],['MA','Morocco','+212'],['BR','Brazil','+55'],['MX','Mexico','+52'],
    ['AR','Argentina','+54'],['CL','Chile','+56'],['CO','Colombia','+57'],['PE','Peru','+51'],['VE','Venezuela','+58'],
    ['NZ','New Zealand','+64'],['JP','Japan','+81'],['KR','South Korea','+82'],['CN','China','+86'],['HK','Hong Kong','+852'],
    ['TW','Taiwan','+886'],['TH','Thailand','+66'],['VN','Vietnam','+84'],['ID','Indonesia','+62'],['PH','Philippines','+63'],
    ['PK','Pakistan','+92'],['BD','Bangladesh','+880'],['LK','Sri Lanka','+94'],['NP','Nepal','+977'],['BT','Bhutan','+975'],
    ['QA','Qatar','+974'],['KW','Kuwait','+965'],['OM','Oman','+968'],['BH','Bahrain','+973'],['JO','Jordan','+962'],
    ['IR','Iran','+98'],['IQ','Iraq','+964'],['ET','Ethiopia','+251'],['TZ','Tanzania','+255'],['UG','Uganda','+256'],
    ['DZ','Algeria','+213'],['TN','Tunisia','+216'],['GH','Ghana','+233'],['FJ','Fiji','+679'],['IS','Iceland','+354']
  ];

  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [emailFallback, setEmailFallback] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  const { login, requestPhoneOtp, verifyPhoneOtp, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter your mobile phone number.');
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 6 || digits.length > 15) {
        setError('Please enter a valid mobile number.');
        return;
      }
      const normalizedPhone = await requestPhoneOtp(`${countryCode}${digits}`);
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit OTP received via SMS.');
      return;
    }

    try {
      setError(null);
      await verifyPhoneOtp(phone.trim(), otp.trim());
      trackEvent('login_completed', { method: 'phone_otp' });
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP. Please check the code and try again.');
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
        setEmailFallback(true);
        setError('For your security, this password cannot be used. Enter your email below and use “Forgot password?” to create a new password.');
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
          <p className="mt-4 max-w-md text-[13px] leading-6 text-[#707884]">Sign in to continue learning, teaching and finding your next peer.</p>
          <div className="mt-8 border-l-2 border-[#d31d24] pl-4 text-[12px] leading-5 text-[#707884]">
            <p className="font-semibold text-[#17233b]">Your next useful conversation is close.</p>
            <p className="mt-1">Use your mobile number for the quickest sign-in, or continue with email and password.</p>
          </div>
        </div>

        <div className="w-full max-w-xl lg:justify-self-end">
          <Card className="login-card p-5 sm:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-[#edf0f2] pb-4">
              <span className="flex h-8 w-8 items-center justify-center border border-[#f1c8ca] bg-[#fff7f7] text-[#d31d24]"><Phone className="h-4 w-4" /></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#17233b]">Sign in</p>
                <p className="mt-0.5 text-[11px] text-[#8a92a0]">Use your mobile number to continue</p>
              </div>
            </div>

            {error && <div role="alert" className="login-error mb-5">{error}</div>}

            {successMessage && !error && (
              <div className="login-success mb-5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d31d24]" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-5">
              <div>
                <label className="login-label" htmlFor="login-phone">Mobile Number</label>
                <div className="mt-1.5 flex min-w-0 flex-col gap-2 sm:flex-row">
                  <div className="relative w-full shrink-0 sm:w-[150px]">
                    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} disabled={otpSent} aria-label="Country code" className="login-input h-[42px] w-full appearance-none pl-3 pr-8 font-semibold disabled:opacity-60">
                      {countries.map(([iso, name, code]) => <option key={iso + code} value={code}>{name} ({code})</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                    <input id="login-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))} placeholder="98765 43210" disabled={otpSent} className="login-input h-[42px] w-full pl-9 pr-3 font-mono disabled:opacity-60" required autoFocus={!otpSent} />
                  </div>
                </div>
                {!otpSent && <p className="login-help">Select your country, then enter your mobile number. The country code is added automatically.</p>}
              </div>

              {otpSent && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label className="login-label" htmlFor="login-otp">6-Digit OTP</label>
                    <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(null); setSuccessMessage(null); }} className="login-secondary-action">Change mobile number</button>
                  </div>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                    <input id="login-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="login-input w-full pl-9 pr-3 text-center font-mono text-lg tracking-[0.5em]" required autoFocus />
                  </div>
                  <p className="login-help">Sent via 2Factor SMS to <span className="font-semibold text-[#17233b]">{phone}</span>. Valid for 10 minutes.</p>
                </div>
              )}

              <Button type="submit" loading={loading} disabled={loading || (!otpSent && cooldown > 0)} className="login-primary-button mt-2 w-full" icon={<ArrowRight className="h-4 w-4" />}>
                {otpSent ? 'Verify OTP & Sign In' : cooldown > 0 ? `Resend Available in ${cooldown}s` : 'Send OTP via SMS'}
              </Button>

              {otpSent && (
                <div className="flex items-center justify-center">
                  <button type="button" disabled={cooldown > 0 || loading} onClick={() => handleSendOtp()} className={`login-secondary-action inline-flex items-center gap-1.5 ${cooldown > 0 ? 'cursor-not-allowed text-[#9aa1ac]' : ''}`}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              )}
            </form>
          </Card>

          <div className="login-divider"><span>or</span></div>

          <Card className="login-email-card p-5 sm:p-6">
            <button type="button" onClick={() => { setEmailFallback(!emailFallback); setError(null); }} className="flex w-full items-center justify-between gap-4 text-left">
              <span><span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#17233b]">Alternative sign in</span><span className="mt-1 block text-[12px] text-[#707884]">Use email and password instead</span></span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#dfe3e7] text-lg font-light text-[#17233b]" aria-hidden="true">{emailFallback ? '−' : '+'}</span>
            </button>

            {emailFallback && (
              <form onSubmit={handleEmailLogin} className="mt-5 space-y-4 border-t border-[#edf0f2] pt-5">
                <div>
                  <label className="login-label" htmlFor="login-email">Email Address</label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                    <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="arjun@skillbarter.com" className="login-input w-full pl-9 pr-3" required />
                  </div>
                </div>
                <div>
                  <label className="login-label" htmlFor="login-password">Password</label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1ac]" />
                    <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="login-input w-full pl-9 pr-3" required />
                  </div>
                </div>
                <Button type="submit" loading={loading} className="login-primary-button w-full">Sign In with Email</Button>
                <button type="button" onClick={handleForgotPassword} disabled={resetSending || loading} className="login-reset-action w-full disabled:opacity-50">
                  {resetSending ? 'Sending reset instructions...' : 'Forgot password?'}
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
