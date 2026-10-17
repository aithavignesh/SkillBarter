import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const inventoryPath = fileURLToPath(new URL("../../migrations/postgres-source-inventory.sql", import.meta.url));

test("source inventory SQL is explicitly read-only", async () => {
  const sql = await readFile(inventoryPath, "utf8");
  const withoutComments = sql.replace(/--[^\n]*/g, "");
  const statements = withoutComments.split(";").map((statement) => statement.trim()).filter(Boolean);
  assert.match(statements[0], /^BEGIN\s+TRANSACTION\s+READ\s+ONLY$/i);
  assert.match(statements.at(-1), /^COMMIT$/i);
  for (const statement of statements.slice(1, -1)) {
    assert.match(statement, /^SELECT\b/i, \`Unexpected non-read-only statement: \${statement.slice(0, 100)}\`);
    assert.doesNotMatch(statement, /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/i);
  }
});

test("foreign-key inventory resolves referenced columns by constraint ordinal", async () => {
  const sql = await readFile(inventoryPath, "utf8");
  assert.match(sql, /JOIN\s+pg_constraint\s+con/i);
  assert.match(sql, /unnest\(con\.conkey\)\s+WITH\s+ORDINALITY/i);
  assert.match(sql, /unnest\(con\.confkey\)\s+WITH\s+ORDINALITY/i);
  assert.match(sql, /target_key\.ord\s*=\s*source_key\.ord/i);
  assert.match(sql, /target_column\.attrelid\s*=\s*target_table\.oid/i);
});
