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
import { ArrowLeftRight, Repeat, CheckCircle2, Calendar, MessageSquare, Star, Sparkles, MapPin, Clock, ArrowUpRight, XCircle } from 'lucide-react';

export const ExchangesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [reviewExchange, setReviewExchange] = useState<Exchange | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const loadExchanges = async () => {
    try { setLoading(true); setExchanges(await api.getExchanges(activeTab !== 'ALL' ? activeTab : undefined)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadExchanges(); }, [activeTab]);

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
      eyebrow="Exchange workspace"
      title="Skill exchanges"
      description="Track proposals, active barters and completed exchanges from one operational workspace."
      icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
      actions={<Link to="/matches"><Button size="sm" icon={<Sparkles className="h-3.5 w-3.5" />}>Find a match</Button></Link>}
    >
      <div className="border border-[#e1e4e8] bg-white px-3"><Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} /></div>
      {loading ? (
        <div className="mt-5 border border-[#e1e4e8] bg-white py-20 text-center text-sm text-slate-400">Loading exchange workspace…</div>
      ) : exchanges.length === 0 ? (
        <div className="mt-5 border border-[#e1e4e8] bg-white py-20 text-center"><Repeat className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 text-sm font-bold text-[#17233b]">No exchanges in this view</h3><p className="mt-1 text-xs text-slate-500">Start with a smart match and send your first barter proposal.</p><Link to="/discover" className="mt-4 inline-block"><Button size="sm">Browse skills</Button></Link></div>
      ) : (
        <div className="mt-5 overflow-hidden border border-[#e1e4e8] bg-white">
          <div className="hidden grid-cols-[minmax(230px,1.2fr)_minmax(220px,1fr)_180px_190px] border-b border-[#e1e4e8] bg-[#f7f8f7] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:grid"><span>Partner / exchange</span><span>Details</span><span>Status</span><span className="text-right">Actions</span></div>
          <div className="divide-y divide-[#e1e4e8]">
            {exchanges.map((ex) => {
              const isRequester = currentUser?.id === ex.requester_id;
              const partner = isRequester ? ex.receiver : ex.requester;
              const myOffer = isRequester ? ex.requester_skill_name : ex.receiver_skill_name;
              const partnerOffer = isRequester ? ex.receiver_skill_name : ex.requester_skill_name;
              const myCompleted = isRequester ? ex.requester_completed : ex.receiver_completed;
              const partnerCompleted = isRequester ? ex.receiver_completed : ex.requester_completed;
              return (
                <div key={ex.id} className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(230px,1.2fr)_minmax(220px,1fr)_180px_190px] md:items-center">
                  <div className="flex min-w-0 items-center gap-3"><img src={partner.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'} alt={partner.full_name} className="h-11 w-11 shrink-0 rounded-full border border-[#dfe3e8] object-cover" /><div className="min-w-0"><p className="truncate text-sm font-bold text-[#17233b]">{partner.full_name}</p><p className="truncate text-xs text-slate-500">{myOffer || 'Your skill'} <span className="mx-1 text-[#d31d24]">↔</span> {partnerOffer || 'Their skill'}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="h-3 w-3" />{partner.address_display || 'Local meetup'}</p></div></div>
                  <div className="space-y-1 text-[11px] text-slate-500"><p className="line-clamp-2 italic">“{ex.proposal_message || 'Skill exchange proposal'}”</p><p className="flex flex-wrap gap-3"><span><Calendar className="mr-1 inline h-3 w-3" />{ex.preferred_date || 'Flexible'}</span><span><Clock className="mr-1 inline h-3 w-3" />~{ex.estimated_hours || 2}h</span></p></div>
                  <div><Badge variant={statusColors[ex.status] || 'slate'} size="md">{ex.status}</Badge><p className="mt-1 text-[10px] text-slate-400">{new Date(ex.created_at).toLocaleDateString()}</p></div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {ex.status === 'PENDING' && !isRequester && <><Button size="sm" variant="outline" onClick={() => action(()=>api.rejectExchange(ex.id))}>Decline</Button><Button size="sm" onClick={() => action(()=>api.acceptExchange(ex.id))}>Accept</Button></>}
                    {ex.status === 'PENDING' && isRequester && <Button size="sm" variant="outline" onClick={() => action(()=>api.cancelExchange(ex.id, 'Request withdrawn by requester'))} icon={<XCircle className="h-3.5 w-3.5" />}>Withdraw</Button>}
                    {ex.status === 'ACTIVE' && !myCompleted && <Button size="sm" onClick={() => action(async()=>{ const updated=await api.completeExchange(ex.id); if(updated.status==='COMPLETED'){setReviewExchange(updated);setIsReviewOpen(true);} })} icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Complete</Button>}
                    {ex.status === 'ACTIVE' && <><Link to={`/messages/${partner.id}`}><Button size="sm" variant="outline" icon={<MessageSquare className="h-3.5 w-3.5" />}>Chat</Button></Link><Button size="sm" variant="ghost" onClick={() => action(()=>api.cancelExchange(ex.id, 'Cancelled by participant'))}>Cancel</Button></>}
                    {ex.status === 'COMPLETED' && ex.user_can_review && <Button size="sm" onClick={()=>{setReviewExchange(ex);setIsReviewOpen(true);}} icon={<Star className="h-3.5 w-3.5" />}>Review</Button>}
                    <Link to={`/exchanges/${ex.id}`}><Button size="sm" variant="ghost" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>Open</Button></Link>
                  </div>
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
