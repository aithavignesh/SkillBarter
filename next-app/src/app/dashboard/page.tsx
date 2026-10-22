"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = { fullName: string; username: string; email: string; onboardingCompleted: boolean; isAdmin: boolean };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) { router.replace("/login"); return; }
        if (!response.ok) throw new Error(data.error || "Unable to load your account.");
        if (active && data.user && !data.user.onboardingCompleted) { router.replace("/onboarding"); return; }
        if (active) setUser(data.user);
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Unable to load your account."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (busy) return <main className="dashboardPage"><p>Loading your account…</p></main>;
  if (error) return <main className="dashboardPage"><p className="formError">{error}</p><Link href="/login">Return to login</Link></main>;
  if (!user) return <main className="dashboardPage"><p>Redirecting…</p></main>;

  return <main className="dashboardPage"><nav className="nav wrap"><Link className="brand" href="/">skill<span>barter</span></Link><div className="navActions"><Link className="navLink" href="/matches">Discover</Link><Link className="navLink" href="/exchanges">Exchanges</Link><Link className="navLink" href="/community">Community</Link><Link className="navLink" href="/notifications">Notifications</Link><Link className="navLink" href="/profile">Profile</Link><button className="logoutButton" onClick={logout}>Log out</button></div></nav><section className="dashboardWelcome wrap"><p className="eyebrow">Your SkillBarter space</p><h1>Welcome, {user.fullName.split(" ")[0]}.</h1><p>Find people with complementary skills, manage your exchanges, and keep your learning moving.</p><div className="dashboardTiles"><article><span>PROFILE</span><h2>@{user.username}</h2><p>{user.email}</p></article><article><span>ONBOARDING</span><h2>{user.onboardingCompleted ? "Completed" : "Not completed"}</h2><p>Profile and skill preferences.</p></article><article><span>ACCOUNT ROLE</span><h2>{user.isAdmin ? "Administrator" : "Member"}</h2><p>Role is checked on the API server.</p></article></div>{user.isAdmin && <Link className="button" href="/admin">Open admin tools ↗</Link>}</section></main>;
}
