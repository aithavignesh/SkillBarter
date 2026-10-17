import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Exchange from "../src/models/Exchange.js";
import Report from "../src/models/Report.js";
import AnalyticsEvent from "../src/models/AnalyticsEvent.js";
import app from "../src/app.js";

const jwtSecret = "admin-moderation-tests-secret-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const adminId = "68f000000000000000000001";
const otherUserId = "68f000000000000000000002";
const reportId = "68f000000000000000000003";
const adminUser = {
  _id: adminId, id: adminId, email: "admin@example.com", username: "admin",
  fullName: "Admin", isAdmin: true, isActive: true, onboardingCompleted: true,
  skillsToTeach: [], skillsToLearn: [], tokenVersion: 0
};
const normalUser = { ...adminUser, isAdmin: false };
const originalUserFind = User.find;
const originalUserCountDocuments = User.countDocuments;
const originalExchangeCountDocuments = Exchange.countDocuments;
const originalReportCountDocuments = Report.countDocuments;
const originalAnalyticsCountDocuments = AnalyticsEvent.countDocuments;
const originalAnalyticsDistinct = AnalyticsEvent.distinct;
const originalAnalyticsAggregate = AnalyticsEvent.aggregate;
const originalUserFindById = User.findById;
const originalUserFindByIdAndUpdate = User.findByIdAndUpdate;
const originalReportFindByIdAndUpdate = Report.findByIdAndUpdate;
let server;
let baseUrl;

server = app.listen(0);
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  User.find = originalUserFind;
  User.countDocuments = originalUserCountDocuments;
  Exchange.countDocuments = originalExchangeCountDocuments;
  Report.countDocuments = originalReportCountDocuments;
  AnalyticsEvent.countDocuments = originalAnalyticsCountDocuments;
  AnalyticsEvent.distinct = originalAnalyticsDistinct;
  AnalyticsEvent.aggregate = originalAnalyticsAggregate;
  User.findById = originalUserFindById;
  User.findByIdAndUpdate = originalUserFindByIdAndUpdate;
  Report.findByIdAndUpdate = originalReportFindByIdAndUpdate;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function setAuthenticatedUser(user) {
  User.findById = () => ({ select: async () => user });
}

function authToken(id = adminId) {
  return jwt.sign({ sub: id, tokenVersion: 0 }, jwtSecret, {
    expiresIn: "1h", issuer: "skillbarter-api", audience: "skillbarter-web"
  });
}

async function patch(path, body, id = adminId) {
  return fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${authToken(id)}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("non-admin users cannot access any admin read or write endpoint", async () => {
  setAuthenticatedUser(normalUser);
  const requests = [
    ["GET", "/api/admin/stats"],
    ["GET", "/api/admin/analytics"],
    ["GET", "/api/admin/users"],
    ["GET", "/api/admin/exchanges"],
    ["GET", "/api/admin/reports"],
    ["PATCH", `/api/admin/users/${otherUserId}/status`, { isActive: false }],
    ["PATCH", `/api/admin/reports/${reportId}`, { status: "resolved", resolutionNote: "No access" }]
  ];

  for (const [method, path, body] of requests) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${authToken()}`,
        ...(body ? { "content-type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    assert.equal(response.status, 403, `${method} ${path} should reject non-admin users`);
  }
});

test("admin stats returns the expected dashboard counts", async () => {
  setAuthenticatedUser(adminUser);
  User.countDocuments = async (filter) => filter?.isActive === true ? 7 : 12;
  Exchange.countDocuments = async (filter) => filter?.status === "pending" ? 3 : 8;
  Report.countDocuments = async (filter) => filter?.status === "open" ? 2 : 0;

  const response = await fetch(`${baseUrl}/api/admin/stats`, {
    headers: { authorization: `Bearer ${authToken()}` }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    stats: { users: 12, activeUsers: 7, exchanges: 8, pendingExchanges: 3, openReports: 2 }
  });
});

test("admin analytics aggregates the last 30 days and top pages", async () => {
  setAuthenticatedUser(adminUser);
  let eventCountFilter;
  let distinctArgs;
  const aggregatePipelines = [];

  AnalyticsEvent.countDocuments = async (filter) => {
    eventCountFilter = filter;
    return 42;
  };
  AnalyticsEvent.distinct = async (...args) => {
    distinctArgs = args;
    return [otherUserId, adminId];
  };
  AnalyticsEvent.aggregate = async (pipeline) => {
    aggregatePipelines.push(pipeline);
    const group = pipeline.find((stage) => stage.$group)?.$group;
    if (group?._id === "$name") return [{ _id: "page_view", count: 30 }, { _id: "message_sent", count: 12 }];
    if (group?._id?.$dateToString) return [{ _id: "2026-10-16", count: 20 }, { _id: "2026-10-17", count: 22 }];
    return [{ _id: "/discover", views: 18 }, { _id: "/matches", views: 12 }];
  };

  const beforeRequest = Date.now();
  const response = await fetch(`${baseUrl}/api/admin/analytics`, {
    headers: { authorization: `Bearer ${authToken()}` }
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.periodDays, 30);
  assert.deepEqual(result.summary, { totalEvents: 42, activeUsers: 2 });
  assert.deepEqual(result.eventsByType, [
    { name: "page_view", count: 30 }, { name: "message_sent", count: 12 }
  ]);
  assert.deepEqual(result.dailyEvents, [
    { date: "2026-10-16", count: 20 }, { date: "2026-10-17", count: 22 }
  ]);
  assert.deepEqual(result.topPages, [
    { path: "/discover", views: 18 }, { path: "/matches", views: 12 }
  ]);

  const cutoff = eventCountFilter.createdAt.$gte.getTime();
  assert.ok(cutoff <= beforeRequest - 29 * 24 * 60 * 60 * 1000);
  assert.ok(cutoff >= beforeRequest - 30 * 24 * 60 * 60 * 1000 - 1000);
  assert.deepEqual(distinctArgs, ["actor", eventCountFilter]);
  assert.equal(aggregatePipelines.length, 3);
  const topPagesPipeline = aggregatePipelines.find((pipeline) =>
    pipeline.some((stage) => stage.$group?._id === "$path")
  );
  assert.deepEqual(topPagesPipeline[0].$match.name, "page_view");
  assert.equal(topPagesPipeline[0].$match.path.$ne, "");
  assert.deepEqual(topPagesPipeline.at(-1), { $limit: 10 });
});

test("admin user listing caps the requested page size at 100", async () => {
  setAuthenticatedUser(adminUser);
  let selectedFields;
  let sortFields;
  let limitValue;
  User.find = () => ({
    select(fields) {
      selectedFields = fields;
      return this;
    },
    sort(fields) {
      sortFields = fields;
      return this;
    },
    limit(value) {
      limitValue = value;
      return Promise.resolve([]);
    }
  });

  const response = await fetch(`${baseUrl}/api/admin/users?limit=1000`, {
    headers: { authorization: `Bearer ${authToken()}` }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { users: [] });
  assert.equal(limitValue, 100);
  assert.deepEqual(sortFields, { createdAt: -1 });
  assert.match(selectedFields, /email/);
  assert.doesNotMatch(selectedFields, /password|tokenVersion/);
});

test("admin cannot deactivate their own account", async () => {
  setAuthenticatedUser(adminUser);
  const response = await patch(`/api/admin/users/${adminId}/status`, { isActive: false });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /own account/);
});

test("admin user status update requires a boolean", async () => {
  setAuthenticatedUser(adminUser);
  const response = await patch(`/api/admin/users/${otherUserId}/status`, { isActive: "false" });
  assert.equal(response.status, 400);
});

test("admin user status update rejects invalid IDs and missing users", async () => {
  setAuthenticatedUser(adminUser);
  const invalidId = await patch("/api/admin/users/not-an-id/status", { isActive: false });
  assert.equal(invalidId.status, 400);

  User.findByIdAndUpdate = () => ({ select: async () => null });
  const missingUser = await patch(`/api/admin/users/${otherUserId}/status`, { isActive: false });
  assert.equal(missingUser.status, 404);
});

test("admin status changes revoke sessions on deactivation and reactivation", async () => {
  setAuthenticatedUser(adminUser);

  for (const isActive of [false, true]) {
    let updateArgs;
    User.findByIdAndUpdate = (...args) => {
      updateArgs = args;
      return { select: async () => ({ _id: otherUserId, isActive, isAdmin: false }) };
    };

    const response = await patch(`/api/admin/users/${otherUserId}/status`, { isActive });

    assert.equal(response.status, 200);
    assert.deepEqual(updateArgs[1], { $set: { isActive }, $inc: { tokenVersion: 1 } });
    assert.equal(updateArgs[2].runValidators, true);
  }
});

test("admin report moderation rejects invalid report IDs and statuses", async () => {
  setAuthenticatedUser(adminUser);
  const badId = await patch("/api/admin/reports/not-an-id", { status: "resolved" });
  assert.equal(badId.status, 400);
  const badStatus = await patch(`/api/admin/reports/${reportId}`, { status: "delete" });
  assert.equal(badStatus.status, 400);
});

test("admin report moderation rejects non-string or oversized resolution notes", async () => {
  setAuthenticatedUser(adminUser);
  const badType = await patch(`/api/admin/reports/${reportId}`, { status: "resolved", resolutionNote: 123 });
  assert.equal(badType.status, 400);
  const tooLong = await patch(`/api/admin/reports/${reportId}`, { status: "resolved", resolutionNote: "x".repeat(2001) });
  assert.equal(tooLong.status, 400);
});

test("admin report moderation updates status and records the moderator", async () => {
  setAuthenticatedUser(adminUser);
  let updateArgs;
  Report.findByIdAndUpdate = async (...args) => {
    updateArgs = args;
    return { _id: reportId, status: "resolved", resolvedBy: adminId };
  };

  const response = await patch(`/api/admin/reports/${reportId}`, {
    status: "resolved", resolutionNote: "Reviewed and resolved."
  });

  assert.equal(response.status, 200);
  assert.equal(updateArgs[0], reportId);
  assert.deepEqual(updateArgs[1].$set, {
    status: "resolved", resolutionNote: "Reviewed and resolved.", resolvedBy: adminId
  });
  assert.equal(updateArgs[2].runValidators, true);
});

test("admin report moderation returns 404 when the report does not exist", async () => {
  setAuthenticatedUser(adminUser);
  Report.findByIdAndUpdate = async () => null;

  const response = await patch(`/api/admin/reports/${reportId}`, {
    status: "resolved", resolutionNote: "Review completed."
  });

  assert.equal(response.status, 404);
});

test("report moderation preserves moderator assignment only for terminal statuses", async () => {
  setAuthenticatedUser(adminUser);

  for (const status of ["reviewing", "dismissed"]) {
    let updateArgs;
    Report.findByIdAndUpdate = async (...args) => {
      updateArgs = args;
      return { _id: reportId, status, resolvedBy: status === "dismissed" ? adminId : null };
    };

    const response = await patch(`/api/admin/reports/${reportId}`, { status });

    assert.equal(response.status, 200, `status ${status} should be accepted`);
    assert.equal(
      updateArgs[1].$set.resolvedBy,
      status === "dismissed" ? adminId : null,
      `status ${status} should set the expected moderator assignment`
    );
  }
});

test("reopening a report clears the current moderator assignment", async () => {
  setAuthenticatedUser(adminUser);
  let updateArgs;
  Report.findByIdAndUpdate = async (...args) => {
    updateArgs = args;
    return { _id: reportId, status: "open", resolvedBy: null };
  };

  const response = await patch(`/api/admin/reports/${reportId}`, {
    status: "open", resolutionNote: "Needs another review."
  });

  assert.equal(response.status, 200);
  assert.deepEqual(updateArgs[1].$set, {
    status: "open", resolutionNote: "Needs another review.", resolvedBy: null
  });
  assert.equal(updateArgs[2].runValidators, true);
});
