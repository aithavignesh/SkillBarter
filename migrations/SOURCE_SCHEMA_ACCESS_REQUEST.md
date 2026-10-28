# SkillBarter PostgreSQL-to-MongoDB Migration: Source Evidence Request

Date: 2026-10-28
Branch: `migration/next-express-mongodb`
Purpose: Collect the minimum approved evidence needed to review source mappings and authorize a non-production dry run. This request does not authorize production access or data import.

## Access and environment requested

Please arrange the following through the project/database owner:

- [ ] Identify an approved non-production InsForge/PostgreSQL environment that represents the intended source schema.
- [ ] Provide a read-only database role limited to the required schema/catalog inspection and approved aggregate inventory queries.
- [ ] Provide an isolated MongoDB staging database/project with no production credentials or shared production collections.
- [ ] Confirm the named source owner, schema reviewer, data/privacy reviewer, and migration reviewer.
- [ ] Confirm whether the source export may contain personal data or authentication hashes and document the approved handling/retention requirements.

Do not send database URLs, passwords, API keys, OTP provider secrets, or raw user records through chat, issue comments, or Git. Supply credentials only through the organization's approved secret manager.

## Required source evidence

Capture the following privately, outside the repository:

1. **Schema snapshot provenance:** source environment identifier, schema name, PostgreSQL version, capture timestamp with timezone, and snapshot revision.
2. **Catalog inventory:** actual tables and columns, data types, nullability, defaults, primary/foreign keys, unique/check constraints, indexes, row-level security policies, and triggers.
3. **Aggregate data inventory:** exact row counts and approved aggregate counts for null/blank required values, observed enum/status values, string-length compatibility, duplicate/collision groups, timestamps, and nullable references.
4. **Export integrity evidence:** per-table export file, row count, SHA-256 checksum, and explicit column inventory in the manifest. Keep raw export files private.
5. **Identity and reference rules:** source primary-key type, approved deterministic mapping to target ObjectIds, normalization/collision handling, deletion semantics, and password-hash compatibility.
6. **Review record:** decisions for every source field marked mapped, transformed, excluded, or blocked, with rationale, reviewer, and private evidence reference.

Run the repository's schema snapshot runbook only after the source owner confirms the approved non-production environment and read-only permissions. Do not run inventory SQL unchanged if the actual catalog differs from the documented table list.

## Mapping decisions that require explicit approval

- Required or nullable usernames, phones, names, and password hashes.
- Case/whitespace normalization and uniqueness collisions for email, username, phone, and skill names.
- Missing skill references on exchanges and nullable exchange references on messages.
- Legacy status/type values that do not match target enums.
- Fields not represented in target models, including profile/location metadata, review sub-scores, post titles/types, notification links, and analytics session/timestamp data.
- Preservation of original timestamps, read state, cancellation data, counters, and association metadata.
- Any rejected or quarantined rows and the documented reason for each disposition.

No identity, credential, relationship, timestamp, or application field should be silently invented, dropped, truncated, or rewritten to force the import to pass.

## Go/no-go sequence

1. Verify source provenance and reconcile actual catalog metadata.
2. Complete field-by-field mapping review and obtain source/security/privacy/migration reviewer decisions.
3. Keep the source-to-target contract blocked until that evidence is reviewed; do not set `schemaSnapshotReviewed: true` from a template or an assumption.
4. Run migration preflight against the approved export and reviewed contract.
5. Only then perform a dry run in isolated MongoDB staging.
6. Reconcile row counts, duplicates, IDs/references, timestamps, excluded/rejected rows, and target constraints.
7. Complete staging authentication and core journey tests and obtain sign-off.
8. Treat production cutover as a separate approval. Keep the legacy app and production database unchanged until then.

## Current status

The source-to-target contract remains `blocked-pending-source-schema` with `schemaSnapshotReviewed: false`. No end-to-end PostgreSQL-to-MongoDB import or production cutover is claimed by this document.
