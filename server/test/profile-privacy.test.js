import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Block from "../src/models/Block.js";
import app from "../src/app.js";

const jwtSecret = "profile-privacy-tests-secret-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const requesterId = "68f000000000000000000011";
const profileId = "68f000000000000000000012";
const requester = {
  _id: requesterId, id: requesterId, email: "requester@example.com",
  username: "requester", fullName: "Requester", isAdmin: false, isActive: true,
  tokenVersion: 0, skillsToTeach: [], skillsToLearn: []
};
const profile = {
  _id: profileId, id: profileId, email: "profile@example.com",
  username: "profileuser", fullName: "Profile User", isActive: true,
  avatarUrl: "", bio: "", headline: "", skillsToTeach: [], skillsToLearn: [],
  onboardingCompleted: true, createdAt: new Date("2026-01-01T00:00:00.000Z")
};
const originalUserFindById = User.findById;
const originalBlockExists = Block.exists;
let server;
let baseUrl;

const token = jwt.sign({ sub: requesterId, tokenVersion: 0 }, jwtSecret, {
  expiresIn: "1h", issuer: "skillbarter-api", audience: "skillbarter-web"
});

server = app.listen(0);
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  User.findById = originalUserFindById;
  Block.exists = originalBlockExists;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function mockUserQueries() {
  User.findById = (id) => {
    if (String(id) === requesterId) return { select: async () => requester };
    if (String(id) === profileId) {
      const query = {
        populate() { return this; },
        then(resolve, reject) { return Promise.resolve(profile).then(resolve, reject); }
      };
      return query;
    }
    return { select: async () => null };
  };
}

async function getProfile() {
  return fetch(`${baseUrl}/api/users/${profileId}`, {
    headers: { authorization: `Bearer ${token}` }
  });
}

test("a profile is hidden when the requester blocked its owner", async () => {
  mockUserQueries();
  let query;
  Block.exists = async (filter) => { query = filter; return { _id: profileId }; };
  const response = await getProfile();
  assert.equal(response.status, 404);
  assert.deepEqual(query, {
    $or: [
      { blocker: requesterId, blocked: profileId },
      { blocker: profileId, blocked: requesterId }
    ]
  });
});

test("a profile is hidden when its owner blocked the requester", async () => {
  mockUserQueries();
  Block.exists = async () => true;
  const response = await getProfile();
  assert.equal(response.status, 404);
});

test("a profile remains visible when there is no block relationship", async () => {
  mockUserQueries();
  Block.exists = async () => null;
  const response = await getProfile();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.id, profileId);
  assert.equal(body.user.email, undefined);
  assert.equal(body.user.passwordHash, undefined);
});

test("an invalid profile ID is rejected before querying the target profile", async () => {
  mockUserQueries();
  let queriedTargetProfile = false;
  User.findById = (id) => {
    // Authentication must still load the requester account.
    if (String(id) === requesterId) return { select: async () => requester };
    queriedTargetProfile = true;
    throw new Error("invalid target profile should not be queried");
  };
  const response = await fetch(`${baseUrl}/api/users/not-an-object-id`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 400);
  assert.equal(queriedTargetProfile, false);
});
