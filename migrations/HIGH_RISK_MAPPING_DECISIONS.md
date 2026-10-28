# SkillBarter Migration: High-Risk Mapping Decisions

Date: 2026-10-28
Branch: `migration/next-express-mongodb`
Status: **Decision register only — all decisions below remain unapproved until verified against the authorized source snapshot.**

This register summarizes the source-to-target differences already documented in `source-to-target-contract.json`. It is intended to make the review meeting focused; it does not establish that the proposed source ORM fields match the live database.

## Priority 0 — Identity, credentials, and referential integrity

| Area | Unresolved risk | Evidence / decision required before import |
|---|---|---|
| User identity | Source username may be nullable; target username is required and normalized lowercase | Count null/blank usernames; approve a deterministic, collision-safe remediation. Do not invent usernames silently. |
| Email and phone | Normalization or canonicalization may cause uniqueness collisions; phone can be null/empty | Review unique constraints, null/blank distribution, and normalized collision groups; approve explicit policy before changing identifiers. |
| Password hashes | Source and target authentication may use incompatible algorithms or formats | Inspect algorithm metadata without exposing hashes; validate compatibility with controlled fixtures and plan safe migration or reset if needed. |
| Source IDs | PostgreSQL numeric IDs must map to MongoDB ObjectIds/references | Approve deterministic crosswalk strategy; prove every required reference resolves exactly once and remains stable across reruns. |
| User-skill associations | `user_skills` contains role and association metadata while target stores skill arrays | Confirm actual OFFERED/NEEDED values; decide how experience level, description, and creation time are preserved. |
| Exchanges | Source may allow missing skill references and has status/cancellation/completion fields absent from target | Map every observed status explicitly; preserve cancellation, counter-proposal, schedule, location, and both participants' completion flags. No lossy conversion without approval. |
| Messages | Source exchange reference may be nullable; target requires an exchange | Define a safe representation for messages without an exchange; preserve read state and original creation timestamp. Do not attach messages to fabricated exchanges. |

## Priority 1 — User content and moderation history

| Area | Unresolved risk | Evidence / decision required before import |
|---|---|---|
| Reviews | Source contains sub-scores and would-exchange-again flag; target may not | Decide how to preserve these fields; check rating ranges, comment length, and uniqueness semantics. |
| Posts | Source title/type, skill/exchange/partner references and likes_count may not exist in target | Decide a lossless representation; never infer individual liker identities from a count. |
| Notifications | Source type and link formats may not match target enums/resource fields | Inventory all actual values and link patterns; approve explicit mappings and preserve unread/read timestamps. |
| Blocks and reports | Moderation records depend on stable user/exchange IDs and status/category semantics | Validate self-blocks, duplicate rules, target identity references, report categories, status conversion, admin notes, and historical timestamps. |
| Analytics | Session IDs, event names, timestamps, and free-form properties may include sensitive information | Privacy/retention review; preserve event time separately from import time, validate properties JSON, and define actor handling for events without a known user. |
| Connections | Semantics and target representation are not yet approved | Product owner must decide whether to map, transform, archive, or exclude based on observed data. Do not assume a connection is an exchange. |

## Priority 2 — Data compatibility and auditability

- Compare source string lengths with target maximums before import; no silent truncation.
- Compare source nullability/defaults with target required fields/defaults; no silent substitution of current timestamps.
- Inventory all actual enum/status values; reject or quarantine unknown values until a disposition is approved.
- Preserve original timestamps and record import timestamps separately if needed.
- Reconcile each source row as migrated, explicitly excluded with a reason, or rejected for review; counts must balance exactly.
- Require zero unresolved required references and a documented decision for every excluded/quarantined row.
- Run migration only in isolated staging after preflight passes and the source owner, security/privacy reviewer, and migration reviewer approve.

## Approval record

Complete only after real evidence is reviewed:

| Decision owner | Required sign-off | Current status |
|---|---|---|
| Source/database owner | Snapshot provenance, actual constraints and inventory | Pending |
| Product owner | Semantics for missing fields, connections, statuses and content | Pending |
| Security/privacy reviewer | Password-hash compatibility, personal data, analytics and retention | Pending |
| Migration reviewer | Field mappings, deterministic references and reconciliation plan | Pending |

## Stop rule

The mapping contract must remain blocked while the actual source schema and required decisions are pending. This document is not approval to export/import data, change production, merge to `main`, or retire the legacy application.
