# MongoDB staging reconciliation runbook

## Purpose and limits

`server/src/migrations/verifyMongoStaging.js` performs read-only checks against an explicitly supplied MongoDB database. It compares actual collection document counts with expected counts and checks declared direct references against target collection `_id` values. It does not import data, infer mappings, validate field-by-field content, prove authentication works, or authorize production cutover.

## Preconditions

1. Source schema review and mapping decisions have been approved and recorded.
2. A completed dry-run/import report has been reviewed and its per-collection counts independently reconciled with the source inventory.
3. Use a dedicated staging database and credentials with read-only access. Do not use production credentials or production database names.
4. Keep the specification and any export/report files containing sensitive data outside Git. Never commit connection strings, credentials, raw exports, or user records.

## Specification format

Create a private JSON file with an explicit count for every collection that must be checked. Counts must come from approved migration evidence; do not guess or copy expected counts from the target database itself.

```json
{
  "collections": [
    { "name": "users", "expectedCount": 0 },
    { "name": "connections", "expectedCount": 0 }
  ],
  "references": [
    {
      "collection": "connections",
      "field": "user",
      "targetCollection": "users"
    },
    {
      "collection": "connections",
      "field": "connectedUser",
      "targetCollection": "users"
    }
  ]
}
```

The zero counts above are illustrative placeholders only. Replace them with reviewed counts before running. Add reference checks for each approved direct reference field. The current checker supports simple field names and scalar or array values; it does not support dotted/nested field paths.

## Run

From the repository root, set `MIGRATION_STAGING_MONGODB_URI` to the dedicated staging URI in the local shell/secret manager, then run:

```sh
node server/src/migrations/verifyMongoStaging.js /secure/path/staging-reconciliation.json
```

Exit status:
- `0`: all declared collection counts and reference checks passed.
- `2`: checker ran, but one or more count/reference checks failed.
- `1`: configuration, connection, or validation error.

The checker prints a JSON report. Preserve the report in the restricted migration evidence location, not in Git if it contains sensitive operational details.

## Review requirements

A passing report is necessary but not sufficient for migration sign-off. Review rejected/quarantined rows, excluded rows and reasons, ID mapping, all reference types, uniqueness/index constraints, authentication hash compatibility, timestamps, and business-critical field preservation. Run staging end-to-end tests and obtain explicit migration approval before any production cutover. The legacy production application and database must remain unchanged until that approval.
