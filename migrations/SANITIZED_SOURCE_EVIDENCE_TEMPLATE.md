# Sanitized PostgreSQL source evidence summary

Status: **template only — not evidence that the source database has been inspected**.

Use this worksheet only after running the approved read-only snapshot and inventory scripts against the intended non-production source. Keep raw outputs in access-controlled storage outside Git. Share or commit only the sanitized summary after review.

## Source provenance

| Field | Reviewed value |
|---|---|
| Non-production environment label (no hostnames/secrets) | Pending |
| Capture timestamp with timezone | Pending |
| PostgreSQL version (if available) | Pending |
| Schemas inspected | Pending |
| Snapshot SQL revision / commit | Pending |
| Reviewer and review date | Pending |
| Private evidence reference (no URL containing credentials) | Pending |

## Table inventory

Record one row per actual table or view. Do not infer a missing table from the current contract, and do not omit newly discovered tables.

| Schema | Table/view | Object type | Exact row count (if approved and captured) | Primary key | Foreign keys / unique constraints summarized | Disposition | Notes / evidence reference |
|---|---|---|---:|---|---|---|---|
| Pending from reviewed snapshot | Pending | Pending | Pending | Pending | Pending | blocked | Pending |

## Column-level anomalies

Summarize only facts needed to decide mapping. Include actual column type, nullability, default, and relevant constraint; do not include row values that identify a person.

| Schema.table.column | Actual type | Nullable | Default | Constraint/index note | Mapping risk or decision needed |
|---|---|---|---|---|---|
| Pending from reviewed snapshot | Pending | Pending | Pending | Pending | Pending |

## Aggregate value and length findings

Use counts/buckets, not raw application records. Examples: counts by observed status/type, null/empty phone counts, duplicate normalized email/username counts, notification title/message length buckets, and analytics event-name counts. Include only aggregates that were actually measured.

| Table.column / check | Aggregate result | Query revision | Interpretation / follow-up |
|---|---|---|---|
| Pending — not measured | Pending | Pending | Pending |

## Unresolved decisions and approvals

- [ ] Actual table/view list reconciled against `migrations/source-to-target-contract.json`.
- [ ] Column types, nullability, defaults, primary/foreign/unique/check constraints, indexes, triggers, and RLS reviewed.
- [ ] Status/type values and length distributions measured where relevant.
- [ ] ID conversion and referential-integrity strategy documented.
- [ ] Data-loss, privacy, retention, collision, and unsupported-value policies documented.
- [ ] Source owner approval recorded in the approved private process.
- [ ] Migration reviewer approval recorded in the approved private process.
- [ ] Contract updated only after evidence and decisions are reviewed.

## Do not put in this file

- Database URLs, hostnames that are considered confidential, passwords, tokens, or connection strings.
- Raw SQL output, full row exports, names/emails/phone numbers, message bodies, authentication hashes, or analytics payloads.
- Claims that an inventory ran unless the output exists and has been reviewed.

**Gate:** Until actual evidence is captured and approved, leave `schemaSnapshotReviewed` false and keep mapping/import/cutover blocked. This worksheet does not authorize a production import or cutover.