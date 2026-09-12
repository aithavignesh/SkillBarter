import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Exchange, Message } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ExchangeReviewModal } from '../components/exchange/ExchangeReviewModal';
import {
  ArrowLeft,
  Repeat,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  Send,
  ShieldCheck,
  Star,
  AlertTriangle
} from 'lucide-react';

export const ExchangeWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { lastMessageEvent } = useSocket();
  const navigate = useNavigate();

  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newTextMessage, setNewTextMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);

  const exchangeId = parseInt(id || '0', 10);

  const loadExchangeData = async () => {
    try {
      setLoading(true);
      const data = await api.getExchangeDetails(exchangeId);
      setExchange(data);

      const partnerId = currentUser?.id === data.requester_id ? data.receiver_id : data.requester_id;
      const msgs = await api.getMessages(partnerId);
      setMessages(msgs);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExchangeData();
  }, [exchangeId, currentUser?.id]);

  useEffect(() => {
    if (lastMessageEvent && lastMessageEvent.event === 'NEW_MESSAGE') {
      const partnerId = currentUser?.id === exchange?.requester_id ? exchange?.receiver_id : exchange?.requester_id;
      if (lastMessageEvent.data.sender_id === partnerId) {
        setMessages((prev) => [...prev, lastMessageEvent.data]);
      }
    }
  }, [lastMessageEvent]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTextMessage.trim() || !exchange) return;

    const partnerId = currentUser?.id === exchange.requester_id ? exchange.receiver_id : exchange.requester_id;
    try {
      const sent = await api.sendMessage({
        receiver_id: partnerId,
        content: newTextMessage.trim(),
        exchange_id: exchange.id,
      });
      setMessages((prev) => [...prev, sent]);
      setNewTextMessage('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleComplete = async () => {
    try {
      const updated = await api.completeExchange(exchangeId);
      setExchange(updated);
      if (updated.status === 'COMPLETED') {
        setReviewModalOpen(true);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    try {
      const updated = await api.cancelExchange(exchangeId, cancelReason.trim());
      setExchange(updated);
      setCancelModalOpen(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading || !exchange) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-xs text-slate-400">
        Loading exchange workspace...
      </div>
    );
  }

  const isRequester = currentUser?.id === exchange.requester_id;
  const partner = isRequester ? exchange.receiver : exchange.requester;
  const myOffer = isRequester ? exchange.requester_skill_name : exchange.receiver_skill_name;
  const partnerOffer = isRequester ? exchange.receiver_skill_name : exchange.requester_skill_name;
  const myCompleted = isRequester ? exchange.requester_completed : exchange.receiver_completed;
  const partnerCompleted = isRequester ? exchange.receiver_completed : exchange.requester_completed;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Back button & Status banner */}
      <div className="flex items-center justify-between">
        <Link to="/exchanges" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Back to Exchanges
        </Link>
        <Badge variant={exchange.status === 'ACTIVE' || exchange.status === 'COMPLETED' ? 'emerald' : 'amber'} size="md">
          {exchange.status}
        </Badge>
      </div>

      {/* Main Workspace Header Card */}
      <Card className="p-6 border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img
              src={partner.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
              alt={partner.full_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{partner.full_name}</h2>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ★ {Math.round(partner.trust_score)} Trust
                </span>
              </div>
              <p className="text-xs text-slate-500">{partner.headline || 'Community Partner'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {exchange.status === 'ACTIVE' && !myCompleted && (
              <Button size="sm" onClick={handleComplete} icon={<CheckCircle2 className="w-4 h-4" />}>
                Confirm My Completion
              </Button>
            )}

            {exchange.status === 'COMPLETED' && exchange.user_can_review && (
              <Button size="sm" onClick={() => setReviewModalOpen(true)} icon={<Star className="w-4 h-4 text-amber-300 fill-amber-300" />}>
                Leave Review
              </Button>
            )}

            {['PENDING', 'ACCEPTED', 'ACTIVE'].includes(exchange.status) && (
              <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setCancelModalOpen(true)}>
                Cancel Barter
              </Button>
            )}
          </div>
        </div>

        {/* 2-Way Barter Flow Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center items-center">
          <div className="text-left sm:text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">You Provide</span>
            <strong className="text-sm text-emerald-900 block mt-0.5">{myOffer || 'Web Development'}</strong>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Repeat className="w-4 h-4" />
            </div>
          </div>

          <div className="text-right sm:text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Partner Provides</span>
            <strong className="text-sm text-teal-900 block mt-0.5">{partnerOffer || 'Plumbing'}</strong>
          </div>
        </div>

        {/* Mutual Protocol Status */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
          <h4 className="text-xs font-bold text-emerald-900 mb-2">Mutual Completion Protocol:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${myCompleted ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                {myCompleted ? '✓' : '•'}
              </div>
              <span className={myCompleted ? 'font-bold text-emerald-900' : 'text-slate-600'}>
                You: {myCompleted ? 'Delivery confirmed' : 'Awaiting confirmation'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${partnerCompleted ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                {partnerCompleted ? '✓' : '•'}
              </div>
              <span className={partnerCompleted ? 'font-bold text-emerald-900' : 'text-slate-600'}>
                {partner.full_name}: {partnerCompleted ? 'Delivery confirmed' : 'Awaiting confirmation'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Embedded Live Chat Window */}
      <Card className="overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-slate-800">
              Exchange Chat with {partner.full_name}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Real-time WebSockets</span>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-white">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-400">
              No messages yet in this exchange. Say hello and coordinate your meetup!
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === currentUser?.id;
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs sm:max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-br-xs'
                        : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    <p>{m.content}</p>
                    <span className={`text-[9px] mt-1 block ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
          <input
            type="text"
            placeholder={`Message ${partner.full_name.split(' ')[0]}...`}
            value={newTextMessage}
            onChange={(e) => setNewTextMessage(e.target.value)}
            className="flex-1 text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button type="submit" size="sm" icon={<Send className="w-4 h-4" />}>
            Send
          </Button>
        </form>
      </Card>

      {/* Review Modal */}
      {reviewModalOpen && (
        <ExchangeReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          exchange={exchange}
          onSuccess={() => {
            alert('Review submitted! Community trust updated.');
            loadExchangeData();
          }}
        />
      )}
    </div>
  );
};
