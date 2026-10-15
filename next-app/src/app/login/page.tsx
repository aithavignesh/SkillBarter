"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to log in.");
      router.replace("/dashboard");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to log in."); }
    finally { setBusy(false); }
  }

  return <main className="authPage"><Link className="brand authBrand" href="/">skill<span>barter</span></Link><section className="authCard"><p className="eyebrow">Welcome back</p><h1>Pick up where<br />you left off.</h1><p className="authIntro">Sign in to continue sharing skills and learning together.</p><form onSubmit={submit} className="authForm"><label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></label>{error && <p className="formError" role="alert">{error}</p>}<button className="button authSubmit" disabled={busy}>{busy ? "Signing in…" : "Log in"} <span aria-hidden="true">↗</span></button></form><p className="authFoot">New to SkillBarter? <Link href="/signup">Create an account</Link></p><Link className="backHome" href="/">← Back to home</Link></section></main>;
}
