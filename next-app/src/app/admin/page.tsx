"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stats = { users: number; activeUsers: number; exchanges: number; pendingExchanges: number; openReports: number };
type AdminUser = { _id: string; fullName: string; username: string; email: string; isActive: boolean; isAdmin: boolean; onboardingCompleted: boolean; createdAt: string };
type Report = { _id: string; targetType: string; reason: string; details: string; status: string; createdAt: string; reporter?: { fullName: string; username: string }; targetUser?: { fullName: string; username: string } | null; resolutionNote?: string };
type Exchange = { _id: string; status: string; createdAt: string; requester?: { fullName: string; username: string }; recipient?: { fullName: string; username: string }; skillOffered?: { name: string }; skillRequested?: { name: string } };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [section, setSection] = useState<"users" | "reports" | "exchanges">("reports");

  const load = useCallback(async () => {
    setError("");
    const failures: string[] = [];
    const results = await Promise.allSettled([
      api<{ stats: Stats }>("/api/admin/stats"),
      api<{ users: AdminUser[] }>("/api/admin/users?limit=50"),
      api<{ reports: Report[] }>("/api/admin/reports?limit=50"),
      api<{ exchanges: Exchange[] }>("/api/admin/exchanges?limit=50")
    ]);

    if (results[0].status === "fulfilled") setStats(results[0].value.stats);
    else failures.push(`Statistics: ${results[0].reason instanceof Error ? results[0].reason.message : "Unable to load statistics."}`);

    if (results[1].status === "fulfilled") setUsers(results[1].value.users);
    else failures.push(`Users: ${results[1].reason instanceof Error ? results[1].reason.message : "Unable to load users."}`);

    if (results[2].status === "fulfilled") setReports(results[2].value.reports);
    else failures.push(`Reports: ${results[2].reason instanceof Error ? results[2].reason.message : "Unable to load reports."}`);

    if (results[3].status === "fulfilled") setExchanges(results[3].value.exchanges);
    else failures.push(`Exchanges: ${results[3].reason instanceof Error ? results[3].reason.message : "Unable to load exchanges."}`);

    const authFailure = failures.some((message) => /Authentication required|invalid or expired|account is unavailable/i.test(message));
    if (authFailure) {
      router.replace("/login");
      return;
    }
    if (failures.length) setError(failures.join(" · "));
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function setUserActive(user: AdminUser) {
    setBusyId(user._id); setError("");
    try {
      await api(`/api/admin/users/${user._id}/status`, { method: "PATCH", body: JSON.stringify({ isActive: !user.isActive }) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update user."); }
    finally { setBusyId(""); }
  }

  async function setReportStatus(report: Report, status: "reviewing" | "resolved" | "dismissed") {
    setBusyId(report._id); setError("");
    try {
      await api(`/api/admin/reports/${report._id}`, { method: "PATCH", body: JSON.stringify({ status, resolutionNote: report.resolutionNote || "" }) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update report."); }
    finally { setBusyId(""); }
  }

  return <main className="dashboardPage"><nav className="nav wrap"><Link className="brand" href="/">skill<span>barter</span></Link><Link className="navLink" href="/dashboard">Back to dashboard</Link></nav><section className="adminContent wrap"><p className="eyebrow">Administration</p><h1>Platform overview.</h1><p className="adminIntro">Review account activity, keep exchanges healthy, and follow up on reports.</p>{error && <p className="formError" role="alert">{error}</p>}
  {stats && <div className="dashboardTiles adminStats">{Object.entries(stats).map(([key, value]) => <article key={key}><span>{key.replace(/[A-Z]/g, (letter) => " " + letter).toUpperCase()}</span><h2>{value}</h2></article>)}</div>}
  <div className="adminTabs" role="tablist" aria-label="Admin sections"><button role="tab" aria-selected={section === "reports"} className={section === "reports" ? "active" : ""} onClick={() => setSection("reports")}>Reports ({reports.filter((r) => ["open", "reviewing"].includes(r.status)).length})</button><button role="tab" aria-selected={section === "users"} className={section === "users" ? "active" : ""} onClick={() => setSection("users")}>Users ({users.length})</button><button role="tab" aria-selected={section === "exchanges"} className={section === "exchanges" ? "active" : ""} onClick={() => setSection("exchanges")}>Exchanges ({exchanges.length})</button><button className="adminRefresh" onClick={() => void load()}>Refresh ↻</button></div>
  {section === "reports" && <section className="adminPanel"><h2>Reports queue</h2>{reports.length === 0 ? <p className="emptyAdmin">No reports found.</p> : <div className="adminList">{reports.map((report) => <article className="adminItem" key={report._id}><div className="adminItemTop"><span className={`statusPill status-${report.status}`}>{report.status}</span><time>{new Date(report.createdAt).toLocaleDateString()}</time></div><h3>{report.reason}</h3><p>{report.details || "No additional details provided."}</p><div className="adminMeta">Reported by {report.reporter?.fullName || "Unknown"} · Target: {report.targetUser?.fullName || report.targetType}</div>{report.status !== "resolved" && report.status !== "dismissed" && <div className="adminActions"><button disabled={busyId === report._id} onClick={() => void setReportStatus(report, "reviewing")}>Mark reviewing</button><button disabled={busyId === report._id} onClick={() => void setReportStatus(report, "resolved")}>Resolve</button><button disabled={busyId === report._id} onClick={() => void setReportStatus(report, "dismissed")}>Dismiss</button></div>}</article>)}</div>}</section>}
  {section === "users" && <section className="adminPanel"><h2>User accounts</h2>{users.length === 0 ? <p className="emptyAdmin">No users found.</p> : <div className="adminList">{users.map((user) => <article className="adminItem" key={user._id}><div className="adminItemTop"><span className={`statusPill ${user.isActive ? "status-resolved" : "status-dismissed"}`}>{user.isActive ? "active" : "disabled"}</span><time>{new Date(user.createdAt).toLocaleDateString()}</time></div><h3>{user.fullName} {user.isAdmin && <span className="adminRole">ADMIN</span>}</h3><p>@{user.username} · {user.email}</p><div className="adminMeta">Onboarding: {user.onboardingCompleted ? "complete" : "incomplete"}</div>{!user.isAdmin && <div className="adminActions"><button disabled={busyId === user._id} onClick={() => void setUserActive(user)}>{user.isActive ? "Deactivate account" : "Reactivate account"}</button></div>}</article>)}</div>}</section>}
  {section === "exchanges" && <section className="adminPanel"><h2>Exchange activity</h2>{exchanges.length === 0 ? <p className="emptyAdmin">No exchanges found.</p> : <div className="adminList">{exchanges.map((exchange) => <article className="adminItem" key={exchange._id}><div className="adminItemTop"><span className={`statusPill status-${exchange.status}`}>{exchange.status}</span><time>{new Date(exchange.createdAt).toLocaleDateString()}</time></div><h3>{exchange.skillOffered?.name || "Skill"} ↔ {exchange.skillRequested?.name || "Skill"}</h3><p>{exchange.requester?.fullName || "Unknown"} → {exchange.recipient?.fullName || "Unknown"}</p><div className="adminMeta">Exchange ID: {exchange._id}</div></article>)}</div>}</section>}
  </section></main>;
}
