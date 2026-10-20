import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import User from "../src/models/User.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target User schema exposes required identity and authentication fields", () => {
  assert.equal(User.modelName, "User");
  assert.equal(User.schema.path("fullName").isRequired, true);
  assert.equal(User.schema.path("username").isRequired, true);
  assert.equal(User.schema.path("email").isRequired, true);
  assert.equal(User.schema.path("passwordHash").isRequired, true);
  assert.equal(User.schema.path("passwordHash").options.select, false);
  assert.ok(User.schema.path("tokenVersion"));
  assert.ok(User.schema.indexes().some(([keys, options]) =>
    keys.phone === 1 && options.unique === true && options.partialFilterExpression
  ));
});

test("users mapping records source/target conversion gaps and remains pending", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const users = contract.tables.find((table) => table.name === "users");
  assert.ok(users);
  assert.equal(users.status, "pending");
  assert.equal(users.proposedTarget, "User");
  assert.match(users.reason, /password_hash/i);
  assert.match(users.reason, /nullable username/i);
  assert.match(users.reason, /monetization/i);
  assert.match(users.reason, /onboarding defaults true/i);
  assert.match(users.reason, /captured PostgreSQL schema snapshot/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("user conversion guards source fields and nullability not represented by the target model", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const users = contract.tables.find((table) => table.name === "users");
  assert.ok(users);
  assert.equal(User.schema.path("latitude"), undefined);
  assert.equal(User.schema.path("longitude"), undefined);
  assert.equal(User.schema.path("reliabilityScore"), undefined);
  assert.equal(User.schema.path("responseRate"), undefined);
  assert.equal(User.schema.path("skillQualityScore"), undefined);
  assert.equal(User.schema.path("completedExchangesCount"), undefined);
  assert.equal(User.schema.path("badges"), undefined);
  assert.equal(User.schema.path("onboardingCompleted").options.default, false);
  assert.equal(User.schema.path("fullName").options.maxlength, 100);
  assert.match(users.reason, /latitude/i);
  assert.match(users.reason, /reliability/i);
  assert.match(users.reason, /badges/i);
  assert.match(users.reason, /onboarding defaults true/i);
  assert.equal(users.status, "pending");
  assert.equal(contract.schemaSnapshotReviewed, false);
});
