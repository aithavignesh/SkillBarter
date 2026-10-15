"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stats = { users: number; activeUsers: number; exchanges: number; pendingExchanges: number; openReports: number };

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/admin/stats", { cache: "no-store" }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(data.error || "Unable to load admin dashboard.");
      if (active) setStats(data.stats);
    }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "Unable to load admin dashboard."); });
    return () => { active = false; };
  }, [router]);
  return <main className="dashboardPage"><nav className="nav wrap"><Link className="brand" href="/">skill<span>barter</span></Link><Link className="navLink" href="/dashboard">Dashboard</Link></nav><section className="dashboardWelcome wrap"><p className="eyebrow">Administration</p><h1>Platform overview.</h1>{error && <p className="formError" role="alert">{error}</p>}{stats && <div className="dashboardTiles">{Object.entries(stats).map(([key, value]) => <article key={key}><span>{key.replace(/[A-Z]/g, (letter) => " " + letter).toUpperCase()}</span><h2>{value}</h2></article>)}</div>}</section></main>;
}
