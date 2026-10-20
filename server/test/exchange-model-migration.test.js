import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Exchange from "../src/models/Exchange.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Exchange schema exposes required skills and target lifecycle representation", () => {
  assert.equal(Exchange.modelName, "Exchange");
  assert.equal(Exchange.schema.path("requester").isRequired, true);
  assert.equal(Exchange.schema.path("recipient").isRequired, true);
  assert.equal(Exchange.schema.path("skillOffered").isRequired, true);
  assert.equal(Exchange.schema.path("skillRequested").isRequired, true);
  assert.ok(Array.isArray(Exchange.schema.path("status").options.enum));
  assert.ok(Exchange.schema.path("scheduledAt"));
  assert.ok(Exchange.schema.path("completedByRequester"));
  assert.ok(Exchange.schema.path("completedByRecipient"));
});

test("exchange conversion guards nullable skills and source-only lifecycle details", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const exchanges = contract.tables.find((table) => table.name === "exchanges");
  assert.ok(exchanges);
  assert.equal(exchanges.status, "pending");
  assert.equal(exchanges.proposedTarget, "Exchange");
  assert.match(exchanges.reason, /requester_skill_id/i);
  assert.match(exchanges.reason, /receiver_skill_id/i);
  assert.match(exchanges.reason, /ON DELETE SET NULL/i);
  assert.match(exchanges.reason, /COUNTERED\/REJECTED/i);
  assert.match(exchanges.reason, /counter_message/i);
  assert.match(exchanges.reason, /preferred_date/i);
  assert.match(exchanges.reason, /estimated_hours/i);
  assert.match(exchanges.reason, /cancellation_reason/i);
  assert.match(exchanges.reason, /requester_completed/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("target Exchange schema does not directly preserve nullable source skills or counter and cancellation fields", () => {
  assert.equal(Exchange.schema.path("requester_skill_id"), undefined);
  assert.equal(Exchange.schema.path("receiver_skill_id"), undefined);
  assert.equal(Exchange.schema.path("counter_message"), undefined);
  assert.equal(Exchange.schema.path("preferred_date"), undefined);
  assert.equal(Exchange.schema.path("estimated_hours"), undefined);
  assert.equal(Exchange.schema.path("location_area"), undefined);
  assert.equal(Exchange.schema.path("cancellation_reason"), undefined);
  assert.equal(Exchange.schema.path("cancelled_by_id"), undefined);
});
