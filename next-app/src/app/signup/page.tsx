"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, username, email, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create account.");
      router.replace("/dashboard");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create account."); }
    finally { setBusy(false); }
  }

  return <main className="authPage"><Link className="brand authBrand" href="/">skill<span>barter</span></Link><section className="authCard"><p className="eyebrow">Start your next chapter</p><h1>Make learning<br />a shared thing.</h1><p className="authIntro">Create an account to share what you know and discover what you can learn.</p><form onSubmit={submit} className="authForm"><label>Full name<input autoComplete="name" required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" /></label><label>Username<input autoComplete="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" /></label><label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" /></label>{error && <p className="formError" role="alert">{error}</p>}<button className="button authSubmit" disabled={busy}>{busy ? "Creating account…" : "Create account"} <span aria-hidden="true">↗</span></button></form><p className="authFoot">Already have an account? <Link href="/login">Log in</Link></p><Link className="backHome" href="/">← Back to home</Link></section></main>;
}
