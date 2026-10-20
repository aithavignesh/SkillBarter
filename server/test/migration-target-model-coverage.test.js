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
  assert.match(connections.reason, /inventory actual status values/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("skills mapping documents field constraints and keeps conversion decisions pending", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const skills = contract.tables.find((table) => table.name === "skills");
  assert.ok(skills);
  assert.equal(skills.status, "pending");
  assert.equal(skills.proposedTarget, "Skill");
  assert.match(skills.reason, /popularity default 0/i);
  assert.match(skills.reason, /normalizedName/i);
  assert.match(skills.reason, /collision handling/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("user_skills mapping preserves unresolved association semantics and metadata", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const userSkills = contract.tables.find((table) => table.name === "user_skills");
  assert.ok(userSkills);
  assert.equal(userSkills.status, "pending");
  assert.equal(userSkills.proposedTarget, "User.skillsToTeach / User.skillsToLearn");
  assert.match(userSkills.reason, /ON DELETE CASCADE/i);
  assert.match(userSkills.reason, /OFFERED\/NEEDED/i);
  assert.match(userSkills.reason, /experience_level/i);
  assert.match(userSkills.reason, /ObjectIds/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("exchanges mapping documents status, optional skill, and scheduling conversion gaps", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const exchanges = contract.tables.find((table) => table.name === "exchanges");
  assert.ok(exchanges);
  assert.equal(exchanges.status, "pending");
  assert.equal(exchanges.proposedTarget, "Exchange");
  assert.match(exchanges.reason, /requester_skill_id/i);
  assert.match(exchanges.reason, /ON DELETE SET NULL/i);
  assert.match(exchanges.reason, /COUNTERED\/REJECTED/i);
  assert.match(exchanges.reason, /counter_message/i);
  assert.match(exchanges.reason, /requester_completed/i);
  assert.match(exchanges.reason, /lowercase enum/i);
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
  assert.match(notifications.reason, /type conversion\/fallback handling/i);
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
  assert.match(blocks.reason, /captured PostgreSQL snapshot/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("no source mapping can be approved before the PostgreSQL schema snapshot is reviewed", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  assert.equal(contract.schemaSnapshotReviewed, false);
  assert.equal(contract.status, "blocked-pending-source-schema");
  assert.ok(Array.isArray(contract.tables) && contract.tables.length > 0);
  const approved = contract.tables.filter((table) => table.status === "approved");
  assert.deepEqual(approved, [], "mapping approvals must wait for reviewed source schema evidence");
  for (const table of contract.tables) {
    assert.ok(["pending", "blocked"].includes(table.status), `${table.name} must remain pending or blocked`);
    assert.equal(typeof table.reason, "string");
    assert.ok(table.reason.trim().length > 0, `${table.name} must explain its unresolved conversion risks`);
  }
});
