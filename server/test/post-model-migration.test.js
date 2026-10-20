import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Post from "../src/models/Post.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Post schema exposes current content, visibility, and engagement representation", () => {
  assert.equal(Post.modelName, "Post");
  assert.ok(Post.schema.path("author"));
  assert.ok(Post.schema.path("content"));
  assert.ok(Post.schema.path("tags"));
  assert.ok(Post.schema.path("likes"));
  assert.ok(Post.schema.path("visibility"));
  assert.ok(Post.schema.path("isHidden"));
  assert.equal(Post.schema.path("content").options.maxlength, 5000);
  assert.equal(Post.schema.path("visibility").options.default, "public");
});

test("posts migration stays pending while source fields and target representation differ", async () => {
  const contractPath = path.join(repositoryRoot, "migrations/source-to-target-contract.json");
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const posts = contract.tables.find((table) => table.name === "posts");
  assert.ok(posts);
  assert.equal(posts.status, "pending");
  assert.equal(posts.proposedTarget, "Post");
  assert.match(posts.reason, /post_type String\(50\)/i);
  assert.match(posts.reason, /title String\(200\)/i);
  assert.match(posts.reason, /ON DELETE SET NULL/i);
  assert.match(posts.reason, /likes_count/i);
  assert.match(posts.reason, /5000 characters/i);
  assert.match(posts.reason, /ObjectId/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("post conversion guards legacy fields that the target schema does not preserve directly", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const posts = contract.tables.find((table) => table.name === "posts");
  assert.ok(posts);
  assert.equal(Post.schema.path("title"), undefined);
  assert.equal(Post.schema.path("post_type"), undefined);
  assert.equal(Post.schema.path("skill"), undefined);
  assert.equal(Post.schema.path("exchange"), undefined);
  assert.equal(Post.schema.path("partner"), undefined);
  assert.equal(Post.schema.path("likes_count"), undefined);
  assert.ok(Post.schema.path("likes"), "target likes array is not equivalent to source likes_count");
  assert.ok(Post.schema.path("createdAt"), "target timestamp is automatically createdAt");
  assert.match(posts.reason, /post_type String\(50\)/i);
  assert.match(posts.reason, /title String\(200\)/i);
  assert.match(posts.reason, /skill_id/i);
  assert.match(posts.reason, /exchange_id/i);
  assert.match(posts.reason, /partner_id/i);
  assert.match(posts.reason, /likes_count/i);
  assert.equal(posts.status, "pending");
  assert.equal(contract.schemaSnapshotReviewed, false);
});
