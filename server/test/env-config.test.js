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
    validateEnvironment({ ...validBase, PASSWORD_RESET_URL: "http://localhost:3000/reset-password", SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "secret", SMTP_FROM: "no-reply@example.com" }),
    { origins: ["http://localhost:3000"] }
  );
});

test("rejects password reset URLs containing query parameters or fragments", () => {
  assert.throws(
    () => validateEnvironment({ ...validBase, PASSWORD_RESET_URL: "http://localhost:3000/reset?token=existing", SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "secret", SMTP_FROM: "no-reply@example.com" }),
    /without credentials, query, or fragment/
  );
});

test("requires HTTPS for password reset URLs in production", () => {
  assert.throws(
    () => validateEnvironment({
      ...validBase,
      NODE_ENV: "production",
      CLIENT_ORIGIN: "https://app.example.com",
      PASSWORD_RESET_URL: "http://app.example.com/reset-password",
      SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "secret", SMTP_FROM: "no-reply@example.com"
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
      PASSWORD_RESET_URL: "https://app.example.com/reset-password",
      SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "secret", SMTP_FROM: "no-reply@example.com"
    }),
    { origins: ["https://app.example.com"] }
  );
});

test("rejects password reset URLs on origins not listed in CLIENT_ORIGIN", () => {
  assert.throws(
    () => validateEnvironment({
      ...validBase,
      PASSWORD_RESET_URL: "http://attacker.example/reset-password",
      SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "secret", SMTP_FROM: "no-reply@example.com"
    }),
    /must use an origin listed in CLIENT_ORIGIN/
  );
});

test("accepts a password reset URL when its origin is one of multiple allowed origins", () => {
  assert.deepEqual(
    validateEnvironment({
      ...validBase,
      CLIENT_ORIGIN: "http://localhost:3000,http://admin.localhost:3000",
      PASSWORD_RESET_URL: "http://admin.localhost:3000/reset-password",
      SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "secret", SMTP_FROM: "no-reply@example.com"
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
      PASSWORD_RESET_URL: "https://attacker.example/reset-password",
      SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "secret", SMTP_FROM: "no-reply@example.com"
    }),
    /must use an origin listed in CLIENT_ORIGIN/
  );
});

test("rejects client origins that include credentials", () => {
  assert.throws(
    () => validateEnvironment({ ...validBase, CLIENT_ORIGIN: "http://user:password@localhost:3000" }),
    /without paths or credentials/
  );
});

test("rejects client origins that include query parameters or fragments", () => {
  assert.throws(
    () => validateEnvironment({ ...validBase, CLIENT_ORIGIN: "http://localhost:3000?next=/app" }),
    /without paths or credentials/
  );
  assert.throws(
    () => validateEnvironment({ ...validBase, CLIENT_ORIGIN: "http://localhost:3000#section" }),
    /without paths or credentials/
  );
});

test("rejects unsupported protocols for client origins", () => {
  assert.throws(
    () => validateEnvironment({ ...validBase, CLIENT_ORIGIN: "ftp://localhost:3000" }),
    /without paths or credentials/
  );
});

test("requires complete SMTP configuration when password recovery is enabled", () => {
  assert.throws(
    () => validateEnvironment({ ...validBase, PASSWORD_RESET_URL: "http://localhost:3000/reset-password" }),
    /requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM/
  );
});

test("rejects invalid SMTP ports when password recovery is enabled", () => {
  assert.throws(
    () => validateEnvironment({
      ...validBase,
      PASSWORD_RESET_URL: "http://localhost:3000/reset-password",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "70000",
      SMTP_USER: "user",
      SMTP_PASSWORD: "secret",
      SMTP_FROM: "no-reply@example.com"
    }),
    /SMTP_PORT must be an integer between 1 and 65535/
  );
});

test("does not require SMTP settings when password recovery is disabled", () => {
  assert.deepEqual(validateEnvironment(validBase), { origins: ["http://localhost:3000"] });
});

test("rejects each missing SMTP setting when password recovery is enabled", () => {
  const completeMailConfig = {
    PASSWORD_RESET_URL: "http://localhost:3000/reset-password",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "user",
    SMTP_PASSWORD: "secret",
    SMTP_FROM: "no-reply@example.com"
  };

  for (const key of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"]) {
    assert.throws(
      () => validateEnvironment({ ...validBase, ...completeMailConfig, [key]: "" }),
      /requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM/,
      `expected missing ${key} to be rejected`
    );
  }
});

test("rejects password reset URLs containing credentials", () => {
  assert.throws(
    () => validateEnvironment({
      ...validBase,
      PASSWORD_RESET_URL: "http://user:password@localhost:3000/reset-password",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "user",
      SMTP_PASSWORD: "secret",
      SMTP_FROM: "no-reply@example.com"
    }),
    /without credentials, query, or fragment/
  );
});

test("rejects unsupported protocols for password reset URLs", () => {
  assert.throws(
    () => validateEnvironment({
      ...validBase,
      PASSWORD_RESET_URL: "ftp://localhost:3000/reset-password",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "user",
      SMTP_PASSWORD: "secret",
      SMTP_FROM: "no-reply@example.com"
    }),
    /must be an HTTP\(S\) URL/
  );
});

test("rejects relative password reset URLs", () => {
  assert.throws(
    () => validateEnvironment({
      ...validBase,
      PASSWORD_RESET_URL: "/reset-password",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "user",
      SMTP_PASSWORD: "secret",
      SMTP_FROM: "no-reply@example.com"
    }),
    /must be a valid absolute URL/
  );
});

test("rejects an empty comma-separated client origin list", () => {
  assert.throws(
    () => validateEnvironment({ ...validBase, CLIENT_ORIGIN: " , , " }),
    /At least one CLIENT_ORIGIN must be configured/
  );
});

test("rejects malformed client origin entries in a comma-separated list", () => {
  assert.throws(
    () => validateEnvironment({
      ...validBase,
      CLIENT_ORIGIN: "http://localhost:3000,not-a-url"
    }),
    /CLIENT_ORIGIN must contain valid origin URLs/
  );
});

test("rejects SMTP_HOST values that contain a URL or path", () => {
  for (const host of ["https://smtp.example.com", "smtp.example.com/path", "smtp example.com"]) {
    assert.throws(
      () => validateEnvironment({
        ...validBase,
        PASSWORD_RESET_URL: "http://localhost:3000/reset-password",
        SMTP_HOST: host,
        SMTP_PORT: "587",
        SMTP_USER: "user",
        SMTP_PASSWORD: "secret",
        SMTP_FROM: "no-reply@example.com"
      }),
      /SMTP_HOST must be a hostname or IP address, not a URL/,
      `expected invalid SMTP host ${host} to be rejected`
    );
  }
});

test("accepts a hostname or IP address as SMTP_HOST", () => {
  for (const host of ["smtp.example.com", "localhost", "127.0.0.1"]) {
    assert.deepEqual(
      validateEnvironment({
        ...validBase,
        PASSWORD_RESET_URL: "http://localhost:3000/reset-password",
        SMTP_HOST: host,
        SMTP_PORT: "587",
        SMTP_USER: "user",
        SMTP_PASSWORD: "secret",
        SMTP_FROM: "no-reply@example.com"
      }),
      { origins: ["http://localhost:3000"] }
    );
  }
});
