# InsForge/PostgreSQL to MongoDB migration runbook

Status: BLOCKED until a verified source schema, authorized export, and reviewed mapping contract are available.

This runbook is a safe execution plan, not evidence that a database has been accessed or imported. The migration branch must not modify production, the live InsForge database, or the production deployment.

## Current stack boundaries

- Target frontend: `next-app/` (Next.js).
- Target API: `server/` (Node.js + Express).
- Target database: MongoDB via Mongoose.
- Legacy reference/rollback applications: `frontend/` (Vite/React) and `backend/` (FastAPI).
- Hosting plan: Vercel for Next.js, Render for Express, MongoDB Atlas for the target database; staging only until separately approved.

## Required prerequisites

1. An approved non-production PostgreSQL source and a read-only account.
2. Source owner confirmation of schema, tables, constraints, indexes, triggers, RLS policies, and data retention rules.
3. A schema snapshot and source inventory captured with the steps in `SCHEMA_SNAPSHOT_RUNBOOK.md`.
4. A reviewed field-by-field mapping contract in `source-to-target-contract.json`, with evidence and reviewer provenance.
5. An authorized, sanitized export manifest and data files stored outside Git in access-controlled storage.
6. A provisioned, isolated non-production MongoDB database and separate staging credentials.
7. A reviewed ID mapping, relationship mapping, enum conversion, duplicate handling, and rejected-row/quarantine policy.
8. A backup and rollback procedure approved by the owners of both systems.

Never commit credentials, database URLs, raw exports, row-level user data, or private schema evidence to this repository.

## Execution phases

### Phase 1 — Inventory only

- Capture schema metadata from an approved non-production source.
- Reconcile the actual table and column inventory with the source catalog.
- Record exact row counts and approved aggregate value inventories only after the source owner approves the queries.
- Review sensitive fields, auth hashes, location data, analytics properties, and retention obligations.
- Keep all evidence private; commit only non-sensitive decisions.

Exit criteria: source provenance and complete schema inventory are reviewed. Until then, the contract must remain `blocked-pending-source-schema`.

### Phase 2 — Resolve mappings

For every source table and every source column, record one disposition: `mapped`, `transformed`, `excluded`, or `blocked`. Explain every transformation or exclusion. No silent field drops.

Explicitly resolve:
- Numeric source IDs to deterministic target ObjectIds and a persistent crosswalk.
- Unique/case-insensitive email, username, and phone collisions.
- Password hash compatibility; never reset or invent credentials silently.
- Nullable usernames/phones and target required-field differences.
- Every observed status/enum and invalid value.
- Optional and deleted relationships, including user-skill associations, exchange skills, messages without exchanges, post type/likes, notification types, connection semantics, review sub-scores, and user location/trust/entitlement fields.
- Timestamp preservation, timezone normalization, and historical read/completion state.
- Oversized text, nulls, malformed data, duplicates, and rejected/quarantined records.

Exit criteria: mapping validation and target-model coverage checks pass against the reviewed schema and explicit column inventory; source and target owners approve unresolved-data dispositions.

### Phase 3 — Export validation and dry run

1. Create an authorized non-production export with a manifest containing source environment label, export timestamp, table names, source columns, file names, row counts, and file hashes. Do not include credentials or user data in the manifest.
2. Run the repository export-integrity and migration preflight validators against the export directory and reviewed mapping contract. From the repository root, run `npm run preflight:migration -- <private-export-directory> migrations/source-to-target-contract.json`. Keep the export directory outside Git; this command is validation-only and never writes to either database. It exits non-zero when integrity or mapping gates fail.
3. Stop if any table/column is unaccounted for, an export hash fails, a mapping remains blocked, or a target field path is invalid.
4. Import only to the isolated staging database using a separately reviewed importer. Use deterministic ID mapping and idempotent batches; preserve source timestamps and log rejected rows without leaking sensitive data.
5. Reconcile per-table source/target counts, unique keys, relationship resolution, enum distributions, timestamp ranges, and rejected/quarantined rows. Investigate every difference.
6. Run application-level tests on migrated staging data, including authentication, profiles, skills, matching, the two-user exchange lifecycle, messages/read receipts, reviews, reports/blocks, notifications, and admin authorization.
7. Have the source owner, migration reviewer, and privacy/security reviewer sign off on the private reconciliation report.

Do not run an import while the contract is blocked. Do not point production traffic at staging.

### Phase 4 — Staging deployment

- Deploy `next-app/` as a separate Vercel staging project and set the root directory to `next-app`.
- Deploy `server/` as a separate Render staging web service with working directory `server`.
- Provision an isolated MongoDB Atlas staging database with least-privilege credentials, network restrictions, and backups.
- Configure environment variables through hosting secret settings, not Git. Required examples are in `server/.env.example` and `next-app/.env.example`.
- Configure and verify SMTP and Twilio Verify in staging before testing OTP flows. Do not claim delivery works until actual delivery tests pass.
- Verify API health, frontend-to-API proxying, cookie/session behavior, CORS, logs, error handling, and rate limits.
- Complete automated and manual acceptance tests and retain a rollback path.

See `../docs/DEPLOYMENT_MERN.md` for the staging hosting checklist.

### Phase 5 — Production decision (separate approval)

Production cutover is out of scope for this runbook and is not authorized by a green CI run, a successful dry run, or the existence of a deployment. Before a separate cutover decision, require approved backup/restore tests, reviewed data reconciliation, feature/security acceptance, monitoring, incident ownership, and a tested rollback plan. Keep the existing production application and InsForge database unchanged until all owners explicitly approve the cutover.

## Current blocker register

- Source schema snapshot review: pending.
- Actual source field and table inventory reconciliation: pending.
- Field-level mapping decisions: pending.
- Authorized export and integrity manifest: pending.
- Reviewed importer and isolated dry run: not authorized until prior gates pass.
- SMTP/Twilio staging delivery tests: pending.
- End-to-end staging acceptance: pending.
- Production cutover: not authorized.

Update these statuses only when supported by real evidence. Do not infer completion from documentation, repository structure checks, or CI.
