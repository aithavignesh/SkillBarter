import { isIP } from "node:net";

const MIN_SECRET_LENGTH = 32;

export function validateEnvironment(env = process.env) {
  if (!env.MONGODB_URI?.trim()) {
    throw new Error("MONGODB_URI is required.");
  }

  if (!env.JWT_SECRET || env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  if (env.OTP_SECRET && env.OTP_SECRET.length < MIN_SECRET_LENGTH) {
    throw new Error("OTP_SECRET must contain at least 32 characters when configured.");
  }

  const twilioKeys = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID"];
  const hasTwilioConfig = twilioKeys.some((key) => Boolean(env[key]?.trim()));
  if (hasTwilioConfig) {
    if (twilioKeys.some((key) => !env[key]?.trim())) {
      throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID must be configured together.");
    }
    if (!/^AC[a-f0-9]{32}$/i.test(env.TWILIO_ACCOUNT_SID) ||
        !/^VA[a-f0-9]{32}$/i.test(env.TWILIO_VERIFY_SERVICE_SID) ||
        env.TWILIO_AUTH_TOKEN.length < 16) {
      throw new Error("Twilio Verify credentials have an invalid format.");
    }
  }

  const production = env.NODE_ENV === "production";
  if (production && !env.CLIENT_ORIGIN?.trim()) {
    throw new Error("CLIENT_ORIGIN must be configured in production.");
  }

  const origins = (env.CLIENT_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!origins.length) {
    throw new Error("At least one CLIENT_ORIGIN must be configured.");
  }

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error("CLIENT_ORIGIN must contain valid origin URLs.");
    }

    if (!["http:", "https:"].includes(parsed.protocol) ||
        parsed.username || parsed.password ||
        parsed.pathname !== "/" || parsed.search || parsed.hash) {
      throw new Error("CLIENT_ORIGIN entries must be origin URLs without paths or credentials.");
    }

    if (production && parsed.protocol !== "https:") {
      throw new Error("CLIENT_ORIGIN must use HTTPS in production.");
    }
  }

  if (env.PASSWORD_RESET_URL?.trim()) {
    if (env.PASSWORD_RESET_URL !== env.PASSWORD_RESET_URL.trim()) {
      throw new Error("PASSWORD_RESET_URL must not contain leading or trailing whitespace.");
    }

    const smtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"];
    if (smtpKeys.some((key) => !env[key]?.trim())) {
      throw new Error("PASSWORD_RESET_URL requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.");
    }

    if (/[\r\n]/.test(env.SMTP_FROM)) {
      throw new Error("SMTP_FROM must not contain line breaks.");
    }

    const smtpPortValue = env.SMTP_PORT;
    const smtpPort = Number(smtpPortValue);
    if (!/^\d+$/.test(smtpPortValue) || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
    }

    if (/\s|:\/\/|[/?#]/.test(env.SMTP_HOST)) {
      throw new Error("SMTP_HOST must be a hostname or IP address, not a URL.");
    }

    const smtpHost = env.SMTP_HOST.toLowerCase();
    const validHostname = smtpHost.length <= 253 &&
      smtpHost.split(".").every((label) =>
        label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
      );

    const looksLikeIPv4 = /^\d+(?:\.\d+){3}$/.test(env.SMTP_HOST);
    if ((isIP(env.SMTP_HOST) === 0 && !validHostname) ||
        (looksLikeIPv4 && isIP(env.SMTP_HOST) !== 4)) {
      throw new Error("SMTP_HOST must be a valid hostname or IP address.");
    }

    let resetUrl;
    try {
      resetUrl = new URL(env.PASSWORD_RESET_URL);
    } catch {
      throw new Error("PASSWORD_RESET_URL must be a valid absolute URL.");
    }

    if (!["http:", "https:"].includes(resetUrl.protocol) ||
        resetUrl.username || resetUrl.password || resetUrl.search || resetUrl.hash) {
      throw new Error("PASSWORD_RESET_URL must be an HTTP(S) URL without credentials, query, or fragment.");
    }

    if (production && resetUrl.protocol !== "https:") {
      throw new Error("PASSWORD_RESET_URL must use HTTPS in production.");
    }

    if (!origins.some((origin) => new URL(origin).origin === resetUrl.origin)) {
      throw new Error("PASSWORD_RESET_URL must use an origin listed in CLIENT_ORIGIN.");
    }
  }

  return { origins };
}
