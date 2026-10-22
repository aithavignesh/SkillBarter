import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Block from "../src/models/Block.js";
import app from "../src/app.js";

const jwtSecret = "block-tests-only-secret-that-is-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const userId = "68f000000000000000000001";
const otherUserId = "68f000000000000000000002";
const sampleUser = {
  _id: userId,
  id: userId,
  email: "requester@example.com",
  username: "requester",
  fullName: "Requester",
  isAdmin: false,
  isActive: true,
  onboardingCompleted: true,
  skillsToTeach: [],
  skillsToLearn: [],
  tokenVersion: 0
};

const originalUserFindById = User.findById;
const originalUserFindOne = User.findOne;
const originalBlockCreate = Block.create;
const originalBlockFind = Block.find;
const originalBlockFindOneAndDelete = Block.findOneAndDelete;
let server;
let baseUrl;

const token = jwt.sign({ sub: userId, tokenVersion: 0 }, jwtSecret, {
  expiresIn: "1h",
  issuer: "skillbarter-api",
  audience: "skillbarter-web"
});

server = app.listen(0);
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  User.findById = originalUserFindById;
  User.findOne = originalUserFindOne;
  Block.create = originalBlockCreate;
  Block.find = originalBlockFind;
  Block.findOneAndDelete = originalBlockFindOneAndDelete;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function mockAuthenticatedUser() {
  User.findById = () => ({ select: async () => sampleUser });
}

async function request(method, path) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}` }
  });
}

test("block listing is scoped to the current user", async () => {
  mockAuthenticatedUser();
  let query;
  Block.find = (filter) => {
    query = filter;
    return {
      populate() {
        return {
          sort: async () => [{ blocker: userId, blocked: otherUserId }]
        };
      }
    };
  };

  const response = await request("GET", "/api/blocks");

  assert.equal(response.status, 200);
  assert.deepEqual(query, { blocker: userId });
  assert.equal((await response.json()).blocks.length, 1);
});


test("block and unblock reject malformed user IDs before storage access", async () => {
  mockAuthenticatedUser();
  let userLookupCalled = false;
  let deleteLookupCalled = false;
  User.findOne = () => {
    userLookupCalled = true;
    throw new Error("User lookup must not run for malformed IDs");
  };
  Block.findOneAndDelete = async () => {
    deleteLookupCalled = true;
    throw new Error("Block deletion must not run for malformed IDs");
  };

  const blocked = await request("POST", "/api/blocks/not-an-id");
  const unblocked = await request("DELETE", "/api/blocks/not-an-id");

  assert.equal(blocked.status, 400);
  assert.equal(unblocked.status, 400);
  assert.equal(userLookupCalled, false);
  assert.equal(deleteLookupCalled, false);
});

test("a user cannot block their own account", async () => {
  mockAuthenticatedUser();
  const response = await request("POST", `/api/blocks/${userId}`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /own account/);
});

test("blocking a nonexistent or inactive account returns not found", async () => {
  mockAuthenticatedUser();
  User.findOne = () => ({ select: async () => null });
  const response = await request("POST", `/api/blocks/${otherUserId}`);
  assert.equal(response.status, 404);
});

test("blocking a valid account creates a block record", async () => {
  mockAuthenticatedUser();
  User.findOne = () => ({ select: async () => ({ _id: otherUserId }) });
  let created;
  Block.create = async (record) => {
    created = record;
    return { _id: "68f000000000000000000004", ...record };
  };

  const response = await request("POST", `/api/blocks/${otherUserId}`);
  assert.equal(response.status, 201);
  assert.equal(String(created.blocker), userId);
  assert.equal(String(created.blocked), otherUserId);
});

test("blocking an already blocked account returns conflict", async () => {
  mockAuthenticatedUser();
  User.findOne = () => ({ select: async () => ({ _id: otherUserId }) });
  Block.create = async () => {
    const error = new Error("duplicate");
    error.code = 11000;
    throw error;
  };

  const response = await request("POST", `/api/blocks/${otherUserId}`);
  assert.equal(response.status, 409);
});

test("unblocking only removes the current user's block relationship", async () => {
  mockAuthenticatedUser();
  let query;
  Block.findOneAndDelete = async (filter) => {
    query = filter;
    return { _id: "68f000000000000000000004" };
  };

  const response = await request("DELETE", `/api/blocks/${otherUserId}`);
  assert.equal(response.status, 200);
  assert.deepEqual(query, { blocker: userId, blocked: otherUserId });
});

test("unblocking a relationship that does not exist returns not found", async () => {
  mockAuthenticatedUser();
  Block.findOneAndDelete = async () => null;
  const response = await request("DELETE", `/api/blocks/${otherUserId}`);
  assert.equal(response.status, 404);
});
