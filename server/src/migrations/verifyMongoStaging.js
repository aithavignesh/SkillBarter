import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";

export function getStagingDatabaseName(uri) {
  let parsedUri;
  try { parsedUri = new URL(uri); } catch {
    throw new Error("MIGRATION_STAGING_MONGODB_URI must be a valid MongoDB URI.");
  }
  if (!["mongodb:", "mongodb+srv:"].includes(parsedUri.protocol)) {
    throw new Error("MIGRATION_STAGING_MONGODB_URI must use mongodb:// or mongodb+srv://.");
  }
  return parsedUri.pathname.replace(/^\/+/, "").split("/")[0];
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

  const results = [];
  for (const [name, expectedCount] of expected) {
    const actualCount = await db.collection(name).countDocuments({});
    results.push({ collection: name, expectedCount, actualCount, valid: actualCount === expectedCount });
  }

  const referenceResults = [];
  for (const reference of specification.references) {
    requireObject(reference, "Reference check");
    requireSafeName(reference.collection, "Reference source collection");
    requireSafeName(reference.field, "Reference field");
    requireSafeName(reference.targetCollection, "Reference target collection");
    if (!expected.has(reference.collection) || !expected.has(reference.targetCollection)) {
      throw new Error("Every reference source and target collection must have an explicit count expectation.");
    }
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
  if (!uri?.trim()) throw new Error("MIGRATION_STAGING_MONGODB_URI is required; use a dedicated staging account.");
  if (process.env.MONGODB_URI && uri === process.env.MONGODB_URI) {
    throw new Error("Staging URI must not equal the application's MONGODB_URI.");
  }
  const databaseName = getStagingDatabaseName(uri);
  const hostAndDatabase = `${parsedUri.hostname} ${databaseName}`;
  if (!databaseName || /(^|[-_.])(prod|production|live)([-_.]|$)/i.test(hostAndDatabase)) {
    throw new Error("Staging URI must identify a non-production host and database.");
  }
  if (process.env.MIGRATION_STAGING_CONFIRM !== "YES") {
    throw new Error("Set MIGRATION_STAGING_CONFIRM=YES only after verifying this URI points to the isolated staging database.");
  }
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
