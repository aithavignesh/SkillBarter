import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";

function parseMongoUri(uri, label) {
  let parsedUri;
  try { parsedUri = new URL(uri); } catch {
    throw new Error(`${label} must be a valid MongoDB URI.`);
  }
  if (!["mongodb:", "mongodb+srv:"].includes(parsedUri.protocol)) {
    throw new Error(`${label} must use mongodb:// or mongodb+srv://.`);
  }
  let databaseName;
  try { databaseName = decodeURIComponent(parsedUri.pathname.slice(1).split("/")[0]); } catch {
    throw new Error(`${label} contains an invalid encoded database name.`);
  }
  return { parsedUri, databaseName };
}

export function getStagingDatabaseName(uri) {
  return parseMongoUri(uri, "MIGRATION_STAGING_MONGODB_URI").databaseName;
}

export function validateStagingMongoUri(uri, applicationUri, confirmation) {
  if (typeof uri !== "string" || !uri.trim()) {
    throw new Error("MIGRATION_STAGING_MONGODB_URI is required; use a dedicated staging account.");
  }
  const { parsedUri, databaseName } = parseMongoUri(uri, "MIGRATION_STAGING_MONGODB_URI");

  // Compare endpoint identity, not raw URI strings: different credentials or query
  // parameters must not allow the staging guard to target the application's database.
  if (typeof applicationUri === "string" && applicationUri.trim()) {
    const application = parseMongoUri(applicationUri, "MONGODB_URI");
    if (parsedUri.hostname.toLowerCase() === application.parsedUri.hostname.toLowerCase()
      && databaseName.toLowerCase() === application.databaseName.toLowerCase()) {
      throw new Error("Staging URI must not equal or alias the application's MONGODB_URI host/database.");
    }
  }

  const hostAndDatabase = parsedUri.hostname + " " + databaseName;
  if (!databaseName || /(^|[-_.])(prod|production|live)([-_.]|$)/i.test(hostAndDatabase)) {
    throw new Error("Staging URI must identify a non-production host and database.");
  }
  if (confirmation !== "YES") {
    throw new Error("Set MIGRATION_STAGING_CONFIRM=YES only after verifying this URI points to the isolated staging database.");
  }
  return { databaseName, hostname: parsedUri.hostname };
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be a JSON object.`);
}
function requireSafeName(value, label) {
  if (typeof value !== "string" || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) throw new Error(`${label} must be a simple collection or field name.`);
}

/**
 * Read-only verification of actual MongoDB counts and declared references.
 * Specification is deliberately explicit; it does not infer source-to-target mappings.
 *
 * {
 *   "collections": [{"name":"users","expectedCount":123}],
 *   "references": [{"collection":"connections","field":"user","targetCollection":"users"}]
 * }
 */
export async function verifyMongoStaging(db, specification) {
  if (!db || typeof db.collection !== "function") throw new Error("A connected MongoDB database handle is required.");
  requireObject(specification, "Staging verification specification");
  if (!Array.isArray(specification.collections) || specification.collections.length === 0) {
    throw new Error("Specification must contain a non-empty collections array.");
  }
  if (!Array.isArray(specification.references)) throw new Error("Specification references must be an array.");
  const expected = new Map();
  for (const entry of specification.collections) {
    requireObject(entry, "Collection expectation");
    requireSafeName(entry.name, "Collection name");
    if (!Number.isSafeInteger(entry.expectedCount) || entry.expectedCount < 0) {
      throw new Error(`expectedCount for ${entry.name} must be a non-negative safe integer.`);
    }
    if (expected.has(entry.name)) throw new Error(`Duplicate collection expectation: ${entry.name}`);
    expected.set(entry.name, entry.expectedCount);
  }

  // Validate the complete specification before any database read. This keeps a
  // malformed reference from triggering partial counts or other avoidable reads.
  for (const reference of specification.references) {
    requireObject(reference, "Reference check");
    requireSafeName(reference.collection, "Reference source collection");
    requireSafeName(reference.field, "Reference field");
    requireSafeName(reference.targetCollection, "Reference target collection");
    if (!expected.has(reference.collection) || !expected.has(reference.targetCollection)) {
      throw new Error("Every reference source and target collection must have an explicit count expectation.");
    }
  }

  const results = [];
  for (const [name, expectedCount] of expected) {
    const actualCount = await db.collection(name).countDocuments({});
    results.push({ collection: name, expectedCount, actualCount, valid: actualCount === expectedCount });
  }

  const referenceResults = [];
  for (const reference of specification.references) {
    const source = db.collection(reference.collection);
    const target = db.collection(reference.targetCollection);
    const targetIds = new Set();
    for await (const row of target.find({}, { projection: { _id: 1 } })) targetIds.add(String(row._id));
    let checked = 0;
    let missing = 0;
    for await (const row of source.find({ [reference.field]: { $exists: true, $ne: null } }, { projection: { [reference.field]: 1 } })) {
      const values = Array.isArray(row[reference.field]) ? row[reference.field] : [row[reference.field]];
      for (const value of values) {
        if (value === null || value === undefined || value === "") continue;
        checked += 1;
        if (!targetIds.has(String(value))) missing += 1;
      }
    }
    referenceResults.push({
      collection: reference.collection,
      field: reference.field,
      targetCollection: reference.targetCollection,
      checkedReferences: checked,
      missingReferences: missing,
      valid: missing === 0
    });
  }
  const valid = results.every((item) => item.valid) && referenceResults.every((item) => item.valid);
  return { valid, readOnly: true, collectionResults: results, referenceResults };
}

async function main() {
  const uri = process.env.MIGRATION_STAGING_MONGODB_URI;
  validateStagingMongoUri(uri, process.env.MONGODB_URI, process.env.MIGRATION_STAGING_CONFIRM);
  const specificationPath = process.argv[2];
  if (!specificationPath) throw new Error("Usage: MIGRATION_STAGING_MONGODB_URI=... node server/src/migrations/verifyMongoStaging.js <private-specification.json>");
  let specification;
  try { specification = JSON.parse(await readFile(path.resolve(specificationPath), "utf8")); }
  catch { throw new Error("Unable to read a valid private JSON staging specification."); }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, readPreference: "primary" });
    const report = await verifyMongoStaging(mongoose.connection.db, specification);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.valid) process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`MongoDB staging verification failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
