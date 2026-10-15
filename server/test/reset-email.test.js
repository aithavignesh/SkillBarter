import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { sendPasswordResetEmail } from "../src/services/resetEmail.js";

function setMailEnvironment(t) {
  const values = {
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "smtp-user",
    SMTP_PASSWORD: "smtp-password",
    SMTP_FROM: "no-reply@example.com"
  };
  for (const [key, value] of Object.entries(values)) {
    t.mock.method(process.env, "toString", () => "");
    process.env[key] = value;
    t.after(() => { delete process.env[key]; });
  }
}

test("sends reset email with STARTTLS and bounded connection timeouts", async (t) => {
  setMailEnvironment(t);
  let options;
  let message;
  let closed = false;
  t.mock.method(nodemailer, "createTransport", (config) => {
    options = config;
    return {
      async sendMail(value) { message = value; },
      close() { closed = true; }
    };
  });

  await sendPasswordResetEmail("person@example.com", "https://app.example.com/reset?token=abc");

  assert.equal(options.host, "smtp.example.com");
  assert.equal(options.port, 587);
  assert.equal(options.secure, false);
  assert.equal(options.requireTLS, true);
  assert.equal(options.connectionTimeout, 10_000);
  assert.equal(options.greetingTimeout, 10_000);
  assert.equal(options.socketTimeout, 20_000);
  assert.equal(message.to, "person@example.com");
  assert.match(message.text, /https:\/\/app\.example\.com\/reset\?token=abc/);
  assert.equal(closed, true);
});

test("closes the SMTP transport when sending fails", async (t) => {
  setMailEnvironment(t);
  let closed = false;
  t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail() { throw new Error("SMTP unavailable"); },
    close() { closed = true; }
  }));

  await assert.rejects(
    sendPasswordResetEmail("person@example.com", "https://app.example.com/reset?token=abc"),
    /SMTP unavailable/
  );
  assert.equal(closed, true);
});

test("uses implicit TLS on SMTP port 465", async (t) => {
  setMailEnvironment(t);
  process.env.SMTP_PORT = "465";
  let options;
  t.mock.method(nodemailer, "createTransport", (config) => {
    options = config;
    return { async sendMail() {}, close() {} };
  });

  await sendPasswordResetEmail("person@example.com", "https://app.example.com/reset?token=abc");
  assert.equal(options.secure, true);
  assert.equal(options.requireTLS, false);
});
