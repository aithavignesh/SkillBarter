import test, { after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import PasswordResetToken from "../src/models/PasswordResetToken.js";
import { hashResetToken } from "../src/utils/security.js";
import app from "../src/app.js";

const originalFindOne = User.findOne;
const originalCreate = User.create;
const originalFindById = User.findById;
const originalFindByIdAndUpdate = User.findByIdAndUpdate;
const originalResetFindOneAndDelete = PasswordResetToken.findOneAndDelete;
const originalResetDeleteMany = PasswordResetToken.deleteMany;

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

  const response = await post("/api/auth/register", {
    fullName: " Test User ",
    username: "Test_User",
    email: "TEST@example.com",
    password: "long-enough-password"
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

  const response = await post("/api/auth/register", {
    fullName: "Test User",
    username: "test_user",
    email: "test@example.com",
    password: "long-enough-password"
  });

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /email already exists/);
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

test("password reset confirmation changes the password and increments tokenVersion", async () => {
  const rawToken = "a".repeat(64);
  let tokenQuery;
  let userUpdate;
  PasswordResetToken.findOneAndDelete = async (query) => {
    tokenQuery = query;
    return { user: sampleUser._id };
  };
  PasswordResetToken.deleteMany = async () => ({ deletedCount: 0 });
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
