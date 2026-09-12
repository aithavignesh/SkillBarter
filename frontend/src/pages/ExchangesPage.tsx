import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Exchange } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { ExchangeReviewModal } from '../components/exchange/ExchangeReviewModal';
import {
  ArrowLeftRight,
  Repeat,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MessageSquare,
  ShieldCheck,
  Star,
  Sparkles,
  MapPin
} from 'lucide-react';

export const ExchangesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // Review Modal State
  const [reviewExchange, setReviewExchange] = useState<Exchange | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);

  const loadExchanges = async () => {
    try {
      setLoading(true);
      const data = await api.getExchanges(activeTab !== 'ALL' ? activeTab : undefined);
      setExchanges(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExchanges();
  }, [activeTab]);

  const handleAccept = async (id: number) => {
    try {
      await api.acceptExchange(id);
      await loadExchanges();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.rejectExchange(id);
      await loadExchanges();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      const updated = await api.completeExchange(id);
      await loadExchanges();
      if (updated.status === 'COMPLETED') {
        setReviewExchange(updated);
        setIsReviewOpen(true);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const tabs = [
    { id: 'ALL', label: 'All Barters', count: exchanges.length },
    { id: 'ACTIVE', label: 'Active', count: exchanges.filter(e => e.status === 'ACTIVE').length },
    { id: 'PENDING', label: 'Pending Proposals', count: exchanges.filter(e => e.status === 'PENDING' || e.status === 'COUNTERED').length },
    { id: 'COMPLETED', label: 'Completed', count: exchanges.filter(e => e.status === 'COMPLETED').length },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <ArrowLeftRight className="w-4 h-4" /> Barter Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
            Skill Exchanges
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your incoming and outgoing peer-to-peer barter proposals and active work sessions
          </p>
        </div>

        <Link to="/matches">
          <Button size="sm" icon={<Sparkles className="w-4 h-4" />}>
            Find Skill Matches
          </Button>
        </Link>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-xs">
          Loading your skill exchanges...
        </div>
      ) : exchanges.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Repeat className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No exchanges in this category</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Find neighbors offering skills you need and propose a 1-for-1 trade!
          </p>
          <Link to="/discover">
            <Button size="sm" variant="outline" className="mt-2">
              Browse Nearby Skills
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {exchanges.map((ex) => {
            const isRequester = currentUser?.id === ex.requester_id;
            const partner = isRequester ? ex.receiver : ex.requester;
            const myOffer = isRequester ? ex.requester_skill_name : ex.receiver_skill_name;
            const partnerOffer = isRequester ? ex.receiver_skill_name : ex.requester_skill_name;
            const myCompleted = isRequester ? ex.requester_completed : ex.receiver_completed;
            const partnerCompleted = isRequester ? ex.receiver_completed : ex.requester_completed;

            const statusColors: Record<string, 'emerald' | 'amber' | 'blue' | 'purple' | 'slate' | 'rose'> = {
              PENDING: 'amber',
              ACCEPTED: 'blue',
              ACTIVE: 'emerald',
              COUNTERED: 'purple',
              COMPLETED: 'emerald',
              REJECTED: 'rose',
              CANCELLED: 'slate',
            };

            return (
              <Card key={ex.id} className="p-5 border-slate-200/90 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <img
                      src={partner.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                      alt={partner.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{partner.full_name}</h3>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ★ {Math.round(partner.trust_score)} Trust
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{partner.address_display || 'Local Neighbor'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[ex.status] || 'slate'} size="md">
                      {ex.status}
                    </Badge>
                    <span className="text-[11px] text-slate-400">
                      {new Date(ex.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Barter Pair Equation */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      You Provide:
                    </span>
                    <span className="font-bold text-emerald-900 block truncate">
                      {myOffer || 'Web Development'}
                    </span>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Repeat className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      You Receive:
                    </span>
                    <span className="font-bold text-teal-900 block truncate">
                      {partnerOffer || 'Plumbing'}
                    </span>
                  </div>
                </div>

                {/* Proposal Details & Logistics */}
                <div className="text-xs text-slate-600 space-y-2">
                  <p className="italic bg-white p-3 rounded-lg border border-slate-100">
                    "{ex.proposal_message}"
                  </p>

                  <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {ex.preferred_date || 'Flexible timing'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> ~{ex.estimated_hours} Hours estimated
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {ex.location_area || 'Public meetup'}
                    </span>
                  </div>
                </div>

                {/* Mutual Completion Status if ACTIVE */}
                {ex.status === 'ACTIVE' && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-bold text-emerald-900">Mutual Completion Status:</p>
                      <p className="text-[11px] text-emerald-800">
                        You: <strong>{myCompleted ? 'Confirmed ✓' : 'Pending'}</strong> • {partner.full_name}:{' '}
                        <strong>{partnerCompleted ? 'Confirmed ✓' : 'Pending'}</strong>
                      </p>
                    </div>

                    {!myCompleted && (
                      <Button
                        size="sm"
                        onClick={() => handleComplete(ex.id)}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                )}

                {/* Action Controls */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/exchanges/${ex.id}`}>
                    <Button variant="outline" size="sm">
                      Open Workspace
                    </Button>
                  </Link>

                  <div className="flex items-center gap-2">
                    {/* Receiver actions for PENDING */}
                    {ex.status === 'PENDING' && !isRequester && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(ex.id)}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(ex.id)}
                          icon={<CheckCircle2 className="w-4 h-4" />}
                        >
                          Accept Barter
                        </Button>
                      </>
                    )}

                    {/* Chat CTA if ACTIVE */}
                    {ex.status === 'ACTIVE' && (
                      <Link to={`/messages`}>
                        <Button size="sm" variant="outline" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                          Chat with {partner.full_name.split(' ')[0]}
                        </Button>
                      </Link>
                    )}

                    {/* Review CTA if COMPLETED */}
                    {ex.status === 'COMPLETED' && ex.user_can_review && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setReviewExchange(ex);
                          setIsReviewOpen(true);
                        }}
                        icon={<Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />}
                      >
                        Leave Community Review
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewExchange && (
        <ExchangeReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          exchange={reviewExchange}
          onSuccess={() => {
            alert('Review submitted! Community trust scores have been updated.');
            loadExchanges();
          }}
        />
      )}
    </div>
  );
};
