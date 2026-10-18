import { createHash } from "node:crypto";

const MIGRATION_NAMESPACE = "skillbarter:postgres-to-mongodb:v1";

/**
 * Return a stable 24-character hex ObjectId value for a source row identifier.
 * Use this for non-ObjectId PostgreSQL identifiers only; valid source ObjectIds
 * may be preserved after the migration's cross-collection collision checks.
 * The same collection/source-ID pair must be used for every reference to a row.
 */
export function deterministicObjectId(sourceCollection, sourceId) {
  if (typeof sourceCollection !== "string" || !/^[a-z][a-z0-9_]*$/i.test(sourceCollection)) {
    throw new TypeError("sourceCollection must be a valid table-like identifier.");
  }

  if (typeof sourceId !== "string" && typeof sourceId !== "number") {
    throw new TypeError("sourceId must be a string or finite number.");
  }
  if (typeof sourceId === "number" && !Number.isSafeInteger(sourceId)) {
    throw new TypeError("numeric sourceId must be a safe integer to preserve its exact value.");
  }

  const normalizedId = String(sourceId);
  if (!normalizedId.trim()) throw new TypeError("sourceId must not be empty.");

  return createHash("sha256")
    .update(MIGRATION_NAMESPACE)
    .update("\0")
    .update(typeof sourceId)
    .update("\0")
    .update(sourceCollection.toLowerCase())
    .update("\0")
    .update(normalizedId)
    .digest("hex")
    .slice(0, 24);
}
