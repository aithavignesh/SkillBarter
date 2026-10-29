# SkillBarter migration readiness gate

Status: **BLOCKED — source-schema evidence and review are still pending.**

This checklist coordinates the existing schema snapshot runbook, review worksheet, source-to-target contract, migration preflight, and import reconciliation tools. It is a release gate, not proof that a source snapshot or import has been run.

## Current evidence status

| Gate | Current status | Evidence required to close |
|---|---|---|
| Source provenance | Pending | Approved non-production source; snapshot provenance reviewed and recorded privately |
| Actual schema inventory | Pending | Reconciled schemas/tables, columns, types, defaults, constraints, indexes, RLS policies, and triggers |
| Exact source counts and value inventory | Pending | Approved read-only inventory output stored in access-controlled storage outside Git |
| Field mapping and disposition | Pending | Every actual source field marked mapped, transformed, excluded, or blocked with reason and evidence |
| ID/reference integrity | Pending | Deterministic source-ID crosswalk; uniqueness and foreign-reference resolution validated |
| Data compatibility | Pending | Length/null/enum/collision/timestamp anomalies reviewed with explicit preserve, transform, quarantine, or exclusion decisions |
| Security and privacy | Pending | Credential compatibility, sensitive analytics payloads, access controls, and retention reviewed |
| Admin authorization model | Pending review | Confirm approved roles and permission matrix; current implementation uses a Boolean `isAdmin` gate, not granular roles. Do not claim role-based access control until roles, route permissions, and tests are implemented and reviewed. |
| Dry-run/import report | Not authorized yet | Approved non-production dry run, row-count reconciliation, rejected-row report, and reviewer sign-off |
| Production cutover | Not authorized | Separate explicit approval after all prior gates pass |

Do not mark a gate complete from a template, source ORM comment, successful CI run, or an unverified assumption. CI validates repository code and tests; it does not establish compatibility with the live PostgreSQL source.

## Required sequence

1. **Capture provenance and schema.** Follow `SCHEMA_SNAPSHOT_RUNBOOK.md` using an approved non-production database and a read-only role. Store raw output privately; never commit credentials or raw snapshots.
2. **Reconcile the actual source catalog.** Compare every discovered schema/table/column with the proposed inventory. Explain missing and additional objects. Confirm foreign keys, unique/check constraints, indexes, RLS policies, triggers, and defaults.
3. **Capture approved data-quality aggregates.** Only after confirming the query matches the actual source schema, run exact counts and the status/length inventory. Keep all row-level evidence and sensitive output private.
4. **Review mappings field by field.** Complete `SCHEMA_REVIEW_TEMPLATE.md`. For each source field, record the target, transformation, exclusion or quarantine policy, validation evidence, decision owner, and reviewer. Keep unresolved fields blocked.
5. **Resolve identity and relationship semantics.** Approve deterministic source-ID-to-ObjectId mapping, uniqueness/collision handling, nullable references, delete behavior, status conversions, timestamps, and fields missing from target models. Never synthesize users, skills, references, timestamps, credentials, or liker identities.
6. **Review admin authorization separately.** Confirm the required roles (if any), permissions per admin endpoint, restrictions on changing privileged accounts, and audit requirements with the project owner. Implement and test only against that approved matrix.
7. **Run repository preflight and tests.** Use the existing migration validation scripts and automated test suite against the reviewed contract and sanitized evidence. A green CI run is necessary but not sufficient.
8. **Perform a non-production dry run only after approval.** Reconcile source and target counts, required/optional references, duplicate keys, rejected/quarantined records, and timestamp distributions. Keep a report of every difference and require reviewer sign-off.
9. **Treat production cutover as a separate decision.** No production import, traffic switch, legacy shutdown, or migration-branch merge is authorized by this checklist.

## Stop conditions

Stop and leave the relevant mapping blocked if any of the following is true:

- The snapshot provenance does not match the approved source or the schema/table list is unreconciled.
- The inventory SQL references an unverified table or column.
- Required source fields are null/blank or exceed target constraints and there is no approved remediation policy.
- Identity normalization creates collisions or password-hash compatibility is unknown.
- A foreign key is missing, ambiguous, or cannot be mapped deterministically.
- An observed status/type has no explicit conversion.
- A source field would be silently discarded or a timestamp would be replaced by import time.
- The dry-run report has unexplained count differences, duplicates, failed references, or quarantined rows without approved disposition.
- The admin role/permission requirements are undefined or privileged actions are not covered by tests.
- Source-owner, security/privacy, or migration-reviewer sign-off is missing.

## Sign-off record

Complete this section only with real review evidence; do not pre-fill approvals.

| Approval | Name/role | Date | Evidence reference (private, no secrets) |
|---|---|---|---|
| Source owner | Pending | Pending | Pending |
| Database/schema reviewer | Pending | Pending | Pending |
| Data/privacy reviewer | Pending | Pending | Pending |
| Migration reviewer | Pending | Pending | Pending |
| Production cutover approver (separate approval) | Pending | Pending | Pending |

The source-to-target contract must remain `blocked-pending-source-schema` and `schemaSnapshotReviewed: false` until the required source evidence has actually been reviewed and approved. This document does not change database state or authorize an import.
