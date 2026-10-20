import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const contractPath = fileURLToPath(new URL("../../migrations/source-to-target-contract.json", import.meta.url));
const worksheetPath = fileURLToPath(new URL("../../migrations/SCHEMA_REVIEW_TEMPLATE.md", import.meta.url));

test("schema review worksheet includes every source table in the mapping contract", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const worksheet = await readFile(worksheetPath, "utf8");

  for (const table of contract.tables) {
    assert.ok(worksheet.includes("| `" + table.name + "` |"), "schema review worksheet is missing source table: " + table.name);
  }
});

test("schema review worksheet does not present pending mappings as approved", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const worksheet = await readFile(worksheetPath, "utf8");

  assert.equal(contract.schemaSnapshotReviewed, false);
  assert.equal(contract.status, "blocked-pending-source-schema");
  assert.match(worksheet, /blank review template — not evidence that the source schema has been inspected or approved/i);
  assert.match(worksheet, /Only after these checks are complete should the reviewed contract be updated/i);

  for (const table of contract.tables.filter((entry) => entry.status === "blocked")) {
    const row = worksheet.split("\n").find((line) => line.includes("| `" + table.name + "` |"));
    assert.ok(row, "blocked mapping must have a worksheet row: " + table.name);
    assert.match(row, /\| blocked \|/, "blocked mapping must remain blocked in the worksheet: " + table.name);
  }
});
