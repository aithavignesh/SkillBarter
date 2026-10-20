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
  const provenance = statements[1].toLowerCase();
  for (const field of [
    "current_database() as database_name",
    "current_schema() as current_schema",
    "current_setting('server_version') as server_version",
    "current_user as effective_role",
    "session_user as session_role",
    "transaction_timestamp() as inventory_transaction_started_at"
  ]) {
    assert.ok(provenance.includes(field), "missing source inventory provenance field: " + field);
  }
  for (const statement of statements.slice(1, -1)) {
    assert.match(statement, /^SELECT\b/i);
    assert.doesNotMatch(statement, /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/i);
  }
});

test("foreign-key inventory resolves referenced columns by constraint ordinal", async () => {
  const sql = await readFile(inventoryPath, "utf8");
  assert.match(sql, /FROM\s+pg_constraint\s+con/i);
  assert.match(sql, /unnest\(con\.conkey\)\s+WITH\s+ORDINALITY/i);
  assert.match(sql, /unnest\(con\.confkey\)\s+WITH\s+ORDINALITY/i);
  assert.match(sql, /target_key\.ord\s*=\s*source_key\.ord/i);
  assert.match(sql, /target_column\.attrelid\s*=\s*target_table\.oid/i);
});
test("source inventory covers schema details needed for mapping review", async () => {
  const sql = await readFile(inventoryPath, "utf8");
  assert.match(sql, /FROM\s+information_schema\.columns/i);
  assert.match(sql, /FROM\s+pg_indexes/i);
  assert.match(sql, /FROM\s+pg_policies/i);
  assert.match(sql, /FROM\s+information_schema\.triggers/i);
  assert.match(sql, /pg_get_constraintdef\(con\.oid/i);

  const knownTables = [
    "analytics_events", "blocks", "connections", "exchanges", "messages",
    "notifications", "posts", "reports", "reviews", "skills", "user_skills", "users"
  ];
  for (const table of knownTables) {
    assert.ok(sql.includes("'" + table + "'"), `missing exact row-count entry for ${table}`);
  }
});

test("status inventory is read-only and records source provenance", async () => {
  const statusPath = fileURLToPath(new URL("../../migrations/postgres-source-status-inventory.sql", import.meta.url));
  const sql = await readFile(statusPath, "utf8");
  const withoutComments = sql.replace(/--[^\n]*/g, "");
  const statements = withoutComments.split(";").map((statement) => statement.trim()).filter(Boolean);

  assert.match(statements[0], /^BEGIN\s+TRANSACTION\s+READ\s+ONLY$/i);
  assert.match(statements.at(-1), /^COMMIT$/i);
  assert.match(statements[1], /^SELECT\b/i);
  const provenance = statements[1].toLowerCase();
  for (const field of [
    "current_database() as database_name",
    "current_schema() as current_schema",
    "current_setting('server_version') as server_version",
    "current_user as effective_role",
    "session_user as session_role",
    "transaction_timestamp() as inventory_transaction_started_at"
  ]) {
    assert.ok(provenance.includes(field), "missing status inventory provenance field: " + field);
  }

  for (const statement of statements.slice(1, -1)) {
    assert.match(statement, /^SELECT\b/i);
    assert.doesNotMatch(statement, /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/i);
  }
});
