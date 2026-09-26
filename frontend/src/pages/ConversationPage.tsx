import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, Repeat, BadgeCheck, Crown, Rocket, ShieldOff, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const ConversationPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { lastMessageEvent } = useSocket();
  const partnerId = Number(id || 0);
  const [partner, setPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeExchange, setActiveExchange] = useState<any>(null);
  const [blocked, setBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!partnerId) { setError('Invalid member.'); setLoading(false); return; }
    try {
      setLoading(true);
      const [profile, thread, conversations] = await Promise.all([
        api.getUserProfile(partnerId),
        api.getMessages(partnerId),
        api.getConversations(),
      ]);
      setPartner(profile);
      setMessages(thread);
      setBlocked(Boolean(await (api as any).getBlockStatus?.(partnerId)));
      const conversation = (conversations || []).find((item: any) => Number(item.partner?.id) === partnerId);
      if (conversation?.active_exchange_id) {
        try {
          const exchange = await (api as any).getExchangeDetails(conversation.active_exchange_id);
          setActiveExchange(exchange);
        } catch {
          setActiveExchange({
            id: conversation.active_exchange_id,
            status: conversation.active_exchange_status,
          });
        }
      } else {
        setActiveExchange(null);
      }
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Unable to load conversation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [partnerId]);
  useEffect(() => {
    const event = lastMessageEvent?.event === 'NEW_MESSAGE' ? lastMessageEvent.data : null;
    if (!event) return;
    const isThreadMessage = Number(event.sender_id) === partnerId || Number(event.receiver_id) === partnerId;
    if (isThreadMessage) setMessages(prev => prev.some(m => m.id === event.id) ? prev : [...prev, event]);
  }, [lastMessageEvent, partnerId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !partnerId || sending) return;
    try {
      setSending(true);
      const sent = await api.sendMessage({
        receiver_id: partnerId,
        content: value,
        ...(activeExchange?.id ? { exchange_id: activeExchange.id } : {}),
      });
      setMessages(prev => prev.some(m => m.id === sent.id) ? prev : [...prev, sent]);
      setText('');
    } catch (e: any) {
      setError(e?.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const exchangeLabel = activeExchange?.status === 'ACTIVE' ? 'Exchange in progress' : 'Exchange proposal';

  const toggleBlock = async () => {
    if (!partnerId || blocking) return;
    try {
      setBlocking(true);
      setError('');
      if (blocked) await (api as any).unblockUser(partnerId);
      else await (api as any).blockUser(partnerId);
      setBlocked(!blocked);
      setBlockDialogOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Unable to update block status.');
    } finally {
      setBlocking(false);
    }
  };

  if (loading) return <main className="flex min-h-[60vh] items-center justify-center px-4 text-sm text-slate-500" role="status">Loading conversation…</main>;
  if (!partner && error) return <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center"><p className="text-sm font-semibold text-[#17233b]">Conversation couldn’t be loaded.</p><p className="max-w-md text-xs text-slate-500">{error}</p><Button size="sm" variant="outline" onClick={() => void load()}>Try again</Button></main>;
  if (!partner) return <main className="flex min-h-[60vh] items-center justify-center px-4 text-sm text-slate-500">Conversation unavailable.</main>;

  return (
    <main className="min-h-[calc(100vh-1px)] bg-[#f7f7f5] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-xs font-semibold text-[#697386] hover:text-[#17233b]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <Link to="/messages"><Button size="sm" variant="outline" icon={<MessageSquare className="h-4 w-4" />}>All messages</Button></Link>
        </div>
        <Card className="overflow-hidden">
          <header className="flex flex-col gap-3 border-b border-[#e1e4e8] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <img src={partner?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'} className="h-11 w-11 rounded-full object-cover" alt="" />
              <div className="min-w-0">
                <h1 className="break-words text-sm font-extrabold text-[#17233b]">{partner.full_name || 'Member conversation'}</h1>
                <p className="break-words text-xs text-[#697386]">{partner.headline || 'SkillBarter member'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {partner?.verified&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#17233b]"><BadgeCheck className="h-3 w-3"/>Verified</span>}
                  {partner?.premium&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#d31d24]"><Crown className="h-3 w-3"/>Premium</span>}
                  {partner?.featured&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#d31d24]"><Rocket className="h-3 w-3"/>Featured</span>}
                  {typeof partner?.trust_score === 'number' && <span className="text-[9px] font-bold uppercase tracking-wider text-[#697386]">Trust {Math.round(partner.trust_score)}/100</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeExchange?.id && <Link to={`/exchanges/${activeExchange.id}`}><Button size="sm" variant="outline" icon={<Repeat className="h-4 w-4" />}>Exchange</Button></Link>}
              <Link to={`/profile/${partnerId}`}><Button size="sm" variant="ghost">Profile</Button></Link>
              <Button size="sm" variant="ghost" onClick={() => setBlockDialogOpen(true)} disabled={blocking} icon={blocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}>{blocked ? 'Unblock' : 'Block'}</Button>
            </div>
          </header>

          {activeExchange?.id && (
            <div className="flex items-center justify-between gap-3 border-b border-[#e1e4e8] bg-[#fff7f7] px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-red-100 bg-white text-[#d31d24]"><Repeat className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#d31d24]">{exchangeLabel}</p>
                  <p className="truncate text-xs text-[#697386]">Messages in this thread are linked to exchange #{activeExchange.id}.</p>
                </div>
              </div>
              <Link className="shrink-0" to={`/exchanges/${activeExchange.id}`}><span className="text-[10px] font-extrabold uppercase tracking-wider text-[#17233b] hover:text-[#d31d24]">Open workspace →</span></Link>
            </div>
          )}

          <section className="flex h-[min(68dvh,680px)] min-h-[min(360px,calc(100dvh-14rem))] flex-col bg-[#fbfbfa]">
            <div className="flex-1 space-y-3 overflow-y-auto p-5 sm:p-7">
              {loading ? <div className="flex h-full items-center justify-center text-xs text-[#697386]">Loading conversation…</div> : messages.length ? messages.map((m: any) => {
                const mine = Number(m.sender_id) === Number(currentUser?.id);
                return <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] break-words px-4 py-3 text-xs leading-5 sm:max-w-[78%] ${mine ? 'bg-[#d31d24] text-white' : 'border border-[#e1e4e8] bg-white text-[#17233b]'}`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <span className={`mt-1 block text-[9px] ${mine ? 'text-red-100' : 'text-[#8a94a6]'}`}>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                </div>;
              }) : <div className="flex h-full flex-col items-center justify-center text-center"><MessageSquare className="mb-3 h-9 w-9 text-[#d7dce2]" /><p className="text-sm font-semibold text-[#17233b]">Start the conversation</p><p className="mt-1 text-xs text-[#697386]">Send a message to {partner?.full_name || 'this member'}.</p></div>}
              <div ref={endRef} />
            </div>
            {error && <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>}
            <form onSubmit={send} className="flex items-end gap-2 border-t border-[#e1e4e8] bg-white p-3">
              <textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Write a message…" aria-label="Message" maxLength={2000} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} className="min-h-10 min-w-0 flex-1 resize-none border border-[#d9dde2] bg-white px-3 py-2.5 text-xs text-[#17233b] outline-none focus:border-[#d31d24]" />
              <Button type="submit" size="sm" disabled={sending || !text.trim()} icon={<Send className="h-4 w-4" />}>{sending ? 'Sending…' : 'Send'}</Button>
            </form>
          </section>
        </Card>
      </div>
      <Modal
        isOpen={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        title={blocked ? 'Unblock this member?' : 'Block this member?'}
        subtitle={blocked ? 'This member will be available in your learning network again.' : 'This member will no longer appear in your matching flow.'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[#4d5b72]">{blocked ? `You can message ${partner.full_name} again after unblocking.` : `You can unblock ${partner.full_name} later from your safety settings.`}</p>
          {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-[#e1e4e8] pt-4 sm:flex-row sm:justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => setBlockDialogOpen(false)} disabled={blocking}>Cancel</Button>
            <Button type="button" size="sm" variant={blocked ? 'secondary' : 'danger'} onClick={() => void toggleBlock()} loading={blocking}>{blocked ? 'Unblock member' : 'Block member'}</Button>
          </div>
        </div>
      </Modal>
    </main>
  );
};
