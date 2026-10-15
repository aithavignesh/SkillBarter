import { createHash } from "node:crypto";

export function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function isTokenVersionCurrent(tokenVersion, currentVersion) {
  return Number.isInteger(tokenVersion) && tokenVersion === currentVersion;
}

export function validateScheduledAt(rawScheduledAt, now = Date.now()) {
  const maxSchedulingDays = 180;
  const maxSchedulingMs = maxSchedulingDays * 24 * 60 * 60 * 1000;
  if (typeof rawScheduledAt !== "string" || !rawScheduledAt.trim()) {
    return { error: "Provide a valid future scheduledAt date." };
  }
  const scheduledAtMs = Date.parse(rawScheduledAt);
  if (!Number.isFinite(scheduledAtMs) || scheduledAtMs <= now) {
    return { error: "The exchange must be scheduled for a future date and time." };
  }
  if (scheduledAtMs > now + maxSchedulingMs) {
    return { error: `Choose a date within the next ${maxSchedulingDays} days.` };
  }
  return { date: new Date(scheduledAtMs) };
}
