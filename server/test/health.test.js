import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import healthRoutes from "../src/routes/health.js";

async function withServer(run) {
  const app = express();
  app.use("/api/health", healthRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}/api/health`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("liveness endpoint stays available and reports database state", async () => {
  await withServer(async (url) => {
    const response = await fetch(url);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "skillbarter-api");
    assert.ok(["connected", "disconnected"].includes(body.database));
  });
});

test("readiness endpoint returns 503 when MongoDB is disconnected", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/ready`);
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.status, "not_ready");
    assert.equal(body.checks.database, "disconnected");
  });
});
