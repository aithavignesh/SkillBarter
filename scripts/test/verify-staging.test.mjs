import test from "node:test";
import assert from "node:assert/strict";
import { verifyStaging } from "../verify-staging.mjs";

function fakeFetch(responses) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const value = responses[url];
    if (!value) throw new Error("unexpected URL");
    return { status: value.status, json: async () => value.body };
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

test("staging verifier passes only when API liveness, readiness, and optional frontend succeed", async () => {
  const fetchImpl = fakeFetch({
    "https://api.example.com/api/health": { status: 200, body: { status: "ok", service: "skillbarter-api" } },
    "https://api.example.com/api/health/ready": { status: 200, body: { status: "ready", checks: { database: "connected" } } },
    "https://web.example.com": { status: 200, body: {} }
  });
  const result = await verifyStaging({ apiUrl: "https://api.example.com/", webUrl: "https://web.example.com", fetchImpl });
  assert.equal(result.valid, true, JSON.stringify(result));
  assert.equal(fetchImpl.calls.length, 3);
});

test("staging verifier blocks when database readiness is unhealthy", async () => {
  const fetchImpl = fakeFetch({
    "https://api.example.com/api/health": { status: 200, body: { status: "ok", service: "skillbarter-api" } },
    "https://api.example.com/api/health/ready": { status: 503, body: { status: "not_ready", checks: { database: "disconnected" } } }
  });
  const result = await verifyStaging({ apiUrl: "https://api.example.com", fetchImpl });
  assert.equal(result.valid, false);
  assert.equal(result.results[1].ok, false);
});

test("staging verifier rejects missing, malformed, and credential-bearing URLs", async () => {
  await assert.rejects(() => verifyStaging({}), /STAGING_API_URL is required/);
  await assert.rejects(() => verifyStaging({ apiUrl: "not a URL" }), /valid absolute URL/);
  await assert.rejects(() => verifyStaging({ apiUrl: "https://user:secret@example.com" }), /must not contain credentials/);
  await assert.rejects(() => verifyStaging({ apiUrl: "https://api.example.com/prefix" }), /base URL without a path/);
});

test("staging verifier reports request failures without leaking error details", async () => {
  const result = await verifyStaging({ apiUrl: "https://api.example.com", fetchImpl: async () => { throw new Error("private detail"); } });
  assert.equal(result.valid, false);
  assert.equal(result.results[0].issue, "request failed");
  assert.equal(JSON.stringify(result).includes("private detail"), false);
});
