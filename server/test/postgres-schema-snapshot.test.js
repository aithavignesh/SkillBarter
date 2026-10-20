import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const snapshotPath = fileURLToPath(new URL("../../migrations/postgres-schema-snapshot.sql", import.meta.url));

test("PostgreSQL schema snapshot is read-only and captures migration-critical catalog metadata", async () => {
  const sql = await readFile(snapshotPath, "utf8");
  const withoutComments = sql.replace(/--[^\n]*/g, "");
  const statements = withoutComments.split(";").map((statement) => statement.trim()).filter(Boolean);

  assert.match(statements[0], /^BEGIN\s+TRANSACTION\s+READ\s+ONLY$/i);
  assert.match(statements.at(-1), /^COMMIT$/i);

  const queries = statements.slice(1, -1);
  assert.equal(queries.length, 7, "snapshot must contain seven SELECT queries including provenance");
  for (const query of queries) {
    assert.match(query, /^SELECT\b/i, "each statement inside the transaction must be a SELECT");
    assert.doesNotMatch(
      query,
      /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/i,
      "schema snapshot must not modify database state"
    );
  }

  for (const expected of [
    "pg_class",
    "information_schema.columns",
    "pg_constraint",
    "pg_indexes",
    "pg_policies",
    "information_schema.triggers",
    "pg_get_constraintdef",
    "estimated_row_count",
    "row_level_security_enabled",
    "relforcerowsecurity"
  ]) {
    assert.ok(withoutComments.toLowerCase().includes(expected.toLowerCase()), "missing schema metadata: " + expected);
  }

  assert.match(sql, /WHERE n\.nspname = 'public'/i, "object and constraint inventory must be scoped to public schema");
  assert.match(sql, /WHERE table_schema = 'public'/i, "column inventory must be scoped to public schema");
  assert.match(sql, /WHERE schemaname = 'public'/i, "index and policy inventories must be scoped to public schema");
  assert.match(sql, /WHERE event_object_schema = 'public'/i, "trigger inventory must be scoped to public schema");
});
