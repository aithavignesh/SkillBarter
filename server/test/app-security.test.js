import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import app from "../src/app.js";

async function withServer(run) {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("unknown API routes return a consistent JSON 404", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/route-that-does-not-exist`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Route not found." });
  });
});

test("malformed JSON is rejected with a client error", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid JSON request body." });
  });
});

test("request bodies over the configured limit are rejected", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ oversized: "x".repeat(1_050_000) })
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "Request body exceeds the 1 MB limit." });
  });
});

test("unapproved browser origins are rejected by CORS", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/health`, {
      headers: { origin: "https://untrusted.example" }
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Origin is not allowed by CORS." });
  });
});
