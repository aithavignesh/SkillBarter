import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MatchResult, UserSummary } from '../types';
import { Button } from '../components/ui/Button';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Sparkles, Repeat, MapPin, ShieldCheck, CheckCircle, ArrowRight, SlidersHorizontal } from 'lucide-react';

export const SkillMatchesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [defaultPartnerSkill, setDefaultPartnerSkill] = useState('');
  const [defaultMySkill, setDefaultMySkill] = useState('');

  const loadMatches = async () => {
    try { setLoading(true); setMatches(await api.getMatches()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadMatches(); }, []);

  const offeredList = currentUser?.skills?.filter(s => s.skill_type === 'OFFERED').map(s => s.skill_name) || [];
  const neededList = currentUser?.skills?.filter(s => s.skill_type === 'NEEDED').map(s => s.skill_name) || [];
  const openProposal = (match: MatchResult) => {
    setSelectedPartner(match.candidate); setDefaultPartnerSkill(match.they_offer?.[0] || ''); setDefaultMySkill(match.matched_you_offer?.[0] || ''); setIsProposeOpen(true);
  };

  return (
    <AppPageShell
      eyebrow="Matching"
      title="Smart skill matches"
      description="See people whose offered and needed skills create a reciprocal exchange opportunity with you."
      icon={<Sparkles className="h-3.5 w-3.5" />}
      actions={<Link to="/discover"><Button size="sm" variant="outline" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>Adjust discovery</Button></Link>}
    >
      <div className="grid gap-px border border-[#e1e4e8] bg-[#e1e4e8] lg:grid-cols-[1fr_1fr_220px]">
        <div className="bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">You offer</p><p className="mt-2 text-sm font-bold text-[#17233b]">{offeredList.join(', ') || 'Add skills you can teach'}</p></div>
        <div className="bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">You need</p><p className="mt-2 text-sm font-bold text-[#17233b]">{neededList.join(', ') || 'Add skills you need'}</p></div>
        <div className="bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trust score</p><p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#d31d24]"><ShieldCheck className="h-4 w-4" />{Math.round(currentUser?.trust_score || 0)}/100</p></div>
      </div>

      <div className="mt-5 border border-[#e1e4e8] bg-white">
        <div className="border-b border-[#e1e4e8] bg-[#f7f8f7] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Recommended exchanges</div>
        {loading ? <div className="py-20 text-center text-sm text-slate-400">Calculating matches…</div> : matches.length === 0 ? <div className="py-20 text-center"><Repeat className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 text-sm font-bold text-[#17233b]">No reciprocal matches yet</h3><p className="mx-auto mt-1 max-w-md text-xs text-slate-500">Add more offered or needed skills to improve the set of possible trades.</p></div> : <div className="divide-y divide-[#e1e4e8]">
          {matches.map((match, idx) => <div key={idx} className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1.3fr)_220px] lg:items-center">
            <div className="flex items-start gap-3"><img src={match.candidate?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'} alt={match.candidate?.full_name} className="h-12 w-12 rounded-full border border-[#dfe3e8] object-cover" /><div className="min-w-0"><p className="truncate text-sm font-bold text-[#17233b]">{match.candidate?.full_name}</p><p className="truncate text-xs text-slate-500">{match.candidate?.headline || 'SkillBarter member'}</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold"><span className="flex items-center gap-1 text-slate-500"><MapPin className="h-3 w-3 text-[#d31d24]" />{match.distance_display}</span><span className="text-slate-600">★ {Math.round(match.candidate?.trust_score || 0)}</span></div></div></div>
            <div><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exchange fit</span><span className="text-lg font-extrabold text-[#d31d24]">{match.match_score}%</span></div><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border border-[#e1e4e8] bg-[#f7f8f7] p-3 text-xs"><div><p className="text-[9px] font-bold uppercase text-slate-400">You provide</p><p className="mt-1 truncate font-bold text-[#17233b]">{match.matched_you_offer?.[0] || offeredList[0] || 'Your skill'}</p></div><Repeat className="h-4 w-4 text-[#d31d24]" /><div className="text-right"><p className="text-[9px] font-bold uppercase text-slate-400">They provide</p><p className="mt-1 truncate font-bold text-[#17233b]">{match.they_offer?.[0] || 'Their skill'}</p></div></div><div className="mt-3 space-y-1">{match.reasons.slice(0,3).map((r,i)=><p key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500"><CheckCircle className="h-3 w-3 text-[#d31d24]" />{r}</p>)}</div></div>
            <div className="border-t border-[#e1e4e8] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><div className="mb-3 space-y-1 text-[11px] text-slate-500"><p className="flex justify-between"><span>Skills</span><b className="text-slate-700">{match.score_breakdown.skill_compatibility}/50</b></p><p className="flex justify-between"><span>Proximity</span><b className="text-slate-700">{match.score_breakdown.location_proximity}/20</b></p><p className="flex justify-between"><span>Trust</span><b className="text-slate-700">{match.score_breakdown.trust}/20</b></p></div><Button size="sm" className="w-full" onClick={() => openProposal(match)} icon={<ArrowRight className="h-3.5 w-3.5" />}>Propose exchange</Button></div>
          </div>)}
        </div>}
      </div>

      {selectedPartner && <ProposeExchangeModal isOpen={isProposeOpen} onClose={() => setIsProposeOpen(false)} partner={selectedPartner} defaultPartnerSkill={defaultPartnerSkill} defaultMySkill={defaultMySkill} onSuccess={() => { setIsProposeOpen(false); alert('Exchange request sent successfully!'); }} />}
    </AppPageShell>
  );
};
