import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Connection, UserSummary } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Users, UserPlus, MessageSquare, Repeat, MapPin, UserMinus, ArrowUpRight, Check, X, Clock, BadgeCheck, Crown, Rocket } from 'lucide-react';

const avatar = (url?: string) => url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80';

export const ConnectionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('CONNECTIONS');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [nearby, setNearby] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [conns, suggs, near, reqs] = await Promise.all([
        api.getConnections(),
        api.getConnectionSuggestions(),
        api.getNearbyUsers(15),
        (api as any).getConnectionRequests(),
      ]);
      setConnections(conns);
      setSuggestions(suggs);
      setNearby(near);
      setRequests(reqs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleConnect = async (id: number) => {
    try {
      setBusyId(id);
      await api.connectNeighbor(id);
      await loadData();
    } catch (e: any) {
      alert(e?.message || 'Could not send connection request');
    } finally { setBusyId(null); }
  };

  const handleRequest = async (id: number, action: 'accept' | 'reject') => {
    try {
      setBusyId(id);
      if (action === 'accept') await (api as any).acceptConnectionRequest(id);
      else await (api as any).rejectConnectionRequest(id);
      await loadData();
    } catch (e: any) {
      alert(e?.message || `Could not ${action} connection request`);
    } finally { setBusyId(null); }
  };

  const handleDisconnect = async (id: number) => {
    if (!window.confirm('Remove this connection?')) return;
    try {
      setBusyId(id);
      await api.disconnectNeighbor(id);
      setConnections((items) => items.filter((c) => c.partner.id !== id));
    } catch (e: any) {
      alert(e?.message || 'Could not remove connection');
    } finally { setBusyId(null); }
  };

  const openProposal = (user: UserSummary) => {
    setSelectedPartner(user);
    setIsProposeOpen(true);
  };

  const tabs = [
    { id: 'CONNECTIONS', label: 'Learning Partners', count: connections.length },
    { id: 'REQUESTS', label: 'Learning Requests', count: requests.length },
    { id: 'NEARBY', label: 'Nearby Learners', count: nearby.length },
    { id: 'SUGGESTIONS', label: 'Suggested Learners', count: suggestions.length },
  ];

  const people = activeTab === 'CONNECTIONS'
    ? connections.map((c) => ({ ...c.partner, _connectionId: c.id }))
    : activeTab === 'REQUESTS'
      ? requests.map((r) => ({ ...r.requester, _requestId: r.id }))
      : activeTab === 'NEARBY' ? nearby : suggestions;

  return (
    <AppPageShell
      eyebrow="Learning network"
      title="Learning Network"
      description="Build a trusted peer network, start conversations and turn promising profiles into real learning exchanges."
      icon={<Users className="h-3.5 w-3.5" />}
      actions={<Link to="/discover"><Button size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>Find learning partners</Button></Link>}
    >
      <div className="grid grid-cols-2 gap-px border border-[#e1e4e8] bg-[#e1e4e8] sm:grid-cols-4">
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connections</p><p className="mt-1 text-2xl font-extrabold text-[#17233b]">{connections.length}</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Requests</p><p className="mt-1 text-2xl font-extrabold text-[#d31d24]">{requests.length}</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nearby</p><p className="mt-1 text-2xl font-extrabold text-[#17233b]">{nearby.length}</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Discovery mode</p><p className="mt-1 text-sm font-bold text-[#d31d24]">Learning first</p></div>
      </div>

      {notice && <div className="mt-4 flex items-center justify-between border border-[#ead0d1] bg-[#fff6f6] px-4 py-3 text-xs font-semibold text-[#b8171d]"><span>{notice}</span><button onClick={()=>setNotice('')} className="font-bold underline">Dismiss</button></div>}

      <div className="mt-5 border-b border-[#e1e4e8] bg-white px-2"><Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} /></div>

      {loading ? (
        <div className="border border-[#e1e4e8] bg-white py-20 text-center text-sm text-slate-400">Loading your network…</div>
      ) : people.length === 0 ? (
        <Card className="border-[#e1e4e8] bg-white p-14 text-center">
          {activeTab === 'REQUESTS' ? <Clock className="mx-auto h-9 w-9 text-slate-300" /> : <Users className="mx-auto h-9 w-9 text-slate-300" />}
          <h3 className="mt-3 text-base font-bold text-[#17233b]">{activeTab === 'REQUESTS' ? 'No pending requests' : 'Nothing here yet'}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{activeTab === 'REQUESTS' ? 'New connection requests will appear here.' : 'Find peers who can teach what you want to learn and grow your learning network.'}</p>
        </Card>
      ) : (
        <div className="overflow-hidden border border-[#e1e4e8] bg-white">
          <div className="hidden grid-cols-[minmax(240px,1.4fr)_1fr_150px_190px] border-b border-[#e1e4e8] bg-[#f7f8f7] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:grid">
            <span>Learning partner</span><span>Location / trust</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-[#e1e4e8]">
            {people.map((u: any) => (
              <div key={u.id} className="grid gap-4 px-5 py-4 transition hover:bg-[#fafafa] md:grid-cols-[minmax(240px,1.4fr)_1fr_150px_190px] md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <Link to={`/profile/${u.id}`}><img src={avatar(u.avatar_url)} alt={u.full_name} className="h-11 w-11 shrink-0 rounded-full object-cover border border-[#dfe3e8]" /></Link>
                  <div className="min-w-0"><Link to={`/profile/${u.id}`} className="truncate text-sm font-bold text-[#17233b] hover:text-[#d31d24]">{u.full_name}</Link><p className="truncate text-xs text-slate-500">{u.headline || 'Student & Peer Learner'}</p><div className="mt-1 flex flex-wrap gap-2">{u.verified&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#17233b]"><BadgeCheck className="h-3 w-3"/>Verified</span>}{u.premium&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#d31d24]"><Crown className="h-3 w-3"/>Premium</span>}{u.featured&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#d31d24]"><Rocket className="h-3 w-3"/>Featured</span>}</div></div>
                </div>
                <div className="text-xs text-slate-500"><p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#d31d24]" />{u.distance_display || u.address_display || 'Local'}</p><p className="mt-1 font-semibold text-slate-700">★ {Math.round(u.trust_score || 0)} trust</p></div>
                <div><span className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'REQUESTS' ? 'border-[#f0d6b8] bg-[#fff8ef] text-[#9a5a00]' : 'border-[#ead0d1] bg-[#fff6f6] text-[#b8171d]'}`}>{activeTab === 'CONNECTIONS' ? 'Connected' : activeTab === 'REQUESTS' ? 'Pending' : activeTab === 'NEARBY' ? 'Nearby' : 'Suggested'}</span></div>
                <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                  {activeTab === 'CONNECTIONS' ? <>
                    <Button size="sm" variant="outline" onClick={() => openProposal(u)} icon={<Repeat className="h-3.5 w-3.5" />}>Start Learning Exchange</Button>
                    <Link to={`/messages/${u.id}`}><Button size="sm" variant="ghost" icon={<MessageSquare className="h-3.5 w-3.5" />}>Message</Button></Link>
                    <Button size="sm" variant="ghost" disabled={busyId === u.id} onClick={() => handleDisconnect(u.id)}><UserMinus className="h-4 w-4" /></Button>
                  </> : activeTab === 'REQUESTS' ? <>
                    <Button size="sm" disabled={busyId === u._requestId} onClick={() => handleRequest(u._requestId, 'accept')} icon={<Check className="h-3.5 w-3.5" />}>Accept</Button>
                    <Button size="sm" variant="outline" disabled={busyId === u._requestId} onClick={() => handleRequest(u._requestId, 'reject')} icon={<X className="h-3.5 w-3.5" />}>Decline</Button>
                  </> : <>
                    <Button size="sm" disabled={busyId === u.id} onClick={() => handleConnect(u.id)} icon={<UserPlus className="h-3.5 w-3.5" />}>{busyId === u.id ? 'Sending…' : 'Connect'}</Button>
                    <Button size="sm" variant="outline" onClick={() => openProposal(u)} icon={<Repeat className="h-3.5 w-3.5" />}>Start Learning Exchange</Button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPartner && <ProposeExchangeModal isOpen={isProposeOpen} onClose={() => setIsProposeOpen(false)} partner={selectedPartner} onSuccess={() => { setIsProposeOpen(false); setNotice('Learning request sent. Check Learning Exchanges for the next step.'); }} />}
    </AppPageShell>
  );
};
