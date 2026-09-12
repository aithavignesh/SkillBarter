import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, Building2, Coins, Crown, GraduationCap, HandCoins, Megaphone,
  Percent, Rocket, ShieldCheck, Sparkles, Target, Users, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { getMonetizationState, updateMonetizationState, MonetizationState } from '../services/monetization';

const strategies = [
  { id: 'premium', title: 'Premium Membership', description: 'Unlock premium matching, profile boosts, advanced discovery and priority support.', icon: Crown, value: '₹149 / month', accent: 'amber' },
  { id: 'commission', title: 'Transaction Commission', description: 'A transparent 5% platform fee can apply when users purchase a paid skill or service.', icon: Percent, value: '5% platform fee', accent: 'emerald' },
  { id: 'featured', title: 'Featured Skill Listings', description: 'Boost a skill profile so it receives more visibility in discovery.', icon: Rocket, value: '50 credits / boost', accent: 'violet' },
  { id: 'verified', title: 'Verified Skill Badges', description: 'Request a verification review to strengthen trust and profile credibility.', icon: BadgeCheck, value: 'Verification request', accent: 'blue' },
  { id: 'matching', title: 'Premium AI Matching', description: 'Prioritize richer matching signals and surface high-fit opportunities first.', icon: Sparkles, value: 'Premium feature', accent: 'fuchsia' },
  { id: 'sponsored', title: 'Sponsored Listings & Ads', description: 'Allow relevant businesses and creators to promote useful skill-related offers.', icon: Megaphone, value: 'Advertiser channel', accent: 'orange' },
  { id: 'workshops', title: 'Paid Workshops & Courses', description: 'Let skilled members publish workshops and courses and build a paid learning channel.', icon: GraduationCap, value: 'Creator revenue', accent: 'teal' },
  { id: 'corporate', title: 'Corporate Subscription Plans', description: 'Offer organizations team-based skill discovery, mentoring and exchange programs.', icon: Building2, value: 'B2B plan', accent: 'indigo' },
  { id: 'credits', title: 'Skill Credits', description: 'Use platform credits for boosts and premium actions while keeping basic barter free.', icon: Coins, value: '100 starter credits', accent: 'yellow' },
  { id: 'leads', title: 'Lead Generation Fees', description: 'Professionals can opt in to receive relevant service requests and qualified leads.', icon: Target, value: 'Qualified leads', accent: 'rose' },
];

export const MonetizationPage: React.FC = () => {
  const { currentUser } = useAuth();
  const userId = Number(currentUser?.id ?? 0);
  const [state, setState] = useState<MonetizationState>(() => getMonetizationState(userId));
  const [amount, setAmount] = useState('1000');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (userId) setState(getMonetizationState(userId));
  }, [userId]);

  const commission = useMemo(() => Math.max(0, Number(amount) || 0) * 0.05, [amount]);

  const patch = (changes: Partial<MonetizationState>, notice: string) => {
    const next = updateMonetizationState(userId, changes);
    setState(next);
    setMessage(notice);
    window.setTimeout(() => setMessage(''), 3000);
  };

  const boostProfile = () => {
    if (state.credits < 50) {
      setMessage('Not enough skill credits. Add credits to continue.');
      return;
    }
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    patch({ credits: state.credits - 50, featuredUntil: until }, 'Profile featured for 7 days using 50 credits.');
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold bg-white/10 border border-white/15 rounded-full px-3 py-1.5">
                <HandCoins className="w-4 h-4" /> Monetization Hub
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">Grow SkillBarter without breaking barter.</h1>
              <p className="text-sm text-emerald-50/90 mt-2 max-w-2xl">The core community exchange stays accessible while optional premium visibility, trust, learning and business features create revenue opportunities.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[230px]">
              <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                <p className="text-[11px] text-emerald-100">Skill Credits</p>
                <p className="text-2xl font-extrabold mt-1">{state.credits}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                <p className="text-[11px] text-emerald-100">Premium</p>
                <p className="text-2xl font-extrabold mt-1">{state.premium ? 'ON' : 'FREE'}</p>
              </div>
            </div>
          </div>
        </div>

        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{message}</div>}

        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Premium Membership</h2>
              <p className="text-xs text-slate-500 mt-1">₹149/month — priority matching, profile boosts, advanced discovery and priority support.</p>
            </div>
            <Button size="sm" onClick={() => patch({ premium: !state.premium }, state.premium ? 'Premium membership disabled.' : 'Premium membership activated for product testing.')}>{state.premium ? 'Active' : 'Activate'}</Button>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          {strategies.filter((s) => s.id !== 'premium' && s.id !== 'commission').map((item) => {
            const Icon = item.icon;
            const active = item.id === 'verified' ? state.verified : item.id === 'matching' ? state.priorityMatching : item.id === 'sponsored' ? state.sponsoredEnabled : item.id === 'workshops' ? state.workshopsEnabled : item.id === 'corporate' ? state.corporateInterest : item.id === 'leads' ? state.leadGenerationEnabled : false;
            const action = item.id === 'featured' ? boostProfile : item.id === 'verified' ? () => patch({ verified: true }, 'Verification request submitted.') : item.id === 'matching' ? () => patch({ priorityMatching: !state.priorityMatching }, state.priorityMatching ? 'Priority matching disabled.' : 'Priority matching enabled.') : item.id === 'sponsored' ? () => patch({ sponsoredEnabled: !state.sponsoredEnabled }, 'Sponsored placement preference updated.') : item.id === 'workshops' ? () => patch({ workshopsEnabled: !state.workshopsEnabled }, 'Workshop creator preference updated.') : item.id === 'corporate' ? () => patch({ corporateInterest: true }, 'Corporate plan interest registered.') : item.id === 'leads' ? () => patch({ leadGenerationEnabled: !state.leadGenerationEnabled }, 'Lead generation preference updated.') : () => {};
            return (
              <Card key={item.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div><h3 className="text-sm font-bold text-slate-900">{item.title}</h3><p className="text-[11px] font-semibold text-emerald-700 mt-0.5">{item.value}</p></div>
                      {active && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Active</span>}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mt-2">{item.description}</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={action}>{item.id === 'featured' ? 'Boost profile' : item.id === 'verified' ? (state.verified ? 'Requested' : 'Request verification') : active ? 'Disable' : 'Enable'}</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2"><Percent className="w-4 h-4 text-emerald-600" /><h2 className="text-sm font-extrabold">Transaction Commission Calculator</h2></div>
            <p className="text-xs text-slate-500 mt-1">Transparent 5% platform commission for paid services.</p>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-xs font-semibold text-slate-500">₹</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Platform fee</p><p className="text-lg font-extrabold text-slate-900">₹{commission.toFixed(2)}</p></div>
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] text-emerald-600">Provider receives</p><p className="text-lg font-extrabold text-emerald-800">₹{(Math.max(0, Number(amount) || 0) - commission).toFixed(2)}</p></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2"><Coins className="w-4 h-4 text-amber-600" /><h2 className="text-sm font-extrabold">Skill Credits</h2></div>
            <p className="text-xs text-slate-500 mt-1">Credits power premium actions while basic skill barter remains free.</p>
            <div className="flex items-center justify-between mt-4 rounded-2xl bg-amber-50 p-4">
              <div><p className="text-[10px] text-amber-700">Current balance</p><p className="text-2xl font-extrabold text-amber-900">{state.credits}</p></div>
              <button onClick={() => patch({ credits: state.credits + 100 }, '100 skill credits added for product testing.')} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600">+100 Credits</button>
            </div>
            {state.featuredUntil && <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1"><Rocket className="w-3 h-3" /> Featured until {new Date(state.featuredUntil).toLocaleDateString()}</p>}
          </Card>
        </div>

        <Card className="p-5 bg-white border-dashed">
          <div className="flex items-start gap-3"><ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5" /><div><h2 className="text-sm font-extrabold text-slate-900">Monetization principles</h2><p className="text-xs text-slate-500 mt-1 leading-relaxed">Basic barter remains free. Revenue features are optional and transparent. Real payment collection can be connected to a configured Stripe or Razorpay catalog after the business pricing and payment provider are configured.</p></div></div>
        </Card>
      </div>
    </div>
  );
};
