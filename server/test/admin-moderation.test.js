import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Report from "../src/models/Report.js";
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
