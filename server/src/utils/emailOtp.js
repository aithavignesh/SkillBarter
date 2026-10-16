import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export function generateEmailOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashEmailOtp(email, code, secret = process.env.OTP_SECRET || process.env.JWT_SECRET) {
  if (!secret) throw new Error("OTP_SECRET or JWT_SECRET must be configured.");
  return createHmac("sha256", secret).update(`${email.toLowerCase()}:${code}`).digest("hex");
}

export function emailOtpMatches(expectedHash, email, code) {
  if (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const candidate = Buffer.from(hashEmailOtp(email, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
