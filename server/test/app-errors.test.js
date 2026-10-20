import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

async function withServer(run) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("returns a safe JSON 404 for unknown API routes", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/does-not-exist`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Route not found." });
  });
});

test("returns a client error for malformed JSON instead of a generic server error", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid"
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid JSON request body." });
  });
});

test("rejects request bodies larger than the configured limit", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "x".repeat(1_100_000) })
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "Request body exceeds the 1 MB limit." });
  });
});

test("rejects disallowed browser origins with a generic response", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl, { headers: { origin: "https://not-allowed.example" } });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Origin is not allowed by CORS." });
  });
});
