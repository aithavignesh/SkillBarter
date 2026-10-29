import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Post from "../src/models/Post.js";
import Block from "../src/models/Block.js";
import Connection from "../src/models/Connection.js";
import app from "../src/app.js";

const jwtSecret = "post-security-tests-secret-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const userId = "68f000000000000000000001";
const otherUserId = "68f000000000000000000002";
const postId = "68f000000000000000000003";
const sampleUser = {
  _id: userId, id: userId, email: "user@example.com", username: "user",
  fullName: "User", isAdmin: false, isActive: true, onboardingCompleted: true,
  skillsToTeach: [], skillsToLearn: [], tokenVersion: 0
};
const originalUserFindById = User.findById;
const originalPostCreate = Post.create;
const originalPostFindById = Post.findById;
const originalPostFindOne = Post.findOne;
const originalBlockExists = Block.exists;
const originalConnectionExists = Connection.exists;
const originalBlockFind = Block.find;
const originalConnectionFind = Connection.find;
const originalPostFind = Post.find;
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
  Post.create = originalPostCreate;
  Post.findById = originalPostFindById;
  Post.findOne = originalPostFindOne;
  Block.exists = originalBlockExists;
  Connection.exists = originalConnectionExists;
  Block.find = originalBlockFind;
  Connection.find = originalConnectionFind;
  Post.find = originalPostFind;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function authenticate() {
  User.findById = () => ({ select: async () => sampleUser });
}

const token = jwt.sign({ sub: userId, tokenVersion: 0 }, jwtSecret, {
  expiresIn: "1h", issuer: "skillbarter-api", audience: "skillbarter-web"
});

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

test("post creation rejects empty and oversized content", async () => {
  authenticate();
  const empty = await request("POST", "/api/posts", { content: "  " });
  assert.equal(empty.status, 400);
  const oversized = await request("POST", "/api/posts", { content: "x".repeat(5001) });
  assert.equal(oversized.status, 400);
});

test("post creation normalizes and filters tags", async () => {
  authenticate();
  let document;
  Post.create = async (value) => {
    document = value;
    return { _id: postId, ...value, populate: async () => {} };
  };

  const response = await request("POST", "/api/posts", {
    content: "  Hello SkillBarter  ",
    tags: ["#AI", " Web_Dev ", "bad tag", 42, "#community"]
  });

  assert.equal(response.status, 201);
  assert.equal(document.author, userId);
  assert.equal(document.content, "Hello SkillBarter");
  assert.deepEqual(document.tags, ["ai", "web_dev", "community"]);
});

test("post deletion rejects malformed IDs", async () => {
  authenticate();
  const response = await request("DELETE", "/api/posts/not-an-id");
  assert.equal(response.status, 400);
});

test("users cannot delete another user's post unless they are an admin", async () => {
  authenticate();
  Post.findById = async () => ({
    _id: postId,
    author: otherUserId,
    deleteOne: async () => { throw new Error("must not delete another user's post"); }
  });

  const response = await request("DELETE", `/api/posts/${postId}`);
  assert.equal(response.status, 403);
});

test("post deletion succeeds for the author", async () => {
  authenticate();
  let deleted = false;
  Post.findById = async () => ({
    _id: postId,
    author: userId,
    deleteOne: async () => { deleted = true; }
  });

  const response = await request("DELETE", `/api/posts/${postId}`);
  assert.equal(response.status, 200);
  assert.equal(deleted, true);
});


test("post feed limits connections-only posts to accepted connections", async () => {
  authenticate();
  Block.find = () => ({ select: async () => [] });
  let connectionFilter;
  Connection.find = (filter) => {
    connectionFilter = filter;
    return { select: async () => [{ user: userId, connectedUser: otherUserId }] };
  };
  let postFilter;
  Post.find = (filter) => {
    postFilter = filter;
    return {
      populate() {
        return {
          sort() {
            return { limit: async () => [] };
          }
        };
      }
    };
  };

  const response = await request("GET", "/api/posts");
  assert.equal(response.status, 200);
  assert.equal(connectionFilter.status, "ACCEPTED");
  assert.deepEqual(connectionFilter.$or, [
    { user: userId },
    { connectedUser: userId }
  ]);
  assert.deepEqual(postFilter.$or, [
    { visibility: "public" },
    { visibility: "connections", author: { $in: [otherUserId] } }
  ]);
});


test("connections-only post comments are hidden from non-connections", async () => {
  authenticate();
  Post.findOne = () => ({ select: async () => ({ author: otherUserId, visibility: "connections" }) });
  Connection.exists = async () => false;
  let blockCheckCalled = false;
  Block.exists = async () => { blockCheckCalled = true; return false; };

  const response = await request("GET", `/api/posts/${postId}/comments`);

  assert.equal(response.status, 404);
  assert.equal(blockCheckCalled, false, "blocked relationship lookup should not run after visibility denial");
});

test("connections-only post likes are hidden from non-connections", async () => {
  authenticate();
  Post.findOne = async () => ({ author: otherUserId, visibility: "connections", likes: [], save: async () => {} });
  Connection.exists = async () => false;

  const response = await request("POST", `/api/posts/${postId}/like`);

  assert.equal(response.status, 404);
});


test("non-connections cannot comment on connections-only posts", async () => {
  authenticate();
  Post.findOne = () => ({ select: async () => ({ author: otherUserId, visibility: "connections" }) });
  Connection.exists = async () => false;

  const response = await request("POST", `/api/posts/${postId}/comments`, { content: "Hello" });

  assert.equal(response.status, 404);
});
