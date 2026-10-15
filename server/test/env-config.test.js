import test from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment } from "../src/config/env.js";

const validBase = {
  NODE_ENV: "development",
  MONGODB_URI: "mongodb://localhost:27017/skillbarter",
  JWT_SECRET: "a".repeat(32),
  CLIENT_ORIGIN: "http://localhost:3000"
};

test("accepts a valid development configuration", () => {
  assert.deepEqual(validateEnvironment(validBase), { origins: ["http://localhost:3000"] });
});

test("rejects missing MongoDB configuration", () => {
  assert.throws(() => validateEnvironment({ ...validBase, MONGODB_URI: "" }), /MONGODB_URI is required/);
});

test("rejects short JWT secrets before the server starts", () => {
  assert.throws(() => validateEnvironment({ ...validBase, JWT_SECRET: "too-short" }), /at least 32 characters/);
});

test("requires an explicit client origin in production", () => {
  assert.throws(() => validateEnvironment({ ...validBase, NODE_ENV: "production", CLIENT_ORIGIN: "" }), /CLIENT_ORIGIN must be configured/);
});

test("requires HTTPS origins in production", () => {
  assert.throws(() => validateEnvironment({ ...validBase, NODE_ENV: "production", CLIENT_ORIGIN: "http://app.example.com" }), /must use HTTPS/);
});

test("rejects client origins that include a path", () => {
  assert.throws(() => validateEnvironment({ ...validBase, CLIENT_ORIGIN: "http://localhost:3000/app" }), /without paths/);
});

test("accepts a comma-separated list of valid HTTPS production origins", () => {
  assert.deepEqual(
    validateEnvironment({ ...validBase, NODE_ENV: "production", CLIENT_ORIGIN: "https://app.example.com,https://admin.example.com" }),
    { origins: ["https://app.example.com", "https://admin.example.com"] }
  );
});
