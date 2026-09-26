import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { trackEvent } from '../services/analytics';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Exchange, Message } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ExchangeReviewModal } from '../components/exchange/ExchangeReviewModal';
import { Modal } from '../components/ui/Modal';
import { ArrowLeft, Repeat, CheckCircle2, Send, Circle, Star, X, MessageSquare, Calendar, Clock, MapPin, ShieldCheck, BadgeCheck, Crown, Rocket } from 'lucide-react';

export const ExchangeWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { lastMessageEvent } = useSocket();
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newTextMessage, setNewTextMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState<boolean>(false);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleHours, setScheduleHours] = useState<string>('2');
  const [scheduleArea, setScheduleArea] = useState<string>('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [messagesError, setMessagesError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [exchangeActionPending, setExchangeActionPending] = useState(false);

  const exchangeId = Number(id || 0);

  const loadExchangeData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      setActionError('');
      setMessagesError('');
      setExchange(null);
      setMessages([]);
      const data = await api.getExchange(exchangeId);
      setExchange(data);
      trackEvent('exchange_workspace_viewed', { exchange_status: data.status });
      const partnerId = currentUser?.id === data.requester_id ? data.receiver_id : data.requester_id;
      try {
        setMessages(await api.getMessages(partnerId));
      } catch (e) {
        console.error(e);
        setMessagesError('Messages are temporarily unavailable. You can still review the exchange details.');
      }
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : 'Unable to load this exchange.');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { if (exchangeId) loadExchangeData(); }, [exchangeId, currentUser?.id]);

  useEffect(() => {
    if (lastMessageEvent?.event !== 'NEW_MESSAGE' || !exchange) return;
    const partnerId = currentUser?.id === exchange.requester_id ? exchange.receiver_id : exchange.requester_id;
    if (Number(lastMessageEvent.data.sender_id) === Number(partnerId)) setMessages(prev => [...prev, lastMessageEvent.data]);
  }, [lastMessageEvent, exchange, currentUser?.id]);

  const isRequester = currentUser?.id === exchange?.requester_id;
  const partner = exchange ? (isRequester ? exchange.receiver : exchange.requester) : null;
  const myOffer = exchange ? (isRequester ? exchange.requester_skill_name : exchange.receiver_skill_name) : '';
  const partnerOffer = exchange ? (isRequester ? exchange.receiver_skill_name : exchange.requester_skill_name) : '';
  const myCompleted = exchange ? (isRequester ? exchange.requester_completed : exchange.receiver_completed) : false;
  const partnerCompleted = exchange ? (isRequester ? exchange.receiver_completed : exchange.requester_completed) : false;

  const openScheduleEditor = () => {
    if (!exchange) return;
    setScheduleError('');
    setScheduleDate(exchange.preferred_date || '');
    setScheduleHours(String(exchange.estimated_hours || 2));
    setScheduleArea(exchange.location_area || '');
    setScheduleOpen(true);
  };

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchange) return;
    try {
      setActionError('');
      setActionSuccess('');
      setScheduleError('');
      setScheduleSaving(true);
      const updated = await (api as any).updateExchangeSchedule(exchange.id, {
        preferred_date: scheduleDate,
        estimated_hours: Number(scheduleHours),
        location_area: scheduleArea,
      });
      setExchange(previous => previous ? { ...previous, ...updated } : updated);
      trackEvent('exchange_schedule_saved', { estimated_hours: Number(scheduleHours) });
      setActionSuccess('Session schedule saved. Your learning plan is ready.');
      setScheduleOpen(false);
    } catch (err: any) {
      setScheduleError(err?.message || 'Unable to update exchange schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTextMessage.trim() || !exchange || !partner) return;
    try {
      setMessageSending(true);
      setActionError('');
      setActionSuccess('');
      const sent = await api.sendMessage({ receiver_id: partner.id, content: newTextMessage.trim(), exchange_id: exchange.id });
      setMessages(prev => [...prev, sent]);
      trackEvent('exchange_message_sent', { exchange_id: exchange.id });
      setActionSuccess('Message sent to your learning partner.');
      setNewTextMessage('');
    } catch (e: any) { setActionError(e?.message || 'Unable to send message'); }
    finally { setMessageSending(false); }
  };

  const handleComplete = async () => {
    if (!exchange || exchangeActionPending) return;
    try {
      setExchangeActionPending(true);
      setActionError('');
      const updated = await api.completeExchange(exchange.id);
      setExchange(previous => previous ? { ...previous, ...updated, user_can_review: updated.status === 'COMPLETED' } : updated);
      if (updated.status === 'COMPLETED') setReviewModalOpen(true);
      else await loadExchangeData();
    } catch (e: any) { setActionError(e?.message || 'Unable to confirm completion'); }
    finally { setExchangeActionPending(false); }
  };

  const handleAccept = async () => {
    if (!exchange || exchangeActionPending) return;
    try { setExchangeActionPending(true); setActionError(''); const updated = await api.acceptExchange(exchange.id); setExchange(previous => previous ? { ...previous, ...updated } : updated); }
    catch (e: any) { setActionError(e?.message || 'Unable to accept exchange'); }
    finally { setExchangeActionPending(false); }
  };

  const handleDecline = async () => {
    if (!exchange || exchangeActionPending) return;
    try { setExchangeActionPending(true); setActionError(''); const updated = await api.rejectExchange(exchange.id); setExchange(previous => previous ? { ...previous, ...updated } : updated); }
    catch (e: any) { setActionError(e?.message || 'Unable to decline exchange'); }
    finally { setExchangeActionPending(false); }
  };

  const handleCancel = async () => {
    if (!exchange || exchangeActionPending) return;
    try {
      setExchangeActionPending(true);
      setActionError('');
      if (exchange.status === 'PENDING' && isRequester) {
        const updated = await api.withdrawExchange(exchange.id);
        setExchange(updated);
      } else if (exchange.status === 'ACTIVE') {
        if (!cancelReason.trim()) return;
        const updated = await api.cancelExchange(exchange.id, cancelReason.trim());
        setExchange(updated);
      } else {
        return;
      }
      setCancelModalOpen(false);
      setCancelReason('');
    } catch (e: any) { setActionError(e?.message || 'Unable to update learning exchange'); }
    finally { setExchangeActionPending(false); }
  };

  if (loading) return <main className="min-h-[60vh] bg-[#f7f7f5] px-6 py-16 text-center text-sm text-slate-500" role="status">Loading exchange workspace…</main>;
  if (loadError) return <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#f7f7f5] px-6 py-16 text-center"><p className="text-sm font-semibold text-[#17233b]">We couldn’t load this exchange.</p><p className="max-w-md text-xs text-slate-500">{loadError}</p><Button size="sm" variant="outline" onClick={() => void loadExchangeData()}>Try again</Button><Link to="/exchanges" className="text-xs font-semibold text-[#d31d24]">Back to exchanges</Link></main>;
  if (!exchange || !partner) return <main className="min-h-[60vh] bg-[#f7f7f5] px-6 py-16 text-center"><p className="text-sm font-semibold text-[#17233b]">Exchange not found</p><Link to="/exchanges" className="mt-4 inline-block"><Button size="sm">Back to exchanges</Button></Link></main>;

  const statusVariant = exchange.status === 'PENDING' ? 'amber' : exchange.status === 'COUNTERED' ? 'purple' : exchange.status === 'ACCEPTED' || exchange.status === 'ACTIVE' ? 'blue' : exchange.status === 'COMPLETED' ? 'emerald' : exchange.status === 'REJECTED' || exchange.status === 'CANCELLED' ? 'rose' : 'slate';
  const statusLabel = exchange.status === 'PENDING' ? 'Requested' : exchange.status === 'COUNTERED' ? 'Counter-proposed' : exchange.status === 'ACCEPTED' ? 'Accepted' : exchange.status === 'ACTIVE' ? 'In progress' : exchange.status === 'COMPLETED' ? 'Completed' : exchange.status === 'REJECTED' ? 'Declined' : exchange.status === 'CANCELLED' ? 'Cancelled' : exchange.status;
  const statusOrder: Record<Exchange['status'], number> = { PENDING: 1, COUNTERED: 1, ACCEPTED: 2, ACTIVE: 2, COMPLETED: 3, REJECTED: 0, CANCELLED: 0 };
  const currentStatusOrder = statusOrder[exchange.status];
  const lifecycleSteps: { key: Exchange['status']; label: string }[] = [
    { key: 'PENDING', label: 'Requested' },
    { key: 'ACCEPTED', label: exchange.status === 'ACTIVE' ? 'In progress' : 'Accepted' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <main className="min-h-[calc(100vh-1px)] bg-[#f7f7f5] px-4 py-5 pb-24 sm:px-6 sm:pb-24 lg:px-8 lg:pb-5 xl:px-10">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link to="/exchanges" className="inline-flex items-center gap-2 text-xs font-bold text-[#697386] hover:text-[#17233b]"><ArrowLeft className="h-4 w-4" /> Back to exchanges</Link>
          <Badge variant={statusVariant} size="md" className="exchange-status-badge">{statusLabel}</Badge>
        </div>

        {actionError && <div role="alert" className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{actionError}</div>}
        {actionSuccess && <div role="status" className="mt-4 border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-800">{actionSuccess}</div>}

        <section className="border-b border-[#e1e4e8] pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d31d24]">Learning session workspace</p>
              <h1 className="exchange-title break-words text-2xl font-extrabold tracking-[-0.02em] text-[#17233b] sm:text-3xl">{myOffer || 'Skill exchange'} <span className="text-[#d31d24]">↔</span> {partnerOffer || 'Partner skill'}</h1>
              <p className="mt-1.5 text-sm text-[#697386]">Turn the accepted request into a focused learning session: agree on one practical outcome, meet, then confirm what you learned.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {exchange.status === 'PENDING' && !isRequester && <><Button size="sm" onClick={handleAccept} loading={exchangeActionPending} disabled={exchangeActionPending} icon={<CheckCircle2 className="h-4 w-4" />}>Accept & Start Learning</Button><Button size="sm" variant="outline" onClick={handleDecline} disabled={exchangeActionPending} icon={<X className="h-4 w-4" />}>Decline</Button></>}
              {exchange.status === 'ACTIVE' && !myCompleted && <Button size="sm" onClick={handleComplete} loading={exchangeActionPending} disabled={exchangeActionPending} icon={<CheckCircle2 className="h-4 w-4" />}>Confirm Session Complete</Button>}
              {exchange.status === 'COMPLETED' && exchange.user_can_review && <Button size="sm" onClick={() => setReviewModalOpen(true)} icon={<Star className="h-4 w-4" />}>Leave review</Button>}
              {exchange.status === 'COMPLETED' && exchange.has_reviewed && <span className="inline-flex items-center gap-1 border border-green-100 bg-green-50 px-3 py-2 text-[10px] font-bold uppercase text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Review submitted</span>}
              {exchange.status === 'COMPLETED' && <Link to="/matches"><Button size="sm" icon={<Repeat className="h-4 w-4" />}>Find Your Next Learning Partner</Button></Link>}
              {exchange.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={openScheduleEditor} icon={<Calendar className="h-4 w-4" />}>{exchange.preferred_date ? 'Edit schedule' : 'Schedule'}</Button>}
              {exchange.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => setCancelModalOpen(true)} disabled={exchangeActionPending} icon={<X className="h-4 w-4" />}>Cancel exchange</Button>}
            </div>
          </div>
        </section>

        {exchange.status === 'PENDING' && isRequester && <Card className="mt-5 border-amber-200 bg-amber-50/60 p-4"><div className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><p className="text-xs font-bold text-amber-900">Waiting for your learning partner</p><p className="mt-1 text-[11px] leading-5 text-amber-800">Your request is sent. You can message them with any extra context, then wait for them to accept before planning the session.</p></div></div></Card>}
        {exchange.status === 'PENDING' && !isRequester && <Card className="mt-5 border-emerald-200 bg-emerald-50/60 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><div><p className="text-xs font-bold text-emerald-900">Your response starts the learning session</p><p className="mt-1 text-[11px] leading-5 text-emerald-800">Review the learning goal, accept if it works for you, then use the workspace to agree on a time and format.</p></div></div></Card>}
        {exchange.status === 'ACTIVE' && <Card className="exchange-next-action mt-5 border-blue-200 bg-blue-50/60 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-blue-900">{exchange.preferred_date ? 'Your session plan is in place' : 'Next: schedule your learning session'}</p><p className="mt-1 text-[11px] leading-5 text-blue-800">{exchange.preferred_date ? `${exchange.preferred_date}${exchange.location_area ? ` · ${exchange.location_area}` : ''}${exchange.estimated_hours ? ` · about ${exchange.estimated_hours} hours` : ''}` : 'Choose one practical learning outcome, pick a time, and confirm whether you will meet online or on campus.'}</p></div><Button size="sm" variant="outline" onClick={openScheduleEditor} icon={<Calendar className="h-3.5 w-3.5" />}>{exchange.preferred_date ? 'Edit schedule' : 'Schedule now'}</Button></div></Card>}

        <div className="grid gap-5 pt-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d31d24]">Lifecycle</p><h3 className="mt-1 text-sm font-bold text-[#17233b]">Learning session progress</h3></div><span className="text-[10px] font-bold text-[#697386]">{exchange.status}</span></div>
              <div className="exchange-lifecycle mt-5 grid gap-2 sm:grid-cols-3">
                {lifecycleSteps.map(step => {
                  const done = currentStatusOrder >= statusOrder[step.key];
                  const currentStep = currentStatusOrder === statusOrder[step.key];
                  const detail = step.key === 'PENDING'
                    ? 'Request sent'
                    : step.key === 'ACCEPTED'
                      ? exchange.status === 'ACTIVE' && exchange.preferred_date
                        ? 'Session scheduled'
                        : exchange.status === 'ACTIVE'
                          ? 'Plan the session together'
                          : 'Learning partner accepted'
                      : 'Learning exchange completed';
                  return (
                    <div key={step.key} aria-current={currentStep ? 'step' : undefined} className={`exchange-lifecycle__step border px-3 py-3 ${done ? 'exchange-lifecycle__step--done' : 'border-[#e1e4e8] bg-[#f7f8f7]'}`}>
                      <div className="flex items-center gap-2">{done ? <CheckCircle2 className="h-4 w-4 text-[#d31d24]" /> : <Circle className="h-4 w-4 text-slate-300" />}<span className="text-xs font-bold text-[#17233b]">{step.label}</span></div>
                      <p className="mt-1 pl-6 text-[10px] text-slate-500">{detail}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex flex-col gap-3 border-b border-[#e1e4e8] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={partner.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'} alt={partner.full_name} className="h-12 w-12 rounded-full border border-[#e1e4e8] object-cover" />
                  <div className="min-w-0"><h2 className="break-words text-sm font-bold text-[#17233b]">{partner.full_name}</h2><p className="mt-0.5 break-words text-xs text-[#697386]">{partner.headline || 'Student & peer learner'}</p><div className="mt-1 flex flex-wrap gap-2">{partner.verified&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#17233b]"><BadgeCheck className="h-3 w-3"/>Verified</span>}{partner.premium&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#d31d24]"><Crown className="h-3 w-3"/>Premium</span>}{partner.featured&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#d31d24]"><Rocket className="h-3 w-3"/>Featured</span>}</div></div>
                </div>
                <span className="inline-flex items-center gap-1 border border-[#e1e4e8] bg-[#f7f8f7] px-2 py-1 text-[10px] font-bold text-[#697386]"><ShieldCheck className="h-3.5 w-3.5 text-[#d31d24]" /> {Math.round(partner.trust_score || 0)} Trust</span>
              </div>
              <div className="grid gap-3 pt-5 sm:grid-cols-3">
                <div className="exchange-skill-card border border-[#e1e4e8] bg-[#f7f8f7] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">You can teach</p><p className="mt-2 break-words text-sm font-bold text-[#17233b]">{myOffer || 'Your skill'}</p></div>
                <div className="flex items-center justify-center border border-[#e1e4e8] bg-white"><Repeat className="h-5 w-5 text-[#d31d24]" /></div>
                <div className="exchange-skill-card border border-[#e1e4e8] bg-[#f7f8f7] p-4 sm:text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Partner can teach</p><p className="mt-2 break-words text-sm font-bold text-[#17233b]">{partnerOffer || 'Partner skill'}</p></div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 border border-[#e1e4e8] p-3 text-xs"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${myCompleted ? 'bg-[#d31d24]' : 'bg-slate-300'}`} /> <span className="break-words">You: {myCompleted ? 'completion confirmed' : 'awaiting confirmation'}</span></div>
                <div className="flex items-center gap-2 border border-[#e1e4e8] p-3 text-xs"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${partnerCompleted ? 'bg-[#d31d24]' : 'bg-slate-300'}`} /> <span className="break-words">{partner.full_name}: {partnerCompleted ? 'completion confirmed' : 'awaiting confirmation'}</span></div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e1e4e8] bg-[#f7f8f7] px-4 py-3"><div className="flex min-w-0 items-center gap-2"><MessageSquare className="h-4 w-4 shrink-0 text-[#d31d24]" /><span className="break-words text-xs font-bold text-[#17233b]">Learning plan with {partner.full_name}</span></div><span className="shrink-0 text-[10px] text-slate-500">Exchange #{exchange.id}</span></div>
              <div className="h-[min(390px,48dvh)] min-h-[220px] space-y-3 overflow-y-auto bg-white p-3 sm:p-4" aria-live="polite">
                {messagesError && <p role="status" className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{messagesError}</p>}
                {messages.length === 0 ? <div className="py-24 text-center text-xs leading-5 text-slate-500">{messagesError ? 'Your messages will appear here when they are available.' : 'No messages yet. Send a quick note about your learning goal and preferred session time.'}</div> : messages.map(m => { const mine = Number(m.sender_id) === Number(currentUser?.id); return <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[90%] break-words px-3 py-2.5 text-xs sm:max-w-[78%] ${mine ? 'bg-[#d31d24] text-white' : 'bg-[#f1f3f5] text-[#17233b]'}`}><p className={`mb-1 text-[9px] font-bold ${mine ? 'text-red-100' : 'text-slate-500'}`}>{mine ? 'You' : partner.full_name}</p><p className="whitespace-pre-wrap break-words">{m.content}</p><time dateTime={m.created_at} className={`mt-1 block text-[9px] ${mine ? 'text-red-100' : 'text-slate-500'}`}>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</time></div></div>; })}
              </div>
              <form onSubmit={handleSendMessage} className="flex flex-col gap-2 border-t border-[#e1e4e8] bg-[#f7f8f7] p-3 sm:flex-row"><textarea rows={2} value={newTextMessage} onChange={e => setNewTextMessage(e.target.value)} placeholder={`Message ${partner.full_name.split(' ')[0]}…`} aria-label="Message learning partner" maxLength={2000} disabled={messageSending} className="min-h-10 w-full min-w-0 flex-1 resize-none border border-[#d9dde2] bg-white px-3 py-2.5 text-xs text-[#17233b] outline-none focus:border-[#d31d24] disabled:cursor-not-allowed disabled:opacity-60" /><Button type="submit" size="sm" className="w-full sm:w-auto" disabled={messageSending || !newTextMessage.trim()} loading={messageSending} icon={<Send className="h-3.5 w-3.5" />}>Send</Button></form>
            </Card>
          </div>

          <aside className="space-y-5">
            {['REJECTED','CANCELLED'].includes(String(exchange.status)) && <Card className="border-[#ead0d1] bg-[#fff6f6] p-5"><div className="flex items-center gap-2"><X className="h-4 w-4 text-[#d31d24]" /><h3 className="text-sm font-bold text-[#17233b]">{exchange.status === 'REJECTED' ? 'Exchange declined' : 'Exchange cancelled'}</h3></div><p className="mt-2 text-xs leading-5 text-[#697386]">{exchange.cancellation_reason || (exchange.status === 'REJECTED' ? 'The recipient declined this proposal.' : 'This exchange was cancelled by a participant.')}</p>{exchange.cancelled_by_id && <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Action recorded on this exchange</p>}</Card>}
            <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d31d24]">Trust snapshot</p><div className="mt-4 flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#ead0d1] bg-[#fff6f6] text-lg font-black text-[#d31d24]">{Math.round(partner.trust_score || 0)}</div><div className="min-w-0"><p className="break-words text-sm font-bold text-[#17233b]">{partner.full_name}</p><p className="text-[10px] text-slate-500">Community trust score</p></div></div><div className="mt-4 h-1.5 bg-[#e6e8eb]"><div className="h-full bg-[#d31d24]" style={{width: Math.min(100,Math.max(0,Number(partner.trust_score||0)))+'%'}} /></div><Link to={`/profile/${partner.id}`} className="mt-4 inline-flex text-[10px] font-bold uppercase tracking-wider text-[#d31d24] hover:underline">View full partner profile</Link></Card>
            <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d31d24]">Learning session details</p><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4 border-b border-[#e1e4e8] pb-3"><span className="shrink-0 text-slate-500">Session date</span><span className="min-w-0 break-words text-right font-semibold text-[#17233b]">{exchange.preferred_date || 'Flexible'}</span></div><div className="flex justify-between gap-4 border-b border-[#e1e4e8] pb-3"><span className="flex shrink-0 items-center gap-1 text-slate-500"><Clock className="h-3.5 w-3.5" /> Duration</span><span className="break-words text-right font-semibold text-[#17233b]">~{exchange.estimated_hours || 2}h</span></div><div className="flex justify-between gap-4"><span className="flex shrink-0 items-center gap-1 text-slate-500"><MapPin className="h-3.5 w-3.5" /> Area</span><span className="min-w-0 break-words text-right font-semibold text-[#17233b]">{exchange.location_area || 'Not scheduled yet'}</span></div></div></Card>
            <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d31d24]">Outcome</p>{exchange.status === 'COMPLETED' ? <><div className="mt-3 flex items-center gap-2 text-sm font-bold text-[#17233b]"><CheckCircle2 className="h-4 w-4 text-[#d31d24]" /> Learning outcome completed by both participants</div><p className="mt-2 text-xs leading-5 text-[#697386]">{exchange.has_reviewed ? 'Your feedback has been recorded and contributes to community trust.' : 'Share feedback, then find your next learning partner and keep building your skills.'}</p></> : <><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Learning goal</p><p className="mt-2 break-words text-sm leading-6 text-[#17233b]">“{exchange.proposal_message || 'Learning exchange plan'}”</p><div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">You can teach</p><p className="mt-1 break-words text-xs font-semibold text-emerald-800">{exchange.requester_skill_name || 'Your skill'}</p></div><div className="border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Partner can teach</p><p className="mt-1 break-words text-xs font-semibold text-teal-800">{exchange.receiver_skill_name || 'Partner skill'}</p></div><div className="border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Session</p><p className="mt-1 break-words text-xs font-semibold text-slate-700">{exchange.preferred_date || 'Not scheduled yet'}</p></div></div></>}</Card>
          </aside>
        </div>
      </div>

      <Modal
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule learning session"
        subtitle="Agree on the date, duration and session format with your learning partner."
        maxWidth="md"
      >
        <form onSubmit={saveSchedule} className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Session date / time<input required disabled={scheduleSaving} value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="mt-1 h-10 w-full min-w-0 border border-[#d9dde2] px-3 text-xs focus:border-[#d31d24] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50" placeholder="e.g. Saturday, 4 PM" /></label>
          <label className="text-xs font-semibold text-slate-600">Duration (hours)<input required disabled={scheduleSaving} type="number" min="0.5" max="24" step="0.5" value={scheduleHours} onChange={e => setScheduleHours(e.target.value)} className="mt-1 h-10 w-full min-w-0 border border-[#d9dde2] px-3 text-xs focus:border-[#d31d24] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50" /></label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Session format / area<input required disabled={scheduleSaving} value={scheduleArea} onChange={e => setScheduleArea(e.target.value)} className="mt-1 h-10 w-full min-w-0 border border-[#d9dde2] px-3 text-xs focus:border-[#d31d24] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50" placeholder="Online / campus / public shared space" /></label>
          {scheduleError && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800 sm:col-span-2">{scheduleError}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-[#e1e4e8] pt-4 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduleSaving}>Cancel</Button>
            <Button type="submit" size="sm" loading={scheduleSaving}>Save schedule</Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={exchange.status === 'PENDING' && isRequester ? 'Withdraw this learning request?' : 'Cancel this learning exchange?'}
        subtitle={exchange.status === 'PENDING' && isRequester ? 'Your partner will be notified that the request was withdrawn.' : 'The other participant will be notified.'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[#4d5b72]">This action updates the exchange for both participants.</p>
          {exchange.status === 'ACTIVE' && <label className="block text-xs font-semibold text-slate-600">Reason for cancellation<textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Share a brief reason…" className="mt-1 min-h-24 w-full resize-y border border-[#d9dde2] p-3 text-xs outline-none focus:border-[#d31d24]" /></label>}
          {actionError && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-xs text-red-800">{actionError}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-[#e1e4e8] pt-4 sm:flex-row sm:justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => setCancelModalOpen(false)} disabled={exchangeActionPending}>Keep exchange</Button>
            <Button type="button" size="sm" variant="danger" onClick={handleCancel} disabled={exchangeActionPending || (exchange.status === 'ACTIVE' && !cancelReason.trim())} loading={exchangeActionPending}>{exchange.status === 'PENDING' && isRequester ? 'Withdraw request' : 'Confirm cancellation'}</Button>
          </div>
        </div>
      </Modal>

      {reviewModalOpen && <ExchangeReviewModal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} exchange={exchange} onSuccess={() => { setReviewModalOpen(false); setActionSuccess('Review submitted. Thank you for sharing your experience.'); void loadExchangeData(); }} />}
    </main>
  );
};
