# SkillBarter PostgreSQL → MongoDB migration runbook

Status: **planning and validation contract only**. This document does not import, modify, or delete any data. The InsForge/PostgreSQL source schema, access credentials, and a complete export have not been verified in this branch.

## Non-negotiable safety rules

- Work from a read-only source connection or a consistent database export. Never run an import against production during development.
- Keep the legacy Vite/FastAPI application, InsForge database, and current production deployment unchanged.
- Take and verify a restorable MongoDB backup before any staging import.
- Use an isolated MongoDB database for every dry run. Do not use production connection strings.
- Require explicit approval before any production import, merge, or traffic cutover.
- Never put passwords, OTPs, JWTs, reset tokens, provider secrets, or raw credentials into exports, logs, or reports.

## Required migration phases

1. **Inventory:** run the read-only queries in [`migrations/postgres-source-inventory.sql`](migrations/postgres-source-inventory.sql) against a read-only source connection or a disposable export. Record source table names, columns, types, nullability, defaults, primary keys, foreign keys, indexes, triggers, RLS policies, exact row counts, and update timestamps from the actual source. The script includes exact counts for the currently known application tables; revise it if the live inventory differs. Save a schema snapshot with the migration run.
2. **Export:** create a consistent, read-only export. Record export time, source schema version, per-table row counts, and SHA-256 checksums for each export file. Preserve source IDs and timestamps.
3. **Mapping review:** approve a field-by-field mapping before writing the importer. Any source field without a destination must be explicitly classified as migrated, transformed, intentionally excluded with a reason, or blocked pending product decision.
4. **Dry run:** import into an isolated, disposable MongoDB database using deterministic ID conversion and idempotent upserts. Do not send notifications, SMS, email, analytics events, or other external side effects during migration.
5. **Reconciliation:** compare source/export/import counts; verify unique email/username/phone constraints; validate every relationship; detect duplicates, missing parents, invalid enums, orphaned records, and timestamp drift. Produce a machine-readable report and a human-readable summary.
6. **Application acceptance:** run auth/session, onboarding, skill discovery, matching, exchange lifecycle, messaging, reviews, blocks/reports, community, notifications, and admin checks against the migrated staging database.
7. **Rollback rehearsal:** restore the pre-import backup into a clean staging database and verify health checks and core flows. Document exact recovery owner, decision point, and rollback duration.
8. **Cutover approval:** only after sign-off on reconciliation, security, feature parity, provider tests, and rollback. The current runbook does not authorize cutover.

## Capturing the source inventory safely

Use a PostgreSQL service definition such as `service=skillbarter_source_readonly` whose credentials come from a protected local PostgreSQL service/passfile configuration. Do not paste database passwords into commands, commit connection files, or place credentials in shell history. The database role itself should be read-only; the SQL also starts a read-only transaction as a second guard.

From the repository root, create a private working directory outside Git tracking and capture the query output:

```sh
mkdir -p ./private-migration-evidence
chmod 700 ./private-migration-evidence
psql "service=skillbarter_source_readonly" \
  --set ON_ERROR_STOP=1 \
  --file migrations/postgres-source-inventory.sql \
  --output ./private-migration-evidence/source-inventory.txt
```

If the configured service is unavailable, stop and ask the database owner to provision an authorized read-only connection; do not substitute production/admin credentials. Confirm the output contains all result sets and the exact row-count result. The query's exact-count section references the 12 currently known tables, so review the discovered table inventory first and adjust that section if any table is absent or newly present. Do not treat planner row estimates as exact counts.

Store a reviewed, schema-only snapshot and the inventory timestamp/environment label with migration evidence. Keep credentials and exported user data out of Git; the inventory can still reveal internal schema details, so share it only with authorized reviewers. Review the snapshot against `migrations/source-to-target-contract.json`, record table/field dispositions and unresolved questions, and only then consider setting `schemaSnapshotReviewed` to true. Capturing the output alone does not approve mappings or authorize an import.

## Initial source inventory and target mapping

The source table names below reflect the project's previously inspected InsForge table inventory; verify every name and schema against a fresh read-only source snapshot before implementing the importer.

| Source table | Proposed target | Required mapping / validation |
|---|---|---|
| `users` | `User` | Preserve source ID mapping; normalize email/username only with a collision report; map active/admin/onboarding and profile fields; never migrate plaintext passwords or secrets. Password hash compatibility must be confirmed before migrating credentials. |
| `skills` | `Skill` | Preserve IDs and validate owner/creator fields and referenced categories against actual schema. |
| `user_skills` | `User.skillsToTeach` / `User.skillsToLearn` | Inspect the actual role/type columns first. Verify every user and skill reference; detect duplicates and ambiguous teaching/learning semantics. |
| `exchanges` | `Exchange` | Map requester/recipient, skill references, status, message, schedule and completion fields. Produce a report for statuses or columns unsupported by the target model. |
| `messages` | `Message` | Verify exchange, sender and recipient mappings; preserve order using source timestamps; validate that sender/recipient are participants in the referenced exchange. |
| `reviews` | `Review` | Verify reviewer, reviewee and exchange references; enforce rating range and uniqueness rules; recompute trust metrics from validated reviews rather than trusting stale aggregates. |
| `posts` | `Post` | Map author/content/tags/likes and visibility state; validate all user references. |
| comments | `PostComment` | Confirm whether comments are in a separate source table or embedded elsewhere. Do not assume a source table name until the schema snapshot confirms it. |
| `notifications` | `Notification` | Validate recipient/actor and resource references; map only supported notification/resource enum values. |
| `blocks` | `Block` | Validate blocker/blocked references, self-block constraints and duplicate pairs. |
| `reports` | `Report` | Validate reporter, target, resolver, status and resolution fields; explicitly handle targets that are not user accounts. |
| `analytics_events` | `AnalyticsEvent` | Define retention and privacy policy; migrate only approved non-sensitive events and properties. Exclude tokens, contact details, message bodies and other sensitive payloads. |
| `connections` | **Unmapped — decision required** | No direct target model is confirmed in the current MERN model set. Inspect source semantics and decide whether to map, derive, archive, or intentionally exclude; do not silently convert connections into exchanges. |

The table above is a starting inventory, not a claim that all source columns or semantics are known. The actual source schema must be queried and reviewed before the importer is written.

## Dry-run reconciliation utility

The utility `server/src/migrations/reconcileImportReport.js` compares the validated source manifest with a separate dry-run import report. Run it with `node server/src/migrations/reconcileImportReport.js <manifest.json> <import-report.json>`. Each import-report table entry must contain `name`, `sourceRows`, `migratedRows`, `excludedRows`, `rejectedRows`, and `unresolvedReferences`; when exclusions exist, provide a non-empty `exclusionReason`. The utility verifies table coverage, source counts, row-accounting equations, exclusions, rejections, and unresolved references. It emits JSON and exits with code 2 when reconciliation issues are found (code 1 for malformed inputs).

This is report validation only: it does not produce a database export, confirm a consistent PostgreSQL snapshot, inspect MongoDB documents, or itself prove that references resolve. Use only after a separately reviewed dry run has produced honest counts and reference-check results. Zero reported issues is necessary but not sufficient for migration approval.

## Export validation utility

The read-only utility `server/src/migrations/validateExport.js` validates a **local JSON Lines export directory** against `manifest.json`. The manifest must contain `sourceSchema`, an ISO timestamp `exportedAt`, and a non-empty `tables` array. Each table entry declares `name`, relative `file`, exact `rowCount`, and lowercase/uppercase SHA-256 `sha256`. Each data file must contain one JSON object per line; an empty file is valid only with rowCount 0 and its matching checksum.

Run after creating the export, for example: `node server/src/migrations/validateExport.js ./path-to-export`. It checks file checksums, JSONL syntax, row counts, duplicate names/files, and path traversal, then prints a JSON report. It does not connect to PostgreSQL or MongoDB, prove the export is transactionally consistent, validate relationships, or import data. Protect export files and reports according to the source data's sensitivity.

## Deterministic identifier helper

The migration branch includes `server/src/migrations/deterministicObjectId.js` with focused unit tests. For PostgreSQL source IDs that cannot safely be preserved as MongoDB ObjectIds, it derives a stable 24-hex identifier from a versioned namespace, source collection, and exact source ID. Use the same helper for both a row and every reference to that row. This helper is a building block only; it does not connect to either database, write records, or replace a persisted source-to-target mapping and collision checks. Preserve already-valid ObjectId source IDs only after cross-collection and duplicate-ID checks. Never use this helper to conceal unresolved source schema or relationship semantics.

## Deterministic identifiers and references

- Keep an explicit source-to-target ID map per collection. If source IDs are valid MongoDB ObjectId hex strings, preserve them only after collision and cross-collection checks; otherwise generate stable target IDs from a documented deterministic rule and store the mapping.
- Use the same mapping for every foreign-key reference. Never cast an arbitrary UUID/text ID directly to an ObjectId.
- Preserve source `created_at`/`updated_at` timestamps in the correct timezone and document any timezone normalization.
- Use stable source IDs as idempotency keys so rerunning a dry run does not duplicate documents.
- Record all rejected rows and reasons in a separate report; never silently drop invalid records.

## Acceptance gates

A dry run is **not accepted** until all are true:

- Source export counts match the captured source snapshot.
- Every collection has an explained source → migrated + intentionally excluded + rejected count equation.
- All required references resolve; every exception has a reviewed disposition.
- Unique indexes build successfully without hidden duplicate resolution.
- The app's security and end-to-end tests pass against staging.
- Backup restoration and rollback have been rehearsed.
- A reviewer signs off on the mapping, reconciliation report, and rollback plan.

## Current blockers

- No verified live source schema snapshot or export is included in this repository branch.
- Source credentials and provider settings are not available to this migration task.
- The `connections` table mapping is unresolved.
- Password-hash compatibility and historical enum/relationship compatibility have not been validated.
- No migration importer or production import has been run.

**Next implementation step:** capture and review a schema-only inventory plus row counts from a read-only source/export, then approve the mapping before adding importer code.


## Mapping-contract validator

The provisional contract lives at `migrations/source-to-target-contract.json`. It records the currently known source tables and proposed targets without inventing unverified column mappings. Run `node server/src/migrations/validateMappingContract.js migrations/source-to-target-contract.json` to validate its explicit decisions. Exit code 2 means the contract is structurally valid but still has pending/blocked tables or invalid approvals; exit code 1 means the input is malformed. The checked-in contract intentionally remains blocked because `schemaSnapshotReviewed` is false and `connections` has no approved target. After a verified schema snapshot is reviewed, add field-level decisions using `mapped`, `transformed`, `excluded`, or `blocked`; excluded/blocked fields require a reason. This validator does not query either database or authorize an import.


## Source inventory ↔ mapping coverage check

After producing a manifest from the reviewed source export, run `node server/src/migrations/validateMappingCoverage.js <manifest.json> migrations/source-to-target-contract.json`. This checks that each source-manifest table has a corresponding mapping decision and flags contract entries absent from the manifest for review. It exits with code 2 when coverage or approval gates are incomplete and code 1 for malformed inputs. A passing result requires `schemaSnapshotReviewed: true` and explicit `mapped`, `transformed`, or reasoned `excluded` dispositions for every source table. The current provisional contract intentionally will not pass. Compare names against the actual captured schema; do not delete a mismatch just to make validation pass. This is a static check and does not query databases or validate field-level semantics.


## Combined migration preflight

Run `node server/src/migrations/validateMigrationPreflight.js <export-directory> migrations/source-to-target-contract.json` after an export has been captured. This runs the JSONL/checksum/count/path checks and then compares the manifest table inventory to mapping decisions, producing one JSON report. Exit code 2 means export integrity passed but mapping approval/coverage is incomplete; exit code 1 indicates malformed input or an invalid export. It never connects to or writes to PostgreSQL or MongoDB. The checked-in provisional mapping is expected to block readiness until the actual schema snapshot has been reviewed and all source tables have approved dispositions.
