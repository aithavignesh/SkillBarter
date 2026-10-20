# Source-owner handoff: PostgreSQL migration evidence

Purpose: obtain the minimum reviewed evidence needed to decide whether the SkillBarter PostgreSQL-to-MongoDB mapping is safe. This is a request checklist, not evidence that source access or inventory has occurred.

## Who should run this

The database/source owner or an authorized engineer should run the repository's read-only snapshot and inventory scripts against an approved **non-production** source using an approved read-only database role. The migration developer should not request credentials or widen database permissions to complete this checklist.

## Evidence to prepare

- [ ] **Schema snapshot:** catalog output showing the actual schema/table/view list; columns and types; nullability/defaults; primary, foreign, unique, check, and foreign-key constraints; indexes; triggers; RLS policies; and snapshot provenance.
- [ ] **Table reconciliation:** explain every source object absent from or additional to `migrations/source-to-target-contract.json`. Confirm whether the currently known 12 application tables are complete.
- [ ] **Approved aggregate inventory:** exact counts if approved, observed enum-like status/type values, null/blank counts, duplicate/collision counts, and target length-limit buckets needed by the mapping. State which query revision produced each result.
- [ ] **Data ownership decisions:** confirm intended semantics for account identity, nullable exchange skill references, messages without an exchange, review sub-scores, post titles/types/likes, notification links/read state, report categories/targets, analytics sessions/timestamps, and directed connections.
- [ ] **Review record:** source owner and schema reviewer confirmation, review date, sanitized evidence reference, unresolved issues, and who is authorized to approve remediation.

Use `migrations/SCHEMA_SNAPSHOT_RUNBOOK.md` for safe collection and `migrations/SANITIZED_SOURCE_EVIDENCE_TEMPLATE.md` to summarize reviewed results. Confirm the SQL matches the captured schema before running data inventory queries; do not run the 12-table inventory unchanged if the actual schema differs.

## What can be shared in Git or chat

Share only the minimum sanitized evidence required for a mapping decision:

- Table and column names, types, nullability, defaults, and summarized constraints.
- Aggregate counts and length/status buckets that do not expose individual records.
- The source SQL revision/commit, sanitized environment label, capture time, and reviewer sign-off reference.
- A description of any exception and the agreed disposition.

Do **not** share or commit:

- Connection strings, database URLs, passwords, API keys, tokens, hostnames treated as confidential, or secret-manager output.
- Full row exports or personal data such as names, emails, phone numbers, addresses, message bodies, or user-linked analytics payloads.
- Password hashes, session identifiers, raw event properties, or any sample record that can identify or be linked to a person.
- Raw database snapshots or query output when a sanitized aggregate summary will suffice.

Store raw outputs only in approved access-controlled storage outside the repository. If an aggregate is too revealing, have the source owner provide a more coarsened summary through the approved private review process.

## Acceptance rules

1. Evidence must come from the intended non-production source, with provenance confirmed by the reviewer.
2. An empty result is evidence only for the exact query and schema version that produced it; it does not prove a field/table is absent unless the catalog query establishes that.
3. Source ORM comments and current application models are useful hypotheses, not substitutes for actual schema and value evidence.
4. Each source field must have a documented target mapping, approved transformation, explicit exclusion, or unresolved blocked status.
5. No account merge, synthetic identity, fabricated reference, silent truncation, silent field loss, or import-time replacement of source timestamps is allowed without an explicit reviewed decision.
6. A successful CI run verifies repository checks, not source compatibility.
7. Keep `schemaSnapshotReviewed: false` and the contract blocked until the actual evidence is reviewed. A non-production dry run requires prior mapping approval; production import and cutover require separate approval.

## Handoff status

- Source owner: Pending
- Approved non-production snapshot: Pending
- Sanitized aggregate inventory: Pending
- Mapping decisions reviewed: Pending
- Migration reviewer sign-off: Pending

Do not fill these statuses based on intent or planned work. Update only when the corresponding evidence exists.
