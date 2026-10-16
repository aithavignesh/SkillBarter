const REQUIRED_KEYS = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID"];

export function isPhoneOtpConfigured(env = process.env) {
  return REQUIRED_KEYS.every((key) => typeof env[key] === "string" && env[key].trim().length > 0);
}

function getTwilioConfig(env = process.env) {
  if (!isPhoneOtpConfigured(env)) {
    throw new Error("SMS OTP is not configured on the server.");
  }
  return {
    accountSid: env.TWILIO_ACCOUNT_SID.trim(),
    authToken: env.TWILIO_AUTH_TOKEN.trim(),
    serviceSid: env.TWILIO_VERIFY_SERVICE_SID.trim()
  };
}

async function verifyApiRequest(resource, values, env = process.env) {
  const { accountSid, authToken, serviceSid } = getTwilioConfig(env);
  const url = `https://verify.twilio.com/v2/Services/${serviceSid}/${resource}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams(values),
    signal: AbortSignal.timeout(10_000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Do not expose provider response bodies or credentials to callers/logs.
    const error = new Error("SMS verification provider request failed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function requestPhoneVerification(phone, env = process.env) {
  return verifyApiRequest("Verifications", { To: phone, Channel: "sms" }, env);
}

export async function checkPhoneVerification(phone, code, env = process.env) {
  const result = await verifyApiRequest("VerificationCheck", { To: phone, Code: code }, env);
  return result.status === "approved";
}
