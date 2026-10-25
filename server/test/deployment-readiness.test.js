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

test("rejects malformed and path-bearing client origins", () => {
  assert.throws(
    () => validateEnvironment({ ...base, CLIENT_ORIGIN: "not-a-url" }),
    /valid origin URLs/
  );
  assert.throws(
    () => validateEnvironment({ ...base, CLIENT_ORIGIN: "http://localhost:3000/app" }),
    /without paths or credentials/
  );
});

test("rejects invalid or incomplete Twilio credentials", () => {
  const twilio = {
    TWILIO_ACCOUNT_SID: "AC" + "a".repeat(32),
    TWILIO_AUTH_TOKEN: "t".repeat(32),
    TWILIO_VERIFY_SERVICE_SID: "VA" + "b".repeat(32)
  };
  assert.doesNotThrow(() => validateEnvironment({ ...base, ...twilio }));
  assert.throws(
    () => validateEnvironment({ ...base, ...twilio, TWILIO_VERIFY_SERVICE_SID: "invalid" }),
    /invalid format/
  );
});

test("requires complete SMTP configuration when password reset is enabled", () => {
  assert.throws(
    () => validateEnvironment({ ...base, PASSWORD_RESET_URL: "http://localhost:3000/reset" }),
    /requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM/
  );
});

test("rejects password-reset URLs outside configured client origins", () => {
  assert.throws(
    () => validateEnvironment({
      ...base,
      PASSWORD_RESET_URL: "http://evil.example/reset",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "user",
      SMTP_PASSWORD: "password",
      SMTP_FROM: "noreply@example.com"
    }),
    /must use an origin listed in CLIENT_ORIGIN/
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
