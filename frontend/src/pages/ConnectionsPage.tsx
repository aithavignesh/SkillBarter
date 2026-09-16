import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Connection, UserSummary } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Users, UserPlus, MessageSquare, Repeat, MapPin, UserMinus, ArrowUpRight } from 'lucide-react';

const avatar = (url?: string) => url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80';

export const ConnectionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('CONNECTIONS');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [nearby, setNearby] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [conns, suggs, near] = await Promise.all([
        api.getConnections(),
        api.getConnectionSuggestions(),
        api.getNearbyUsers(15),
      ]);
      setConnections(conns);
      setSuggestions(suggs);
      setNearby(near);
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
      alert(e?.message || 'Could not connect');
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
    { id: 'CONNECTIONS', label: 'My Connections', count: connections.length },
    { id: 'NEARBY', label: 'Nearby', count: nearby.length },
    { id: 'SUGGESTIONS', label: 'Suggested', count: suggestions.length },
  ];

  const people = activeTab === 'CONNECTIONS'
    ? connections.map((c) => ({ ...c.partner, _connectionId: c.id }))
    : activeTab === 'NEARBY' ? nearby : suggestions;

  return (
    <AppPageShell
      eyebrow="Network"
      title="Connections"
      description="Build a trusted local network, start conversations and turn promising profiles into real skill exchanges."
      icon={<Users className="h-3.5 w-3.5" />}
      actions={<Link to="/discover"><Button size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>Discover skills</Button></Link>}
    >
      <div className="grid grid-cols-2 gap-px border border-[#e1e4e8] bg-[#e1e4e8] sm:grid-cols-4">
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connections</p><p className="mt-1 text-2xl font-extrabold text-[#17233b]">{connections.length}</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nearby</p><p className="mt-1 text-2xl font-extrabold text-[#17233b]">{nearby.length}</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggestions</p><p className="mt-1 text-2xl font-extrabold text-[#17233b]">{suggestions.length}</p></div>
        <div className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Network mode</p><p className="mt-1 text-sm font-bold text-[#d31d24]">Local first</p></div>
      </div>

      <div className="mt-5 border-b border-[#e1e4e8] bg-white px-2"><Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} /></div>

      {loading ? (
        <div className="border border-[#e1e4e8] bg-white py-20 text-center text-sm text-slate-400">Loading your network…</div>
      ) : people.length === 0 ? (
        <Card className="border-[#e1e4e8] bg-white p-14 text-center">
          <Users className="mx-auto h-9 w-9 text-slate-300" />
          <h3 className="mt-3 text-base font-bold text-[#17233b]">Nothing here yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Discover nearby people, connect with them and build your barter circle.</p>
        </Card>
      ) : (
        <div className="overflow-hidden border border-[#e1e4e8] bg-white">
          <div className="hidden grid-cols-[minmax(240px,1.4fr)_1fr_150px_190px] border-b border-[#e1e4e8] bg-[#f7f8f7] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:grid">
            <span>Person</span><span>Location / trust</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-[#e1e4e8]">
            {people.map((u: any) => (
              <div key={u.id} className="grid gap-4 px-5 py-4 transition hover:bg-[#fafafa] md:grid-cols-[minmax(240px,1.4fr)_1fr_150px_190px] md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={avatar(u.avatar_url)} alt={u.full_name} className="h-11 w-11 shrink-0 rounded-full object-cover border border-[#dfe3e8]" />
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-[#17233b]">{u.full_name}</p><p className="truncate text-xs text-slate-500">{u.headline || 'SkillBarter member'}</p></div>
                </div>
                <div className="text-xs text-slate-500"><p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#d31d24]" />{u.distance_display || u.address_display || 'Local'}</p><p className="mt-1 font-semibold text-slate-700">★ {Math.round(u.trust_score || 0)} trust</p></div>
                <div><span className="inline-flex border border-[#ead0d1] bg-[#fff6f6] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#b8171d]">{activeTab === 'CONNECTIONS' ? 'Connected' : activeTab === 'NEARBY' ? 'Nearby' : 'Suggested'}</span></div>
                <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                  {activeTab === 'CONNECTIONS' ? <>
                    <Button size="sm" variant="outline" onClick={() => openProposal(u)} icon={<Repeat className="h-3.5 w-3.5" />}>Barter</Button>
                    <Link to={`/messages/${u.id}`}><Button size="sm" variant="ghost" icon={<MessageSquare className="h-3.5 w-3.5" />}>Chat</Button></Link>
                    <Button size="sm" variant="ghost" disabled={busyId === u.id} onClick={() => handleDisconnect(u.id)}><UserMinus className="h-4 w-4" /></Button>
                  </> : <>
                    <Button size="sm" disabled={busyId === u.id} onClick={() => handleConnect(u.id)} icon={<UserPlus className="h-3.5 w-3.5" />}>{busyId === u.id ? 'Working…' : 'Connect'}</Button>
                    <Button size="sm" variant="outline" onClick={() => openProposal(u)} icon={<Repeat className="h-3.5 w-3.5" />}>Propose</Button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPartner && <ProposeExchangeModal isOpen={isProposeOpen} onClose={() => setIsProposeOpen(false)} partner={selectedPartner} onSuccess={() => { setIsProposeOpen(false); alert('Proposal sent!'); }} />}
    </AppPageShell>
  );
};
