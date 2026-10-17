import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import AnalyticsEvent from "../src/models/AnalyticsEvent.js";
import app from "../src/app.js";

const jwtSecret = "analytics-tests-secret-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const userId = "68f000000000000000000001";
const adminId = "68f000000000000000000002";
const user = { _id: userId, id: userId, email: "user@example.com", username: "user", fullName: "User", isAdmin: false, isActive: true, onboardingCompleted: true, skillsToTeach: [], skillsToLearn: [], tokenVersion: 0 };
const admin = { ...user, _id: adminId, id: adminId, isAdmin: true, username: "admin" };
const originals = {
  userFindById: User.findById,
  eventCreate: AnalyticsEvent.create,
  eventCountDocuments: AnalyticsEvent.countDocuments,
  eventDistinct: AnalyticsEvent.distinct,
  eventAggregate: AnalyticsEvent.aggregate
};
const server = app.listen(0);
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
const baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  User.findById = originals.userFindById;
  AnalyticsEvent.create = originals.eventCreate;
  AnalyticsEvent.countDocuments = originals.eventCountDocuments;
  AnalyticsEvent.distinct = originals.eventDistinct;
  AnalyticsEvent.aggregate = originals.eventAggregate;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function token(id) {
  return jwt.sign({ sub: id, tokenVersion: 0 }, jwtSecret, { expiresIn: "1h", issuer: "skillbarter-api", audience: "skillbarter-web" });
}
function authenticate(currentUser) {
  User.findById = () => ({ select: async () => currentUser });
}
function request(path, id, body) {
  return fetch(`${baseUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${token(id)}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

test("analytics event endpoint requires authentication", async () => {
  const response = await fetch(`${baseUrl}/api/analytics/event`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "page_view", path: "/dashboard" })
  });
  assert.equal(response.status, 401);
});

test("analytics accepts only page views from clients and stores only allowlisted paths", async () => {
  authenticate(user);
  let created;
  AnalyticsEvent.create = async (event) => { created = event; return { _id: "event-id" }; };

  const unsupported = await request("/api/analytics/event", userId, { name: "message_sent", path: "/dashboard" });
  assert.equal(unsupported.status, 400);

  const response = await request("/api/analytics/event", userId, { name: "page_view", path: "/admin?email=private@example.com" });
  assert.equal(response.status, 201);
  assert.equal(created.actor, userId);
  assert.equal(created.name, "page_view");
  assert.equal(created.path, "/admin");
  assert.deepEqual(created.properties, {});
});

test("analytics discards unrecognized paths instead of storing arbitrary URLs", async () => {
  authenticate(user);
  let created;
  AnalyticsEvent.create = async (event) => { created = event; return { _id: "event-id" }; };

  const response = await request("/api/analytics/event", userId, {
    name: "page_view",
    path: "https://external.example/collect?email=private@example.com"
  });

  assert.equal(response.status, 201);
  assert.equal(created.path, "");
  assert.deepEqual(created.properties, {});
});

test("analytics summary is restricted to administrators and aggregates a 30-day window", async () => {
  authenticate(user);
  const denied = await request("/api/admin/analytics", userId);
  assert.equal(denied.status, 403);

  authenticate(admin);
  let countFilter;
  let distinctFilter;
  let pipelines = [];
  AnalyticsEvent.countDocuments = async (filter) => { countFilter = filter; return 12; };
  AnalyticsEvent.distinct = async (field, filter) => { distinctFilter = { field, filter }; return ["u1", "u2"]; };
  AnalyticsEvent.aggregate = async (pipeline) => {
    pipelines.push(pipeline);
    if (pipeline.some((stage) => stage.$group?._id === "$name")) return [{ _id: "page_view", count: 12 }];
    if (pipeline.some((stage) => stage.$group?._id?.$dateToString)) return [{ _id: "2026-10-17", count: 12 }];
    return [{ _id: "/dashboard", views: 12 }];
  };

  const response = await request("/api/admin/analytics", adminId);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.periodDays, 30);
  assert.deepEqual(body.summary, { totalEvents: 12, activeUsers: 2 });
  assert.equal(body.eventsByType[0].name, "page_view");
  assert.equal(body.topPages[0].path, "/dashboard");
  assert.ok(countFilter.createdAt.$gte instanceof Date);
  assert.equal(distinctFilter.field, "actor");
  assert.equal(pipelines.length, 3);
});
