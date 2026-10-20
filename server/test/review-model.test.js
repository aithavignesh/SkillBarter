import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Review from "../src/models/Review.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Review schema exposes current rating, references, and uniqueness", () => {
  assert.equal(Review.modelName, "Review");
  assert.ok(Review.schema.path("exchange"));
  assert.ok(Review.schema.path("reviewer"));
  assert.ok(Review.schema.path("reviewee"));
  assert.equal(Review.schema.path("rating").options.min, 1);
  assert.equal(Review.schema.path("rating").options.max, 5);
  assert.equal(Review.schema.path("comment").options.maxlength, 2000);
  assert.ok(Review.schema.indexes().some(([fields, options]) =>
    fields.exchange === 1 && fields.reviewer === 1 && options.unique === true
  ));
});

test("reviews migration remains pending while source sub-scores and comment constraints differ", async () => {
  const contractPath = path.join(repositoryRoot, "migrations/source-to-target-contract.json");
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const reviews = contract.tables.find((table) => table.name === "reviews");
  assert.ok(reviews);
  assert.equal(reviews.status, "pending");
  assert.equal(reviews.proposedTarget, "Review");
  assert.match(reviews.reason, /uq_exchange_reviewer/i);
  assert.match(reviews.reason, /reliability_score/i);
  assert.match(reviews.reason, /skill_quality_score/i);
  assert.match(reviews.reason, /would_exchange_again/i);
  assert.match(reviews.reason, /2000 characters/i);
  assert.match(reviews.reason, /ObjectIds/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});
