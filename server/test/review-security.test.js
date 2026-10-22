import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Exchange from "../src/models/Exchange.js";
import Review from "../src/models/Review.js";
import app from "../src/app.js";

const jwtSecret = "review-tests-only-secret-that-is-at-least-thirty-two-characters";
const userId = "68f200000000000000000001";
const sampleUser = {
  _id: userId, id: userId, email: "reviewer@example.com", username: "reviewer",
  fullName: "Reviewer", isAdmin: false, isActive: true, tokenVersion: 0,
  onboardingCompleted: true, skillsToTeach: [], skillsToLearn: []
};
const originals = {
  userFindById: User.findById,
  exchangeFindById: Exchange.findById,
  reviewCreate: Review.create,
  reviewFind: Review.find
};
let server;
let baseUrl;

function token() {
  process.env.JWT_SECRET = jwtSecret;
  return jwt.sign({ sub: userId, tokenVersion: 0 }, jwtSecret, {
    expiresIn: "1h", issuer: "skillbarter-api", audience: "skillbarter-web"
  });
}

server = app.listen(0);
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  User.findById = originals.userFindById;
  Exchange.findById = originals.exchangeFindById;
  Review.create = originals.reviewCreate;
  Review.find = originals.reviewFind;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function authenticate() {
  User.findById = () => ({ select: async () => sampleUser });
}

async function submitReview(body) {
  process.env.JWT_SECRET = jwtSecret;
  return fetch(`${baseUrl}/api/reviews`, {
    method: "POST",
    headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}


test("non-participants cannot inspect completion state or submit reviews", async () => {
  authenticate();
  let reviewCreateCalled = false;
  Exchange.findById = async () => ({
    _id: "68f200000000000000000002",
    requester: "68f200000000000000000003",
    recipient: "68f200000000000000000004",
    status: "active",
    completedByRequester: true,
    completedByRecipient: false
  });
  Review.create = async () => {
    reviewCreateCalled = true;
    throw new Error("Non-participants must not create reviews");
  };

  const response = await submitReview({
    exchangeId: "68f200000000000000000002",
    rating: 4,
    comment: "Good exchange"
  });

  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /only exchange participants/i);
  assert.equal(reviewCreateCalled, false);
});

test("reviews are rejected until both exchange participants complete", async () => {
  authenticate();
  let reviewCreateCalled = false;
  Exchange.findById = async () => ({
    _id: "68f200000000000000000002",
    requester: userId,
    recipient: "68f200000000000000000004",
    status: "active",
    completedByRequester: true,
    completedByRecipient: false
  });
  Review.create = async () => {
    reviewCreateCalled = true;
    throw new Error("Incomplete exchanges must not create reviews");
  };

  const response = await submitReview({
    exchangeId: "68f200000000000000000002",
    rating: 4
  });

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /only after both participants complete/i);
  assert.equal(reviewCreateCalled, false);
});



test("duplicate review submissions return conflict", async () => {
  authenticate();
  Exchange.findById = async () => ({
    _id: "68f200000000000000000002",
    requester: userId,
    recipient: "68f200000000000000000004",
    status: "completed",
    completedByRequester: true,
    completedByRecipient: true
  });
  let reviewCreateCalled = false;
  Review.create = async () => {
    reviewCreateCalled = true;
    const error = new Error("duplicate review");
    error.code = 11000;
    throw error;
  };

  const response = await submitReview({
    exchangeId: "68f200000000000000000002",
    rating: 5,
    comment: "Great exchange"
  });

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /already reviewed this exchange/i);
  assert.equal(reviewCreateCalled, true);
});

test("review listing rejects malformed user IDs before querying reviews", async () => {
  authenticate();
  let reviewLookupCalled = false;
  Review.find = () => {
    reviewLookupCalled = true;
    throw new Error("Review lookup must not run for malformed user IDs");
  };

  const response = await fetch(`${baseUrl}/api/reviews/user/not-an-id`, {
    headers: { authorization: `Bearer ${token()}` }
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /invalid user ID/i);
  assert.equal(reviewLookupCalled, false);
});

test("review creation rejects malformed exchange IDs before database lookup", async () => {
  authenticate();
  let exchangeLookupCalled = false;
  Exchange.findById = async () => {
    exchangeLookupCalled = true;
    throw new Error("Exchange lookup must not run for malformed IDs");
  };
  let reviewCreateCalled = false;
  Review.create = async () => {
    reviewCreateCalled = true;
    throw new Error("Review creation must not run for malformed IDs");
  };

  const response = await submitReview({ exchangeId: "not-an-id", rating: 5 });

  assert.equal(response.status, 400);
  assert.equal(exchangeLookupCalled, false);
  assert.equal(reviewCreateCalled, false);
});

test("review creation rejects invalid ratings before exchange lookup", async () => {
  authenticate();
  let exchangeLookupCalled = false;
  Exchange.findById = async () => {
    exchangeLookupCalled = true;
    throw new Error("Exchange lookup must not run for invalid ratings");
  };
  let reviewCreateCalled = false;
  Review.create = async () => {
    reviewCreateCalled = true;
    throw new Error("Review creation must not run for invalid ratings");
  };

  const response = await submitReview({
    exchangeId: "68f200000000000000000002",
    rating: 5.5
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /rating must be an integer from 1 to 5/i);
  assert.equal(exchangeLookupCalled, false);
  assert.equal(reviewCreateCalled, false);
});
