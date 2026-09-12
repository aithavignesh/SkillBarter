import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Connection, UserSummary } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { Users, UserPlus, MessageSquare, Repeat, MapPin, Sparkles, UserMinus } from 'lucide-react';

export const ConnectionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('CONNECTIONS');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [nearby, setNearby] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Propose Modal
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState<boolean>(false);

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

  useEffect(() => {
    loadData();
  }, []);

  const handleDisconnect = async (userId: number) => {
    try {
      await api.disconnectNeighbor(userId);
      setConnections(connections.filter(c => c.partner.id !== userId));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleConnect = async (userId: number) => {
    try {
      await api.connectNeighbor(userId);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const tabs = [
    { id: 'CONNECTIONS', label: 'My Connections', count: connections.length },
    { id: 'NEARBY', label: 'Nearby Neighbors', count: nearby.length },
    { id: 'SUGGESTIONS', label: 'Suggested Barters', count: suggestions.length },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
          <Users className="w-4 h-4" /> Neighborhood Network
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
          Connections
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Build long-term barter relationships with skilled residents in your neighborhood
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <div className="text-center py-20 text-xs text-slate-400">Loading connections...</div>
      ) : activeTab === 'CONNECTIONS' ? (
        connections.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No connections yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Browse nearby neighbors or complete a skill exchange to grow your local circle!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((conn) => (
              <Card key={conn.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-3">
                  <img
                    src={conn.partner?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                    alt={conn.partner?.full_name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate">{conn.partner?.full_name}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{conn.partner?.headline || 'Neighbor'}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>{conn.partner?.address_display || 'Local'}</span>
                      <span>•</span>
                      <span className="font-bold text-emerald-700">★ {Math.round(conn.partner?.trust_score)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPartner(conn.partner);
                      setIsProposeOpen(true);
                    }}
                    icon={<Repeat className="w-3.5 h-3.5" />}
                  >
                    Barter
                  </Button>
                  <Link to="/messages">
                    <Button size="sm" variant="ghost" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                      Chat
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisconnect(conn.partner.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : activeTab === 'NEARBY' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {nearby.map((u) => (
            <Card key={u.id} className="p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-start gap-3">
                <img
                  src={u.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                  alt={u.full_name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">{u.full_name}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{u.headline || 'Neighbor'}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {u.distance_display || 'Nearby'}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-slate-700">★ {Math.round(u.trust_score)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button size="sm" onClick={() => handleConnect(u.id)} icon={<UserPlus className="w-3.5 h-3.5" />}>
                  Connect
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPartner(u);
                    setIsProposeOpen(true);
                  }}
                  icon={<Repeat className="w-3.5 h-3.5" />}
                >
                  Propose
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map((u) => (
            <Card key={u.id} className="p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-start gap-3">
                <img
                  src={u.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                  alt={u.full_name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">{u.full_name}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{u.headline || 'Neighbor'}</p>
                  <span className="inline-block mt-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                    {u.distance_display}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button size="sm" onClick={() => handleConnect(u.id)} icon={<UserPlus className="w-3.5 h-3.5" />}>
                  Connect
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPartner(u);
                    setIsProposeOpen(true);
                  }}
                  icon={<Repeat className="w-3.5 h-3.5" />}
                >
                  Propose
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Propose Exchange Modal */}
      {selectedPartner && (
        <ProposeExchangeModal
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          partner={selectedPartner}
          onSuccess={() => alert('Proposal sent!')}
        />
      )}
    </div>
  );
};
