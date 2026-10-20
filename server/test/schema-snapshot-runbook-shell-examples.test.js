import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const runbookPath = fileURLToPath(new URL("../../migrations/SCHEMA_SNAPSHOT_RUNBOOK.md", import.meta.url));

test("Bash snapshot example uses the reviewed SQL and keeps output outside the repository", async () => {
  const runbook = await readFile(runbookPath, "utf8");
  const bashSection = runbook.split("### Bash")[1]?.split("### PowerShell")[0] ?? "";

  assert.match(bashSection, /\$\{DATABASE_URL:\?Set DATABASE_URL through your approved secret manager\}/);
  assert.match(bashSection, /--no-psqlrc/);
  assert.match(bashSection, /--set ON_ERROR_STOP=1/);
  assert.match(bashSection, /--file migrations\/postgres-schema-snapshot\.sql/);
  assert.match(bashSection, /--output "\$HOME\/skillbarter-private-migration-review\/postgres-schema-snapshot\.txt"/);
  assert.match(bashSection, /chmod 700 "\$HOME\/skillbarter-private-migration-review"/);
});

test("PowerShell snapshot example uses the reviewed SQL and fails on psql errors", async () => {
  const runbook = await readFile(runbookPath, "utf8");
  const powershellSection = runbook.split("### PowerShell")[1]?.split("## Review checklist")[0] ?? "";

  assert.match(powershellSection, /if \(-not \$env:DATABASE_URL\)/);
  assert.match(powershellSection, /--no-psqlrc/);
  assert.match(powershellSection, /--set ON_ERROR_STOP=1/);
  assert.match(powershellSection, /--file migrations\/postgres-schema-snapshot\.sql/);
  assert.match(powershellSection, /Join-Path \$outDir "postgres-schema-snapshot\.txt"/);
  assert.match(powershellSection, /if \(\$LASTEXITCODE -ne 0\)/);
  assert.match(powershellSection, /do not treat partial output as reviewed evidence/i);
});
