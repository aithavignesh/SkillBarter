import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Repeat, Lock, Mail, ArrowRight, ShieldCheck, User } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, demoSwitchUser, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await login(email.trim(), password);
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    }
  };

  const handleQuickLogin = async (userId: number) => {
    try {
      setError(null);
      await demoSwitchUser(userId);
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Repeat className="w-5 h-5" />
            </div>
          </Link>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-1">
            Log in to continue exchanging skills with your neighborhood
          </p>
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

        {/* Email / Password Card */}
        <Card className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-emerald-600 hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
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

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-2"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account yet?{' '}
            <Link to="/signup" className="text-emerald-600 font-semibold hover:underline">
              Join your community
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
