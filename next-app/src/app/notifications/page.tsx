"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Notification = { _id: string; title: string; body: string; type: string; readAt: string | null; createdAt: string; actor?: { fullName: string; username: string } | null };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ notifications: Notification[]; unreadCount: number }>("/api/notifications");
      setNotifications(data.notifications); setUnreadCount(data.unreadCount);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to load notifications.";
      if (/Authentication required|invalid or expired|unavailable/i.test(message)) router.replace("/login");
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function markRead(id: string) {
    setBusy(true); setError("");
    try { await api(`/api/notifications/${id}/read`, { method: "PATCH" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update notification."); }
    finally { setBusy(false); }
  }

  async function markAllRead() {
    setBusy(true); setError("");
    try { await api("/api/notifications/read-all", { method: "PATCH" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update notifications."); }
    finally { setBusy(false); }
  }

  return <main className="dashboardPage"><nav className="nav wrap"><Link className="brand" href="/">skill<span>barter</span></Link><div className="navActions"><Link className="navLink" href="/community">Community</Link><Link className="navLink" href="/dashboard">Dashboard</Link></div></nav><section className="notificationsContent wrap"><div className="notificationHeading"><div><p className="eyebrow">Stay in the loop</p><h1>Notifications.</h1><p className="adminIntro">{unreadCount} unread {unreadCount === 1 ? "update" : "updates"}.</p></div><button className="adminRefresh" disabled={busy || unreadCount === 0} onClick={() => void markAllRead()}>Mark all read</button></div>{error && <p className="formError" role="alert">{error}</p>}{loading ? <p className="emptyAdmin" role="status">Loading your notifications…</p> : <div className="notificationList">{notifications.map((item) => <article className={`notificationItem ${item.readAt ? "read" : "unread"}`} key={item._id}><span className="notificationDot" /><div className="notificationBody"><div className="notificationTitleRow"><h2>{item.title}</h2><time>{new Date(item.createdAt).toLocaleString()}</time></div><p>{item.body}</p>{item.actor && <span className="notificationActor">From {item.actor.fullName} (@{item.actor.username})</span>}</div>{!item.readAt && <button className="notificationRead" disabled={busy} onClick={() => void markRead(item._id)}>Mark read</button>}</article>)}{notifications.length === 0 && <div className="emptyAdmin">You’re all caught up. New exchange requests and community activity will appear here.</div>}</div>}</section></main>;
}
