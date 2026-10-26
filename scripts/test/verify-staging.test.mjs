import test from "node:test";
import assert from "node:assert/strict";
import { verifyStaging } from "../verify-staging.mjs";

function fakeFetch(responses) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
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
  for (const call of fetchImpl.calls) {
    assert.equal(call.options.method, "GET");
    assert.equal(call.options.redirect, "error");
    assert.ok(call.options.signal instanceof AbortSignal);
  }
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

test("staging verifier rejects missing, malformed, credential-bearing, and unsafe URLs", async () => {
  await assert.rejects(() => verifyStaging({}), /STAGING_API_URL is required/);
  await assert.rejects(() => verifyStaging({ apiUrl: "not a URL" }), /valid absolute URL/);
  await assert.rejects(() => verifyStaging({ apiUrl: "https://user:secret@example.com" }), /must not contain credentials/);
  await assert.rejects(() => verifyStaging({ apiUrl: "https://api.example.com/prefix" }), /base URL without a path/);
  await assert.rejects(() => verifyStaging({ apiUrl: "ftp://api.example.com" }), /must use HTTP or HTTPS/);
  await assert.rejects(() => verifyStaging({ apiUrl: "https://api.example.com?token=secret" }), /must not contain credentials/);
});

test("staging verifier reports non-JSON health payloads as unhealthy", async () => {
  const fetchImpl = async () => ({ status: 200, json: async () => { throw new SyntaxError("not JSON"); } });
  const result = await verifyStaging({ apiUrl: "https://api.example.com", fetchImpl });
  assert.equal(result.valid, false);
  assert.equal(result.results.every((item) => item.ok === false), true);
});

test("staging verifier reports frontend server errors as failures", async () => {
  const fetchImpl = fakeFetch({
    "https://api.example.com/api/health": { status: 200, body: { status: "ok", service: "skillbarter-api" } },
    "https://api.example.com/api/health/ready": { status: 200, body: { status: "ready", checks: { database: "connected" } } },
    "https://web.example.com": { status: 500, body: {} }
  });
  const result = await verifyStaging({ apiUrl: "https://api.example.com", webUrl: "https://web.example.com", fetchImpl });
  assert.equal(result.valid, false);
  assert.equal(result.results[2].issue, "frontend returned a non-success status");
});

test("staging verifier reports request failures without leaking error details", async () => {
  const result = await verifyStaging({ apiUrl: "https://api.example.com", fetchImpl: async () => { throw new Error("private detail"); } });
  assert.equal(result.valid, false);
  assert.equal(result.results[0].issue, "request failed");
  assert.equal(JSON.stringify(result).includes("private detail"), false);
});

test("staging verifier reports request timeouts without leaking error details", async () => {
  const fetchImpl = (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => {
      const error = new Error("private timeout details");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  });
  const result = await verifyStaging({ apiUrl: "https://api.example.com", fetchImpl, timeoutMs: 5 });
  assert.equal(result.valid, false);
  assert.equal(result.results.every((item) => item.issue === "request timed out"), true);
  assert.equal(JSON.stringify(result).includes("private timeout details"), false);
});

test("staging verifier validates timeout bounds before making requests", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error("should not be called"); };
  for (const timeoutMs of [0, -1, 1.5, NaN, Infinity, 120001]) {
    await assert.rejects(
      () => verifyStaging({ apiUrl: "https://api.example.com", fetchImpl, timeoutMs }),
      /timeoutMs must be an integer between 1 and 120000 milliseconds/
    );
  }
  assert.equal(calls, 0);
});

test("staging verifier validates optional frontend URL before contacting the API", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error("should not be called"); };
  await assert.rejects(
    () => verifyStaging({ apiUrl: "https://api.example.com", webUrl: "https://web.example.com/path", fetchImpl }),
    /STAGING_WEB_URL must be a base URL without a path/
  );
  assert.equal(calls, 0);
});


test("staging verifier timeout covers a stalled health response body", async () => {
  const fetchImpl = async (_url, { signal }) => ({
    status: 200,
    json: () => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("private body timeout details");
        error.name = "AbortError";
        reject(error);
      }, { once: true });
    })
  });
  const result = await verifyStaging({ apiUrl: "https://api.example.com", fetchImpl, timeoutMs: 5 });
  assert.equal(result.valid, false);
  assert.equal(result.results.every((item) => item.issue === "request timed out"), true);
  assert.equal(JSON.stringify(result).includes("private body timeout details"), false);
});
