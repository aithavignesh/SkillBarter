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
  reviewCreate: Review.create
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
