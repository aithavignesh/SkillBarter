"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Match = {
  user: { id: string; fullName: string; username: string; avatarUrl?: string; bio?: string; headline?: string; trustScore?: number };
  score: number;
  suggestedExchange: { skillOfferedId: string; skillOfferedName: string; skillRequestedId: string; skillRequestedName: string } | null;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ matches: Match[]; message?: string }>("/api/matches");
      setMatches(data.matches);
      setMessage(data.message || "");
    } catch (e) {
      const text = e instanceof Error ? e.message : "Unable to load matches.";
      if (/Authentication required|invalid or expired|session has been revoked|account is unavailable/i.test(text)) router.replace("/login");
      else setError(text);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function requestExchange(match: Match) {
    if (!match.suggestedExchange) return;
    setBusyId(match.user.id); setError("");
    try {
      await api("/api/exchanges", { method: "POST", body: JSON.stringify({
        recipientId: match.user.id,
        skillOfferedId: match.suggestedExchange.skillOfferedId,
        skillRequestedId: match.suggestedExchange.skillRequestedId,
        message: "Hi! Our skills look like a good match. Would you like to arrange a skill exchange?"
      }) });
      setMessage(`Exchange request sent to ${match.user.fullName}.`);
    } catch (e) {
      const text = e instanceof Error ? e.message : "Unable to send exchange request.";
      if (/Authentication required|invalid or expired|session has been revoked|account is unavailable/i.test(text)) router.replace("/login");
      else setError(text);
    }
    finally { setBusyId(""); }
  }

  return <main className="dashboardPage"><nav className="nav wrap"><Link className="brand" href="/">skill<span>barter</span></Link><div className="navActions"><Link className="navLink" href="/community">Community</Link><Link className="navLink" href="/notifications">Notifications</Link><Link className="navLink" href="/dashboard">Dashboard</Link></div></nav><section className="matchesContent wrap"><p className="eyebrow">Built around reciprocity</p><h1>People to learn with.</h1><p className="adminIntro">These people can teach something you want to learn—and want to learn something you can teach.</p>{error && <p className="formError" role="alert">{error}</p>}{message && <p className="matchNotice">{message}</p>}{loading ? <p className="emptyAdmin" role="status">Finding people with complementary skills…</p> : <div className="matchGrid">{matches.map((match) => <article className="matchCard" key={match.user.id}><div className="matchPerson"><div className="matchAvatar">{match.user.fullName.slice(0, 1).toUpperCase()}</div><div><h2>{match.user.fullName}</h2><p>@{match.user.username}</p></div></div>{match.user.headline && <p className="matchHeadline">{match.user.headline}</p>}{match.user.bio && <p className="matchBio">{match.user.bio}</p>}<div className="exchangePair"><div><span>YOU CAN TEACH</span><strong>{match.suggestedExchange?.skillOfferedName}</strong></div><span className="exchangeArrow">↔</span><div><span>YOU CAN LEARN</span><strong>{match.suggestedExchange?.skillRequestedName}</strong></div></div><button className="button matchRequest" disabled={busyId === match.user.id} onClick={() => void requestExchange(match)}>{busyId === match.user.id ? "Sending…" : "Request exchange"} ↗</button></article>)}</div>}{!loading && matches.length === 0 && <div className="emptyAdmin">{message || "No reciprocal matches yet. Add more teaching and learning skills to improve your chances."}<p><Link href="/onboarding">Update my skills ↗</Link></p></div>}</section></main>;
}
