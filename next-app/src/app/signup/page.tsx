"use client";

import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function changePhone(value: string) {
    setPhone(value);
    setPhoneCode("");
    setPhoneCodeSent(false);
    setPhoneVerified(false);
    setPhoneVerificationToken("");
    setError("");
  }

  async function requestPhoneCode() {
    setError("");
    setOtpBusy(true);
    try {
      const response = await fetch("/api/auth/phone-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "register" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to send SMS verification code.");
      setPhoneCodeSent(true);
      setPhoneVerified(false);
      setPhoneVerificationToken("");
      setPhoneCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send SMS verification code.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyPhoneCode() {
    setError("");
    setOtpBusy(true);
    try {
      const response = await fetch("/api/auth/phone-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: phoneCode, purpose: "register" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to verify mobile number.");
      if (data.verified !== true || typeof data.phoneVerificationToken !== "string") {
        throw new Error("Mobile verification could not be confirmed. Please try again.");
      }
      setPhoneVerificationToken(data.phoneVerificationToken);
      setPhoneVerified(true);
      setPhoneCodeSent(false);
      setPhoneCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify mobile number.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!phoneVerified || !phoneVerificationToken) {
      setError("Verify your mobile number before creating an account.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, username, email, password, phone, phoneVerificationToken })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create account.");
      router.replace("/onboarding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Start your next chapter"
      title={<>Make learning<br />a shared thing.</>}
      description="Create an account to share what you know and discover what you can learn."
      footer={<>Already have an account? <Link href="/login">Log in</Link></>}
    >
      <form onSubmit={submit} className="authForm">
        <label>Full name<input autoComplete="name" required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" /></label>
        <label>Username<input autoComplete="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" /></label>
        <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" /></label>
        <label>Mobile number<input type="tel" autoComplete="tel" required pattern="\\+[1-9][0-9]{7,14}" value={phone} onChange={(e) => changePhone(e.target.value)} placeholder="+919876543210" aria-describedby="phone-help" /></label>
        <p className="authIntro" id="phone-help">Use international format, including your country code.</p>
        {!phoneVerified && <button type="button" className="backHome" disabled={otpBusy || phone.trim().length < 8} onClick={() => void requestPhoneCode()}>{otpBusy ? "Please wait…" : phoneCodeSent ? "Resend SMS code" : "Send SMS verification code"}</button>}
        {phoneCodeSent && !phoneVerified && <>
          <label>6-digit SMS code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={phoneCode} onChange={(e) => setPhoneCode(e.target.value.replace(/\\D/g, ""))} placeholder="123456" /></label>
          <button type="button" className="backHome" disabled={otpBusy || phoneCode.length !== 6} onClick={() => void verifyPhoneCode()}>Verify mobile number</button>
        </>}
        {phoneVerified && <p role="status">Mobile number verified.</p>}
        {error && <p className="formError" role="alert">{error}</p>}
        <button className="button authSubmit" disabled={busy || otpBusy || !phoneVerified}>{busy ? "Creating account…" : "Create account"} <span aria-hidden="true">↗</span></button>
      </form>
    </AuthShell>
  );
}
