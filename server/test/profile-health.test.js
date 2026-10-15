import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import app from "../src/app.js";

const jwtSecret = "health-profile-tests-secret-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const userId = "68f000000000000000000001";
const sampleUser = {
  _id: userId, id: userId, email: "user@example.com", username: "user",
  fullName: "User", isAdmin: false, isActive: true, onboardingCompleted: false,
  skillsToTeach: [], skillsToLearn: [], tokenVersion: 0, avatarUrl: ""
};
const originalFindById = User.findById;
const originalFindByIdAndUpdate = User.findByIdAndUpdate;
let server;
let baseUrl;

server = app.listen(0);
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  User.findById = originalFindById;
  User.findByIdAndUpdate = originalFindByIdAndUpdate;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const token = jwt.sign({ sub: userId, tokenVersion: 0 }, jwtSecret, {
  expiresIn: "1h", issuer: "skillbarter-api", audience: "skillbarter-web"
});

function authenticate() {
  User.findById = () => ({ select: async () => sampleUser });
}

async function patchProfile(body) {
  return fetch(`${baseUrl}/api/users/me`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("health endpoint responds without authentication and reports service status", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.service, "skillbarter-api");
  assert.ok(["connected", "disconnected"].includes(body.database));
  assert.ok(Number.isFinite(Date.parse(body.timestamp)));
});

test("profile update rejects an invalid display name", async () => {
  authenticate();
  const response = await patchProfile({ fullName: "x" });
  assert.equal(response.status, 400);
});

test("profile update rejects non-string text fields", async () => {
  authenticate();
  for (const body of [{ fullName: 123 }, { bio: 123 }, { headline: false }]) {
    const response = await patchProfile(body);
    assert.equal(response.status, 400);
  }
});

test("profile update rejects oversized biography and headline", async () => {
  authenticate();
  const bio = await patchProfile({ bio: "x".repeat(1001) });
  assert.equal(bio.status, 400);
  const headline = await patchProfile({ headline: "x".repeat(161) });
  assert.equal(headline.status, 400);
});

test("profile update rejects malformed skill selections", async () => {
  authenticate();
  for (const skillsToTeach of [["not-a-valid-object-id"], "", null, {}]) {
    const response = await patchProfile({ skillsToTeach });
    assert.equal(response.status, 400);
  }
});

test("profile update cannot mark onboarding complete without teaching and learning skills", async () => {
  authenticate();
  let calls = 0;
  User.findById = () => ({ select: async () => {
    calls += 1;
    return calls === 1 ? sampleUser : { skillsToTeach: [], skillsToLearn: [] };
  } });
  const response = await patchProfile({ onboardingCompleted: true });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /at least one skill/);
});

test("profile update rejects unsafe avatar URL protocols", async () => {
  authenticate();
  const response = await patchProfile({ avatarUrl: "javascript:alert(1)" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /HTTP or HTTPS/);
});

test("profile update rejects malformed and oversized avatar URLs", async () => {
  authenticate();
  const malformed = await patchProfile({ avatarUrl: "not a URL" });
  assert.equal(malformed.status, 400);
  const oversized = await patchProfile({ avatarUrl: "https://example.com/" + "x".repeat(2048) });
  assert.equal(oversized.status, 400);
});
