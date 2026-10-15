import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Post from "../src/models/Post.js";
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
