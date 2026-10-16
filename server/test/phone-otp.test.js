import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  isPhoneOtpConfigured,
  requestPhoneVerification,
  checkPhoneVerification
} from "../src/services/phoneOtp.js";

const originalFetch = globalThis.fetch;
const env = {
  TWILIO_ACCOUNT_SID: "AC" + "a".repeat(32),
  TWILIO_AUTH_TOKEN: "test-auth-token-which-is-long-enough",
  TWILIO_VERIFY_SERVICE_SID: "VA" + "b".repeat(32)
};

after(() => {
  globalThis.fetch = originalFetch;
});

test("phone OTP configuration requires every Twilio Verify credential", () => {
  assert.equal(isPhoneOtpConfigured({}), false);
  assert.equal(isPhoneOtpConfigured({ ...env, TWILIO_AUTH_TOKEN: "" }), false);
  assert.equal(isPhoneOtpConfigured(env), true);
});

test("phone OTP request sends an SMS through Twilio Verify", async () => {
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ status: "pending" }), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  };

  const result = await requestPhoneVerification("+919876543210", env);
  assert.equal(result.status, "pending");
  assert.equal(captured.url, `https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SERVICE_SID}/Verifications`);
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.headers.Authorization, `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`);
  assert.deepEqual(Object.fromEntries(captured.options.body.entries()), {
    To: "+919876543210",
    Channel: "sms"
  });
});

test("phone OTP verification accepts only an approved provider result", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ status: "approved" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  assert.equal(await checkPhoneVerification("+919876543210", "123456", env), true);

  globalThis.fetch = async () => new Response(JSON.stringify({ status: "pending" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  assert.equal(await checkPhoneVerification("+919876543210", "123456", env), false);
});

test("phone OTP provider failures do not expose provider response details", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "sensitive provider detail" }), {
    status: 500,
    headers: { "content-type": "application/json" }
  });
  await assert.rejects(
    requestPhoneVerification("+919876543210", env),
    (error) => error.message === "SMS verification provider request failed." && error.status === 500
  );
});
