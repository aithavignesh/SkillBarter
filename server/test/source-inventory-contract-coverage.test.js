import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const inventoryPath = fileURLToPath(new URL("../../migrations/postgres-source-inventory.sql", import.meta.url));
const contractPath = fileURLToPath(new URL("../../migrations/source-to-target-contract.json", import.meta.url));

test("exact row-count inventory matches the source-to-target contract table list", async () => {
  const sql = await readFile(inventoryPath, "utf8");
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const section = sql.split("-- 7) Exact row counts")[1]?.split("COMMIT;")[0] ?? "";
  const countedTables = [...section.matchAll(/(?:FROM|UNION\s+ALL\s+SELECT)\s+public\.([a-z][a-z0-9_]*)/gi)]
    .map((match) => match[1].toLowerCase());
  const contractTables = contract.tables.map((table) => table.name.toLowerCase());

  assert.deepEqual([...countedTables].sort(), [...contractTables].sort(),
    "each mapped source table must have a matching exact row-count query");
  assert.equal(new Set(countedTables).size, countedTables.length,
    "source row-count inventory must not count a table more than once");
  assert.equal(contract.schemaSnapshotReviewed, false,
    "the presence of an inventory query must not imply source-schema review");
  assert.equal(contract.status, "blocked-pending-source-schema");
});
