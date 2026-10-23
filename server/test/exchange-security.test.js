import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Exchange from "../src/models/Exchange.js";
import Block from "../src/models/Block.js";
import Notification from "../src/models/Notification.js";
import app from "../src/app.js";

const jwtSecret = "exchange-tests-only-secret-that-is-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;

const userId = "68f000000000000000000001";
const otherUserId = "68f000000000000000000002";
const exchangeId = "68f000000000000000000003";
const outsiderId = "68f000000000000000000004";
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
const originalExchangeFindById = Exchange.findById;
const originalBlockExists = Block.exists;
const originalNotificationCreate = Notification.create;

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
  Exchange.findById = originalExchangeFindById;
  Block.exists = originalBlockExists;
  Notification.create = originalNotificationCreate;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function mockAuthenticatedUser(currentUser = sampleUser) {
  User.findById = () => ({ select: async () => currentUser });
}

function tokenFor(id) {
  return jwt.sign({ sub: id, tokenVersion: 0 }, jwtSecret, {
    expiresIn: "1h",
    issuer: "skillbarter-api",
    audience: "skillbarter-web"
  });
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

async function updateStatus(body, authToken = token) {
  return fetch(`${baseUrl}/api/exchanges/${exchangeId}/status`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify(body)
  });
}

test("the first completion confirmation notifies the other participant", async () => {
  mockAuthenticatedUser();
  const exchange = fakeExchange("active");
  Exchange.findById = async () => exchange;
  let notification;
  Notification.create = async (payload) => {
    notification = payload;
    return payload;
  };

  const response = await updateStatus({ status: "completed" });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.awaitingOtherParticipant, true);
  assert.equal(exchange.completedByRequester, true);
  assert.equal(exchange.status, "active");
  assert.equal(String(notification.recipient), otherUserId);
  assert.equal(String(notification.actor), userId);
  assert.match(notification.title, /confirmation needed/i);
});

test("repeated completion confirmation does not send duplicate notifications", async () => {
  mockAuthenticatedUser();
  const exchange = fakeExchange("active");
  exchange.completedByRequester = true;
  Exchange.findById = async () => exchange;
  let notificationCount = 0;
  Notification.create = async (payload) => {
    notificationCount += 1;
    return payload;
  };

  const response = await updateStatus({ status: "completed" });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.awaitingOtherParticipant, true);
  assert.equal(exchange.completedByRequester, true);
  assert.equal(exchange.completedByRecipient, false);
  assert.equal(notificationCount, 0);
});

test("the second participant completes the exchange after confirming", async () => {
  const recipientUser = { ...sampleUser, _id: otherUserId, id: otherUserId, fullName: "Recipient" };
  mockAuthenticatedUser(recipientUser);
  const exchange = fakeExchange("active");
  exchange.completedByRequester = true;
  Exchange.findById = async () => exchange;
  let notification;
  Notification.create = async (payload) => {
    notification = payload;
    return payload;
  };

  const response = await updateStatus({ status: "completed" }, tokenFor(otherUserId));

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.awaitingOtherParticipant, undefined);
  assert.equal(exchange.completedByRequester, true);
  assert.equal(exchange.completedByRecipient, true);
  assert.equal(exchange.status, "completed");
  assert.equal(String(notification.recipient), userId);
  assert.equal(String(notification.actor), otherUserId);
});

test("a non-participant cannot change an exchange status", async () => {
  const outsider = { ...sampleUser, _id: outsiderId, id: outsiderId };
  mockAuthenticatedUser(outsider);
  Exchange.findById = async () => fakeExchange("accepted");

  const response = await updateStatus({ status: "active" }, tokenFor(outsiderId));

  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /not a participant/i);
});

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

test("exchange status rejects malformed IDs before database lookup", async () => {
  mockAuthenticatedUser();
  let lookupCalled = false;
  Exchange.findById = () => {
    lookupCalled = true;
    throw new Error("Exchange lookup must not run for malformed IDs");
  };

  const response = await fetch(`${baseUrl}/api/exchanges/not-an-id/status`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status: "accepted" })
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /invalid exchange id/i);
  assert.equal(lookupCalled, false);
});

test("exchange status rejects unsupported transitions before database lookup", async () => {
  mockAuthenticatedUser();
  let lookupCalled = false;
  Exchange.findById = () => {
    lookupCalled = true;
    throw new Error("Exchange lookup must not run for unsupported statuses");
  };

  const response = await updateStatus({ status: "admin_override" });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /unsupported exchange status/i);
  assert.equal(lookupCalled, false);
});

test("an accepted exchange cannot be scheduled more than 180 days ahead", async () => {
  mockAuthenticatedUser();
  const exchange = fakeExchange("accepted");
  let saveCalled = false;
  exchange.save = async () => { saveCalled = true; };
  Exchange.findById = async () => exchange;
  let blockLookupCalled = false;
  Block.exists = async () => {
    blockLookupCalled = true;
    return false;
  };

  const response = await updateStatus({
    status: "scheduled",
    scheduledAt: new Date(Date.now() + 181 * 24 * 60 * 60 * 1000).toISOString()
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /180 days/i);
  assert.equal(blockLookupCalled, false);
  assert.equal(saveCalled, false);
  assert.equal(exchange.status, "accepted");
});

test("an accepted exchange rejects an invalid scheduling date before block lookup", async () => {
  mockAuthenticatedUser();
  const exchange = fakeExchange("accepted");
  let saveCalled = false;
  exchange.save = async () => { saveCalled = true; };
  Exchange.findById = async () => exchange;
  let blockLookupCalled = false;
  Block.exists = async () => {
    blockLookupCalled = true;
    return false;
  };

  const response = await updateStatus({ status: "scheduled", scheduledAt: "not-a-date" });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /future date and time/i);
  assert.equal(blockLookupCalled, false);
  assert.equal(saveCalled, false);
  assert.equal(exchange.status, "accepted");
});

test("exchange requests reject self-targeting before database lookups", async () => {
  mockAuthenticatedUser();
  let recipientLookupCalled = false;
  User.findOne = () => {
    recipientLookupCalled = true;
    throw new Error("Self-exchange requests must be rejected before recipient lookup");
  };
  let blockLookupCalled = false;
  Block.exists = async () => {
    blockLookupCalled = true;
    throw new Error("Self-exchange requests must be rejected before block lookup");
  };

  const response = await fetch(`${baseUrl}/api/exchanges`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      recipientId: userId,
      skillOfferedId: "68f000000000000000000005",
      skillRequestedId: "68f000000000000000000006"
    })
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /cannot request an exchange with yourself/i);
  assert.equal(recipientLookupCalled, false);
  assert.equal(blockLookupCalled, false);
});

test("exchange requests reject oversized messages before skill lookups", async () => {
  mockAuthenticatedUser();
  let recipientLookupCalled = false;
  User.findOne = () => {
    recipientLookupCalled = true;
    throw new Error("Oversized exchange messages must be rejected before recipient lookup");
  };
  let blockLookupCalled = false;
  Block.exists = async () => {
    blockLookupCalled = true;
    throw new Error("Oversized exchange messages must be rejected before block lookup");
  };

  const response = await fetch(`${baseUrl}/api/exchanges`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      recipientId: otherUserId,
      skillOfferedId: "68f000000000000000000005",
      skillRequestedId: "68f000000000000000000006",
      message: "x".repeat(2001)
    })
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /2000 characters or fewer/i);
  assert.equal(recipientLookupCalled, false);
  assert.equal(blockLookupCalled, false);
});

test("exchange requests reject malformed IDs before database lookups", async () => {
  mockAuthenticatedUser();
  let recipientLookupCalled = false;
  let blockLookupCalled = false;
  User.findOne = () => {
    recipientLookupCalled = true;
    throw new Error("Malformed exchange IDs must be rejected before recipient lookup");
  };
  Block.exists = async () => {
    blockLookupCalled = true;
    throw new Error("Malformed exchange IDs must be rejected before block lookup");
  };

  const response = await fetch(`${baseUrl}/api/exchanges`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      recipientId: "not-an-object-id",
      skillOfferedId: "68f000000000000000000005",
      skillRequestedId: "68f000000000000000000006",
      message: "Please exchange skills with me."
    })
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /IDs are required/i);
  assert.equal(recipientLookupCalled, false);
  assert.equal(blockLookupCalled, false);
});

test("exchange requests reject non-string messages before database lookups", async () => {
  mockAuthenticatedUser();
  let recipientLookupCalled = false;
  let blockLookupCalled = false;
  User.findOne = () => {
    recipientLookupCalled = true;
    throw new Error("Non-string messages must be rejected before recipient lookup");
  };
  Block.exists = async () => {
    blockLookupCalled = true;
    throw new Error("Non-string messages must be rejected before block lookup");
  };

  const response = await fetch(`${baseUrl}/api/exchanges`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      recipientId: otherUserId,
      skillOfferedId: "68f000000000000000000005",
      skillRequestedId: "68f000000000000000000006",
      message: { unexpected: "object" }
    })
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /2000 characters or fewer/i);
  assert.equal(recipientLookupCalled, false);
  assert.equal(blockLookupCalled, false);
});

