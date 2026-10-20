import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const runbookPath = fileURLToPath(new URL("../../migrations/SCHEMA_SNAPSHOT_RUNBOOK.md", import.meta.url));

test("schema snapshot runbook documents credential and output handling safeguards", async () => {
  const runbook = await readFile(runbookPath, "utf8");

  assert.match(runbook, /approved\s+\*\*non-production\*\*/i);
  assert.match(runbook, /read-only database role/i);
  assert.match(runbook, /Never put database URLs, passwords, tokens, raw exports, or snapshot output in Git/i);
  assert.match(runbook, /secure output location outside the repository/i);
  assert.match(runbook, /access-controlled storage/i);
});

test("schema snapshot runbook keeps mapping approval and cutover behind review gates", async () => {
  const runbook = await readFile(runbookPath, "utf8");

  assert.match(runbook, /Do not update `schemaSnapshotReviewed` or unblock mappings merely because the query ran/i);
  assert.match(runbook, /A reviewer must compare the results with the source-to-target contract/i);
  assert.match(runbook, /This snapshot is not a data export, migration dry run, backup, or cutover approval/i);
  assert.match(runbook, /Do not import production data, change production traffic/i);
  assert.match(runbook, /current mapping contract remains blocked pending source evidence and explicit review/i);
});

test("schema snapshot runbook documents failure handling for partial output", async () => {
  const runbook = await readFile(runbookPath, "utf8");

  assert.match(runbook, /ON_ERROR_STOP=1/);
  assert.match(runbook, /do not treat partial output as a completed snapshot/i);
  assert.match(runbook, /rather than broadening privileges or switching to a write-capable account/i);
});
