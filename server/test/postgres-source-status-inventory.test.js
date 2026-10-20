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

  assert.equal((sql.match(/\bUNION\s+ALL\b/gi) ?? []).length, 11, "all inventory SELECTs must be joined by UNION ALL");
  assert.doesNotMatch(withoutComments, /UNION\s+ALL\s+UNION\s+ALL/i, "must not contain an empty UNION branch");
  for (const field of [
    "connections.status", "exchanges.status", "user_skills.skill_type",
    "notifications.type", "notifications.is_read", "notifications.link_format",
    "notifications.title_over_160", "notifications.message_over_1000",
    "notifications.link_over_255", "notifications.created_at_nullness", "reports.status", "posts.post_type"
  ]) {
    assert.ok(sql.includes("'" + field + "'"), "missing inventory for " + field);
  }
});
