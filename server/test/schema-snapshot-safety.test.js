import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const snapshotPath = fileURLToPath(new URL("../../migrations/postgres-schema-snapshot.sql", import.meta.url));

test("schema snapshot is read-only and captures migration-critical catalog metadata", async () => {
  const sql = await readFile(snapshotPath, "utf8");
  const withoutComments = sql.replace(/--[^\n]*/g, "");
  const statements = withoutComments.split(";").map((statement) => statement.trim()).filter(Boolean);

  assert.match(statements[0], /^BEGIN\s+TRANSACTION\s+READ\s+ONLY$/i);
  assert.match(statements.at(-1), /^COMMIT$/i);
  const queries = statements.slice(1, -1);
  assert.equal(queries.length, 7, "snapshot must contain seven SELECT queries including provenance");

  for (const query of queries) {
    assert.match(query, /^SELECT\b/i);
    assert.doesNotMatch(query, /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/i);
  }

  for (const expected of [
    "pg_class", "information_schema.columns", "pg_constraint", "pg_indexes",
    "pg_policies", "information_schema.triggers", "pg_get_constraintdef",
    "row_level_security_enabled", "relforcerowsecurity", "character_maximum_length",
    "numeric_precision", "with_check", "action_statement"
  ]) {
    assert.ok(withoutComments.toLowerCase().includes(expected.toLowerCase()), "missing schema metadata: " + expected);
  }

  for (const expected of [
    "current_database() as database_name",
    "current_schema() as current_schema",
    "current_setting('server_version') as server_version",
    "transaction_timestamp() as snapshot_transaction_started_at"
  ]) {
    assert.ok(queries[0].toLowerCase().includes(expected), "missing provenance field: " + expected);
  }
});
