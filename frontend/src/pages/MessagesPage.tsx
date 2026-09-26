import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Crown, MessageSquare, Repeat, Send } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const MessagesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { lastMessageEvent } = useSocket();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<number | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => Number(c.partner.id) === Number(activePartnerId));

  const loadConversations = async (backgroundRefresh = false) => {
    try {
      if (!backgroundRefresh) setLoading(true);
      setError('');
      const data = await api.getConversations();
      setConversations(data);
      if (data.length && !activePartnerId) setActivePartnerId(Number(data[0].partner.id));
    } catch (e: any) {
      setError(e?.message || 'Unable to load conversations.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (partnerId: number) => {
    try {
      setMessagesLoading(true);
      setMessages([]);
      setError('');
      setMessages(await api.getMessages(partnerId));
    } catch (e: any) {
      setError(e?.message || 'Unable to load messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (activePartnerId) void loadMessages(activePartnerId);
  }, [activePartnerId]);

  useEffect(() => {
    const eventMessage = lastMessageEvent?.event === 'NEW_MESSAGE' ? lastMessageEvent.data : null;
    if (eventMessage && Number(eventMessage.sender_id) === Number(activePartnerId)) {
      setMessages((previous) =>
        previous.some((message) => message.id === eventMessage.id)
          ? previous
          : [...previous, eventMessage]
      );
    }
    if (eventMessage) void loadConversations(true);
  }, [lastMessageEvent, activePartnerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activePartnerId || !inputText.trim() || sending) return;

    const exchangeId = active?.active_exchange_id;

    try {
      setSending(true);
      setError('');
      const sent = await api.sendMessage({
        receiver_id: activePartnerId,
        content: inputText.trim(),
        ...(exchangeId ? { exchange_id: exchangeId } : {}),
      });
      setMessages((previous) =>
        previous.some((message) => message.id === sent.id)
          ? previous
          : [...previous, sent]
      );
      setInputText('');
      await loadConversations(true);
    } catch (e: any) {
      setError(e?.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const exchangeLabel =
    active?.active_exchange_status === 'ACTIVE'
      ? 'Exchange in progress'
      : active?.active_exchange_status === 'PENDING'
        ? 'Exchange proposal'
        : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
      <Card className="grid h-[min(750px,calc(100dvh-8rem))] min-h-[min(440px,calc(100dvh-10rem))] grid-cols-1 overflow-hidden border-[#e1e4e8] md:grid-cols-12">
        <aside
          className={`${mobileChatOpen ? 'hidden md:flex' : 'flex'} h-full flex-col border-r border-[#e1e4e8] bg-[#f7f8f7] md:col-span-4`}
        >
          <div className="border-b border-[#e1e4e8] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#17233b]">Messages</h2>
                <p className="text-[11px] text-slate-500">Real peer-to-peer SkillBarter conversations</p>
              </div>
              <MessageSquare className="h-4 w-4 text-[#d31d24]" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
            ) : error && conversations.length === 0 ? (
              <div className="p-6 text-center" role="alert">
                <p className="text-xs text-[#8f1a20]">Conversations couldn’t be loaded.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => void loadConversations()}>Try again</Button>
              </div>
            ) : conversations.length ? (
              conversations.map((conversation) => {
                const partnerId = Number(conversation.partner.id);
                const selected = partnerId === Number(activePartnerId);

                return (
                  <button
                    type="button"
                    key={partnerId}
                    onClick={() => {
                      setActivePartnerId(partnerId);
                      setMobileChatOpen(true);
                    }}
                    className={`flex w-full items-start gap-3 border-b border-[#e1e4e8] p-4 text-left ${
                      selected ? 'border-l-4 border-[#d31d24] bg-white' : 'hover:bg-white'
                    }`}
                  >
                    <img
                      src={conversation.partner.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                      className="h-10 w-10 rounded-full object-cover"
                      alt=""
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block truncate text-xs font-bold text-[#17233b]">
                          {conversation.partner.full_name}
                        </span>
                        {Number(conversation.unread_count || 0) > 0 && (
                          <span className="min-w-5 rounded-full bg-[#d31d24] px-1.5 py-0.5 text-center text-[9px] font-bold text-white">
                            {Number(conversation.unread_count) > 99 ? '99+' : conversation.unread_count}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-slate-500">
                        {conversation.last_message?.content || 'Start a conversation'}
                      </span>
                      {conversation.active_exchange_id && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#d31d24]">
                          <Repeat className="h-3 w-3" />
                          {conversation.active_exchange_status === 'ACTIVE'
                            ? 'Exchange active'
                            : 'Exchange proposal'}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No conversations yet. Message a member to begin.
              </div>
            )}
          </div>
        </aside>

        <section
          className={`${mobileChatOpen ? 'flex' : 'hidden md:flex'} h-full flex-col bg-white md:col-span-8`}
        >
          {active ? (
            <>
              <header className="flex flex-col gap-3 border-b border-[#e1e4e8] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-50 md:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <img
                    src={active.partner.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                    className="h-10 w-10 rounded-full object-cover"
                    alt=""
                  />
                  <div>
                    <h3 className="text-xs font-bold text-[#17233b]">{active.partner.full_name}</h3>
                    <p className="text-[11px] text-slate-500">
                      {active.partner.headline || 'SkillBarter member'}
                    </p>
                    <div className="mt-1 flex gap-2">
                      {active.partner.verified && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#17233b]">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {active.partner.premium && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[#d31d24]">
                          <Crown className="h-3 w-3" /> Premium
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {active.active_exchange_id && (
                    <Link to={`/exchanges/${active.active_exchange_id}`}>
                      <Button size="sm" variant="outline" icon={<Repeat className="h-4 w-4" />}>
                        {active.active_exchange_status === 'PENDING' ? 'Review proposal' : 'Open exchange'}
                      </Button>
                    </Link>
                  )}
                  <Link to={`/profile/${active.partner.id}`}>
                    <Button size="sm" variant="ghost">Profile</Button>
                  </Link>
                </div>
              </header>

              {active.active_exchange_id && (
                <div className="flex items-center justify-between gap-3 border-b border-[#e1e4e8] bg-[#fff7f7] px-4 py-2.5">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#d31d24]">
                    <Repeat className="h-3 w-3" />
                    {exchangeLabel}
                  </div>
                  <Link
                    to={`/exchanges/${active.active_exchange_id}`}
                    className="text-[10px] font-bold text-[#17233b] hover:text-[#d31d24]"
                  >
                    Open workspace →
                  </Link>
                </div>
              )}

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f7f7f5] p-4 sm:p-6">
                {messagesLoading ? (
                  <div className="py-16 text-center text-xs text-slate-500" role="status">Loading messages…</div>
                ) : messages.length ? (
                  messages.map((message) => {
                    const mine = Number(message.sender_id) === Number(currentUser?.id);

                    return (
                      <div
                        key={message.id}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md rounded-2xl p-3 text-xs shadow-sm ${
                            mine
                              ? 'bg-[#d31d24] text-white'
                              : 'border border-[#e1e4e8] bg-white text-[#17233b]'
                          }`}
                        >
                          <p className="break-words whitespace-pre-wrap">{message.content}</p>
                          <span
                            className={`mt-1 block text-[9px] ${
                              mine ? 'text-red-100' : 'text-slate-400'
                            }`}
                          >
                            {message.created_at
                              ? new Date(message.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center text-xs text-slate-400">
                    No messages yet. Send the first message.
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="flex flex-col gap-2 border-t border-[#e1e4e8] bg-white p-3"
              >
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder="Type a message..."
                  aria-label="Message"
                  maxLength={2000}
                  className="w-full min-w-0 flex-1 resize-none rounded-xl border border-[#d9dde2] bg-white px-3 py-2.5 text-xs text-[#17233b] outline-none focus:border-[#d31d24]"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={sending || messagesLoading || !inputText.trim()}
                  icon={<Send className="h-4 w-4" />}
                >
                  {sending ? 'Sending…' : 'Send'}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-xs text-slate-400">
              <MessageSquare className="mb-2 h-10 w-10 text-slate-200" />
              Select a conversation to start messaging
            </div>
          )}

          {error && (
            <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </section>
      </Card>
    </div>
  );
};
