import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contractPath = path.join(repositoryRoot, "migrations", "source-to-target-contract.json");

test("checked-in source contract stays blocked until real schema evidence is reviewed", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));

  assert.equal(contract.schemaSnapshotReviewed, false,
    "Do not mark the source schema reviewed without actual reviewed evidence.");
  assert.equal(contract.status, "blocked-pending-source-schema",
    "The contract must remain blocked while source schema evidence is pending.");
  assert.ok(Array.isArray(contract.tables) && contract.tables.length > 0,
    "The contract must enumerate the source tables requiring review.");
  assert.ok(contract.tables.every((table) => ["pending", "blocked"].includes(table.status)),
    "No table may be approved while the source schema is unreviewed.");
  assert.ok(contract.tables.every((table) => typeof table.reason === "string" && table.reason.trim()),
    "Every unresolved table must explain its review risks.");
});
