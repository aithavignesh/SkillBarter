import test from "node:test";
import assert from "node:assert/strict";
import { getStagingDatabaseName, validateStagingMongoUri, verifyMongoStaging } from "../src/migrations/verifyMongoStaging.js";

function fakeDb(collections) {
  return {
    collection(name) {
      const rows = collections[name];
      if (!rows) throw new Error(`unknown collection: ${name}`);
      return {
        countDocuments: async () => rows.length,
        find(filter = {}, options = {}) {
          let selected = rows;
          const key = Object.keys(filter)[0];
          if (key) selected = rows.filter((row) => row[key] !== undefined && row[key] !== null);
          if (options.projection) {
            const field = Object.keys(options.projection).find((field) => field !== "_id");
            if (field) selected = selected.map((row) => ({ [field]: row[field] }));
            else selected = selected.map(({ _id }) => ({ _id }));
          }
          return { async *[Symbol.asyncIterator]() { for (const row of selected) yield row; } };
        }
      };
    }
  };
}

const spec = {
  collections: [{ name: "users", expectedCount: 2 }, { name: "connections", expectedCount: 1 }],
  references: [{ collection: "connections", field: "user", targetCollection: "users" }]
};

test("staging reconciliation passes matching collection counts and references", async () => {
  const db = fakeDb({ users: [{ _id: "u1" }, { _id: "u2" }], connections: [{ _id: "c1", user: "u1" }] });
  const result = await verifyMongoStaging(db, spec);
  assert.equal(result.valid, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.referenceResults[0].checkedReferences, 1);
});

test("staging reconciliation detects collection count mismatches", async () => {
  const db = fakeDb({ users: [{ _id: "u1" }], connections: [{ _id: "c1", user: "u1" }] });
  const result = await verifyMongoStaging(db, spec);
  assert.equal(result.valid, false);
  assert.equal(result.collectionResults[0].valid, false);
});

test("staging reconciliation detects references missing from target collection", async () => {
  const db = fakeDb({ users: [{ _id: "u1" }], connections: [{ _id: "c1", user: "missing-user" }] });
  const result = await verifyMongoStaging(db, spec);
  assert.equal(result.valid, false);
  assert.equal(result.referenceResults[0].missingReferences, 1);
});

test("staging reconciliation rejects invalid and incomplete specifications before database reads", async () => {
  let reads = 0;
  const db = { collection() { reads += 1; throw new Error("should not read"); } };
  await assert.rejects(() => verifyMongoStaging(db, { collections: [], references: [] }), /non-empty collections array/);
  await assert.rejects(() => verifyMongoStaging(db, {
    collections: [{ name: "users", expectedCount: -1 }], references: []
  }), /non-negative safe integer/);
  await assert.rejects(() => verifyMongoStaging(db, {
    collections: [{ name: "users", expectedCount: 0 }],
    references: [{ collection: "users", field: "user", targetCollection: "absent" }]
  }), /explicit count expectation/);
  assert.equal(reads, 0);
});

test("staging reconciliation checks every member of array-valued references", async () => {
  const db = fakeDb({
    users: [{ _id: "u1" }, { _id: "u2" }],
    connections: [{ _id: "c1", user: ["u1", "missing-user"] }]
  });
  const result = await verifyMongoStaging(db, spec);
  assert.equal(result.valid, false);
  assert.equal(result.referenceResults[0].checkedReferences, 2);
  assert.equal(result.referenceResults[0].missingReferences, 1);
});

test("staging reconciliation rejects duplicate collection expectations", async () => {
  const db = { collection() { throw new Error("should not read"); } };
  await assert.rejects(() => verifyMongoStaging(db, {
    collections: [
      { name: "users", expectedCount: 1 },
      { name: "users", expectedCount: 1 }
    ],
    references: []
  }), /Duplicate collection expectation/);
});

test("staging reconciliation rejects unsafe collection and field names", async () => {
  const db = { collection() { throw new Error("should not read"); } };
  await assert.rejects(() => verifyMongoStaging(db, {
    collections: [{ name: "users.$where", expectedCount: 0 }],
    references: []
  }), /simple collection or field name/);
  await assert.rejects(() => verifyMongoStaging(db, {
    collections: [{ name: "users", expectedCount: 0 }, { name: "connections", expectedCount: 0 }],
    references: [{ collection: "connections", field: "nested.user", targetCollection: "users" }]
  }), /simple collection or field name/);
});

test("staging reconciliation rejects unsafe integer count expectations", async () => {
  const db = { collection() { throw new Error("should not read"); } };
  await assert.rejects(() => verifyMongoStaging(db, {
    collections: [{ name: "users", expectedCount: Number.MAX_SAFE_INTEGER + 1 }],
    references: []
  }), /non-negative safe integer/);
});

test("staging URI parser extracts database names without leading slashes", () => {
  assert.equal(getStagingDatabaseName("mongodb://localhost:27017/skillbarter_staging"), "skillbarter_staging");
  assert.equal(getStagingDatabaseName("mongodb+srv://cluster.example.mongodb.net/team_staging?retryWrites=true"), "team_staging");
});

test("staging URI parser rejects non-MongoDB protocols and malformed URIs", () => {
  assert.throws(() => getStagingDatabaseName("https://example.com/staging"), /must use mongodb:\/\/ or mongodb\+srv:\/\//);
  assert.throws(() => getStagingDatabaseName("not-a-uri"), /valid MongoDB URI/);
});

test("staging URI parser rejects URIs without an explicit database name", () => {
  assert.equal(getStagingDatabaseName("mongodb://localhost:27017"), "");
  assert.equal(getStagingDatabaseName("mongodb://localhost:27017/"), "");
});

test("staging URI validation requires explicit confirmation and rejects application URI reuse", () => {
  const stagingUri = "mongodb://localhost:27017/skillbarter_staging";
  assert.deepEqual(validateStagingMongoUri(stagingUri, "mongodb://localhost:27017/skillbarter_app", "YES"), {
    databaseName: "skillbarter_staging",
    hostname: "localhost"
  });
  assert.throws(() => validateStagingMongoUri(stagingUri, stagingUri, "YES"), /must not equal/);
  assert.throws(() => validateStagingMongoUri(stagingUri, undefined, "NO"), /MIGRATION_STAGING_CONFIRM=YES/);
  assert.throws(() => validateStagingMongoUri("  ", undefined, "YES"), /is required/);
});

test("staging URI validation rejects production-like host or database names", () => {
  assert.throws(() => validateStagingMongoUri("mongodb://prod-db.example:27017/skillbarter_staging", undefined, "YES"), /non-production/);
  assert.throws(() => validateStagingMongoUri("mongodb://localhost:27017/skillbarter-production", undefined, "YES"), /non-production/);
});

test("staging URI validation decodes escaped database names before safety checks", () => {
  assert.equal(getStagingDatabaseName("mongodb://localhost:27017/skillbarter%5Fstaging"), "skillbarter_staging");
  assert.throws(() => getStagingDatabaseName("mongodb://localhost:27017/bad%ZZname"), /invalid encoded database name/);
});
