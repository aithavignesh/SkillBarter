import test, { after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import PasswordResetToken from "../src/models/PasswordResetToken.js";
import EmailOtpChallenge from "../src/models/EmailOtpChallenge.js";
import { hashEmailOtp } from "../src/utils/emailOtp.js";
import { hashResetToken } from "../src/utils/security.js";
import app from "../src/app.js";

const originalFindOne = User.findOne;
const originalCreate = User.create;
const originalFindById = User.findById;
const originalFindByIdAndUpdate = User.findByIdAndUpdate;
const originalResetFindOneAndDelete = PasswordResetToken.findOneAndDelete;
const originalResetDeleteMany = PasswordResetToken.deleteMany;
const originalOtpFindOne = EmailOtpChallenge.findOne;
const originalOtpFindOneAndUpdate = EmailOtpChallenge.findOneAndUpdate;
const originalOtpUpdateOne = EmailOtpChallenge.updateOne;

let server;
let baseUrl;
const jwtSecret = "test-only-secret-that-is-at-least-thirty-two-characters-long";
process.env.JWT_SECRET = jwtSecret;

const sampleUser = {
  _id: "68f000000000000000000001",
  id: "68f000000000000000000001",
  fullName: "Test User",
  username: "test_user",
  email: "test@example.com",
  phone: "",
  avatarUrl: "",
  bio: "",
  headline: "",
  onboardingCompleted: false,
  isAdmin: false,
  isActive: true,
  tokenVersion: 0
};

server = app.listen(0);
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  User.findOne = originalFindOne;
  User.create = originalCreate;
  User.findById = originalFindById;
  User.findByIdAndUpdate = originalFindByIdAndUpdate;
  PasswordResetToken.findOneAndDelete = originalResetFindOneAndDelete;
  PasswordResetToken.deleteMany = originalResetDeleteMany;
  EmailOtpChallenge.findOne = originalOtpFindOne;
  EmailOtpChallenge.findOneAndUpdate = originalOtpFindOneAndUpdate;
  EmailOtpChallenge.updateOne = originalOtpUpdateOne;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function selectedQuery(value) {
  return { select: async () => value };
}

test("registration creates an account and returns a signed session token", async () => {
  User.findOne = () => selectedQuery(null);
  User.create = async (document) => ({ ...sampleUser, ...document, id: sampleUser.id, tokenVersion: 0 });

  const phone = "+919876543210";
  const phoneVerificationToken = jwt.sign(
    { purpose: "phone_registration", phone },
    jwtSecret,
    { expiresIn: "10m", issuer: "skillbarter-api", audience: "skillbarter-web" }
  );
  const response = await post("/api/auth/register", {
    fullName: " Test User ",
    username: "Test_User",
    email: "TEST@example.com",
    password: "long-enough-password",
    phone,
    phoneVerificationToken
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.user.username, "test_user");
  assert.equal(body.user.email, "test@example.com");
  assert.ok(body.token);
  const payload = jwt.verify(body.token, jwtSecret, { issuer: "skillbarter-api", audience: "skillbarter-web" });
  assert.equal(payload.sub, sampleUser.id);
  assert.equal(payload.tokenVersion, 0);
  assert.equal("passwordHash" in body.user, false);
});

test("registration returns conflict when email or username is already taken", async () => {
  User.findOne = () => selectedQuery({ email: "test@example.com", username: "test_user" });

  const phone = "+919876543210";
  const phoneVerificationToken = jwt.sign(
    { purpose: "phone_registration", phone },
    jwtSecret,
    { expiresIn: "10m", issuer: "skillbarter-api", audience: "skillbarter-web" }
  );
  const response = await post("/api/auth/register", {
    fullName: "Test User",
    username: "test_user",
    email: "test@example.com",
    password: "long-enough-password",
    phone,
    phoneVerificationToken
  });

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /email already exists/);
});

test("registration rejects a missing phone verification proof", async () => {
  const response = await post("/api/auth/register", {
    fullName: "Test User",
    username: "test_user",
    email: "test@example.com",
    password: "long-enough-password",
    phone: "+919876543210"
  });
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /Verify your mobile number/);
});

test("phone OTP request rejects malformed phone numbers before provider access", async () => {
  const response = await post("/api/auth/phone-otp/request", { phone: "not-a-phone", purpose: "login" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid mobile number/);
});

test("email OTP request rejects malformed and oversized addresses before database access", async () => {
  let databaseQueried = false;
  User.findOne = () => {
    databaseQueried = true;
    throw new Error("User lookup should not run for invalid email addresses.");
  };

  for (const email of ["not-an-email", `${"a".repeat(245)}@example.com`]) {
    const response = await post("/api/auth/otp/request", { email });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /valid email address/i);
  }
  assert.equal(databaseQueried, false);
});

test("email OTP request fails closed when mail delivery is not configured", async () => {
  const smtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"];
  const previousEnv = Object.fromEntries(smtpKeys.map((key) => [key, process.env[key]]));
  for (const key of smtpKeys) delete process.env[key];

  let databaseQueried = false;
  User.findOne = () => {
    databaseQueried = true;
    throw new Error("User lookup should not run when email delivery is unavailable.");
  };

  try {
    const response = await post("/api/auth/otp/request", { email: "test@example.com" });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /temporarily unavailable/i);
    assert.equal(databaseQueried, false);
  } finally {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("email OTP request uses a generic response when no active account matches", async () => {
  const smtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"];
  const previousEnv = Object.fromEntries(smtpKeys.map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries({
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "587",
    SMTP_USER: "test-user",
    SMTP_PASSWORD: "test-password",
    SMTP_FROM: "noreply@example.test"
  })) process.env[key] = value;

  User.findOne = () => selectedQuery(null);
  try {
    const response = await post("/api/auth/otp/request", { email: "unknown@example.com" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      message: "If an active account exists for that email, a sign-in code will be sent."
    });
  } finally {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("phone OTP verification rejects malformed codes before provider access", async () => {
  const response = await post("/api/auth/phone-otp/verify", { phone: "+919876543210", code: "123", purpose: "login" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /6-digit SMS code/);
});

test("login accepts the correct password and returns a signed token", async () => {
  const passwordHash = await bcrypt.hash("long-enough-password", 4);
  User.findOne = () => selectedQuery({ ...sampleUser, passwordHash });

  const response = await post("/api/auth/login", {
    email: " TEST@example.com ",
    password: "long-enough-password"
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.email, "test@example.com");
  assert.ok(body.token);
  assert.equal(jwt.verify(body.token, jwtSecret, { issuer: "skillbarter-api", audience: "skillbarter-web" }).sub, sampleUser.id);
});

test("login rejects oversized passwords before querying the database", async () => {
  let databaseQueried = false;
  User.findOne = () => {
    databaseQueried = true;
    return selectedQuery(null);
  };

  const response = await post("/api/auth/login", {
    email: "test@example.com",
    password: "x".repeat(129)
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /at most 128 characters/);
  assert.equal(databaseQueried, false);
});

test("login rejects an incorrect password", async () => {
  const passwordHash = await bcrypt.hash("different-password", 4);
  User.findOne = () => selectedQuery({ ...sampleUser, passwordHash });

  const response = await post("/api/auth/login", {
    email: "test@example.com",
    password: "wrong-password"
  });

  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /incorrect/);
});

test("login rejects inactive accounts", async () => {
  const passwordHash = await bcrypt.hash("long-enough-password", 4);
  User.findOne = () => selectedQuery({ ...sampleUser, isActive: false, passwordHash });

  const response = await post("/api/auth/login", {
    email: "test@example.com",
    password: "long-enough-password"
  });

  assert.equal(response.status, 401);
});

test("authentication rejects a JWT with a revoked token version", async () => {
  User.findById = () => ({
    select: async () => ({ ...sampleUser, tokenVersion: 2 })
  });
  const token = jwt.sign({ sub: sampleUser.id, tokenVersion: 1 }, jwtSecret, {
    expiresIn: "1h",
    issuer: "skillbarter-api",
    audience: "skillbarter-web"
  });

  const response = await fetch(`${baseUrl}/api/exchanges`, {
    headers: { authorization: `Bearer ${token}` }
  });

  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /revoked/);
});

test("email OTP verification issues a signed session and consumes the code once", async () => {
  const challenge = {
    _id: "68f000000000000000000099",
    codeHash: hashEmailOtp("test@example.com", "123456"),
    attempts: 0
  };
  EmailOtpChallenge.findOne = () => ({
    select() {
      return { sort: async () => challenge };
    }
  });
  EmailOtpChallenge.findOneAndUpdate = async (query, update, options) => {
    assert.equal(query._id, challenge._id);
    assert.deepEqual(update.$set.consumedAt instanceof Date, true);
    assert.equal(options.new, true);
    return { ...challenge, consumedAt: update.$set.consumedAt };
  };
  User.findOne = () => selectedQuery(sampleUser);

  const response = await post("/api/auth/otp/verify", { email: "TEST@example.com", code: "123456" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.email, "test@example.com");
  assert.ok(body.token);
  assert.equal(jwt.verify(body.token, jwtSecret, { issuer: "skillbarter-api", audience: "skillbarter-web" }).sub, sampleUser.id);
});

test("email OTP verification increments attempts for an incorrect code", async () => {
  const challenge = {
    _id: "68f000000000000000000098",
    codeHash: hashEmailOtp("test@example.com", "123456"),
    attempts: 0
  };
  let attemptUpdate;
  EmailOtpChallenge.findOne = () => ({
    select() {
      return { sort: async () => challenge };
    }
  });
  EmailOtpChallenge.updateOne = async (query, update) => {
    attemptUpdate = { query, update };
    return { modifiedCount: 1 };
  };

  const response = await post("/api/auth/otp/verify", { email: "test@example.com", code: "999999" });
  assert.equal(response.status, 401);
  assert.deepEqual(attemptUpdate.update.$inc, { attempts: 1 });
  assert.equal(attemptUpdate.query._id, challenge._id);
});

test("email OTP verification rejects malformed codes before database access", async () => {
  let queried = false;
  EmailOtpChallenge.findOne = () => {
    queried = true;
    throw new Error("OTP lookup should not run for malformed codes.");
  };
  const response = await post("/api/auth/otp/verify", { email: "test@example.com", code: "123" });
  assert.equal(response.status, 400);
  assert.equal(queried, false);
});

test("logout increments tokenVersion to revoke the active JWT", async () => {
  let updateCall;
  User.findById = () => ({ select: async () => ({ ...sampleUser, tokenVersion: 0 }) });
  User.findByIdAndUpdate = async (id, update, options) => {
    updateCall = { id, update, options };
    return { ...sampleUser, tokenVersion: 1 };
  };
  const token = jwt.sign({ sub: sampleUser.id, tokenVersion: 0 }, jwtSecret, {
    expiresIn: "1h",
    issuer: "skillbarter-api",
    audience: "skillbarter-web"
  });

  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(updateCall.id, sampleUser.id);
  assert.deepEqual(updateCall.update.$inc, { tokenVersion: 1 });
  assert.equal(updateCall.options.new, true);
});

test("password reset confirmation changes the password and increments tokenVersion", async () => {
  const rawToken = "a".repeat(64);
  let tokenQuery;
  let userUpdate;
  let cleanedUpUser;
  PasswordResetToken.findOneAndDelete = async (query) => {
    tokenQuery = query;
    return { user: sampleUser._id };
  };
  PasswordResetToken.deleteMany = async (query) => {
    cleanedUpUser = query.user;
    return { deletedCount: 1 };
  };
  User.findByIdAndUpdate = async (id, update, options) => {
    userUpdate = { id, update, options };
    return { ...sampleUser, tokenVersion: 1 };
  };

  const response = await post("/api/auth/password-reset/confirm", {
    token: rawToken,
    password: "new-long-password"
  });

  assert.equal(response.status, 200);
  assert.match((await response.json()).message, /Please sign in again/);
  assert.equal(tokenQuery.tokenHash, hashResetToken(rawToken));
  assert.notEqual(tokenQuery.tokenHash, rawToken);
  assert.deepEqual(userUpdate.update.$inc, { tokenVersion: 1 });
  assert.equal(userUpdate.id, sampleUser._id);
  assert.equal(userUpdate.options.new, true);
  assert.equal(userUpdate.options.runValidators, true);
  assert.equal(cleanedUpUser, sampleUser._id, "all remaining reset tokens for the account must be invalidated");
});


test("password reset rejects expired or already-consumed tokens", async () => {
  PasswordResetToken.findOneAndDelete = async (query) => {
    assert.match(query.tokenHash, /^[a-f0-9]{64}$/);
    assert.ok(query.expiresAt.$gt instanceof Date);
    return null;
  };

  const response = await post("/api/auth/password-reset/confirm", {
    token: "c".repeat(64),
    password: "another-long-password"
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /invalid or expired/);
});

test("password login rejects a phone number in the email field before database access", async () => {
  let databaseQueried = false;
  User.findOne = () => {
    databaseQueried = true;
    throw new Error("Database lookup must not run for a phone number supplied as email.");
  };

  const response = await post("/api/auth/login", {
    email: "+919876543210",
    password: "long-enough-password"
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /enter your email and password/i);
  assert.equal(databaseQueried, false);
});

test("password reset rejects malformed tokens and weak passwords before database access", async () => {
  let tokenLookupCalled = false;
  PasswordResetToken.findOneAndDelete = () => {
    tokenLookupCalled = true;
    throw new Error("Reset-token lookup must not run for invalid reset input.");
  };

  const invalidInputs = [
    { token: "not-a-token", password: "new-long-password" },
    { token: "d".repeat(64), password: "short" },
    { token: "d".repeat(64), password: "x".repeat(129) }
  ];

  for (const body of invalidInputs) {
    const response = await post("/api/auth/password-reset/confirm", body);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /valid reset token and a password/i);
  }
  assert.equal(tokenLookupCalled, false);
});

test("password reset request uses the same generic response for unknown accounts", async () => {
  const configKeys = [
    "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD",
    "SMTP_FROM", "PASSWORD_RESET_URL"
  ];
  const previousEnv = Object.fromEntries(configKeys.map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries({
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "587",
    SMTP_USER: "test-user",
    SMTP_PASSWORD: "test-password",
    SMTP_FROM: "noreply@example.test",
    PASSWORD_RESET_URL: "https://example.test/reset"
  })) process.env[key] = value;

  const originalTokenCreate = PasswordResetToken.create;
  let tokenCreated = false;
  User.findOne = () => selectedQuery(null);
  PasswordResetToken.create = async () => {
    tokenCreated = true;
    throw new Error("Unknown accounts must not receive reset-token records.");
  };

  try {
    const response = await post("/api/auth/password-reset/request", { email: "unknown@example.com" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      message: "If an account exists for that email, password reset instructions will be sent."
    });
    assert.equal(tokenCreated, false);
  } finally {
    PasswordResetToken.create = originalTokenCreate;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

