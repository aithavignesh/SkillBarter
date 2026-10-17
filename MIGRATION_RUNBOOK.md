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
