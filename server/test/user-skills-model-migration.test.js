import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import User from "../src/models/User.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target User skill arrays reference Skill documents", () => {
  assert.ok(User.schema.path("skillsToTeach"));
  assert.ok(User.schema.path("skillsToLearn"));
  assert.equal(User.schema.path("skillsToTeach").caster.options.ref, "Skill");
  assert.equal(User.schema.path("skillsToLearn").caster.options.ref, "Skill");
});

test("user_skills mapping preserves association metadata as an explicit unresolved gap", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const mapping = contract.tables.find((table) => table.name === "user_skills");
  assert.ok(mapping);
  assert.equal(mapping.status, "pending");
  assert.equal(mapping.proposedTarget, "User.skillsToTeach / User.skillsToLearn");
  assert.match(mapping.reason, /experience_level/i);
  assert.match(mapping.reason, /description Text/i);
  assert.match(mapping.reason, /created_at/i);
  assert.match(mapping.reason, /OFFERED or NEEDED/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});
