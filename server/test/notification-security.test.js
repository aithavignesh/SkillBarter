import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Notification from "../src/models/Notification.js";
import app from "../src/app.js";

const jwtSecret = "notification-tests-secret-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const userId = "68f000000000000000000001";
const notificationId = "68f000000000000000000002";
const sampleUser = {
  _id: userId, id: userId, email: "user@example.com", username: "user",
  fullName: "User", isAdmin: false, isActive: true, onboardingCompleted: true,
  skillsToTeach: [], skillsToLearn: [], tokenVersion: 0
};
const originals = {
  userFindById: User.findById,
  find: Notification.find,
  countDocuments: Notification.countDocuments,
  updateMany: Notification.updateMany,
  findOneAndUpdate: Notification.findOneAndUpdate,
  findOneAndDelete: Notification.findOneAndDelete
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
  Notification.find = originals.find;
  Notification.countDocuments = originals.countDocuments;
  Notification.updateMany = originals.updateMany;
  Notification.findOneAndUpdate = originals.findOneAndUpdate;
  Notification.findOneAndDelete = originals.findOneAndDelete;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function authenticate() {
  User.findById = () => ({ select: async () => sampleUser });
}

const token = jwt.sign({ sub: userId, tokenVersion: 0 }, jwtSecret, {
  expiresIn: "1h", issuer: "skillbarter-api", audience: "skillbarter-web"
});

async function request(method, path) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}` }
  });
}

test("notification listing scopes results and unread count to the current user", async () => {
  authenticate();
  const listed = [{ _id: notificationId, recipient: userId, title: "Test notification" }];
  let listQuery;
  let countQuery;
  Notification.find = (filter) => {
    listQuery = filter;
    return {
      populate() {
        return {
          sort() {
            return {
              limit: async (limit) => {
                assert.equal(limit, 30);
                return listed;
              }
            };
          }
        };
      }
    };
  };
  Notification.countDocuments = async (filter) => {
    countQuery = filter;
    return 1;
  };

  const response = await request("GET", "/api/notifications");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(listQuery, { recipient: userId });
  assert.deepEqual(countQuery, { recipient: userId, readAt: null });
  assert.equal(body.unreadCount, 1);
  assert.equal(body.notifications.length, 1);
});

test("notification listing caps oversized page limits", async () => {
  authenticate();
  let requestedLimit;
  Notification.find = () => ({
    populate() {
      return {
        sort() {
          return {
            limit: async (limit) => {
              requestedLimit = limit;
              return [];
            }
          };
        }
      };
    }
  });
  Notification.countDocuments = async () => 0;

  const response = await request("GET", "/api/notifications?limit=10000");

  assert.equal(response.status, 200);
  assert.equal(requestedLimit, 100);
});

test("marking all notifications read scopes the update to the current user", async () => {
  authenticate();
  let query;
  Notification.updateMany = async (...args) => {
    query = args;
    return { modifiedCount: 3 };
  };

  const response = await request("PATCH", "/api/notifications/read-all");
  assert.equal(response.status, 200);
  assert.deepEqual(query[0], { recipient: userId, readAt: null });
  assert.ok(query[1].$set.readAt instanceof Date);
  assert.equal((await response.json()).updatedCount, 3);
});

test("marking a notification read scopes by both notification and recipient", async () => {
  authenticate();
  let query;
  Notification.findOneAndUpdate = async (...args) => {
    query = args;
    return { _id: notificationId, recipient: userId, readAt: new Date() };
  };

  const response = await request("PATCH", `/api/notifications/${notificationId}/read`);
  assert.equal(response.status, 200);
  assert.deepEqual(query[0], { _id: notificationId, recipient: userId });
});

test("notification read rejects malformed IDs", async () => {
  authenticate();
  const response = await request("PATCH", "/api/notifications/not-an-id/read");
  assert.equal(response.status, 400);
});

test("notification delete scopes by recipient and returns not found for another user's notification", async () => {
  authenticate();
  let query;
  Notification.findOneAndDelete = async (filter) => {
    query = filter;
    return null;
  };

  const response = await request("DELETE", `/api/notifications/${notificationId}`);
  assert.equal(response.status, 404);
  assert.deepEqual(query, { _id: notificationId, recipient: userId });
});
