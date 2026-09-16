import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, Building2, Coins, GraduationCap, HandCoins, Megaphone,
  Percent, Rocket, ShieldCheck, Sparkles, Target, Clock3, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  activatePremium,
  canUse,
  getMonetizationState,
  getPriorityMatchRemaining,
  getMonetizationUsage,
  recordBoost,
  updateMonetizationState,
  MonetizationState,
} from '../services/monetization';

const strategies = [
  { id: 'featured', title: 'Featured Skill Listings', description: 'Boost a skill profile so it receives more visibility in discovery.', icon: Rocket, value: '50 credits / boost' },
  { id: 'verified', title: 'Verified Skill Badges', description: 'Request a verification review to strengthen trust and profile credibility.', icon: BadgeCheck, value: 'Verification review' },
  { id: 'matching', title: 'Premium AI Matching', description: 'Prioritize richer matching signals and surface high-fit opportunities first.', icon: Sparkles, value: '20 priority matches / day' },
  { id: 'sponsored', title: 'Sponsored Listings & Ads', description: 'Allow relevant businesses and creators to promote useful skill-related offers.', icon: Megaphone, value: 'Advertiser channel' },
  { id: 'workshops', title: 'Paid Workshops & Courses', description: 'Let skilled members publish workshops and courses and build a paid learning channel.', icon: GraduationCap, value: 'Creator revenue' },
  { id: 'corporate', title: 'Corporate Subscription Plans', description: 'Offer organizations team-based skill discovery, mentoring and exchange programs.', icon: Building2, value: 'B2B plan' },
  { id: 'credits', title: 'Skill Credits', description: 'Use platform credits for boosts and premium actions while keeping basic barter free.', icon: Coins, value: '100 starter credits' },
  { id: 'leads', title: 'Lead Generation Fees', description: 'Professionals can opt in to receive relevant service requests and qualified leads.', icon: Target, value: 'Qualified leads' },
];

export const MonetizationPage: React.FC = () => {
  const { currentUser } = useAuth();
  const userId = Number(currentUser?.id ?? 0);
  const [state, setState] = useState<MonetizationState>(() => getMonetizationState(userId));
  const [amount, setAmount] = useState('1000');
  const [message, setMessage] = useState('');
  const [usageTick, setUsageTick] = useState(0);

  useEffect(() => { if (userId) setState(getMonetizationState(userId)); }, [userId]);

  const usage = useMemo(() => getMonetizationUsage(userId), [userId, usageTick, state]);
  const priorityRemaining = useMemo(() => getPriorityMatchRemaining(userId), [userId, usageTick, state]);
  const commission = useMemo(() => Math.max(0, Number(amount) || 0) * 0.05, [amount]);
  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(''), 3500); };
  const patch = (changes: Partial<MonetizationState>, notice: string) => {
    const next = updateMonetizationState(userId, changes); setState(next); setUsageTick(v => v + 1); notify(notice);
  };
  const boostProfile = () => {
    if (!canUse(userId, 'profile_boost')) { notify('You need at least 50 skill credits to boost your profile.'); return; }
    try { const next = recordBoost(userId, 7); setState(next); setUsageTick(v => v + 1); notify('Profile featured for 7 days. 50 skill credits were used.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Unable to boost profile.'); }
  };
  const togglePremium = () => {
    if (state.premium) patch({ premium: false, premiumUntil: null, priorityMatching: false }, 'Premium access disabled.');
    else { const next = activatePremium(userId, 1); setState(next); setUsageTick(v => v + 1); notify('Premium activated for product testing. No payment was collected.'); }
  };
  const requestVerification = () => {
    if (state.verified) { notify('Your profile is already verified.'); return; }
    if (state.verificationRequestedAt) { notify('Verification is already pending review.'); return; }
    patch({ verificationRequestedAt: new Date().toISOString() }, 'Verification request submitted for review. A reviewer must approve it before the badge appears.');
  };

  return (
    <main className="min-h-[calc(100vh-1px)] bg-[#f7f7f5] px-4 py-5 sm:px-6 lg:px-8 xl:px-10"><div className="mx-auto w-full max-w-[1320px]">
      <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold text-slate-400"><span>Workspace</span><span>/</span><span className="text-slate-600">Monetization</span></div>
      <section className="border-b border-[#e1e4e8] pb-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d31d24]"><HandCoins className="h-3.5 w-3.5"/><span>Growth & Revenue</span></div><h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#17233b] sm:text-3xl">Monetization Hub</h1><p className="mt-1.5 max-w-3xl text-sm leading-6 text-[#697386]">Optional premium visibility, trust, learning and business features while basic skill barter remains accessible.</p></div><div className="grid grid-cols-3 gap-2"><div className="min-w-[95px] border border-[#e1e4e8] bg-white px-4 py-3"><p className="text-[10px] text-[#697386]">Skill Credits</p><p className="mt-1 text-xl font-extrabold text-[#17233b]">{state.credits}</p></div><div className="min-w-[95px] border border-[#e1e4e8] bg-white px-4 py-3"><p className="text-[10px] text-[#697386]">Premium</p><p className="mt-1 text-xl font-extrabold text-[#17233b]">{state.premium ? 'ON' : 'FREE'}</p></div><div className="min-w-[95px] border border-[#e1e4e8] bg-white px-4 py-3"><p className="text-[10px] text-[#697386]">Priority left</p><p className="mt-1 text-xl font-extrabold text-[#17233b]">{priorityRemaining}</p></div></div></div></section>
      <div className="space-y-5 pt-6">{message && <div className="flex items-center gap-2 border border-red-100 bg-[#fff5f5] px-4 py-3 text-xs font-semibold text-[#b8171d]"><CheckCircle2 className="h-4 w-4"/>{message}</div>}
        <Card className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h2 className="text-sm font-extrabold text-[#17233b]">Premium Membership</h2>{state.premium && <span className="border border-red-100 bg-[#fff5f5] px-2 py-1 text-[9px] font-bold uppercase text-[#b8171d]">Active</span>}</div><p className="mt-1 text-xs text-[#697386]">₹149/month — priority matching, profile boosts, advanced discovery and priority support.</p>{state.premiumUntil && <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#697386]"><Clock3 className="h-3 w-3"/> Access until {new Date(state.premiumUntil).toLocaleDateString()}</p>}<p className="mt-2 text-[10px] text-slate-400">Demo entitlement only; no payment is collected yet.</p></div><Button size="sm" onClick={togglePremium}>{state.premium ? 'Disable access' : 'Activate Premium'}</Button></div></Card>
        <div className="grid gap-4 md:grid-cols-2">{strategies.map((item) => { const Icon=item.icon; const active=item.id==='verified'?state.verified:item.id==='matching'?state.priorityMatching:item.id==='sponsored'?state.sponsoredEnabled:item.id==='workshops'?state.workshopsEnabled:item.id==='corporate'?state.corporateInterest:item.id==='leads'?state.leadGenerationEnabled:item.id==='featured'?Boolean(state.featuredUntil&&new Date(state.featuredUntil).getTime()>Date.now()):false; const action=item.id==='featured'?boostProfile:item.id==='verified'?requestVerification:item.id==='matching'?()=>state.premium?patch({priorityMatching:!state.priorityMatching},state.priorityMatching?'Priority matching disabled.':'Priority matching enabled.'):notify('Premium membership is required for priority matching.'):item.id==='sponsored'?()=>patch({sponsoredEnabled:!state.sponsoredEnabled},'Sponsored placement preference updated.'):item.id==='workshops'?()=>patch({workshopsEnabled:!state.workshopsEnabled},'Workshop creator preference updated.'):item.id==='corporate'?()=>patch({corporateInterest:true},'Corporate plan interest registered.'):item.id==='leads'?()=>patch({leadGenerationEnabled:!state.leadGenerationEnabled},'Lead generation preference updated.'):()=>patch({credits:state.credits+100},'100 skill credits added for product testing.'); const label=item.id==='featured'?(active?'Boost again':'Boost profile'):item.id==='verified'?(state.verified?'Verified':state.verificationRequestedAt?'Pending review':'Request verification'):item.id==='credits'?'+100 Credits':active?'Disable':'Enable'; return <Card key={item.id} className="p-5"><div className="flex items-start gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-red-100 bg-[#fff5f5] text-[#d31d24]"><Icon className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-[#17233b]">{item.title}</h3><p className="mt-0.5 text-[11px] font-semibold text-[#d31d24]">{item.value}</p></div>{active&&<span className="border border-red-100 bg-[#fff5f5] px-2 py-1 text-[10px] font-bold text-[#b8171d]">Active</span>}</div><p className="mt-2 text-xs leading-relaxed text-[#697386]">{item.description}</p>{item.id==='matching'&&<p className="mt-2 text-[10px] font-semibold text-[#697386]">{priorityRemaining} priority matches remaining today.</p>}{item.id==='verified'&&state.verificationRequestedAt&&!state.verified&&<p className="mt-2 text-[10px] text-[#697386]">Request submitted {new Date(state.verificationRequestedAt).toLocaleDateString()} · awaiting reviewer approval.</p>}<Button size="sm" variant="outline" className="mt-3" onClick={action}>{label}</Button></div></div></Card>; })}</div>
        <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><div className="flex items-center gap-2"><Percent className="h-4 w-4 text-[#d31d24]"/><h2 className="text-sm font-extrabold text-[#17233b]">Transaction Commission Calculator</h2></div><p className="mt-1 text-xs text-[#697386]">Illustrative 5% platform commission for future paid services. This does not charge or alter core barter exchanges.</p><div className="mt-4 flex items-center gap-2"><span className="text-xs font-semibold text-[#697386]">₹</span><input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} className="h-10 flex-1 border border-[#d9dde2] bg-white px-3 text-sm text-[#17233b] outline-none focus:border-[#d31d24]"/></div><div className="mt-3 grid grid-cols-2 gap-3"><div className="border border-[#e1e4e8] bg-[#f7f8f7] p-3"><p className="text-[10px] text-[#697386]">Illustrative fee</p><p className="text-lg font-extrabold text-[#17233b]">₹{commission.toFixed(2)}</p></div><div className="border border-red-100 bg-[#fff5f5] p-3"><p className="text-[10px] text-[#b8171d]">Provider receives</p><p className="text-lg font-extrabold text-[#17233b]">₹{(Math.max(0,Number(amount)||0)-commission).toFixed(2)}</p></div></div></Card><Card className="p-5"><div className="flex items-center gap-2"><Coins className="h-4 w-4 text-[#d31d24]"/><h2 className="text-sm font-extrabold text-[#17233b]">Skill Credits</h2></div><p className="mt-1 text-xs text-[#697386]">Credits power premium actions while basic skill barter remains free.</p><div className="mt-4 flex items-center justify-between border border-[#e1e4e8] bg-[#f7f8f7] p-4"><div><p className="text-[10px] text-[#697386]">Current balance</p><p className="text-2xl font-extrabold text-[#17233b]">{state.credits}</p></div><button onClick={()=>patch({credits:state.credits+100},'100 skill credits added for product testing.')} className="border border-[#d31d24] bg-[#d31d24] px-4 py-2 text-xs font-bold text-white hover:bg-[#b8171d]">+100 Credits</button></div>{state.featuredUntil&&<p className="mt-3 flex items-center gap-1 text-[11px] text-[#697386]"><Rocket className="h-3 w-3"/> Featured until {new Date(state.featuredUntil).toLocaleDateString()} · {usage.boostsUsed} total boosts recorded</p>}</Card></div>
        <Card className="p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-[#d31d24]"/><div><h2 className="text-sm font-extrabold text-[#17233b]">Monetization principles</h2><p className="mt-1 text-xs leading-relaxed text-[#697386]">Basic barter remains free. Premium state, feature preferences, credits and usage counters persist per signed-in user in the browser. Verification requests stay pending until an approval workflow marks them verified. The commission calculator is only a pricing preview; no payment is collected yet.</p></div></div></Card>
      </div></div></main>
  );
};