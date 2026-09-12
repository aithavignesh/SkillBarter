import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Repeat, Lock, Mail, ArrowRight, Phone, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailFallback, setEmailFallback] = useState(false);
  const { login, requestPhoneOtp, verifyPhoneOtp, loading } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await requestPhoneOtp(phone);
      const fallback = sessionStorage.getItem('skillbarter_demo_otp') || '';
      setDemoOtp(fallback);
      setOtp(fallback);
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Unable to send OTP');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await verifyPhoneOtp(phone, otp);
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
    }
  };

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

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3"><div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20"><Repeat className="w-5 h-5" /></div></Link>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-1">Log in securely with your mobile number and OTP</p>
        </div>

        <Card className="p-6 border-emerald-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><ShieldCheck className="w-4 h-4 text-emerald-600" /><span className="text-xs font-bold text-emerald-800">Mobile OTP Login</span></div>
          <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
              <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+917050062084" disabled={otpSent} className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60" required /></div>
            </div>
            {otpSent && <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit OTP</label>
              {demoOtp && <div className="mb-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800"><span className="font-semibold">Demo OTP:</span> <span className="font-bold tracking-widest">{demoOtp}</span><span className="block mt-0.5 text-[10px]">SMS delivery is unavailable, so this secure test OTP is ready for submission.</span></div>}
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="w-full text-center tracking-[0.4em] text-lg py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
            </div>}
            <Button type="submit" loading={loading} className="w-full" icon={<ArrowRight className="w-4 h-4" />}>{otpSent ? 'Verify OTP & Sign In' : 'Send OTP'}</Button>
            {otpSent && <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setDemoOtp(''); setError(null); }} className="w-full text-[11px] text-slate-500 hover:text-emerald-700">Change mobile number</button>}
          </form>
        </Card>

        <div className="relative flex items-center"><div className="flex-1 border-t border-slate-200" /><span className="px-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">or</span><div className="flex-1 border-t border-slate-200" /></div>

        <Card className="p-5">
          <button type="button" onClick={() => { setEmailFallback(!emailFallback); setError(null); }} className="w-full text-left text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-between"><span>Use email & password instead</span><span>{emailFallback ? '−' : '+'}</span></button>
          {emailFallback && <form onSubmit={handleEmailLogin} className="space-y-4 mt-4">
            <div><label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label><div className="relative"><Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="arjun@skillbarter.com" className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required /></div></div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1">Password</label><div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required /></div></div>
            <Button type="submit" loading={loading} className="w-full">Sign In with Email</Button>
          </form>}
        </Card>

        <div className="text-center text-xs text-slate-500">Don't have an account yet? <Link to="/signup" className="text-emerald-600 font-semibold hover:underline">Join your community</Link></div>
      </div>
    </div>
  );
};
