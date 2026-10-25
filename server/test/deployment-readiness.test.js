import test from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment } from "../src/config/env.js";

const base = {
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1:27017/skillbarter_test",
  JWT_SECRET: "s".repeat(40),
  CLIENT_ORIGIN: "http://localhost:3000"
};

test("requires MongoDB URI and strong JWT secret", () => {
  assert.throws(() => validateEnvironment({ ...base, MONGODB_URI: "" }), /MONGODB_URI is required/);
  assert.throws(() => validateEnvironment({ ...base, JWT_SECRET: "short" }), /at least 32 characters/);
});

test("rejects partial Twilio configuration", () => {
  assert.throws(
    () => validateEnvironment({ ...base, TWILIO_ACCOUNT_SID: "AC" + "a".repeat(32) }),
    /must be configured together/
  );
});

test("rejects non-HTTPS production origins", () => {
  assert.throws(
    () => validateEnvironment({ ...base, NODE_ENV: "production", CLIENT_ORIGIN: "http://app.example.com" }),
    /must use HTTPS/
  );
});

test("accepts valid production origins and secret lengths", () => {
  assert.deepEqual(
    validateEnvironment({
      ...base,
      NODE_ENV: "production",
      CLIENT_ORIGIN: "https://app.example.com,https://admin.example.com"
    }),
    { origins: ["https://app.example.com", "https://admin.example.com"] }
  );
});
