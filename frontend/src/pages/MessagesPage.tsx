import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Conversation, Message } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MessageSquare, Send, Repeat, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MessagesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { lastMessageEvent } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await api.getConversations();
      setConversations(data);
      if (data.length > 0 && !activePartnerId) {
        setActivePartnerId(data[0].partner.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (partnerId: number) => {
    try {
      const data = await api.getMessages(partnerId);
      setMessages(data);
      // Mark conversation as read locally
      setConversations((prev) =>
        prev.map((c) => (c.partner.id === partnerId ? { ...c, unread_count: 0 } : c))
      );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activePartnerId) {
      loadMessages(activePartnerId);
    }
  }, [activePartnerId]);

  useEffect(() => {
    if (lastMessageEvent && lastMessageEvent.event === 'NEW_MESSAGE') {
      const msg = lastMessageEvent.data;
      if (msg.sender_id === activePartnerId) {
        setMessages((prev) => [...prev, msg]);
      }
      loadConversations();
    }
  }, [lastMessageEvent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activePartnerId) return;

    try {
      const sent = await api.sendMessage({
        receiver_id: activePartnerId,
        content: inputText.trim(),
      });
      setMessages((prev) => [...prev, sent]);
      setInputText('');
      loadConversations();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const activeConv = conversations.find((c) => c.partner.id === activePartnerId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Card className="overflow-hidden border-slate-200/90 shadow-md h-[750px] grid grid-cols-1 md:grid-cols-12">
        {/* LEFT COLUMN: Conversation List */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="text-sm font-bold text-slate-900">Neighborhood Messages</h2>
            <p className="text-[11px] text-slate-500">Live peer-to-peer barter conversations</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active conversations. Propose a skill barter or message a neighbor to begin!
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.partner.id === activePartnerId;
                return (
                  <div
                    key={conv.partner.id}
                    onClick={() => setActivePartnerId(conv.partner.id)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-white border-l-4 border-emerald-600 shadow-xs' : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <img
                      src={conv.partner.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                      alt={conv.partner.full_name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {conv.partner.full_name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ★ {Math.round(conv.partner.trust_score)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {conv.last_message || 'Active conversation'}
                      </p>
                      {conv.active_exchange_status && (
                        <span className="inline-block text-[9px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded mt-1">
                          Barter: {conv.active_exchange_status}
                        </span>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Window */}
        <div className="md:col-span-8 flex flex-col h-full bg-white">
          {activeConv ? (
            <>
              {/* Chat Header with Exchange Context */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <img
                    src={activeConv.partner.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                    alt={activeConv.partner.full_name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{activeConv.partner.full_name}</h3>
                    <p className="text-[11px] text-slate-500">{activeConv.partner.headline || 'Neighbor'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeConv.active_exchange_id && (
                    <Link to={`/exchanges/${activeConv.active_exchange_id}`}>
                      <Button size="sm" variant="outline" icon={<Repeat className="w-3.5 h-3.5" />}>
                        Exchange Workspace
                      </Button>
                    </Link>
                  )}
                  <Link to={`/profile/${activeConv.partner.id}`}>
                    <Button size="sm" variant="ghost">
                      Profile
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-white">
                {messages.length === 0 ? (
                  <div className="text-center py-20 text-xs text-slate-400">
                    No messages yet. Send a note to discuss availability and barter details!
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
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button type="submit" size="sm" icon={<Send className="w-4 h-4" />}>
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400 p-8 text-center">
              <MessageSquare className="w-10 h-10 text-slate-200 mb-2" />
              Select a conversation on the left to start messaging
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
