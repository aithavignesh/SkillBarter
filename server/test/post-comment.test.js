import test, { after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Post from "../src/models/Post.js";
import PostComment from "../src/models/PostComment.js";
import Block from "../src/models/Block.js";
import Notification from "../src/models/Notification.js";
import app from "../src/app.js";

const jwtSecret = "post-comment-tests-secret-at-least-thirty-two-characters";
process.env.JWT_SECRET = jwtSecret;
const userId = "68f000000000000000000001";
const otherUserId = "68f000000000000000000002";
const postId = "68f000000000000000000003";
const commentId = "68f000000000000000000004";
const sampleUser = {
  _id: userId, id: userId, email: "user@example.com", username: "user",
  fullName: "User", isAdmin: false, isActive: true, onboardingCompleted: true,
  skillsToTeach: [], skillsToLearn: [], tokenVersion: 0
};
const originals = {
  userFindById: User.findById,
  postFindOne: Post.findOne,
  commentCreate: PostComment.create,
  commentFindById: PostComment.findById,
  blockExists: Block.exists,
  notificationCreate: Notification.create
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
  Post.findOne = originals.postFindOne;
  PostComment.create = originals.commentCreate;
  PostComment.findById = originals.commentFindById;
  Block.exists = originals.blockExists;
  Notification.create = originals.notificationCreate;
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

test("post comments reject blank and oversized raw content", async () => {
  authenticate();
  const blank = await request("POST", `/api/posts/${postId}/comments`, { content: "   " });
  assert.equal(blank.status, 400);
  const oversized = await request("POST", `/api/posts/${postId}/comments`, { content: "x".repeat(2001) });
  assert.equal(oversized.status, 400);
  const padded = await request("POST", `/api/posts/${postId}/comments`, { content: `${" ".repeat(2001)}a` });
  assert.equal(padded.status, 400);
});

test("post comments reject malformed post IDs", async () => {
  authenticate();
  const response = await request("POST", "/api/posts/not-an-id/comments", { content: "Useful tip" });
  assert.equal(response.status, 400);
});

test("post comments are blocked across a blocked relationship", async () => {
  authenticate();
  Post.findOne = () => ({ select: async () => ({ author: otherUserId }) });
  Block.exists = async () => true;
  const response = await request("POST", `/api/posts/${postId}/comments`, { content: "Useful tip" });
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /blocked/);
});

test("post comments are saved and notify the post author", async () => {
  authenticate();
  Post.findOne = () => ({ select: async () => ({ _id: postId, author: otherUserId }) });
  Block.exists = async () => false;
  let saved;
  let notification;
  PostComment.create = async (value) => {
    saved = value;
    return { _id: commentId, ...value, populate: async () => {} };
  };
  Notification.create = async (value) => { notification = value; };
  const response = await request("POST", `/api/posts/${postId}/comments`, { content: "  Helpful advice  " });
  const data = await response.json();
  assert.equal(response.status, 201);
  assert.equal(saved.post, postId);
  assert.equal(saved.author, userId);
  assert.equal(saved.content, "Helpful advice");
  assert.equal(data.comment.content, "Helpful advice");
  assert.equal(notification.recipient, otherUserId);
  assert.equal(notification.type, "post_comment");
});

test("comment deletion rejects malformed IDs and protects other authors' comments", async () => {
  authenticate();
  assert.equal((await request("DELETE", "/api/posts/comments/not-an-id")).status, 400);
  PostComment.findById = async () => ({
    _id: commentId, author: otherUserId,
    deleteOne: async () => { throw new Error("must not delete another user's comment"); }
  });
  assert.equal((await request("DELETE", `/api/posts/comments/${commentId}`)).status, 403);
});

test("comment author can delete their own comment", async () => {
  authenticate();
  let deleted = false;
  PostComment.findById = async () => ({
    _id: commentId, author: userId,
    deleteOne: async () => { deleted = true; }
  });
  const response = await request("DELETE", `/api/posts/comments/${commentId}`);
  assert.equal(response.status, 200);
  assert.equal(deleted, true);
});
