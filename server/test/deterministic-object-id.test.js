import test from "node:test";
import assert from "node:assert/strict";
import { deterministicObjectId } from "../src/migrations/deterministicObjectId.js";

test("generates a stable 24-character hexadecimal identifier", () => {
  const first = deterministicObjectId("users", "source-user-123");
  assert.equal(first, deterministicObjectId("users", "source-user-123"));
  assert.match(first, /^[a-f0-9]{24}$/);
});

test("namespaces identifiers by exact source collection name", () => {
  assert.notEqual(deterministicObjectId("users", "42"), deterministicObjectId("skills", "42"));
  assert.notEqual(deterministicObjectId("users", "42"), deterministicObjectId("Users", "42"));
});

test("distinguishes source identifiers without coercing strings to numbers", () => {
  assert.notEqual(deterministicObjectId("users", "001"), deterministicObjectId("users", "1"));
  assert.notEqual(deterministicObjectId("users", "1"), deterministicObjectId("users", 1));
});

test("rejects invalid collection names and empty or unsupported source IDs", () => {
  assert.throws(() => deterministicObjectId("../users", "1"), /sourceCollection/);
  assert.throws(() => deterministicObjectId("users", ""), /must not be empty/);
  assert.throws(() => deterministicObjectId("users", "   "), /must not be empty/);
  assert.throws(() => deterministicObjectId("users", null), /sourceId must be a string or finite number/);
  assert.throws(() => deterministicObjectId("users", Number.NaN), /sourceId must be a string or finite number/);
  assert.throws(() => deterministicObjectId("users", Number.POSITIVE_INFINITY), /sourceId must be a string or finite number/);
  assert.throws(() => deterministicObjectId("users", Number.NEGATIVE_INFINITY), /sourceId must be a string or finite number/);
});

test("rejects numeric identifiers that JavaScript cannot represent exactly", () => {
  assert.throws(
    () => deterministicObjectId("users", Number.MAX_SAFE_INTEGER + 1),
    /safe integer to preserve its exact value/
  );
  assert.throws(
    () => deterministicObjectId("users", 1.5),
    /safe integer to preserve its exact value/
  );
});
