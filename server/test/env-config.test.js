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

test("accepts an optional valid password reset URL in development", () => {
  assert.deepEqual(
    validateEnvironment({ ...validBase, PASSWORD_RESET_URL: "http://localhost:3000/reset-password" }),
    { origins: ["http://localhost:3000"] }
  );
});

test("rejects password reset URLs containing query parameters or fragments", () => {
  assert.throws(
    () => validateEnvironment({ ...validBase, PASSWORD_RESET_URL: "http://localhost:3000/reset?token=existing" }),
    /without credentials, query, or fragment/
  );
});

test("requires HTTPS for password reset URLs in production", () => {
  assert.throws(
    () => validateEnvironment({
      ...validBase,
      NODE_ENV: "production",
      CLIENT_ORIGIN: "https://app.example.com",
      PASSWORD_RESET_URL: "http://app.example.com/reset-password"
    }),
    /PASSWORD_RESET_URL must use HTTPS/
  );
});

test("accepts HTTPS password reset URLs in production", () => {
  assert.deepEqual(
    validateEnvironment({
      ...validBase,
      NODE_ENV: "production",
      CLIENT_ORIGIN: "https://app.example.com",
      PASSWORD_RESET_URL: "https://app.example.com/reset-password"
    }),
    { origins: ["https://app.example.com"] }
  );
});

test("rejects password reset URLs on origins not listed in CLIENT_ORIGIN", () => {
  assert.throws(
    () => validateEnvironment({
      ...validBase,
      PASSWORD_RESET_URL: "http://attacker.example/reset-password"
    }),
    /must use an origin listed in CLIENT_ORIGIN/
  );
});

test("accepts a password reset URL when its origin is one of multiple allowed origins", () => {
  assert.deepEqual(
    validateEnvironment({
      ...validBase,
      CLIENT_ORIGIN: "http://localhost:3000,http://admin.localhost:3000",
      PASSWORD_RESET_URL: "http://admin.localhost:3000/reset-password"
    }),
    { origins: ["http://localhost:3000", "http://admin.localhost:3000"] }
  );
});

test("rejects production password reset URLs that are not on an allowed client origin", () => {
  assert.throws(
    () => validateEnvironment({
      ...validBase,
      NODE_ENV: "production",
      CLIENT_ORIGIN: "https://app.example.com",
      PASSWORD_RESET_URL: "https://attacker.example/reset-password"
    }),
    /must use an origin listed in CLIENT_ORIGIN/
  );
});
