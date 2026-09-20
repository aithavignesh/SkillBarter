import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { AppPageShell } from '../components/ui/AppPageShell';
import { useAuth } from '../context/AuthContext';
import { Users, MessageSquare, Repeat, MapPin, ArrowUpRight, Check, X, Clock, Sparkles } from 'lucide-react';

const avatar = (url?: string) => url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80';

type NetworkPerson = any;

export const ConnectionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('PARTNERS');
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [nearby, setNearby] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<NetworkPerson | null>(null);
  const [defaultPartnerSkill, setDefaultPartnerSkill] = useState('');
  const [defaultMySkill, setDefaultMySkill] = useState('');
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [exchangeResult, nearbyResult, matchResult] = await Promise.allSettled([
      api.getExchanges(),
      api.getNearbyUsers(15),
      api.getMatches(),
    ]);
    if (exchangeResult.status === 'fulfilled') setExchanges(exchangeResult.value);
    if (nearbyResult.status === 'fulfilled') setNearby(nearbyResult.value);
    if (matchResult.status === 'fulfilled') setSuggestions(matchResult.value);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const partners = useMemo(() => {
    const seen = new Set<number>();
    return exchanges
      .filter((ex) => ['ACCEPTED', 'ACTIVE', 'COMPLETED'].includes(ex.status))
      .map((ex) => Number(ex.requester_id) === Number(currentUser?.id) ? ex.receiver : ex.requester)
      .filter((person) => person?.id && !seen.has(Number(person.id)) && seen.add(Number(person.id)));
  }, [exchanges, currentUser?.id]);

  const pendingRequests = useMemo(
    () => exchanges.filter((ex) => ex.status === 'PENDING'),
    [exchanges],
  );

  const openProposal = (user: NetworkPerson) => {
    setSelectedPartner(user);
    setDefaultPartnerSkill(user.skills_offered?.[0] || '');
    setDefaultMySkill(currentUser?.skills?.find((s: any) => s.skill_type === 'OFFERED')?.skill_name || '');
    setIsProposeOpen(true);
  };

  const handleRequest = async (id: number, action: 'accept' | 'reject') => {
    try {
      setBusyId(id);
      if (action === 'accept') await api.acceptExchange(id);
      else await api.rejectExchange(id);
      setNotice(action === 'accept' ? 'Learning request accepted.' : 'Learning request declined.');
      await loadData();
    } catch (e: any) {
      setNotice(e?.message || `Could not ${action} the learning request.`);
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { id: 'PARTNERS', label: 'Learning Partners', count: partners.length },
    { id: 'REQUESTS', label: 'Learning Requests', count: pendingRequests.length },
    { id: 'NEARBY', label: 'Nearby Learners', count: nearby.length },
    { id: 'SUGGESTIONS', label: 'Suggested Learners', count: suggestions.length },
  ];

  const people: NetworkPerson[] = activeTab === 'PARTNERS'
    ? partners
    : activeTab === 'NEARBY'
      ? nearby
      : activeTab === 'SUGGESTIONS'
        ? suggestions.map((m: any) => m.candidate).filter(Boolean)
        : pendingRequests.map((ex) => Number(ex.requester_id) === Number(currentUser?.id) ? ex.receiver : ex.requester).filter(Boolean);

  return (
    <AppPageShell
      eyebrow="Learning network"
      title="Learning Network"
      description="Keep your learning relationships in one place, then turn a promising peer into your next learning exchange."
      icon={<Users className="h-3.5 w-3.5" />}
      actions={<Link to="/discover"><Button size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>Find learning partners</Button></Link>}
    >
      <div className="grid grid-cols-2 gap-px border border-[#e1e4e8] bg-[#e1e4e8] sm:grid-cols-4">
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Learning partners</p><p className="mt-1 text-2xl font-extrabold text-[#17233b]">{partners.length}</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Open requests</p><p className="mt-1 text-2xl font-extrabold text-[#d31d24]">{pendingRequests.length}</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nearby learners</p><p className="mt-1 text-2xl font-extrabold text-[#17233b]">{nearby.length}</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#d31d24]">Discovery</p><p className="mt-1 text-sm font-bold text-[#d31d24]">Learning first</p></div>
      </div>

      {notice && <div className="mt-4 flex items-center justify-between border border-[#ead0d1] bg-[#fff6f6] px-4 py-3 text-xs font-semibold text-[#b8171d]"><span>{notice}</span><button onClick={() => setNotice('')} className="font-bold underline">Dismiss</button></div>}

      <div className="mt-5 border-b border-[#e1e4e8] bg-white px-2"><Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} /></div>

      {loading ? (
        <div className="border border-[#e1e4e8] bg-white py-20 text-center text-sm text-slate-400">Loading your learning network…</div>
      ) : people.length === 0 ? (
        <Card className="border-[#e1e4e8] bg-white p-14 text-center">
          {activeTab === 'REQUESTS' ? <Clock className="mx-auto h-9 w-9 text-slate-300" /> : <Users className="mx-auto h-9 w-9 text-slate-300" />}
          <h3 className="mt-3 text-base font-bold text-[#17233b]">{activeTab === 'REQUESTS' ? 'No open learning requests' : activeTab === 'PARTNERS' ? 'Your learning network is just getting started' : 'No learners found here yet'}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{activeTab === 'REQUESTS' ? 'New learning requests will appear here.' : 'Find a peer who can teach what you want to learn and start a focused exchange.'}</p>
          {activeTab !== 'REQUESTS' && <Link to="/discover" className="mt-4 inline-block"><Button size="sm" icon={<Sparkles className="h-3.5 w-3.5" />}>Find learning partners</Button></Link>}
        </Card>
      ) : (
        <div className="overflow-hidden border border-[#e1e4e8] bg-white">
          <div className="hidden grid-cols-[minmax(240px,1.4fr)_1fr_150px_220px] border-b border-[#e1e4e8] bg-[#f7f8f7] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:grid">
            <span>Learning partner</span><span>Location / trust</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-[#e1e4e8]">
            {people.map((u: any) => {
              const pending = activeTab === 'REQUESTS';
              const request = pendingRequests.find((ex) => Number(ex.requester_id) === Number(u.id) || Number(ex.receiver_id) === Number(u.id));
              const isIncoming = Boolean(request && Number(request.receiver_id) === Number(currentUser?.id));
              return (
                <div key={u.id} className="grid gap-4 px-5 py-4 transition hover:bg-[#fafafa] md:grid-cols-[minmax(240px,1.4fr)_1fr_150px_220px] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <Link to={`/profile/${u.id}`}><img src={avatar(u.avatar_url)} alt={u.full_name} className="h-11 w-11 shrink-0 rounded-full object-cover border border-[#dfe3e8]" /></Link>
                    <div className="min-w-0">
                      <Link to={`/profile/${u.id}`} className="truncate text-sm font-bold text-[#17233b] hover:text-[#d31d24]">{u.full_name || 'Learning peer'}</Link>
                      <p className="truncate text-xs text-slate-500">{u.headline || 'Student & Peer Learner'}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500"><p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#d31d24]" />{u.distance_display || u.address_display || 'Location not set'}</p><p className="mt-1 font-semibold text-slate-700">★ {Math.round(Number(u.trust_score) || 0)} trust</p></div>
                  <div><span className="inline-flex border border-[#ead0d1] bg-[#fff6f6] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#b8171d]">{pending ? (isIncoming ? 'Incoming' : 'Sent') : activeTab === 'PARTNERS' ? 'Learning partner' : activeTab === 'NEARBY' ? 'Nearby' : 'Suggested'}</span></div>
                  <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                    {pending ? isIncoming ? <>
                      <Button size="sm" disabled={busyId === request?.id} onClick={() => request && handleRequest(request.id, 'accept')} icon={<Check className="h-3.5 w-3.5" />}>Accept</Button>
                      <Button size="sm" variant="outline" disabled={busyId === request?.id} onClick={() => request && handleRequest(request.id, 'reject')} icon={<X className="h-3.5 w-3.5" />}>Decline</Button>
                    </> : <Link to="/exchanges"><Button size="sm" variant="outline">View request</Button></Link> : <>
                      <Button size="sm" onClick={() => openProposal(u)} icon={<Repeat className="h-3.5 w-3.5" />}>Start Learning Exchange</Button>
                      {activeTab === 'PARTNERS' && <Link to={`/messages/${u.id}`}><Button size="sm" variant="ghost" icon={<MessageSquare className="h-3.5 w-3.5" />}>Message</Button></Link>}
                    </>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedPartner && <ProposeExchangeModal isOpen={isProposeOpen} onClose={() => setIsProposeOpen(false)} partner={selectedPartner} defaultPartnerSkill={defaultPartnerSkill} defaultMySkill={defaultMySkill} onSuccess={() => { setIsProposeOpen(false); setNotice('Learning request sent. Check Learning Exchanges for the next step.'); loadData(); }} />}
    </AppPageShell>
  );
};
