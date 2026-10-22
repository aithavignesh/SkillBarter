import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Report from "../src/models/Report.js";
import Exchange from "../src/models/Exchange.js";
import app from "../src/app.js";

const jwtSecret = "report-tests-secret-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const userId = "68f000000000000000000001";
const sampleUser = {
  _id: userId, id: userId, email: "user@example.com", username: "user",
  fullName: "User", isAdmin: false, isActive: true, onboardingCompleted: true,
  skillsToTeach: [], skillsToLearn: [], tokenVersion: 0
};
const originalFindById = User.findById;
const originalExchangeFindById = Exchange.findById;
const originalReportCreate = Report.create;
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
  Exchange.findById = originalExchangeFindById;
  Report.create = originalReportCreate;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function createToken() {
  process.env.JWT_SECRET = jwtSecret;
  return jwt.sign({ sub: userId, tokenVersion: 0 }, jwtSecret, {
    expiresIn: "1h", issuer: "skillbarter-api", audience: "skillbarter-web"
  });
}

test("users cannot report their own account", async () => {
  let lookupCount = 0;
  User.findById = (id) => {
    lookupCount += 1;
    assert.equal(String(id), userId);
    return { select: async () => sampleUser };
  };
  let createCalled = false;
  Report.create = async () => {
    createCalled = true;
    throw new Error("Report creation must not run for a self-report.");
  };

  process.env.JWT_SECRET = jwtSecret;
  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${createToken()}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      targetType: "user",
      targetId: userId,
      reason: "Test self-report"
    })
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /cannot report your own account/i);
  assert.equal(lookupCount, 1, "only the authentication lookup should run");
  assert.equal(createCalled, false);
});

test("a non-participant cannot report an exchange", async () => {
  Exchange.findById = () => ({
    select: async () => ({
      _id: "68f000000000000000000003",
      requester: "68f000000000000000000004",
      recipient: "68f000000000000000000005"
    })
  });
  let createCalled = false;
  Report.create = async () => {
    createCalled = true;
    throw new Error("Report.create must not run for an unauthorized exchange report");
  };

  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      targetType: "exchange",
      targetId: "68f000000000000000000003",
      reason: "Inappropriate behavior"
    })
  });

  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /only exchange participants/i);
  assert.equal(createCalled, false);
});

test("invalid report reasons are rejected before target lookup", async () => {
  process.env.JWT_SECRET = jwtSecret;
  let targetLookupCalled = false;
  User.findById = (id) => {
    if (String(id) === userId) return { select: async () => sampleUser };
    targetLookupCalled = true;
    throw new Error("Target lookup must not run for an invalid report reason");
  };
  let createCalled = false;
  Report.create = async () => {
    createCalled = true;
    throw new Error("Report.create must not run for an invalid report reason");
  };

  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      targetType: "user",
      targetId: "68f000000000000000000003",
      reason: "  "
    })
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /reason between 3 and 120 characters/i);
  assert.equal(targetLookupCalled, false);
  assert.equal(createCalled, false);
});
