import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, ArrowRight, Repeat } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';

export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) return setError('This password reset link is missing or expired. Please request a new one.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    try {
      setLoading(true);
      await api.resetPassword(password, token);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Unable to reset password. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="reset-password-page min-h-[85vh] flex items-start justify-center bg-[#f7f7f5] px-4 pb-12 pt-24 sm:items-center sm:pt-28">
    <Card className="w-full max-w-md border-[#e1e4e8] p-6 shadow-sm sm:p-8">
      <div className="text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2 mb-3" aria-label="SkillBarter home">
          <div className="flex h-10 w-10 items-center justify-center bg-[#17233b] text-white"><Repeat className="h-5 w-5" /></div>
          <span className="text-[18px] font-bold tracking-[-0.04em] text-[#17233b]">Skill<span className="text-[#d31d24]">Barter</span></span>
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900">Create a new password</h1>
        <p className="text-xs text-slate-500 mt-1">Choose a password you have not used elsewhere.</p>
      </div>
      {success ? <div className="space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-emerald-600" /></div>
        <div><p className="font-bold text-slate-900">Password changed successfully</p><p className="text-xs text-slate-500 mt-1">You can now sign in with your new password.</p></div>
        <Button type="button" className="w-full" icon={<ArrowRight className="w-4 h-4" />} onClick={() => navigate('/login')}>Go to Sign In</Button>
      </div> : <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div id="reset-password-error" role="alert" className="login-error">{error}</div>}
        <div>
          <label htmlFor="reset-password" className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
          <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'reset-password-error' : undefined} className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" minLength={8} required autoFocus /></div>
        </div>
        <div>
          <label htmlFor="confirm-reset-password" className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
          <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input id="confirm-reset-password" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'reset-password-error' : undefined} className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" minLength={8} required /></div>
        </div>
        <Button type="submit" loading={loading} className="w-full">Change Password</Button>
        <Link to="/login" className="block text-center text-xs text-slate-500 hover:text-emerald-700">Back to sign in</Link>
      </form>}
    </Card>
  </div>;
};
