import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Skill from "../src/models/Skill.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Skill schema exposes normalized uniqueness and target field limits", () => {
  assert.equal(Skill.modelName, "Skill");
  assert.equal(Skill.schema.path("name").options.maxlength, 80);
  assert.equal(Skill.schema.path("normalizedName").isRequired, true);
  assert.equal(Skill.schema.path("normalizedName").options.unique, true);
  assert.equal(Skill.schema.path("category").options.maxlength, 80);
  assert.equal(Skill.schema.path("category").options.default, "Other");
  assert.equal(Skill.schema.path("description").options.maxlength, 500);
  assert.ok(Skill.schema.path("createdBy"));
  assert.equal(Skill.schema.path("icon"), undefined);
  assert.equal(Skill.schema.path("popularity"), undefined);
});

test("skills mapping records source/target constraints and remains pending", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const skills = contract.tables.find((table) => table.name === "skills");
  assert.ok(skills);
  assert.equal(skills.status, "pending");
  assert.equal(skills.proposedTarget, "Skill");
  assert.match(skills.reason, /String\(100\)/i);
  assert.match(skills.reason, /icon default Wrench/i);
  assert.match(skills.reason, /popularity default 0/i);
  assert.match(skills.reason, /normalizedName/i);
  assert.match(skills.reason, /collision handling/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});
