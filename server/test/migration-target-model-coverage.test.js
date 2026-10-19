import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contractPath = path.join(repositoryRoot, "migrations/source-to-target-contract.json");
const modelsDirectory = path.join(repositoryRoot, "server/src/models");

test("every proposed migration target refers to an existing Mongoose model", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const modelFiles = new Set((await readdir(modelsDirectory))
    .filter((file) => file.endsWith(".js"))
    .map((file) => file.slice(0, -3)));
  const issues = [];

  for (const table of contract.tables) {
    if (table.proposedTarget == null) continue;
    // A target can describe fields on a model, e.g. "User.skillsToTeach / User.skillsToLearn".
    const targetModels = table.proposedTarget.match(/\b[A-Z][A-Za-z0-9]*\b/g) ?? [];
    const normalized = targetModels.length ? targetModels : [table.proposedTarget.split(/[./\s]/)[0]];
    for (const modelName of new Set(normalized)) {
      if (!modelFiles.has(modelName)) issues.push(`${table.name} -> ${modelName}: model file is missing`);
    }
  }

  assert.deepEqual(issues, [], issues.join("\n"));
});

test("unresolved source tables remain explicitly blocked until their mapping is approved", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const connections = contract.tables.find((table) => table.name === "connections");
  assert.ok(connections, "connections source table must remain visible in the contract");
  assert.equal(connections.status, "blocked");
  assert.equal(connections.proposedTarget, "Connection");
  assert.match(connections.reason, /inventory status values/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("notifications mapping remains pending until source type and field conversions are reviewed", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const notifications = contract.tables.find((table) => table.name === "notifications");
  assert.ok(notifications);
  assert.equal(notifications.status, "pending");
  assert.equal(notifications.proposedTarget, "Notification");
  assert.match(notifications.reason, /user_id/i);
  assert.match(notifications.reason, /is_read/i);
  assert.match(notifications.reason, /fixed lowercase enum/i);
  assert.match(notifications.reason, /type\/message\/link\/read state/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("blocks mapping remains pending until source constraints and fields are reviewed", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const blocks = contract.tables.find((table) => table.name === "blocks");
  assert.ok(blocks, "blocks source table must remain visible in the contract");
  assert.equal(blocks.status, "pending");
  assert.equal(blocks.proposedTarget, "Block");
  assert.match(blocks.reason, /blocker_id/i);
  assert.match(blocks.reason, /blocked_id/i);
  assert.match(blocks.reason, /ON DELETE CASCADE/i);
  assert.match(blocks.reason, /uq_blocker_blocked/i);
  assert.match(blocks.reason, /captured PostgreSQL constraints/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});
