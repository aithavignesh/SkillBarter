import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Notification from "../src/models/Notification.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Notification schema exposes recipient, type enum, body, and read timestamp", () => {
  assert.equal(Notification.modelName, "Notification");
  assert.equal(Notification.schema.path("recipient").isRequired, true);
  assert.equal(Notification.schema.path("type").isRequired, true);
  assert.ok(Array.isArray(Notification.schema.path("type").options.enum));
  assert.equal(Notification.schema.path("title").options.maxlength, 160);
  assert.equal(Notification.schema.path("body").options.maxlength, 1000);
  assert.equal(Notification.schema.path("readAt").options.default, null);
  assert.ok(Notification.schema.path("resourceType"));
  assert.ok(Notification.schema.path("resourceId"));
});

test("notifications migration remains pending until source types and link/read semantics are mapped", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const notifications = contract.tables.find((table) => table.name === "notifications");
  assert.ok(notifications);
  assert.equal(notifications.status, "pending");
  assert.equal(notifications.proposedTarget, "Notification");
  assert.match(notifications.reason, /type String\(50\)/i);
  assert.match(notifications.reason, /link String\(255\)/i);
  assert.match(notifications.reason, /fixed lowercase enum/i);
  assert.match(notifications.reason, /is_read/i);
  assert.match(notifications.reason, /numeric user IDs to ObjectIds/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});
