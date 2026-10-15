import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("health endpoint responds without requiring database startup", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
});

test("registration rejects invalid fields before database access", async () => {
  const response = await post("/api/auth/register", { fullName: "A", username: "x", email: "bad", password: "short" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /name between 2 and 100/);
});

test("login rejects malformed email before database access", async () => {
  const response = await post("/api/auth/login", { email: "not-an-email", password: "not-empty" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /email and password/);
});

test("password reset confirmation rejects malformed tokens before database access", async () => {
  const response = await post("/api/auth/password-reset/confirm", { token: "invalid", password: "long-enough-password" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid reset token/);
});

test("exchange endpoints reject unauthenticated requests before database access", async () => {
  const response = await fetch(`${baseUrl}/api/exchanges`);
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /Authentication required/);
});
