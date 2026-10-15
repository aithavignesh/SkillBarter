import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import app from "../src/app.js";

const jwtSecret = "health-profile-tests-secret-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const userId = "68f000000000000000000001";
const sampleUser = {
  _id: userId, id: userId, email: "user@example.com", username: "user",
  fullName: "User", isAdmin: false, isActive: true, onboardingCompleted: false,
  skillsToTeach: [], skillsToLearn: [], tokenVersion: 0
};
const originalFindById = User.findById;
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

test("profile update rejects oversized biography and headline", async () => {
  authenticate();
  const bio = await patchProfile({ bio: "x".repeat(1001) });
  assert.equal(bio.status, 400);
  const headline = await patchProfile({ headline: "x".repeat(161) });
  assert.equal(headline.status, 400);
});

test("profile update rejects malformed skill IDs", async () => {
  authenticate();
  const response = await patchProfile({ skillsToTeach: ["not-a-valid-object-id"] });
  assert.equal(response.status, 400);
});

test("profile update cannot mark onboarding complete without teaching and learning skills", async () => {
  authenticate();
  User.findById = () => ({ select: async () => ({ skillsToTeach: [], skillsToLearn: [] }) });
  const response = await patchProfile({ onboardingCompleted: true });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /at least one skill/);
});
