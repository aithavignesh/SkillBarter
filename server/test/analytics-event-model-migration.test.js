import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AnalyticsEvent from "../src/models/AnalyticsEvent.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target AnalyticsEvent schema keeps actor, enum, path, and mixed properties constraints", () => {
  assert.equal(AnalyticsEvent.modelName, "AnalyticsEvent");
  assert.equal(AnalyticsEvent.schema.path("actor").options.required, true);
  assert.equal(AnalyticsEvent.schema.path("name").options.required, true);
  assert.ok(Array.isArray(AnalyticsEvent.schema.path("name").options.enum));
  assert.equal(AnalyticsEvent.schema.path("path").options.maxlength, 160);
  assert.equal(AnalyticsEvent.schema.path("path").options.default, "");
  assert.ok(AnalyticsEvent.schema.path("properties"));
});

test("analytics migration stays pending while source session and event semantics differ", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const analytics = contract.tables.find((table) => table.name === "analytics_events");
  assert.ok(analytics);
  assert.equal(analytics.status, "pending");
  assert.equal(analytics.proposedTarget, "AnalyticsEvent");
  assert.match(analytics.reason, /session_id String\(120\)/i);
  assert.match(analytics.reason, /properties Text/i);
  assert.match(analytics.reason, /actor User ObjectId/i);
  assert.match(analytics.reason, /fixed lowercase enum/i);
  assert.match(analytics.reason, /160 characters/i);
  assert.match(analytics.reason, /privacy\/retention policy/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("analytics mapping explicitly protects source event time and anonymous-session decisions", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const analytics = contract.tables.find((table) => table.name === "analytics_events");
  assert.ok(analytics);
  assert.match(analytics.reason, /required indexed timestamp DateTime/i);
  assert.match(analytics.reason, /separate event timestamp/i);
  assert.match(analytics.reason, /source rows without an attributable user/i);
  assert.match(analytics.reason, /session_id may be retained under the approved privacy\/retention policy/i);
  assert.equal(AnalyticsEvent.schema.path("timestamp"), undefined);
  assert.ok(AnalyticsEvent.schema.path("createdAt"));
  assert.equal(contract.schemaSnapshotReviewed, false);
});
