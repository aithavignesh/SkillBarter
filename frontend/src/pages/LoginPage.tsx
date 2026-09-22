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
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Repeat className="w-5 h-5" />
            </div>
          </Link>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back to SkillBarter</h2>
          <p className="text-xs text-slate-500 mt-1">Sign in to continue learning, teaching and finding your next peer</p>
        </div>

        <Card className="p-6 border-emerald-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-800">Sign in with mobile OTP</span>
          </div>

          {error && <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}

          {successMessage && !error && (
            <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
              <div className="flex gap-2">
                <div className="relative w-[150px] shrink-0">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    disabled={otpSent}
                    aria-label="Country code"
                    className="h-[42px] w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  >
                    {countries.map(([iso, name, code]) => (
                      <option key={iso + code} value={code}>{name} ({code})</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="relative min-w-0 flex-1">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                    placeholder="98765 43210"
                    disabled={otpSent}
                    className="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-mono outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    required
                    autoFocus={!otpSent}
                  />
                </div>
              </div>
              {!otpSent && <p className="text-[11px] text-slate-500 mt-1">Select your country, then enter your mobile number. The country code is added automatically.</p>}
            </div>

            {otpSent && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">6-Digit OTP</label>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(null); setSuccessMessage(null); }} className="text-[11px] text-emerald-600 hover:underline font-medium">Change mobile number</button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="w-full text-center tracking-[0.5em] font-mono text-lg py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required autoFocus />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Sent via 2Factor SMS to <span className="font-semibold text-slate-700">{phone}</span>. Valid for 10 minutes.</p>
              </div>
            )}

            <Button type="submit" loading={loading} disabled={loading || (!otpSent && cooldown > 0)} className="w-full mt-2" icon={<ArrowRight className="w-4 h-4" />}>
              {otpSent ? 'Verify OTP & Sign In' : cooldown > 0 ? `Resend Available in ${cooldown}s` : 'Send OTP via SMS'}
            </Button>

            {otpSent && (
              <div className="flex items-center justify-center pt-2">
                <button type="button" disabled={cooldown > 0 || loading} onClick={() => handleSendOtp()} className={`inline-flex items-center gap-1.5 text-xs ${cooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-emerald-600 hover:underline font-medium'}`}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            )}
          </form>
        </Card>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-slate-200" />
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">or</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        <Card className="p-5">
          <button type="button" onClick={() => { setEmailFallback(!emailFallback); setError(null); }} className="w-full text-left text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-between">
            <span>Use email & password instead</span>
            <span>{emailFallback ? '−' : '+'}</span>
          </button>

          {emailFallback && (
            <form onSubmit={handleEmailLogin} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="arjun@skillbarter.com" className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
              </div>
              <Button type="submit" loading={loading} className="w-full">Sign In with Email</Button>
              <button type="button" onClick={handleForgotPassword} disabled={resetSending || loading} className="w-full text-xs text-emerald-700 hover:underline font-semibold disabled:opacity-50">
                {resetSending ? 'Sending reset instructions...' : 'Forgot password?'}
              </button>
            </form>
          )}
        </Card>

        <div className="text-center text-xs text-slate-500">
          Don't have an account yet?{' '}
          <Link to="/signup" className="text-emerald-600 font-semibold hover:underline">Join your community</Link>
        </div>
      </div>
    </div>
  );
};
