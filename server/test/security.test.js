import test from "node:test";
import assert from "node:assert/strict";
import { hashResetToken, isTokenVersionCurrent, validateScheduledAt } from "../src/utils/security.js";

test("reset tokens are stored as deterministic SHA-256 hashes, not raw tokens", () => {
  const token = "a".repeat(64);
  const hashed = hashResetToken(token);
  assert.match(hashed, /^[a-f0-9]{64}$/);
  assert.notEqual(hashed, token);
  assert.equal(hashResetToken(token), hashed);
  assert.notEqual(hashResetToken(token), hashResetToken("b".repeat(64)));
});

test("session token version accepts only the current integer version", () => {
  assert.equal(isTokenVersionCurrent(0, 0), true);
  assert.equal(isTokenVersionCurrent(2, 2), true);
  assert.equal(isTokenVersionCurrent(1, 2), false);
  assert.equal(isTokenVersionCurrent(undefined, 0), false);
  assert.equal(isTokenVersionCurrent("0", 0), false);
});

test("scheduling rejects missing and malformed dates", () => {
  const now = Date.parse("2026-10-15T12:00:00.000Z");
  assert.equal(validateScheduledAt(undefined, now).error, "Provide a valid future scheduledAt date.");
  assert.equal(validateScheduledAt("   ", now).error, "Provide a valid future scheduledAt date.");
  assert.equal(validateScheduledAt("not-a-date", now).error, "The exchange must be scheduled for a future date and time.");
});

test("scheduling rejects dates in the past or at the current time", () => {
  const now = Date.parse("2026-10-15T12:00:00.000Z");
  assert.match(validateScheduledAt("2026-10-15T11:59:59.000Z", now).error, /future date/);
  assert.match(validateScheduledAt("2026-10-15T12:00:00.000Z", now).error, /future date/);
});

test("scheduling accepts future dates within 180 days and rejects dates beyond the limit", () => {
  const now = Date.parse("2026-10-15T12:00:00.000Z");
  const valid = validateScheduledAt("2026-11-01T12:00:00.000Z", now);
  assert.equal(valid.error, undefined);
  assert.equal(valid.date.toISOString(), "2026-11-01T12:00:00.000Z");
  assert.match(validateScheduledAt("2027-04-14T12:00:00.001Z", now).error, /180 days/);
});
