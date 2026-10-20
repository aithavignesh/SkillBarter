import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Review from "../src/models/Review.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Review schema preserves core references, rating bounds, and reviewer uniqueness", () => {
  assert.equal(Review.modelName, "Review");
  assert.equal(Review.schema.path("exchange").options.ref, "Exchange");
  assert.equal(Review.schema.path("reviewer").options.ref, "User");
  assert.equal(Review.schema.path("reviewee").options.ref, "User");
  assert.equal(Review.schema.path("rating").options.min, 1);
  assert.equal(Review.schema.path("rating").options.max, 5);
  assert.equal(Review.schema.path("comment").options.maxlength, 2000);
  assert.ok(Review.schema.indexes().some(([keys, options]) =>
    keys.exchange === 1 && keys.reviewer === 1 && options.unique === true
  ));
});

test("reviews migration mapping records dropped source metadata and remains pending", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const reviews = contract.tables.find((table) => table.name === "reviews");
  assert.ok(reviews);
  assert.equal(reviews.status, "pending");
  assert.equal(reviews.proposedTarget, "Review");
  assert.match(reviews.reason, /reliability_score/i);
  assert.match(reviews.reason, /skill_quality_score/i);
  assert.match(reviews.reason, /would_exchange_again/i);
  assert.match(reviews.reason, /uq_exchange_reviewer/i);
  assert.match(reviews.reason, /2000 characters/i);
  assert.match(reviews.reason, /captured PostgreSQL schema snapshot/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});
