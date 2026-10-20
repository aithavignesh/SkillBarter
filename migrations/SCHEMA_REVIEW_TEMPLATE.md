# SkillBarter source schema review worksheet

Status: **blank review template — not evidence that the source schema has been inspected or approved**.

Use this file as a checklist while reviewing the schema-only inventory captured from an authorized read-only PostgreSQL connection. Keep raw inventory output, exports, credentials, and any user data in access-controlled storage outside Git. Commit only reviewed, non-sensitive decisions after the source owner and migration reviewer agree.

## Snapshot provenance

| Item | Value to record during review |
|---|---|
| Source environment label (never a secret) | Pending |
| Capture timestamp and timezone | Pending |
| PostgreSQL schema(s) reviewed | Pending |
| Inventory query revision / commit | Pending |
| Exact source table list reconciled to catalog | Pending |
| Reviewer and review date | Pending |
| Evidence location (private reference only; no credentials) | Pending |

## Table-level decisions

For every table found in the captured inventory, choose exactly one disposition: `mapped`, `transformed`, `excluded`, or `blocked`. `excluded` and `blocked` require a reason. Do not remove a source table from the inventory to make the mapping check pass.

| Source table | Exact source row count | Target collection/model | Disposition | Relationship / transformation notes | Validation evidence | Reviewer approval |
|---|---:|---|---|---|---|---|
| `users` | Pending | `User` (proposed) | blocked | Confirm fields, roles/status, auth identifiers, hash format, and uniqueness constraints | Pending | Pending |
| `skills` | Pending | `Skill` (proposed) | blocked | Confirm owner/category references and enum values | Pending | Pending |
| `user_skills` | Pending | `User.skillsToTeach` / `User.skillsToLearn` (proposed) | blocked | Inspect role/type semantics and duplicate/reference rules | Pending | Pending |
| `exchanges` | Pending | `Exchange` (proposed) | blocked | Confirm participant IDs, status values, schedule and completion fields | Pending | Pending |
| `messages` | Pending | `Message` (proposed) | blocked | Confirm sender/recipient/exchange references and ordering timestamps | Pending | Pending |
| `reviews` | Pending | `Review` (proposed) | blocked | Confirm reviewer/reviewee/exchange refs, rating range and uniqueness | Pending | Pending |
| `posts` | Pending | `Post` (proposed) | blocked | Confirm author, content, tags, likes and visibility semantics | Pending | Pending |
| `notifications` | Pending | `Notification` (proposed) | blocked | Confirm actor/recipient/resource fields and supported types | Pending | Pending |
| `blocks` | Pending | `Block` (proposed) | blocked | Confirm blocker/blocked IDs, self-block and duplicate rules | Pending | Pending |
| `reports` | Pending | `Report` (proposed) | blocked | Confirm target types, reporter/resolver, status and resolution fields | Pending | Pending |
| `analytics_events` | Pending | `AnalyticsEvent` (proposed) | blocked | Review retention/privacy policy and exclude sensitive properties | Pending | Pending |
| `connections` | Pending | Undecided | blocked | Product decision required: map, transform, archive, or explicitly exclude based on actual semantics; never assume it is an exchange | Pending | Pending |

These rows are only the currently known table inventory. Add every additional table found in the real source and investigate any listed table that is absent before approving the snapshot.

## Field-level mapping worksheet

Create one row per actual source column. Do not fill source types, nullability, constraints, enum values, or target fields from assumptions. Use a disposition of `mapped`, `transformed`, `excluded`, or `blocked`.

| Source table.column | Actual source type / nullability / default | Constraints / enum values | Target model.field | Disposition | Transformation / exclusion reason | Validation / collision check | Approved by |
|---|---|---|---|---|---|---|---|
| Pending from verified inventory | Pending | Pending | Pending | blocked | No source column has been reviewed in this template | Pending | Pending |


## Post-specific mapping decisions (must remain blocked until reviewed)

Use this matrix only after the source snapshot confirms the actual columns, types, constraints, and observed values. These are known proposed differences between the current source ORM description and target model, not verified live-database facts.

| Source field / behavior | Current target gap | Required decision and validation evidence | Status |
|---|---|---|---|
| `author_id` | Target requires `Post.author` as a User ObjectId | Define deterministic source-user-ID to target-ObjectId mapping; validate every reference resolves exactly once and preserve author ownership | blocked |
| `post_type` (source comment lists OFFER, REQUEST, COMPLETED_EXCHANGE, COMMUNITY, RECOMMENDATION) | Target has no post type field | Capture actual values and decide a lossless target field or explicit approved transformation; do not infer type from content | blocked |
| `title` (source String(200)) | Target has no title field | Preserve title separately or approve a documented alternative; inventory null/blank and overlength cases before deciding how to represent them | blocked |
| `content` | Target trims and caps content at 5,000 characters | Compare source type and actual length distribution; choose preserve, reject/quarantine, or approved transformation; never silently truncate | blocked |
| `skill_id`, `exchange_id`, `partner_id` | Target has no corresponding references | Map each nullable FK to the correct target model, preserve nulls and ON DELETE SET NULL semantics, and validate dangling references before import | blocked |
| `likes_count` | Target stores individual user IDs in `likes[]`, not an aggregate count | Determine whether individual liker identities exist elsewhere. Do not synthesize users or pretend the count reconstructs the list; document count preservation/reconciliation and negative-count handling | blocked |
| `created_at` | Mongoose timestamps generate target `createdAt` unless explicitly supplied | Preserve the original instant and timezone semantics, explicitly set target `createdAt` during import, and validate null/malformed timestamps and UTC boundary samples. Do not substitute migration time or target insertion time | blocked |
| Source primary key / references | Target uses MongoDB ObjectIds | Maintain a durable source-ID-to-ObjectId crosswalk for posts and all referenced entities; verify uniqueness and referential completeness before importing dependent records | blocked |

Before approving the `posts` row in the table-level worksheet, attach private evidence for source/target counts, required and optional reference resolution, timestamp preservation, title/type disposition, content length policy, and likes reconciliation. Record the decision owner and reviewer; the presence of this checklist is not approval.


## Block and connection relationship decisions (must remain blocked until reviewed)

The items below describe proposed source/target differences that require confirmation against the actual captured source schema and data. Do not interpret this worksheet as evidence that self-pairs or reciprocal pairs exist.

| Source behavior | Target behavior / risk | Required decision and validation evidence | Status |
|---|---|---|---|
| `blocks.blocker_id` and `blocks.blocked_id` | Target uses required User ObjectIds and rejects self-blocks in model validation | Build a deterministic user-ID crosswalk; check all references resolve; inventory self-block rows; have the product owner decide whether to reject, quarantine, or explicitly transform any found rows | blocked |
| `blocks.created_at` | Target Mongoose timestamps generate `createdAt` and `updatedAt` | Preserve the original instant explicitly and compare source/target timestamp distributions; do not replace historical time with import time | blocked |
| Unique `(blocker_id, blocked_id)` | Target unique index on ordered pair | Verify source unique constraint and duplicates in the actual snapshot; preserve pair direction and do not reverse or deduplicate pairs without policy approval | blocked |
| `connections.user_id`, `connected_user_id` | Target uses User ObjectIds and rejects self-connections | Validate crosswalk coverage and inventory self-pairs before import; agree on a disposition for any rows that target validation rejects | blocked |
| Ordered-pair uniqueness | Reciprocal rows `A → B` and `B → A` are distinct under the ordered-pair key | Inventory reciprocal pairs and actual uniqueness rules. Do not collapse reciprocal records unless the product owner explicitly approves that semantic change | blocked |
| `connections.status` | Target status is open-ended but defaults to `ACCEPTED` | Capture actual values and null/blank distribution; map only observed values by an explicit policy and never apply the default to historical rows without checking source values | blocked |
| `connections.created_at` | Target `createdAt` defaults to null with timestamps disabled | Explicitly preserve source creation time; identify nulls and timezone assumptions and validate representative UTC boundary records | blocked |
| Source FK deletion rules | Source ORM describes cascading deletes for both relationship tables | Verify live foreign keys and target deletion policy; document whether deletes should cascade, be retained, or be anonymized before approval | blocked |

Before approving either table, attach private evidence for exact row counts, unique-key violations, self-pairs, reciprocal connections, unresolved user references, observed statuses, timestamp nullness/ranges, and the approved handling policy. Keep source and target row-level evidence outside Git.

## Required decisions before marking the snapshot reviewed

- [ ] Reconcile every source schema and table against the catalog output; explain missing, additional, or non-application tables.
- [ ] Review primary keys, unique constraints, foreign keys (including composite keys), indexes, RLS policies, triggers, and exact row counts.
- [ ] Record actual status/enum values and define explicit handling for values the target application does not support.
- [ ] Verify email, username, and phone uniqueness/case-normalization collisions without silently changing identities.
- [ ] Confirm password hash algorithm/parameters and compatibility; otherwise plan a safe credential-reset path rather than claiming hashes are portable.
- [ ] Define deterministic ID conversion and source-to-target ID mapping for every foreign-key reference.
- [ ] Decide `connections` semantics and disposition with the product owner.
- [ ] Review analytics data minimization/retention and exclude tokens, contact details, message bodies, and other sensitive payloads unless explicitly approved.
- [ ] Document every excluded/transformed field and how it will be reconciled.
- [ ] Obtain source-owner and migration-reviewer sign-off.

Only after these checks are complete should the reviewed contract be updated. This worksheet itself never changes the database, approves an import, or authorizes production cutover.
