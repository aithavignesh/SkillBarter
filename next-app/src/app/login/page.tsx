"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "emailOtp">("password");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const endpoint = mode === "password"
        ? "/api/auth/login"
        : otpSent ? "/api/auth/otp/verify" : "/api/auth/otp/request";
      const body = mode === "password" ? { email, password } : otpSent ? { email, code: otpCode } : { email };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      if (mode === "emailOtp" && !otpSent) {
        setOtpSent(true);
        setError("");
        return;
      }
      router.replace("/dashboard");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }

  function switchMode() {
    setMode((current) => current === "password" ? "emailOtp" : "password");
    setOtpSent(false);
    setOtpCode("");
    setError("");
  }

  return <main className="authPage"><Link className="brand authBrand" href="/">skill<span>barter</span></Link><section className="authCard"><p className="eyebrow">Welcome back</p><h1>Pick up where<br />you left off.</h1><p className="authIntro">Sign in to continue sharing skills and learning together.</p><form onSubmit={submit} className="authForm"><label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>{mode === "password" ? <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></label> : otpSent ? <label>6-digit email code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" /></label> : <p className="authIntro">We’ll email a one-time sign-in code if this address belongs to an active account.</p>}{mode === "password" && <p className="authFoot"><Link href="/reset-password">Forgot your password?</Link></p>}{error && <p className="formError" role="alert">{error}</p>}<button className="button authSubmit" disabled={busy}>{busy ? "Please wait…" : mode === "password" ? "Log in" : otpSent ? "Verify code & sign in" : "Send email code"} <span aria-hidden="true">↗</span></button>{mode === "emailOtp" && otpSent && <button type="button" className="backHome" onClick={() => { setOtpSent(false); setOtpCode(""); setError(""); }}>Resend a code</button>}</form><p className="authFoot"><button type="button" className="textLink" onClick={switchMode}>{mode === "password" ? "Use email OTP instead" : "Use password instead"}</button></p><p className="authFoot">New to SkillBarter? <Link href="/signup">Create an account</Link></p><Link className="backHome" href="/">← Back to home</Link></section></main>;
}
