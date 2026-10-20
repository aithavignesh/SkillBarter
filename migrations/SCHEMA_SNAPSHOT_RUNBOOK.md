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

The script starts a read-only transaction and prints a provenance row first: database name, current schema, PostgreSQL version, and transaction start timestamp. Before reviewing the remaining output, confirm that this provenance matches the intended non-production source and expected schema. Treat database and role names as internal metadata; sanitize them before sharing outside the approved review group. If the query fails, do not treat partial output as a completed snapshot. Check the error with the database administrator rather than broadening privileges or switching to a write-capable account.


## Follow-up inventory: exact counts and observed values

Run these only after the schema snapshot confirms the expected `public` tables and the source owner approves the inventory on the same non-production environment. The exact-count query scans the listed tables and may be expensive on large datasets; obtain DBA approval before running it. These scripts are read-only, but their output is still internal migration evidence and must remain outside Git.

### Exact row counts and schema inventory

The source inventory script includes catalog details and exact `COUNT(*)` results for the 12 currently known application tables. If the schema snapshot shows a different table list, do not run it unchanged: reconcile the table list with the source owner and adjust the query to the verified schema first.

PowerShell:

```powershell
if (-not $env:DATABASE_URL) { throw "Set DATABASE_URL through your approved secret manager first." }
$outDir = Join-Path $HOME "skillbarter-private-migration-review"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
psql $env:DATABASE_URL --no-psqlrc --set ON_ERROR_STOP=1 --file migrations/postgres-source-inventory.sql --output (Join-Path $outDir "postgres-source-inventory.txt")
if ($LASTEXITCODE -ne 0) { throw "Source inventory failed; do not treat partial output as reviewed evidence." }
```

### Aggregate status and length inventory

After confirming that every referenced table and column exists in the reviewed schema, run the status inventory. It reports aggregate value counts and length/timestamp buckets rather than exporting application rows. Review output privately; do not paste raw records or credentials into Git or chat.

The status inventory also reports aggregate duplicate-group counts for trimmed, case-insensitive email and username values, duplicate groups for trimmed phone values, and phone nullness. These are screening checks, not a complete identity-resolution policy: confirm the actual source constraints and application normalization rules, and separately assess phone-number canonicalization (for example, country codes) before choosing any collision remediation. Do not merge accounts or rewrite identifiers based on these aggregates alone. It also counts null email, blank email, null username, blank username, null password hashes, and null full names. Treat these as separate data-quality signals: blank strings are not equivalent to SQL NULL, and counts do not reveal which records are affected. Compare findings with verified source constraints and the target model's required-field and length rules; do not silently invent identities, synthesize credentials, or truncate names to force a fit. A separate `users.full_name_over_100` bucket highlights non-null names longer than the target model's 100-character limit. Review the affected values privately and agree on an explicit remediation policy before import; the aggregate count is not permission to truncate.

```powershell
if (-not $env:DATABASE_URL) { throw "Set DATABASE_URL through your approved secret manager first." }
$outDir = Join-Path $HOME "skillbarter-private-migration-review"
psql $env:DATABASE_URL --no-psqlrc --set ON_ERROR_STOP=1 --file migrations/postgres-source-status-inventory.sql --output (Join-Path $outDir "postgres-source-status-inventory.txt")
if ($LASTEXITCODE -ne 0) { throw "Status inventory failed; do not treat partial output as reviewed evidence." }
```

Keep all three outputs in the access-controlled review directory. Share only a sanitized summary of table names, column definitions, aggregate counts, observed enum-like values, and anomalies needed for mapping decisions. Do not share connection strings, credentials, personal data, message contents, or raw exports.

## Review checklist

1. Confirm the snapshot came from the intended non-production source and record the capture date and reviewer outside the repository.
2. Reconcile the table/view list against `source-to-target-contract.json`.
3. Review column types, nullability, defaults, primary/unique/foreign/check constraints, indexes, RLS policies, and triggers.
4. Compare the observed schema with every proposed target model. Document all data-loss risks, enum conversions, nullable/required mismatches, uniqueness collisions, and foreign-key deletion semantics.
5. Use a separate approved data-inventory procedure to validate actual value distributions and row-level anomalies; this catalog snapshot does not establish data compatibility.
6. Update the review template and mapping contract only after evidence is reviewed and decisions are approved.

## What this does not authorize

This snapshot is not a data export, migration dry run, backup, or cutover approval. Do not import production data, change production traffic, remove the legacy application, or merge the migration branch based solely on this result. The current mapping contract remains blocked pending source evidence and explicit review.
