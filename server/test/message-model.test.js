import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Message from "../src/models/Message.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Message schema exposes current required fields and read-state representation", () => {
  assert.equal(Message.modelName, "Message");
  assert.ok(Message.schema.path("exchange"));
  assert.ok(Message.schema.path("sender"));
  assert.ok(Message.schema.path("recipient"));
  assert.ok(Message.schema.path("body"));
  assert.equal(Message.schema.path("exchange").isRequired, true);
  assert.equal(Message.schema.path("body").options.maxlength, 5000);
  assert.equal(Message.schema.path("readAt").options.default, null);
});

test("messages migration stays pending while source and target constraints differ", async () => {
  const contractPath = path.join(repositoryRoot, "migrations/source-to-target-contract.json");
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const messages = contract.tables.find((table) => table.name === "messages");
  assert.ok(messages);
  assert.equal(messages.status, "pending");
  assert.equal(messages.proposedTarget, "Message");
  assert.match(messages.reason, /nullable indexed exchange_id/i);
  assert.match(messages.reason, /ON DELETE SET NULL/i);
  assert.match(messages.reason, /is_read=true/i);
  assert.match(messages.reason, /5000 characters/i);
  assert.match(messages.reason, /ObjectIds/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("message conversion guards the nullable source exchange and timestamp/read-state mismatches", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const messages = contract.tables.find((table) => table.name === "messages");
  assert.ok(messages);
  assert.match(messages.reason, /nullable indexed exchange_id/i);
  assert.match(messages.reason, /required target exchange/i);
  assert.match(messages.reason, /created_at timestamp/i);
  assert.match(messages.reason, /createdAt\/updatedAt/i);
  assert.match(messages.reason, /is_read=true/i);
  assert.equal(Message.schema.path("exchange").isRequired, true);
  assert.ok(Message.schema.path("createdAt"), "createdAt is added automatically by Mongoose timestamps");
  assert.equal(Message.schema.options.timestamps, true);
  assert.equal(contract.schemaSnapshotReviewed, false);
});
