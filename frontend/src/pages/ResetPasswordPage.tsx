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

  return <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
    <Card className="w-full max-w-md p-6 border-emerald-200 shadow-sm">
      <div className="text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20"><Repeat className="w-5 h-5" /></div>
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900">Create a new password</h1>
        <p className="text-xs text-slate-500 mt-1">Choose a password you have not used elsewhere.</p>
      </div>
      {success ? <div className="space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-emerald-600" /></div>
        <div><p className="font-bold text-slate-900">Password changed successfully</p><p className="text-xs text-slate-500 mt-1">You can now sign in with your new password.</p></div>
        <Button type="button" className="w-full" icon={<ArrowRight className="w-4 h-4" />} onClick={() => navigate('/login')}>Go to Sign In</Button>
      </div> : <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
          <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" minLength={8} required autoFocus /></div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
          <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" minLength={8} required /></div>
        </div>
        <Button type="submit" loading={loading} className="w-full">Change Password</Button>
        <Link to="/login" className="block text-center text-xs text-slate-500 hover:text-emerald-700">Back to sign in</Link>
      </form>}
    </Card>
  </div>;
};
