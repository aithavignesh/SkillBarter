import test from "node:test";
import assert from "node:assert/strict";
import { mapNotificationType } from "../src/migrations/mapNotificationType.js";

test("maps only explicitly approved notification source values", () => {
  assert.equal(mapNotificationType("legacy_message", { legacy_message: "message" }), "message");
});

test("rejects whitespace-only source notification types", () => {
  assert.throws(() => mapNotificationType("   ", {}), /non-empty string/);
});

test("rejects source notification types padded with whitespace", () => {
  assert.throws(() => mapNotificationType(" legacy_message ", { " legacy_message ": "message" }), /leading or trailing whitespace/);
});

test("rejects missing and unsupported notification mappings instead of guessing", () => {
  assert.throws(() => mapNotificationType("unknown", {}), /Unmapped source notification type/);
  assert.throws(
    () => mapNotificationType("legacy_message", { legacy_message: "unknown_type" }),
    /Invalid target notification type/
  );
});
