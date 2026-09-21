import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { trackEvent } from '../services/analytics';
import { useAuth } from '../context/AuthContext';
import { MatchResult, UserSummary } from '../types';
import { Button } from '../components/ui/Button';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { AppPageShell } from '../components/ui/AppPageShell';
import { getMonetizationState, getPriorityMatchRemaining, consumePriorityMatch, updateMonetizationState } from '../services/monetization';
import { Sparkles, Repeat, MapPin, ShieldCheck, CheckCircle, ArrowRight, SlidersHorizontal, Crown, Power, BadgeCheck, Rocket, RefreshCw, Users, BookOpen, Share2 } from 'lucide-react';

export const SkillMatchesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userId = Number(currentUser?.id ?? 0);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [defaultPartnerSkill, setDefaultPartnerSkill] = useState('');
  const [defaultMySkill, setDefaultMySkill] = useState('');
  const [notice, setNotice] = useState('');
  const [usageTick, setUsageTick] = useState(0);
  const [priorityProposal, setPriorityProposal] = useState(false);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      setMatches(await api.getMatches());
    } catch (e) {
      console.error(e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    trackEvent('matches_viewed');
    loadMatches();
  }, []);

  const monetization = useMemo(() => getMonetizationState(userId), [userId, usageTick]);
  const priorityRemaining = useMemo(() => getPriorityMatchRemaining(userId), [userId, usageTick, monetization]);
  const priorityActive = monetization.premium && monetization.priorityMatching;
  const displayedMatches = useMemo(() => {
    if (!priorityActive) return matches;
    return [...matches].sort((a, b) => {
      const aPriority = Number(a.match_score || 0) * 0.65 + Number(a.score_breakdown?.trust || 0) * 1.2 + Number(a.score_breakdown?.location_proximity || 0) * 0.35;
      const bPriority = Number(b.match_score || 0) * 0.65 + Number(b.score_breakdown?.trust || 0) * 1.2 + Number(b.score_breakdown?.location_proximity || 0) * 0.35;
      return bPriority - aPriority;
    });
  }, [matches, priorityActive]);

  const offeredList = currentUser?.skills?.filter(s => s.skill_type === 'OFFERED').map(s => s.skill_name) || [];
  const neededList = currentUser?.skills?.filter(s => s.skill_type === 'NEEDED').map(s => s.skill_name) || [];

  const disablePriority = () => {
    updateMonetizationState(userId, { priorityMatching: false });
    setUsageTick(v => v + 1);
    setNotice('Priority matching disabled. Regular matching is now available without the daily priority limit.');
  };

  const openProposal = (match: MatchResult) => {
    setNotice('');
    setPriorityProposal(priorityActive);
    setSelectedPartner(match.candidate);
    setDefaultPartnerSkill(match.they_offer?.[0] || '');
    setDefaultMySkill(match.matched_you_offer?.[0] || '');
    setIsProposeOpen(true);
  };

  const handleProposalSuccess = () => {
    if (priorityProposal) consumePriorityMatch(userId);
    setUsageTick(v => v + 1);
    setIsProposeOpen(false);
    setPriorityProposal(false);
    trackEvent('exchange_request_sent', { priority: priorityProposal });
    setNotice(priorityProposal ? 'Priority learning request sent.' : 'Learning request sent.');
    navigate('/exchanges');
  };

  return (
    <AppPageShell
      eyebrow="Learning matches"
      title="People who can teach what you want to learn"
      description="We match your learning goals with peers who can teach them — while showing where you can help each other."
      icon={<Sparkles className="h-3.5 w-3.5" />}
      actions={<Link to="/discover"><Button size="sm" variant="outline" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>Change learning preferences</Button></Link>}
    >
      <div className="grid gap-px border border-[#e1e4e8] bg-[#e1e4e8] lg:grid-cols-[1fr_1fr_220px]">
        <div className="bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">You can teach</p><p className="mt-2 text-sm font-bold text-[#17233b]">{offeredList.join(', ') || 'Add skills you can teach'}</p></div>
        <div className="bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">You want to learn</p><p className="mt-2 text-sm font-bold text-[#17233b]">{neededList.join(', ') || 'Add skills you want to learn'}</p></div>
        <div className="bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trust score</p><p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#d31d24]"><ShieldCheck className="h-4 w-4" />{Math.round(currentUser?.trust_score || 0)}/100</p></div>
      </div>

      {notice && <div className="mt-4 border border-red-100 bg-[#fff5f5] px-4 py-3 text-xs font-semibold text-[#b8171d]">{notice}</div>}
      {priorityActive && <div className="mt-4 flex flex-col gap-3 border border-red-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Crown className="h-4 w-4 text-[#d31d24]"/><div><p className="text-xs font-bold text-[#17233b]">Priority matching is active</p><p className="text-[10px] text-[#697386]">Recommendations use fit, trust and proximity. {priorityRemaining} priority actions remain today.</p></div></div><div className="flex items-center gap-2"><span className="border border-[#e1e4e8] bg-[#f7f8f7] px-2.5 py-1.5 text-[10px] font-bold text-slate-600">{priorityRemaining}/20 left</span><Button size="sm" variant="outline" onClick={disablePriority} icon={<Power className="h-3 w-3" />}>Use regular matching</Button></div></div>}
      {priorityActive && priorityRemaining === 0 && <div className="mt-3 border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"><b>Daily priority limit reached.</b> Turn off Priority Matching above to propose exchanges using the regular flow.</div>}

      <div className="mt-5 border border-[#ead0d1] bg-[#fff8f8] px-5 py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d31d24]">Your next step</p><h2 className="mt-1 text-sm font-bold text-[#17233b]">Pick one learning partner and send a simple request.</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">You do not need a perfect plan. Choose someone who can teach a skill you want, then use the suggested message to start the conversation.</p></div><div className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-slate-500"><span className="rounded-full border border-[#e1e4e8] bg-white px-2.5 py-1">1. Choose</span><ArrowRight className="h-3 w-3 text-[#d31d24]" /><span className="rounded-full border border-[#e1e4e8] bg-white px-2.5 py-1">2. Request</span></div></div></div>

      <div className="mt-5 border border-[#e1e4e8] bg-white">
        <div className="border-b border-[#e1e4e8] bg-[#f7f8f7] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{priorityActive ? 'Priority learning recommendations' : 'Recommended learning partners'}</div>
        {loading ? <div className="py-20 text-center text-sm text-slate-400">Finding peers who fit your learning goals…</div> : loadError ? <div className="px-5 py-16 text-center"><RefreshCw className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 text-sm font-bold text-[#17233b]">We couldn’t load your matches</h3><p className="mx-auto mt-1 max-w-md text-xs text-slate-500">Your profile is still safe. Try again, or use Discover to browse available learning partners.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Button size="sm" onClick={loadMatches} icon={<RefreshCw className="h-3.5 w-3.5" />}>Try again</Button><Link to="/discover"><Button size="sm" variant="outline" icon={<Users className="h-3.5 w-3.5" />}>Open Discover</Button></Link></div></div> : displayedMatches.length === 0 ? <div className="px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#ead0d1] bg-[#fff8f8]"><Users className="h-5 w-5 text-[#d31d24]" /></div><h3 className="mt-3 text-sm font-bold text-[#17233b]">There aren’t matching peers yet</h3><p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500">That can happen in a new community. Your profile is ready, but there may not be a peer who overlaps with your skills and location yet.</p><div className="mx-auto mt-5 grid max-w-2xl gap-3 text-left sm:grid-cols-3"><div className="border border-[#e1e4e8] bg-[#f7f8f7] p-3"><BookOpen className="h-4 w-4 text-[#d31d24]" /><p className="mt-2 text-[11px] font-bold text-[#17233b]">Add another skill</p><p className="mt-1 text-[10px] leading-4 text-slate-500">More teach/learn combinations create more chances to match.</p></div><div className="border border-[#e1e4e8] bg-[#f7f8f7] p-3"><MapPin className="h-4 w-4 text-[#d31d24]" /><p className="mt-2 text-[11px] font-bold text-[#17233b]">Widen your radius</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Include peers a little farther away when local supply is small.</p></div><div className="border border-[#e1e4e8] bg-[#f7f8f7] p-3"><Users className="h-4 w-4 text-[#d31d24]" /><p className="mt-2 text-[11px] font-bold text-[#17233b]">Bring in your peers</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Invite classmates or friends who can teach something useful.</p></div></div><div className="mt-5 flex flex-wrap justify-center gap-2"><Link to="/discover"><Button size="sm" icon={<Users className="h-3.5 w-3.5" />}>Browse Discover</Button></Link><Link to={`/profile/${userId}`}><Button size="sm" variant="outline" icon={<BookOpen className="h-3.5 w-3.5" />}>Update my skills</Button></Link><Button size="sm" variant="outline" onClick={() => navigate('/invite')} icon={<Share2 className="h-3.5 w-3.5" />}>Invite classmates</Button></div><p className="mt-4 text-[10px] text-slate-400">We’ll show new matches as more learners join and update their learning profiles.</p></div> : <div className="divide-y divide-[#e1e4e8]">
          {displayedMatches.map((match, idx) => <div key={idx} className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1.3fr)_220px] lg:items-center">
            <div className="flex items-start gap-3"><img src={match.candidate?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'} alt={match.candidate?.full_name} className="h-12 w-12 rounded-full border border-[#dfe3e8] object-cover" /><div className="min-w-0"><p className="truncate text-sm font-bold text-[#17233b]">{match.candidate?.full_name}</p><p className="truncate text-xs text-slate-500">{match.candidate?.headline || 'Student & Peer Learner'}</p><div className="mt-1.5 flex flex-wrap gap-2">{match.candidate?.verified&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#17233b]"><BadgeCheck className="h-3 w-3"/>Verified</span>}{match.candidate?.premium&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#d31d24]"><Crown className="h-3 w-3"/>Premium</span>}{match.candidate?.featured&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#d31d24]"><Rocket className="h-3 w-3"/>Featured</span>}</div><div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold"><span className="flex items-center gap-1 text-slate-500"><MapPin className="h-3 w-3 text-[#d31d24]" />{match.distance_display}</span><span className="text-slate-600">★ {Math.round(match.candidate?.trust_score || 0)}</span></div></div></div>
            <div><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Why this partner fits</span><span className="text-lg font-extrabold text-[#d31d24]">{match.match_score}%</span></div><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border border-[#e1e4e8] bg-[#f7f8f7] p-3 text-xs"><div><p className="text-[9px] font-bold uppercase text-slate-400">You can teach</p><p className="mt-1 truncate font-bold text-[#17233b]">{match.matched_you_offer?.[0] || offeredList[0] || 'Your skill'}</p></div><Repeat className="h-4 w-4 text-[#d31d24]" /><div className="text-right"><p className="text-[9px] font-bold uppercase text-slate-400">They can teach</p><p className="mt-1 truncate font-bold text-[#17233b]">{match.they_offer?.[0] || 'Their skill'}</p></div></div><div className="mt-3 space-y-1">{match.reasons.slice(0,4).map((r,i)=><p key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500"><CheckCircle className="h-3 w-3 text-[#d31d24]" />{r}</p>)}</div></div>
            <div className="border-t border-[#e1e4e8] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><div className="mb-3 space-y-2 text-[11px] text-slate-500"><p className="flex items-center justify-between"><span>Skills</span><b className="text-slate-700">{match.score_breakdown.skill_compatibility}/50</b></p><p className="flex items-center justify-between"><span>Proximity</span><b className="text-slate-700">{match.score_breakdown.location_proximity}/20</b></p><p className="flex items-center justify-between"><span>Trust</span><b className="text-slate-700">{match.score_breakdown.trust}/20</b></p><p className="flex items-center justify-between"><span>Availability</span><b className="text-slate-700">{match.score_breakdown.availability}/10</b></p></div><div className="mb-3 border-t border-[#e1e4e8] pt-2 text-[10px] text-slate-500"><span className="font-bold uppercase tracking-wider text-slate-400">Why connect?</span><p className="mt-1 text-[#17233b]">{match.reasons?.[0] || 'Your learning goal overlaps with what this peer can teach.'}</p></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Link to={`/profile/${match.candidate?.id}`} className="min-w-0"><Button size="sm" variant="outline" className="w-full whitespace-normal leading-4">View learning profile</Button></Link><Button size="sm" className="w-full whitespace-normal leading-4" onClick={() => openProposal(match)} icon={<ArrowRight className="h-3.5 w-3.5" />}>Start First Learning Exchange</Button></div></div>
          </div>)}
        </div>}
      </div>

      {selectedPartner && <ProposeExchangeModal isOpen={isProposeOpen} onClose={() => { setIsProposeOpen(false); setPriorityProposal(false); }} partner={selectedPartner} defaultPartnerSkill={defaultPartnerSkill} defaultMySkill={defaultMySkill} onSuccess={handleProposalSuccess} />}
    </AppPageShell>
  );
};
