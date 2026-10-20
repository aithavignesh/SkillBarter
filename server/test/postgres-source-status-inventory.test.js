import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const queryPath = fileURLToPath(new URL("../../migrations/postgres-source-status-inventory.sql", import.meta.url));

test("source status inventory is read-only and covers migration-sensitive values", async () => {
  const sql = await readFile(queryPath, "utf8");
  const withoutComments = sql.replace(/--[^\n]*/g, "");
  const statements = withoutComments.split(";").map((statement) => statement.trim()).filter(Boolean);

  assert.match(statements[0], /^BEGIN\s+TRANSACTION\s+READ\s+ONLY$/i);
  assert.match(statements.at(-1), /^COMMIT$/i);
  for (const statement of statements.slice(1, -1)) {
    assert.match(statement, /^SELECT\b/i);
    assert.doesNotMatch(statement, /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/i);
  }

  for (const field of [
    "connections.status", "exchanges.status", "user_skills.skill_type",
    "notifications.type", "notifications.is_read", "reports.status", "posts.post_type"
  ]) {
    assert.ok(sql.includes("'" + field + "'"), "missing inventory for " + field);
  }
});
