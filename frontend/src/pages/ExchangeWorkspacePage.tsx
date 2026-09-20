import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Exchange, Message } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ExchangeReviewModal } from '../components/exchange/ExchangeReviewModal';
import { ArrowLeft, Repeat, CheckCircle2, Send, Circle, Star, X, MessageSquare, Calendar, Clock, MapPin, ShieldCheck, BadgeCheck, Crown, Rocket } from 'lucide-react';

export const ExchangeWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { lastMessageEvent } = useSocket();
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newTextMessage, setNewTextMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState<boolean>(false);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleHours, setScheduleHours] = useState<string>('2');
  const [scheduleArea, setScheduleArea] = useState<string>('');
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const exchangeId = Number(id || 0);

  const loadExchangeData = async () => {
    try {
      setLoading(true);
      const data = await api.getExchangeDetails(exchangeId);
      setExchange(data);
      const partnerId = currentUser?.id === data.requester_id ? data.receiver_id : data.requester_id;
      setMessages(await api.getMessages(partnerId));
    } catch (e) { console.error(e); }
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
    setScheduleDate(exchange.preferred_date || '');
    setScheduleHours(String(exchange.estimated_hours || 2));
    setScheduleArea(exchange.location_area || '');
    setScheduleOpen(true);
  };

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchange) return;
    try {
      setScheduleSaving(true);
      const updated = await (api as any).updateExchangeSchedule(exchange.id, {
        preferred_date: scheduleDate,
        estimated_hours: Number(scheduleHours),
        location_area: scheduleArea,
      });
      setExchange(previous => previous ? { ...previous, ...updated } : updated);
      setScheduleOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Unable to update exchange schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTextMessage.trim() || !exchange || !partner) return;
    try {
      const sent = await api.sendMessage({ receiver_id: partner.id, content: newTextMessage.trim(), exchange_id: exchange.id });
      setMessages(prev => [...prev, sent]);
      setNewTextMessage('');
    } catch (e: any) { alert(e?.message || 'Unable to send message'); }
  };

  const handleComplete = async () => {
    if (!exchange) return;
    try {
      const updated = await api.completeExchange(exchange.id);
      setExchange(previous => previous ? { ...previous, ...updated, user_can_review: updated.status === 'COMPLETED' } : updated);
      if (updated.status === 'COMPLETED') setReviewModalOpen(true);
      else await loadExchangeData();
    } catch (e: any) { alert(e?.message || 'Unable to confirm completion'); }
  };

  const handleAccept = async () => {
    if (!exchange) return;
    try { const updated = await api.acceptExchange(exchange.id); setExchange(previous => previous ? { ...previous, ...updated } : updated); }
    catch (e: any) { alert(e?.message || 'Unable to accept exchange'); }
  };

  const handleDecline = async () => {
    if (!exchange) return;
    try { const updated = await api.rejectExchange(exchange.id); setExchange(previous => previous ? { ...previous, ...updated } : updated); }
    catch (e: any) { alert(e?.message || 'Unable to decline exchange'); }
  };

  const handleCancel = async () => {
    if (!exchange) return;
    try {
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
    } catch (e: any) { alert(e?.message || 'Unable to update learning exchange'); }
  };

  if (loading) return <main className="min-h-screen bg-[#f7f7f5] px-6 py-16 text-center text-sm text-slate-400">Loading exchange workspace…</main>;
  if (!exchange || !partner) return <main className="min-h-screen bg-[#f7f7f5] px-6 py-16 text-center"><p className="text-sm font-semibold text-[#17233b]">Exchange not found</p><Link to="/exchanges" className="mt-4 inline-block"><Button size="sm">Back to exchanges</Button></Link></main>;

  const statusVariant: any = exchange.status === 'ACTIVE' ? 'emerald' : exchange.status === 'COMPLETED' ? 'emerald' : exchange.status === 'PENDING' ? 'amber' : 'slate';

  return (
    <main className="min-h-[calc(100vh-1px)] bg-[#f7f7f5] px-4 py-5 pb-24 sm:px-6 sm:pb-24 lg:px-8 lg:pb-5 xl:px-10">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link to="/exchanges" className="inline-flex items-center gap-2 text-xs font-bold text-[#697386] hover:text-[#17233b]"><ArrowLeft className="h-4 w-4" /> Back to exchanges</Link>
          <Badge variant={statusVariant} size="md">{exchange.status}</Badge>
        </div>

        <section className="border-b border-[#e1e4e8] pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d31d24]">Learning session workspace</p>
              <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#17233b] sm:text-3xl">{myOffer || 'Skill exchange'} <span className="text-[#d31d24]">↔</span> {partnerOffer || 'Partner skill'}</h1>
              <p className="mt-1.5 text-sm text-[#697386]">Turn the accepted request into a focused learning session: agree on one practical outcome, meet, then confirm what you learned.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {exchange.status === 'PENDING' && !isRequester && <><Button size="sm" onClick={handleAccept} icon={<CheckCircle2 className="h-4 w-4" />}>Accept & Start Learning</Button><Button size="sm" variant="outline" onClick={handleDecline} icon={<X className="h-4 w-4" />}>Decline</Button></>}
              {exchange.status === 'ACTIVE' && !myCompleted && <Button size="sm" onClick={handleComplete} icon={<CheckCircle2 className="h-4 w-4" />}>Confirm Session Complete</Button>}
              {exchange.status === 'COMPLETED' && exchange.user_can_review && <Button size="sm" onClick={() => setReviewModalOpen(true)} icon={<Star className="h-4 w-4" />}>Leave review</Button>}
              {exchange.status === 'COMPLETED' && exchange.has_reviewed && <span className="inline-flex items-center gap-1 border border-green-100 bg-green-50 px-3 py-2 text-[10px] font-bold uppercase text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Review submitted</span>}
              {exchange.status === 'COMPLETED' && <Link to="/matches"><Button size="sm" icon={<Repeat className="h-4 w-4" />}>Find Your Next Learning Partner</Button></Link>}
              {exchange.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={openScheduleEditor} icon={<Calendar className="h-4 w-4" />}>Schedule</Button>}
              {exchange.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => setCancelModalOpen(true)} icon={<X className="h-4 w-4" />}>Cancel exchange</Button>}
            </div>
          </div>
        </section>

        {exchange.status === 'PENDING' && isRequester && <Card className="mt-5 border-amber-200 bg-amber-50/60 p-4"><div className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><p className="text-xs font-bold text-amber-900">Waiting for your learning partner</p><p className="mt-1 text-[11px] leading-5 text-amber-800">Your request is sent. You can message them with any extra context, then wait for them to accept before planning the session.</p></div></div></Card>}
        {exchange.status === 'PENDING' && !isRequester && <Card className="mt-5 border-emerald-200 bg-emerald-50/60 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><div><p className="text-xs font-bold text-emerald-900">Your response starts the learning session</p><p className="mt-1 text-[11px] leading-5 text-emerald-800">Review the learning goal, accept if it works for you, then use the workspace to agree on a time and format.</p></div></div></Card>}
        {exchange.status === 'ACTIVE' && <Card className="mt-5 border-blue-200 bg-blue-50/60 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-blue-900">Next: schedule your learning session</p><p className="mt-1 text-[11px] leading-5 text-blue-800">Choose one practical learning outcome, pick a time, and confirm whether you will meet online or on campus.</p></div><Button size="sm" variant="outline" onClick={openScheduleEditor} icon={<Calendar className="h-3.5 w-3.5" />}>Schedule now</Button></div></Card>}

        <div className="grid gap-5 pt-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d31d24]">Lifecycle</p><h3 className="mt-1 text-sm font-bold text-[#17233b]">Learning session progress</h3></div><span className="text-[10px] font-bold text-[#697386]">{exchange.status}</span></div>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">{[["PENDING","Learning plan"],["ACTIVE","In progress"],["COMPLETED","Completed"]].map(([key,label])=>{const order:any={PENDING:1,ACTIVE:2,COMPLETED:3};const current=order[exchange.status]||0;const done=current>=order[key];return <div key={key} className={"border px-3 py-3 "+(done?"border-[#ead0d1] bg-[#fff6f6]":"border-[#e1e4e8] bg-[#f7f8f7]")}><div className="flex items-center gap-2">{done?<CheckCircle2 className="h-4 w-4 text-[#d31d24]"/>:<Circle className="h-4 w-4 text-slate-300"/>}<span className="text-xs font-bold text-[#17233b]">{label}</span></div><p className="mt-1 pl-6 text-[10px] text-slate-400">{key==="PENDING"?"Request sent":key==="ACTIVE"?"Plan the session together":"Session completed"}</p></div>})}</div>
            </Card>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4 border-b border-[#e1e4e8] pb-4">
                <div className="flex items-center gap-3">
                  <img src={partner.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'} alt={partner.full_name} className="h-12 w-12 rounded-full border border-[#e1e4e8] object-cover" />
                  <div><h2 className="text-sm font-bold text-[#17233b]">{partner.full_name}</h2><p className="mt-0.5 text-xs text-[#697386]">{partner.headline || 'Student & peer learner'}</p><div className="mt-1 flex flex-wrap gap-2">{partner.verified&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#17233b]"><BadgeCheck className="h-3 w-3"/>Verified</span>}{partner.premium&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#d31d24]"><Crown className="h-3 w-3"/>Premium</span>}{partner.featured&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#d31d24]"><Rocket className="h-3 w-3"/>Featured</span>}</div></div>
                </div>
                <span className="inline-flex items-center gap-1 border border-[#e1e4e8] bg-[#f7f8f7] px-2 py-1 text-[10px] font-bold text-[#697386]"><ShieldCheck className="h-3.5 w-3.5 text-[#d31d24]" /> {Math.round(partner.trust_score || 0)} Trust</span>
              </div>
              <div className="grid gap-3 pt-5 sm:grid-cols-3">
                <div className="border border-[#e1e4e8] bg-[#f7f8f7] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">You can teach</p><p className="mt-2 text-sm font-bold text-[#17233b]">{myOffer || 'Your skill'}</p></div>
                <div className="flex items-center justify-center border border-[#e1e4e8] bg-white"><Repeat className="h-5 w-5 text-[#d31d24]" /></div>
                <div className="border border-[#e1e4e8] bg-[#f7f8f7] p-4 sm:text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Partner can teach</p><p className="mt-2 text-sm font-bold text-[#17233b]">{partnerOffer || 'Partner skill'}</p></div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 border border-[#e1e4e8] p-3 text-xs"><span className={`h-2.5 w-2.5 rounded-full ${myCompleted ? 'bg-[#d31d24]' : 'bg-slate-300'}`} /> You: {myCompleted ? 'completion confirmed' : 'awaiting confirmation'}</div>
                <div className="flex items-center gap-2 border border-[#e1e4e8] p-3 text-xs"><span className={`h-2.5 w-2.5 rounded-full ${partnerCompleted ? 'bg-[#d31d24]' : 'bg-slate-300'}`} /> {partner.full_name}: {partnerCompleted ? 'completion confirmed' : 'awaiting confirmation'}</div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#e1e4e8] bg-[#f7f8f7] px-4 py-3"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[#d31d24]" /><span className="text-xs font-bold text-[#17233b]">Learning plan with {partner.full_name}</span></div><span className="text-[10px] text-slate-400">Exchange #{exchange.id}</span></div>
              <div className="h-[390px] space-y-3 overflow-y-auto bg-white p-4">
                {messages.length === 0 ? <div className="py-24 text-center text-xs text-slate-400">No messages yet. Send a quick note about your learning goal and preferred session time.</div> : messages.map(m => { const mine = Number(m.sender_id) === Number(currentUser?.id); return <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[78%] px-3 py-2.5 text-xs ${mine ? 'bg-[#d31d24] text-white' : 'bg-[#f1f3f5] text-[#17233b]'}`}><p>{m.content}</p><span className={`mt-1 block text-[9px] ${mine ? 'text-red-100' : 'text-slate-400'}`}>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div></div>; })}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-[#e1e4e8] bg-[#f7f8f7] p-3"><input value={newTextMessage} onChange={e => setNewTextMessage(e.target.value)} placeholder={`Message ${partner.full_name.split(' ')[0]}…`} className="h-10 flex-1 border border-[#d9dde2] bg-white px-3 text-xs text-[#17233b] outline-none focus:border-[#d31d24]" /><Button type="submit" size="sm" icon={<Send className="h-3.5 w-3.5" />}>Send</Button></form>
            </Card>
          </div>

          <aside className="space-y-5">
            {['REJECTED','CANCELLED'].includes(String(exchange.status)) && <Card className="border-[#ead0d1] bg-[#fff6f6] p-5"><div className="flex items-center gap-2"><X className="h-4 w-4 text-[#d31d24]" /><h3 className="text-sm font-bold text-[#17233b]">{exchange.status === 'REJECTED' ? 'Exchange declined' : 'Exchange cancelled'}</h3></div><p className="mt-2 text-xs leading-5 text-[#697386]">{exchange.cancellation_reason || (exchange.status === 'REJECTED' ? 'The recipient declined this proposal.' : 'This exchange was cancelled by a participant.')}</p>{exchange.cancelled_by_id && <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Action recorded on this exchange</p>}</Card>}
            <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d31d24]">Trust snapshot</p><div className="mt-4 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center border border-[#ead0d1] bg-[#fff6f6] text-lg font-black text-[#d31d24]">{Math.round(partner.trust_score || 0)}</div><div><p className="text-sm font-bold text-[#17233b]">{partner.full_name}</p><p className="text-[10px] text-slate-400">Community trust score</p></div></div><div className="mt-4 h-1.5 bg-[#e6e8eb]"><div className="h-full bg-[#d31d24]" style={{width: Math.min(100,Math.max(0,Number(partner.trust_score||0)))+'%'}} /></div><Link to={`/profile/${partner.id}`} className="mt-4 inline-flex text-[10px] font-bold uppercase tracking-wider text-[#d31d24] hover:underline">View full partner profile</Link></Card>
            <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d31d24]">Learning session details</p><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4 border-b border-[#e1e4e8] pb-3"><span className="text-slate-400">Session date</span><span className="font-semibold text-[#17233b]">{exchange.preferred_date || 'Flexible'}</span></div><div className="flex justify-between gap-4 border-b border-[#e1e4e8] pb-3"><span className="flex items-center gap-1 text-slate-400"><Clock className="h-3.5 w-3.5" /> Duration</span><span className="font-semibold text-[#17233b]">~{exchange.estimated_hours || 2}h</span></div><div className="flex justify-between gap-4"><span className="flex items-center gap-1 text-slate-400"><MapPin className="h-3.5 w-3.5" /> Area</span><span className="font-semibold text-[#17233b]">{exchange.location_area || 'Not scheduled yet'}</span></div></div></Card>
            <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d31d24]">Outcome</p>{exchange.status === 'COMPLETED' ? <><div className="mt-3 flex items-center gap-2 text-sm font-bold text-[#17233b]"><CheckCircle2 className="h-4 w-4 text-[#d31d24]" /> Learning outcome completed by both participants</div><p className="mt-2 text-xs leading-5 text-[#697386]">{exchange.has_reviewed ? 'Your feedback has been recorded and contributes to community trust.' : 'Share feedback, then find your next learning partner and keep building your skills.'}</p></> : <><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Learning goal</p><p className="mt-2 text-sm leading-6 text-[#17233b]">“{exchange.proposal_message || 'Learning exchange plan'}”</p><div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">You can teach</p><p className="mt-1 text-xs font-semibold text-emerald-800">{exchange.requester_skill_name || 'Your skill'}</p></div><div className="border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Partner can teach</p><p className="mt-1 text-xs font-semibold text-teal-800">{exchange.receiver_skill_name || 'Partner skill'}</p></div><div className="border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Session</p><p className="mt-1 text-xs font-semibold text-slate-700">{exchange.preferred_date || 'Not scheduled yet'}</p></div></div></>}</Card>
          </aside>
        </div>
      </div>

      {scheduleOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17233b]/35 p-4"><div className="w-full max-w-lg border border-[#e1e4e8] bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-[#17233b]">Schedule learning session</h3><p className="mt-1 text-xs text-[#697386]">Agree on the date, duration and session format with your learning partner.</p></div><button type="button" onClick={()=>setScheduleOpen(false)} className="p-1 text-slate-400 hover:text-[#17233b]"><X className="h-4 w-4"/></button></div><form onSubmit={saveSchedule} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Session date / time<input required value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)} className="mt-1 h-10 w-full border border-[#d9dde2] px-3 text-xs" placeholder="e.g. Saturday, 4 PM"/></label><label className="text-xs font-semibold text-slate-600">Duration (hours)<input required type="number" min="0.5" max="24" step="0.5" value={scheduleHours} onChange={e=>setScheduleHours(e.target.value)} className="mt-1 h-10 w-full border border-[#d9dde2] px-3 text-xs"/></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Session format / area<input required value={scheduleArea} onChange={e=>setScheduleArea(e.target.value)} className="mt-1 h-10 w-full border border-[#d9dde2] px-3 text-xs" placeholder="Online / campus / public shared space"/></label><div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" size="sm" variant="ghost" onClick={()=>setScheduleOpen(false)}>Cancel</Button><Button type="submit" size="sm" loading={scheduleSaving}>Save schedule</Button></div></form></div></div>}
      {cancelModalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17233b]/35 p-4"><div className="w-full max-w-md border border-[#e1e4e8] bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-[#17233b]">{exchange.status === 'PENDING' && isRequester ? 'Withdraw this learning request?' : 'Cancel this learning exchange?'}</h3><p className="mt-1 text-xs text-[#697386]">{exchange.status === 'PENDING' && isRequester ? 'Your partner will be notified that the request was withdrawn.' : 'The other participant will be notified.'}</p></div><button onClick={() => setCancelModalOpen(false)} className="p-1 text-slate-400 hover:text-[#17233b]"><X className="h-4 w-4" /></button></div>{exchange.status === 'ACTIVE' && <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason for cancellation…" className="mt-4 min-h-24 w-full resize-none border border-[#d9dde2] p-3 text-xs outline-none focus:border-[#d31d24]" />}<div className="mt-4 flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setCancelModalOpen(false)}>Keep exchange</Button><Button size="sm" onClick={handleCancel} disabled={exchange.status === 'ACTIVE' && !cancelReason.trim()}>{exchange.status === 'PENDING' && isRequester ? 'Withdraw request' : 'Confirm cancellation'}</Button></div></div></div>}

      {reviewModalOpen && <ExchangeReviewModal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} exchange={exchange} onSuccess={() => { setReviewModalOpen(false); loadExchangeData(); }} />}
    </main>
  );
};
