"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ExchangeMessages from "./ExchangeMessages";

type Person = { _id: string; fullName: string; username: string };
type Skill = { _id: string; name: string };
type Exchange = { _id: string; requester: Person; recipient: Person; skillOffered: Skill; skillRequested: Skill; message: string; status: string; scheduledAt?: string | null; completedByRequester: boolean; completedByRecipient: boolean; createdAt: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

export default function ExchangesPage() {
  const router = useRouter();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [userId, setUserId] = useState("");
  const [scheduleValues, setScheduleValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [exchangeData, userData] = await Promise.all([
        api<{ exchanges: Exchange[] }>("/api/exchanges"),
        api<{ user: { id: string } }>("/api/auth/me")
      ]);
      setExchanges(exchangeData.exchanges); setUserId(userData.user.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to load exchanges.";
      if (/Authentication required|invalid or expired|session has been revoked|account is unavailable/i.test(message)) router.replace("/login");
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(exchange: Exchange, status: string, scheduledAt?: string) {
    setBusyId(exchange._id); setError("");
    try {
      await api(`/api/exchanges/${exchange._id}/status`, { method: "PATCH", body: JSON.stringify({ status, ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}) }) });
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to update exchange.";
      if (/Authentication required|invalid or expired|session has been revoked|account is unavailable/i.test(message)) router.replace("/login");
      else setError(message);
    }
    finally { setBusyId(""); }
  }

  return <main className="dashboardPage"><nav className="nav wrap"><Link className="brand" href="/">skill<span>barter</span></Link><div className="navActions"><Link className="navLink" href="/matches">Discover</Link><Link className="navLink" href="/notifications">Notifications</Link><Link className="navLink" href="/dashboard">Dashboard</Link></div></nav><section className="exchangesContent wrap"><p className="eyebrow">From request to shared progress</p><h1>Your exchanges.</h1><p className="adminIntro">Coordinate with your exchange partner, schedule a session, and mark completion together.</p>{error && <p className="formError" role="alert">{error}</p>}{loading ? <div className="emptyAdmin" role="status">Loading your exchanges…</div> : <div className="exchangeList">{exchanges.map((exchange) => { const isRequester = String(exchange.requester?._id) === String(userId); const isRecipient = String(exchange.recipient?._id) === String(userId); const isBusy = busyId === exchange._id; return <article className="exchangeCard" key={exchange._id}><div className="exchangeCardHeader"><span className={`statusPill status-${exchange.status}`}>{exchange.status}</span><time>{new Date(exchange.createdAt).toLocaleDateString()}</time></div><h2>{exchange.skillOffered?.name || "Skill"} <span>↔</span> {exchange.skillRequested?.name || "Skill"}</h2><p className="exchangePeople">{exchange.requester?.fullName} (@{exchange.requester?.username}) and {exchange.recipient?.fullName} (@{exchange.recipient?.username})</p>{exchange.message && <blockquote className="exchangeMessage">{exchange.message}</blockquote>}{exchange.scheduledAt && <p className="scheduledTime">Scheduled for {new Date(exchange.scheduledAt).toLocaleString()}</p>}{exchange.status === "completed" && <p className="scheduledTime">Exchange completed. <Link href={`/reviews?user=${isRequester ? exchange.recipient?._id : exchange.requester?._id}&exchange=${exchange._id}`}>Leave a review ↗</Link></p>}<div className="exchangeControls">{exchange.status === "pending" && isRecipient && <><button disabled={isBusy} onClick={() => void changeStatus(exchange, "accepted")}>Accept request</button><button disabled={isBusy} onClick={() => void changeStatus(exchange, "declined")}>Decline</button></>}{["pending", "accepted", "scheduled"].includes(exchange.status) && isRequester && <button disabled={isBusy} onClick={() => void changeStatus(exchange, "cancelled")}>Cancel request</button>}{exchange.status === "accepted" && <form className="scheduleForm" onSubmit={(event) => { event.preventDefault(); const value = scheduleValues[exchange._id]; if (value) void changeStatus(exchange, "scheduled", value); }}><label>Schedule session<input type="datetime-local" required value={scheduleValues[exchange._id] || ""} onChange={(e) => setScheduleValues((values) => ({ ...values, [exchange._id]: e.target.value }))} /></label><button disabled={isBusy || !scheduleValues[exchange._id]}>Confirm time</button></form>}{["accepted", "scheduled"].includes(exchange.status) && <button disabled={isBusy} onClick={() => void changeStatus(exchange, "active")}>Start exchange</button>}{["active", "scheduled"].includes(exchange.status) && <button disabled={isBusy} onClick={() => void changeStatus(exchange, "completed")}>{isRequester && exchange.completedByRequester ? "Waiting for partner" : isRecipient && exchange.completedByRecipient ? "Waiting for partner" : "Mark completed"}</button>}</div><ExchangeMessages exchangeId={exchange._id} userId={userId} /></article>; })}</div>}{!loading && exchanges.length === 0 && <div className="emptyAdmin">No exchanges yet. <Link href="/matches">Discover a skill partner ↗</Link></div>}</section></main>;
}
