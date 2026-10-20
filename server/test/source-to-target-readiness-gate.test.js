import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateMappingContract } from "../src/migrations/validateMappingContract.js";

const contractPath = fileURLToPath(new URL("../../migrations/source-to-target-contract.json", import.meta.url));

test("current source-to-target contract remains blocked until source schema review", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));

  assert.equal(contract.schemaSnapshotReviewed, false);
  assert.equal(contract.status, "blocked-pending-source-schema");
  assert.equal(contract.tables.length, 12);
  assert.ok(contract.tables.every((table) => ["pending", "blocked"].includes(table.status)),
    "no mapping may be approved before the source schema is reviewed");
  assert.ok(contract.tables.every((table) => typeof table.reason === "string" && table.reason.trim().length > 0),
    "every source table must explain its unresolved mapping risks");

  const connections = contract.tables.find((table) => table.name === "connections");
  assert.ok(connections, "connections source table must remain represented");
  assert.equal(connections.status, "blocked");
});

test("mapping validator cannot report the current contract as migration-ready", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const report = validateMappingContract(contract);

  assert.equal(report.schemaSnapshotReviewed, false);
  assert.equal(report.valid, true, "a documented blocked contract can be structurally valid");
  assert.equal(report.readyTableCount, 0);
  assert.equal(report.blockedTableCount, contract.tables.length);
});
