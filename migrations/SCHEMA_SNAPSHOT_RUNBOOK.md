# PostgreSQL schema snapshot runbook

## Purpose and safety

Use this procedure to capture catalog metadata needed to review the InsForge/PostgreSQL-to-MongoDB mapping. The SQL in `postgres-schema-snapshot.sql` reads catalog metadata only; it does not export application rows. Estimated row counts come from PostgreSQL statistics and may be stale.

- Start with an approved **non-production** source database.
- Use an approved read-only database role with permission to inspect the relevant catalog metadata.
- Never put database URLs, passwords, tokens, raw exports, or snapshot output in Git.
- Treat the snapshot as internal schema metadata and store it in access-controlled storage.
- Do not update `schemaSnapshotReviewed` or unblock mappings merely because the query ran. A reviewer must compare the results with the source-to-target contract and record unresolved differences.

## Run with psql

From the repository root, make sure `DATABASE_URL` is set through your approved secret manager or local environment (do not paste credentials into the command or commit them). Use a secure output location outside the repository.

### Bash

```bash
: "${DATABASE_URL:?Set DATABASE_URL through your approved secret manager}"
mkdir -p "$HOME/skillbarter-private-migration-review"
chmod 700 "$HOME/skillbarter-private-migration-review"
psql "$DATABASE_URL" \
  --no-psqlrc \
  --set ON_ERROR_STOP=1 \
  --file migrations/postgres-schema-snapshot.sql \
  --output "$HOME/skillbarter-private-migration-review/postgres-schema-snapshot.txt"
```

### PowerShell

Set `DATABASE_URL` in the current session using your approved secret-management method, then run:

```powershell
if (-not $env:DATABASE_URL) { throw "Set DATABASE_URL through your approved secret manager first." }
$outDir = Join-Path $HOME "skillbarter-private-migration-review"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
psql $env:DATABASE_URL --no-psqlrc --set ON_ERROR_STOP=1 --file migrations/postgres-schema-snapshot.sql --output (Join-Path $outDir "postgres-schema-snapshot.txt")
if ($LASTEXITCODE -ne 0) { throw "Schema snapshot failed; do not treat partial output as reviewed evidence." }
```

The script starts a read-only transaction. If the query fails, do not treat partial output as a completed snapshot. Check the error with the database administrator rather than broadening privileges or switching to a write-capable account.

## Review checklist

1. Confirm the snapshot came from the intended non-production source and record the capture date and reviewer outside the repository.
2. Reconcile the table/view list against `source-to-target-contract.json`.
3. Review column types, nullability, defaults, primary/unique/foreign/check constraints, indexes, RLS policies, and triggers.
4. Compare the observed schema with every proposed target model. Document all data-loss risks, enum conversions, nullable/required mismatches, uniqueness collisions, and foreign-key deletion semantics.
5. Use a separate approved data-inventory procedure to validate actual value distributions and row-level anomalies; this catalog snapshot does not establish data compatibility.
6. Update the review template and mapping contract only after evidence is reviewed and decisions are approved.

## What this does not authorize

This snapshot is not a data export, migration dry run, backup, or cutover approval. Do not import production data, change production traffic, remove the legacy application, or merge the migration branch based solely on this result. The current mapping contract remains blocked pending source evidence and explicit review.
