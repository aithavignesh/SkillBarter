import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Notification from "../src/models/Notification.js";
import { mapNotificationType, targetNotificationTypes } from "../src/migrations/mapNotificationType.js";


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

test("notification conversion guards source link and read-state semantics", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const notifications = contract.tables.find((table) => table.name === "notifications");
  assert.ok(notifications);
  assert.equal(Notification.schema.path("link"), undefined);
  assert.equal(Notification.schema.path("is_read"), undefined);
  assert.ok(Notification.schema.path("readAt"), "target uses a timestamp rather than a source boolean");
  assert.ok(Notification.schema.path("createdAt"), "target timestamps create createdAt automatically");
  assert.equal(Notification.schema.path("title").options.maxlength, 160);
  assert.equal(Notification.schema.path("body").options.maxlength, 1000);
  assert.match(notifications.reason, /link String\(255\)/i);
  assert.match(notifications.reason, /is_read/i);
  assert.match(notifications.reason, /created_at/i);
  assert.match(notifications.reason, /fixed lowercase enum/i);
  assert.equal(notifications.status, "pending");
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("notification conversion plan blocks lossy mapping until explicit policies are approved", async () => {
  const plan = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/notification-conversion-plan.json"), "utf8"));
  assert.equal(plan.entity, "notifications");
  assert.equal(plan.status, "blocked-pending-source-schema-and-data-inventory");
  assert.equal(plan.safety.schemaSnapshotReviewed, false);
  assert.equal(plan.safety.sourceInventoryExecuted, false);
  assert.equal(plan.safety.dataImportImplemented, false);
  assert.equal(plan.safety.productionImportAllowed, false);
  assert.equal(plan.safety.productionCutoverApproved, false);
  const fields = Object.fromEntries(plan.fields.map((field) => [field.source, field]));
  assert.equal(fields.link.target, null, "source links must not be silently discarded");
  assert.match(fields.link.status, /blocked/);
  assert.match(fields.is_read.conversion, /Do not fabricate/);
  assert.match(fields.message.conversion, /Do not silently truncate/);
  assert.match(fields.type.status, /blocked/);
  assert.match(fields.created_at.conversion, /exactly as UTC/);
});

test("notification type mapper requires explicit source mappings and rejects invalid targets", () => {
  const explicitMap = {
    "known-source-message": "message",
    "known-source-exchange": "exchange_request"
  };
  assert.equal(mapNotificationType("known-source-message", explicitMap), "message");
  assert.equal(mapNotificationType("known-source-exchange", explicitMap), "exchange_request");
  assert.throws(() => mapNotificationType("unseen-source-value", explicitMap), /Unmapped source notification type/);
  assert.throws(() => mapNotificationType("known-source-message", { "known-source-message": "unknown" }), /Invalid target notification type/);
  assert.throws(() => mapNotificationType("", explicitMap), /non-empty string/);
  assert.deepEqual(targetNotificationTypes.sort(), ["exchange_request", "exchange_update", "message", "post_comment", "post_like", "review", "system"]);
});
