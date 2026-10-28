import test from "node:test";
import assert from "node:assert/strict";
import { verifyMongoStaging } from "../src/migrations/verifyMongoStaging.js";

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
