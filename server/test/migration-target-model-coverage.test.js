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

test("unresolved source tables remain explicitly unmapped", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const connections = contract.tables.find((table) => table.name === "connections");
  assert.ok(connections, "connections source table must remain visible in the contract");
  assert.equal(connections.status, "blocked");
  assert.equal(connections.proposedTarget, null);
  assert.match(connections.reason, /do not convert to exchanges by assumption/i);
});
