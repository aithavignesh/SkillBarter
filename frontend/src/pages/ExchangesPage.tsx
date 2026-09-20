import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Exchange } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { ExchangeReviewModal } from '../components/exchange/ExchangeReviewModal';
import { AppPageShell } from '../components/ui/AppPageShell';
import { ArrowLeftRight, Repeat, CheckCircle2, Calendar, MessageSquare, Star, Sparkles, MapPin, Clock, ArrowUpRight, XCircle, BadgeCheck, Crown, Rocket } from 'lucide-react';

export const ExchangesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [reviewExchange, setReviewExchange] = useState<Exchange | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const loadExchanges = async () => {
    try { setLoading(true); setExchanges(await api.getExchanges()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadExchanges(); }, []);

  const visibleExchanges = activeTab === 'ALL'
    ? exchanges
    : exchanges.filter((exchange) => activeTab === 'PENDING'
      ? ['PENDING', 'COUNTERED'].includes(exchange.status)
      : exchange.status === activeTab);

  const action = async (fn: () => Promise<any>) => {
    try { await fn(); await loadExchanges(); }
    catch (e: any) { alert(e?.message || 'Action failed'); }
  };

  const tabs = [
    { id:'ALL', label:'All', count:exchanges.length },
    { id:'ACTIVE', label:'Active', count:exchanges.filter(e=>e.status==='ACTIVE').length },
    { id:'PENDING', label:'Pending', count:exchanges.filter(e=>e.status==='PENDING'||e.status==='COUNTERED').length },
    { id:'COMPLETED', label:'Completed', count:exchanges.filter(e=>e.status==='COMPLETED').length },
  ];
  const statusColors: Record<string, any> = { PENDING:'amber', ACCEPTED:'blue', ACTIVE:'emerald', COUNTERED:'purple', COMPLETED:'emerald', REJECTED:'rose', CANCELLED:'slate' };

  return (
    <AppPageShell
      eyebrow="Peer learning workspace"
      title="Your learning exchanges"
      description="Manage learning sessions, active skill exchanges, and completed peer-learning partnerships."
      icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
      actions={<Link to="/matches"><Button size="sm" icon={<Sparkles className="h-3.5 w-3.5" />}>Find a learning partner</Button></Link>}
    >
      <div className="border border-[#e1e4e8] bg-white px-3"><Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} /></div>
      <div className="mt-4 grid gap-px border border-[#e1e4e8] bg-[#e1e4e8] sm:grid-cols-3">
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. CONNECT</p><p className="mt-1 text-xs font-semibold text-[#17233b]">Accept a learning request</p><p className="mt-1 text-[10px] text-slate-500">Confirm that the learning goal works for you.</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. PLAN</p><p className="mt-1 text-xs font-semibold text-[#17233b]">Schedule the session</p><p className="mt-1 text-[10px] text-slate-500">Pick a time, duration and format before you meet.</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. LEARN</p><p className="mt-1 text-xs font-semibold text-[#17233b]">Complete the session</p><p className="mt-1 text-[10px] text-slate-500">Complete the session, confirm the outcome and leave a peer review.</p></div>
      </div>
      {!loading && exchanges.length > 0 && <div className="mt-4 border border-emerald-200 bg-emerald-50/50 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">After you send a request</p><p className="mt-1 text-xs font-semibold text-slate-800">Wait for your partner to accept, then agree on one small learning outcome and a session time.</p><p className="mt-1 text-[10px] text-slate-500">Keep the first exchange simple. You can refine the learning plan after they respond.</p></div>
          <Link to="/matches"><Button size="sm" variant="outline" icon={<Repeat className="h-3.5 w-3.5" />}>Find another partner</Button></Link>
        </div>
      </div>}
      {loading ? (
        <div className="mt-5 border border-[#e1e4e8] bg-white py-20 text-center text-sm text-slate-400">Loading exchange workspace…</div>
      ) : visibleExchanges.length === 0 ? (
        <div className="mt-5 border border-[#e1e4e8] bg-white py-20 text-center"><Repeat className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 text-sm font-bold text-[#17233b]">No learning exchanges here yet</h3><p className="mt-1 text-xs text-slate-500">Find a peer who can teach what you want to learn and send a simple learning request.</p><Link to="/discover" className="mt-4 inline-block"><Button size="sm">Find learning partners</Button></Link></div>
      ) : (
        <div className="mt-5 overflow-hidden border border-[#e1e4e8] bg-white">
          <div className="hidden grid-cols-[minmax(230px,1.2fr)_minmax(220px,1fr)_180px_190px] border-b border-[#e1e4e8] bg-[#f7f8f7] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:grid"><span>Learning partner</span><span>Learning plan</span><span>Status</span><span className="text-right">Actions</span></div>
          <div className="divide-y divide-[#e1e4e8]">
            {visibleExchanges.map((ex) => {
              const isRequester = currentUser?.id === ex.requester_id;
              const partner = isRequester ? ex.receiver : ex.requester;
              const myOffer = isRequester ? ex.requester_skill_name : ex.receiver_skill_name;
              const partnerOffer = isRequester ? ex.receiver_skill_name : ex.requester_skill_name;
              const myCompleted = isRequester ? ex.requester_completed : ex.receiver_completed;
              const partnerCompleted = isRequester ? ex.receiver_completed : ex.requester_completed;
              return (
                <div key={ex.id} className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(230px,1.2fr)_minmax(220px,1fr)_180px_190px] md:items-center">
                  <div className="flex min-w-0 items-center gap-3"><img src={partner.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'} alt={partner.full_name} className="h-11 w-11 shrink-0 rounded-full border border-[#dfe3e8] object-cover" /><div className="min-w-0"><p className="truncate text-sm font-bold text-[#17233b]">{partner.full_name}</p><p className="truncate text-xs text-slate-500">You teach: <b>{myOffer || 'Your skill'}</b></p><p className="truncate text-xs text-slate-500">You learn: <b>{partnerOffer || 'Their skill'}</b></p><div className="mt-1 flex gap-2">{partner.verified&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#17233b]"><BadgeCheck className="h-3 w-3"/>Verified</span>}{partner.premium&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#d31d24]"><Crown className="h-3 w-3"/>Premium</span>}{partner.featured&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#d31d24]"><Rocket className="h-3 w-3"/>Featured</span>}</div><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="h-3 w-3" />{partner.address_display || 'Local meetup'}</p></div></div>
                  <div className="space-y-1 text-[11px] text-slate-500"><p className="line-clamp-2 italic">“{ex.proposal_message || 'Learning exchange plan'}”</p><p className="flex flex-wrap gap-3"><span><Calendar className="mr-1 inline h-3 w-3" />{ex.preferred_date || 'Flexible'}</span><span><Clock className="mr-1 inline h-3 w-3" />~{ex.estimated_hours || 2}h</span></p></div>
                  <div><Badge variant={statusColors[ex.status] || 'slate'} size="md">{ex.status === 'PENDING' ? (isRequester ? 'You sent this request' : 'You received this request') : ex.status === 'ACTIVE' ? 'Ready to learn' : ex.status}</Badge><p className="mt-1 text-[10px] text-slate-400">{new Date(ex.created_at).toLocaleDateString()}</p></div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {ex.status === 'PENDING' && !isRequester && <><Button size="sm" variant="outline" onClick={() => action(()=>api.rejectExchange(ex.id))}>Decline</Button><Button size="sm" onClick={() => action(()=>api.acceptExchange(ex.id))}>Accept & Start Learning</Button></>}
                    {ex.status === 'PENDING' && isRequester && <><span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">Waiting for partner</span><Button size="sm" variant="outline" onClick={() => action(()=>api.withdrawExchange(ex.id))} icon={<XCircle className="h-3.5 w-3.5" />}>Withdraw</Button></>}
                    {ex.status === 'ACTIVE' && !myCompleted && <Button size="sm" onClick={() => action(async()=>{ const updated=await api.completeExchange(ex.id); if(updated.status==='COMPLETED'){setReviewExchange(updated);setIsReviewOpen(true);} })} icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Confirm Session Complete</Button>}
                    {ex.status === 'ACTIVE' && <><Link to={`/messages/${partner.id}`}><Button size="sm" variant="outline" icon={<MessageSquare className="h-3.5 w-3.5" />}>Message partner</Button></Link><Button size="sm" variant="ghost" onClick={() => { const reason = window.prompt('Why are you cancelling this exchange?'); if (reason?.trim()) void action(()=>api.cancelExchange(ex.id, reason.trim())); }}>Cancel</Button></>}
                    {ex.status === 'COMPLETED' && ex.user_can_review && <Button size="sm" onClick={()=>{setReviewExchange(ex);setIsReviewOpen(true);}} icon={<Star className="h-3.5 w-3.5" />}>Leave Peer Review</Button>}
                    {ex.status === 'COMPLETED' && ex.has_reviewed && <Link to="/matches"><Button size="sm" icon={<Repeat className="h-3.5 w-3.5" />}>Find Next Partner</Button></Link>}
                    <Link to={`/exchanges/${ex.id}`}><Button size="sm" variant="ghost" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>Open</Button></Link>
                  </div>
                  {ex.status === 'COMPLETED' && ex.has_reviewed && <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e1e4e8] pt-3"><p className="text-[11px] text-slate-500"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-[#d31d24]" />Session complete. Your feedback is helping build a trusted learning network.</p><Link to="/matches" className="text-[11px] font-bold text-[#d31d24] hover:underline">Continue learning →</Link></div>}
                  {ex.status === 'ACTIVE' && <div className="md:col-span-4 border-t border-[#e1e4e8] pt-3 text-[11px] text-slate-500">Completion: <b className="text-slate-700">You {myCompleted ? 'confirmed' : 'pending'}</b> · <b className="text-slate-700">{partner.full_name} {partnerCompleted ? 'confirmed' : 'pending'}</b></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {reviewExchange && <ExchangeReviewModal isOpen={isReviewOpen} onClose={()=>setIsReviewOpen(false)} exchange={reviewExchange} onSuccess={()=>{setIsReviewOpen(false);loadExchanges();}} />}
    </AppPageShell>
  );
};
