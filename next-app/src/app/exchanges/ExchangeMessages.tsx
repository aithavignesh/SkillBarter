"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Person = { _id?: string; id?: string; fullName?: string; username?: string; avatarUrl?: string };
type Message = { _id: string; body: string; createdAt: string; readAt?: string | null; sender: Person };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

export default function ExchangeMessages({ exchangeId, userId }: { exchangeId: string; userId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await api<{ messages: Message[] }>(`/api/messages/exchange/${exchangeId}`);
      setMessages(data.messages);
      setError("");
      const unreadIncoming = data.messages.filter((message) =>
        String(message.sender?._id || message.sender?.id) !== String(userId) && !message.readAt
      );
      await Promise.all(unreadIncoming.map(async (message) => {
        try {
          await api(`/api/messages/${message._id}/read`, { method: "PATCH" });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (/Authentication required|invalid or expired|session has been revoked|account is unavailable/i.test(message)) {
            router.replace("/login");
            return;
          }
          // A second poll may race with a read receipt; the next poll reconciles it.
        }
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to load messages.";
      if (/Authentication required|invalid or expired|session has been revoked|account is unavailable/i.test(message)) router.replace("/login");
      else setError(message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [exchangeId, router, userId]);

  useEffect(() => {
    let active = true;
    void loadMessages();
    const interval = window.setInterval(() => {
      if (active) void loadMessages(true);
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [loadMessages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({ exchangeId, body })
      });
      setDraft("");
      await loadMessages(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to send message.";
      if (/Authentication required|invalid or expired|session has been revoked|account is unavailable/i.test(message)) router.replace("/login");
      else setError(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="exchangeMessages" aria-label="Exchange messages">
      <div className="exchangeMessagesHeader">
        <h3>Messages</h3>
        <span>Refreshes automatically</span>
      </div>
      {error && <p className="formError" role="alert">{error}</p>}
      <div className="exchangeMessageList" aria-live="polite">
        {loading && messages.length === 0 && <p className="messageEmpty">Loading conversation…</p>}
        {!loading && messages.length === 0 && <p className="messageEmpty">No messages yet. Coordinate your first session here.</p>}
        {messages.map((message) => {
          const own = String(message.sender?._id || message.sender?.id) === String(userId);
          return (
            <article className={own ? "exchangeChatMessage own" : "exchangeChatMessage"} key={message._id}>
              <div className="exchangeChatMeta">
                <strong>{own ? "You" : message.sender?.fullName || message.sender?.username || "Exchange partner"}</strong>
                <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
              </div>
              <p>{message.body}</p>
              {own && message.readAt && <span className="messageReadReceipt">Read</span>}
            </article>
          );
        })}
      </div>
      <form className="exchangeMessageComposer" onSubmit={sendMessage}>
        <label className="srOnly" htmlFor={`message-${exchangeId}`}>Write a message</label>
        <textarea id={`message-${exchangeId}`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={2} placeholder="Message your exchange partner…" />
        <div className="exchangeMessageComposerFooter">
          <span>{draft.length}/5000</span>
          <button className="button" disabled={sending || !draft.trim()}>{sending ? "Sending…" : "Send message"}</button>
        </div>
      </form>
    </section>
  );
}
