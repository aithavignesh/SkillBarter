"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const isConfirm = Boolean(token);
      if (isConfirm && password !== confirmPassword) throw new Error("Passwords do not match.");
      const response = await fetch(isConfirm ? "/api/auth/password-reset/confirm" : "/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isConfirm ? { token, password } : { email })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to process your request.");
      setMessage(data.message || "Request completed.");
      if (isConfirm) { setPassword(""); setConfirmPassword(""); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to process your request.");
    } finally { setBusy(false); }
  }

  return <main className="authPage"><Link className="brand authBrand" href="/">skill<span>barter</span></Link><section className="authCard"><p className="eyebrow">Account recovery</p><h1>{token ? "Choose a new password." : "Forgot your password?"}</h1><p className="authIntro">{token ? "Choose a strong password to secure your account." : "Enter the email linked to your account. If recovery is configured, we’ll send you a reset link."}</p><form onSubmit={submit} className="authForm">{!token ? <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label> : <><label>New password<input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" /></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter it again" /></label></>}{error && <p className="formError" role="alert">{error}</p>}{message && <p role="status">{message}</p>}<button className="button authSubmit" disabled={busy}>{busy ? "Please wait…" : token ? "Update password" : "Send reset link"} <span aria-hidden="true">↗</span></button></form><p className="authFoot"><Link href="/login">← Back to log in</Link></p></section></main>;
}
