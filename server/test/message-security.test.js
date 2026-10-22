import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Exchange from "../src/models/Exchange.js";
import Message from "../src/models/Message.js";
import Block from "../src/models/Block.js";
import app from "../src/app.js";

const jwtSecret = "message-tests-only-secret-that-is-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;

const userId = "68f100000000000000000001";
const recipientId = "68f100000000000000000002";
const outsiderId = "68f100000000000000000003";
const exchangeId = "68f100000000000000000004";
const sampleUser = {
  _id: userId, id: userId, email: "sender@example.com", username: "sender",
  fullName: "Sender", isAdmin: false, isActive: true, tokenVersion: 0
};

const originals = {
  userFindById: User.findById,
  exchangeFindById: Exchange.findById,
  blockExists: Block.exists,
  messageCreate: Message.create,
  messageFind: Message.find,
  messageFindOneAndUpdate: Message.findOneAndUpdate
};
let server;
let baseUrl;

server = app.listen(0);
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  User.findById = originals.userFindById;
  Exchange.findById = originals.exchangeFindById;
  Block.exists = originals.blockExists;
  Message.create = originals.messageCreate;
  Message.find = originals.messageFind;
  Message.findOneAndUpdate = originals.messageFindOneAndUpdate;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function tokenFor(id = userId) {
  return jwt.sign({ sub: id, tokenVersion: 0 }, jwtSecret, {
    expiresIn: "1h", issuer: "skillbarter-api", audience: "skillbarter-web"
  });
}

function mockAuthenticatedUser(currentUser = sampleUser) {
  User.findById = () => ({ select: async () => currentUser });
}

function mockExchange(status = "active") {
  return {
    _id: exchangeId,
    requester: userId,
    recipient: recipientId,
    status,
    select: async () => ({
      _id: exchangeId, requester: userId, recipient: recipientId, status
    })
  };
}


test("message endpoints reject malformed IDs before database access", async () => {
  mockAuthenticatedUser();
  let exchangeLookupCalled = false;
  let messageUpdateCalled = false;
  Exchange.findById = () => {
    exchangeLookupCalled = true;
    throw new Error("Exchange lookup must not run for malformed IDs");
  };
  Message.findOneAndUpdate = () => {
    messageUpdateCalled = true;
    throw new Error("Message update must not run for malformed IDs");
  };

  const historyResponse = await fetch(`${baseUrl}/api/messages/exchange/not-an-id`, {
    headers: { authorization: `Bearer ${tokenFor()}` }
  });
  const readResponse = await fetch(`${baseUrl}/api/messages/not-an-id/read`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${tokenFor()}` }
  });

  assert.equal(historyResponse.status, 400);
  assert.equal(readResponse.status, 400);
  assert.equal(exchangeLookupCalled, false);
  assert.equal(messageUpdateCalled, false);
});


test("message read updates are scoped to the authenticated recipient", async () => {
  mockAuthenticatedUser();
  let query;
  let update;
  Message.findOneAndUpdate = async (filter, change) => {
    query = filter;
    update = change;
    return null;
  };

  const response = await fetch(`${baseUrl}/api/messages/${exchangeId}/read`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${tokenFor()}` }
  });

  assert.equal(response.status, 404);
  assert.deepEqual(query, { _id: exchangeId, recipient: userId, readAt: null });
  assert.ok(update.$set.readAt instanceof Date);
});

test("a non-participant cannot read exchange messages", async () => {
  mockAuthenticatedUser({ ...sampleUser, _id: outsiderId, id: outsiderId });
  Exchange.findById = () => ({
    select: async () => ({ requester: userId, recipient: recipientId })
  });

  const response = await fetch(`${baseUrl}/api/messages/exchange/${exchangeId}`, {
    headers: { authorization: `Bearer ${tokenFor(outsiderId)}` }
  });

  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /only exchange participants/i);
});

test("a block prevents participants from reading message history", async () => {
  mockAuthenticatedUser();
  Exchange.findById = () => ({
    select: async () => ({ requester: userId, recipient: recipientId })
  });
  Block.exists = async () => true;
  let messageQueryCalled = false;
  Message.find = () => {
    messageQueryCalled = true;
    throw new Error("Message.find must not be called when participants are blocked");
  };

  const response = await fetch(`${baseUrl}/api/messages/exchange/${exchangeId}`, {
    headers: { authorization: `Bearer ${tokenFor()}` }
  });

  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /blocked the other/i);
  assert.equal(messageQueryCalled, false);
});

test("messages cannot be sent after an exchange is cancelled or declined", async () => {
  mockAuthenticatedUser();
  let createCalled = false;
  Message.create = async () => {
    createCalled = true;
    throw new Error("Message.create must not be called for a closed exchange");
  };
  Block.exists = async () => false;

  for (const status of ["cancelled", "declined"]) {
    Exchange.findById = () => mockExchange(status);
    const response = await fetch(`${baseUrl}/api/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${tokenFor()}`
      },
      body: JSON.stringify({ exchangeId, body: "A follow-up message" })
    });
    assert.equal(response.status, 409, `messaging should be disabled for ${status} exchanges`);
    assert.match((await response.json()).error, /messaging is disabled/i);
  }
  assert.equal(createCalled, false);
});

test("a block prevents a participant from sending a message", async () => {
  mockAuthenticatedUser();
  Exchange.findById = () => mockExchange("active");
  Block.exists = async () => true;
  let createCalled = false;
  Message.create = async () => {
    createCalled = true;
    throw new Error("Message.create must not be called for blocked participants");
  };

  const response = await fetch(`${baseUrl}/api/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${tokenFor()}`
    },
    body: JSON.stringify({ exchangeId, body: "Hello there" })
  });

  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /blocked the other/i);
  assert.equal(createCalled, false);
});

test("an outsider cannot send a message to an exchange", async () => {
  mockAuthenticatedUser({ ...sampleUser, _id: outsiderId, id: outsiderId });
  Exchange.findById = () => mockExchange("active");
  let blockLookupCalled = false;
  Block.exists = async () => {
    blockLookupCalled = true;
    return false;
  };
  let createCalled = false;
  Message.create = async () => {
    createCalled = true;
    throw new Error("Message.create must not be called for outsiders");
  };

  const response = await fetch(`${baseUrl}/api/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${tokenFor(outsiderId)}`
    },
    body: JSON.stringify({ exchangeId, body: "Hello there" })
  });

  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /only exchange participants/i);
  assert.equal(blockLookupCalled, false);
  assert.equal(createCalled, false);
});
