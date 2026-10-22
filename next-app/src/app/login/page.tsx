"use client";

import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type SignInMode = "password" | "emailOtp" | "phoneOtp";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<SignInMode>("password");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const endpoint = mode === "password"
        ? "/api/auth/login"
        : mode === "emailOtp"
          ? otpSent ? "/api/auth/otp/verify" : "/api/auth/otp/request"
          : otpSent ? "/api/auth/phone-otp/verify" : "/api/auth/phone-otp/request";
      const body = mode === "password"
        ? { email, password }
        : mode === "emailOtp"
          ? otpSent ? { email, code: otpCode } : { email }
          : otpSent ? { phone, code: otpCode, purpose: "login" } : { phone, purpose: "login" };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      if (mode !== "password" && !otpSent) {
        setOtpSent(true);
        setOtpCode("");
        setNotice(`A sign-in code has been requested. Check your ${mode === "phoneOtp" ? "phone" : "email"}.`);
        return;
      }
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    setError("");
    setBusy(true);
    try {
      const endpoint = mode === "phoneOtp" ? "/api/auth/phone-otp/request" : "/api/auth/otp/request";
      const body = mode === "phoneOtp" ? { phone, purpose: "login" } : { email };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to resend your sign-in code.");
      setOtpCode("");
      setNotice(`A new sign-in code has been requested. Check your ${mode === "phoneOtp" ? "phone" : "email"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to resend your sign-in code.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMode((current) => current === "password" ? "emailOtp" : current === "emailOtp" ? "phoneOtp" : "password");
    setOtpSent(false);
    setOtpCode("");
    setError("");
    setNotice("");
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title={<>Pick up where<br />you left off.</>}
      description="Sign in to continue sharing skills and learning together."
      footer={<>
        <button type="button" className="textLink" onClick={switchMode}>{mode === "password" ? "Use email OTP instead" : mode === "emailOtp" ? "Use phone OTP instead" : "Use password instead"}</button>
        {" · "}New to SkillBarter? <Link href="/signup">Create an account</Link>
      </>}
    >
      <form onSubmit={submit} className="authForm">
        {mode === "phoneOtp" ? (
          <label>Mobile number<input type="tel" autoComplete="tel" required pattern="[+][1-9][0-9]{7,14}" value={phone} onChange={(e) => { setPhone(e.target.value); setOtpSent(false); setOtpCode(""); }} placeholder="+919876543210" /></label>
        ) : (
          <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => { setEmail(e.target.value); setOtpSent(false); setOtpCode(""); }} placeholder="you@example.com" /></label>
        )}
        {mode === "password" ? (
          <label>Password<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></label>
        ) : otpSent ? (
          <label>6-digit {mode === "phoneOtp" ? "SMS" : "email"} code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" /></label>
        ) : (
          <p className="authIntro">{mode === "phoneOtp" ? "We’ll text a one-time sign-in code if this number belongs to an active account." : "We’ll email a one-time sign-in code if this address belongs to an active account."}</p>
        )}
        {mode === "password" && <p className="authFoot"><Link href="/reset-password">Forgot your password?</Link></p>}
        {error && <p className="formError" role="alert">{error}</p>}
        {notice && <p className="matchNotice" role="status">{notice}</p>}
        <button className="button authSubmit" disabled={busy}>{busy ? "Please wait…" : mode === "password" ? "Log in" : otpSent ? "Verify code & sign in" : mode === "phoneOtp" ? "Send SMS code" : "Send email code"} <span aria-hidden="true">↗</span></button>
        {mode !== "password" && otpSent && <button type="button" className="backHome" disabled={busy} onClick={() => void resendOtp()}>{busy ? "Sending…" : "Resend a code"}</button>}
      </form>
    </AuthShell>
  );
}
