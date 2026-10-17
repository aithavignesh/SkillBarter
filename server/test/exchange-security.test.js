import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Exchange from "../src/models/Exchange.js";
import Block from "../src/models/Block.js";
import app from "../src/app.js";

const jwtSecret = "exchange-tests-only-secret-that-is-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;

const userId = "68f000000000000000000001";
const otherUserId = "68f000000000000000000002";
const exchangeId = "68f000000000000000000003";
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
const originalExchangeFindById = Exchange.findById;
const originalBlockExists = Block.exists;

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
  Exchange.findById = originalExchangeFindById;
  Block.exists = originalBlockExists;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function mockAuthenticatedUser() {
  User.findById = () => ({ select: async () => sampleUser });
}

function fakeExchange(status = "accepted") {
  return {
    _id: exchangeId,
    requester: userId,
    recipient: otherUserId,
    status,
    scheduledAt: null,
    completedByRequester: false,
    completedByRecipient: false,
    save: async () => {},
    populate: async () => {}
  };
}

async function updateStatus(body) {
  return fetch(`${baseUrl}/api/exchanges/${exchangeId}/status`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
}

test("the requester cannot accept or decline their own pending exchange", async () => {
  mockAuthenticatedUser();
  Exchange.findById = async () => fakeExchange("pending");
  Block.exists = async () => false;

  for (const status of ["accepted", "declined"]) {
    const response = await updateStatus({ status });
    assert.equal(response.status, 403, `requester must not set status to ${status}`);
    assert.match((await response.json()).error, /only the recipient/i);
  }
});

test("an exchange cannot jump directly from pending to active", async () => {
  mockAuthenticatedUser();
  Exchange.findById = async () => fakeExchange("pending");
  Block.exists = async () => false;

  const response = await updateStatus({ status: "active" });

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /only accepted or scheduled/i);
});

test("an accepted exchange cannot be activated after either participant blocks the other", async () => {
  mockAuthenticatedUser();
  Exchange.findById = async () => fakeExchange("accepted");
  let observedQuery;
  Block.exists = async (query) => {
    observedQuery = query;
    return true;
  };

  const response = await updateStatus({ status: "active" });

  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /participant has blocked the other/);
  assert.equal(observedQuery.$or.length, 2);
});

test("a scheduled exchange cannot be activated after a block is created", async () => {
  mockAuthenticatedUser();
  Exchange.findById = async () => fakeExchange("scheduled");
  Block.exists = async () => true;

  const response = await updateStatus({ status: "active" });

  assert.equal(response.status, 403);
});

test("an accepted exchange cannot be scheduled for a past date", async () => {
  mockAuthenticatedUser();
  Exchange.findById = async () => fakeExchange("accepted");
  let blockLookupCalled = false;
  Block.exists = async () => {
    blockLookupCalled = true;
    return false;
  };

  const response = await updateStatus({ status: "scheduled", scheduledAt: "2020-01-01T00:00:00.000Z" });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /future date/);
  assert.equal(blockLookupCalled, false);
});

test("a block created after acceptance prevents scheduling", async () => {
  mockAuthenticatedUser();
  Exchange.findById = async () => fakeExchange("accepted");
  Block.exists = async () => true;

  const response = await updateStatus({
    status: "scheduled",
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });

  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /cannot be scheduled/);
});
