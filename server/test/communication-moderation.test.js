import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Exchange from "../src/models/Exchange.js";
import Block from "../src/models/Block.js";
import Message from "../src/models/Message.js";
import Report from "../src/models/Report.js";
import Review from "../src/models/Review.js";
import app from "../src/app.js";

const jwtSecret = "route-security-tests-secret-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const userId = "68f000000000000000000001";
const otherUserId = "68f000000000000000000002";
const exchangeId = "68f000000000000000000003";
const sampleUser = {
  _id: userId, id: userId, email: "requester@example.com", username: "requester",
  fullName: "Requester", isAdmin: false, isActive: true, onboardingCompleted: true,
  skillsToTeach: [], skillsToLearn: [], tokenVersion: 0
};

const originals = {
  userFindById: User.findById,
  userFindByIdForReport: User.findById,
  userFindByIdAndUpdate: User.findByIdAndUpdate,
  exchangeFindById: Exchange.findById,
  blockExists: Block.exists,
  messageCreate: Message.create,
  messageFindOneAndUpdate: Message.findOneAndUpdate,
  reportCreate: Report.create,
  reviewFind: Review.find,
  reviewCreate: Review.create,
  reviewAggregate: Review.aggregate,
  notificationCreate: (await import("../src/models/Notification.js")).default.create
};
let server;
let baseUrl;
const token = jwt.sign({ sub: userId, tokenVersion: 0 }, jwtSecret, {
  expiresIn: "1h", issuer: "skillbarter-api", audience: "skillbarter-web"
});

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
  Message.findOneAndUpdate = originals.messageFindOneAndUpdate;
  Report.create = originals.reportCreate;
  Review.find = originals.reviewFind;
  Review.create = originals.reviewCreate;
  Review.aggregate = originals.reviewAggregate;
  User.findByIdAndUpdate = originals.userFindByIdAndUpdate;
  const Notification = (await import("../src/models/Notification.js")).default;
  Notification.create = originals.notificationCreate;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function authenticate() {
  User.findById = () => ({ select: async () => sampleUser });
}

async function request(method, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

test("message creation rejects a missing or malformed exchange ID", async () => {
  authenticate();
  const response = await request("POST", "/api/messages", { exchangeId: "bad-id", body: "hello" });
  assert.equal(response.status, 400);
});

test("message creation rejects blank and oversized message bodies", async () => {
  authenticate();
  const blank = await request("POST", "/api/messages", { exchangeId, body: "   " });
  assert.equal(blank.status, 400);
  const long = await request("POST", "/api/messages", { exchangeId, body: "x".repeat(5001) });
  assert.equal(long.status, 400);
  const padded = await request("POST", "/api/messages", { exchangeId, body: `${" ".repeat(5001)}a` });
  assert.equal(padded.status, 400, "oversized raw bodies must be rejected even when trimming makes them short");
});

test("message creation rejects a user who is not an exchange participant", async () => {
  authenticate();
  Exchange.findById = () => ({ select: async () => ({ requester: otherUserId, recipient: "68f000000000000000000005", status: "active" }) });
  const response = await request("POST", "/api/messages", { exchangeId, body: "hello" });
  assert.equal(response.status, 403);
});

test("message creation is blocked when the exchange participants have blocked each other", async () => {
  authenticate();
  Exchange.findById = () => ({ select: async () => ({ requester: userId, recipient: otherUserId, status: "active" }) });
  Block.exists = async () => true;
  const response = await request("POST", "/api/messages", { exchangeId, body: "hello" });
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /blocked/);
});

test("message read receipts are limited to the intended recipient", async () => {
  authenticate();
  let filter;
  Message.findOneAndUpdate = async (query) => {
    filter = query;
    return null;
  };
  const invalidId = await request("PATCH", "/api/messages/not-an-id/read");
  assert.equal(invalidId.status, 400);
  const response = await request("PATCH", "/api/messages/68f000000000000000000006/read");
  assert.equal(response.status, 404);
  assert.equal(String(filter.recipient), userId);
  assert.equal(filter.readAt, null, "only unread messages should be marked as read");
});

test("report creation rejects self-reporting and invalid reasons", async () => {
  authenticate();
  const self = await request("POST", "/api/reports", { targetType: "user", targetId: userId, reason: "abuse" });
  assert.equal(self.status, 400);
  const invalidReason = await request("POST", "/api/reports", { targetType: "user", targetId: otherUserId, reason: "x" });
  assert.equal(invalidReason.status, 400);
  const paddedReason = await request("POST", "/api/reports", {
    targetType: "user", targetId: otherUserId, reason: `${" ".repeat(121)}abc`
  });
  assert.equal(paddedReason.status, 400, "oversized raw report reasons must be rejected even when trimming makes them short");
});

test("reporting an exchange is limited to its participants", async () => {
  authenticate();
  Exchange.findById = () => ({ select: async () => ({ _id: exchangeId, requester: otherUserId, recipient: "68f000000000000000000005" }) });
  const response = await request("POST", "/api/reports", { targetType: "exchange", targetId: exchangeId, reason: "Harassment" });
  assert.equal(response.status, 403);
});

test("review listing scopes by reviewee and caps results at 100", async () => {
  authenticate();
  let query;
  let requestedLimit;
  Review.find = (filter) => {
    query = filter;
    return {
      populate() {
        return {
          sort() {
            return {
              limit: async (limit) => {
                requestedLimit = limit;
                return [{ reviewee: otherUserId, rating: 5 }];
              }
            };
          }
        };
      }
    };
  };

  const response = await request("GET", `/api/reviews/user/${otherUserId}`);

  assert.equal(response.status, 200);
  assert.deepEqual(query, { reviewee: otherUserId });
  assert.equal(requestedLimit, 100);
  assert.equal((await response.json()).reviews.length, 1);
});

test("review listing rejects malformed user IDs before querying storage", async () => {
  authenticate();
  let findCalled = false;
  Review.find = () => {
    findCalled = true;
    throw new Error("Review query must not run for a malformed user ID.");
  };

  const response = await request("GET", "/api/reviews/user/not-an-id");

  assert.equal(response.status, 400);
  assert.equal(findCalled, false);
});

test("review creation rejects invalid ratings and incomplete exchanges", async () => {
  authenticate();
  const invalidRating = await request("POST", "/api/reviews", { exchangeId, rating: 6 });
  assert.equal(invalidRating.status, 400);
  Exchange.findById = async () => ({
    status: "completed", completedByRequester: true, completedByRecipient: false,
    requester: userId, recipient: otherUserId
  });
  const incomplete = await request("POST", "/api/reviews", { exchangeId, rating: 5, comment: "Great" });
  assert.equal(incomplete.status, 409);
});

test("successful reviews update the reviewee trust score and review count", async () => {
  authenticate();
  const Notification = (await import("../src/models/Notification.js")).default;
  Exchange.findById = async () => ({
    _id: exchangeId, status: "completed", completedByRequester: true, completedByRecipient: true,
    requester: userId, recipient: otherUserId
  });
  Review.create = async (value) => ({ _id: "68f000000000000000000007", ...value, populate: async () => {} });
  Review.aggregate = async () => [{ averageRating: 4.5, count: 2 }];
  Notification.create = async () => ({});
  let update;
  User.findByIdAndUpdate = async (id, changes, options) => {
    update = { id: String(id), changes, options };
    return {};
  };

  const response = await request("POST", "/api/reviews", { exchangeId, rating: 5, comment: "Great exchange" });
  assert.equal(response.status, 201);
  assert.equal(update.id, otherUserId);
  assert.equal(update.changes.$set.trustScore, 90);
  assert.equal(update.changes.$set.reviewsCount, 2);
  assert.equal(update.options.runValidators, true);
});

test("review creation rejects users who did not participate in the exchange", async () => {
  authenticate();
  Exchange.findById = async () => ({
    status: "completed", completedByRequester: true, completedByRecipient: true,
    requester: otherUserId, recipient: "68f000000000000000000005"
  });
  const response = await request("POST", "/api/reviews", { exchangeId, rating: 5, comment: "Great" });
  assert.equal(response.status, 403);
});
