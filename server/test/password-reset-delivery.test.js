import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import User from "../src/models/User.js";
import PasswordResetToken from "../src/models/PasswordResetToken.js";
import app from "../src/app.js";

const originalFindOne = User.findOne;
const originalDeleteMany = PasswordResetToken.deleteMany;
const originalCreate = PasswordResetToken.create;
const originalEnv = {};

const mailEnvironment = {
  PASSWORD_RESET_URL: "https://app.example.com/reset",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "smtp-user",
  SMTP_PASSWORD: "smtp-password",
  SMTP_FROM: "no-reply@example.com"
};

for (const [key, value] of Object.entries(mailEnvironment)) {
  originalEnv[key] = process.env[key];
  process.env[key] = value;
}

const server = app.listen(0);
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test("password reset email failure returns the generic response and removes the token", async (t) => {
  t.after(async () => {
    User.findOne = originalFindOne;
    PasswordResetToken.deleteMany = originalDeleteMany;
    PasswordResetToken.create = originalCreate;
    for (const key of Object.keys(mailEnvironment)) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  let deletedForUser = false;
  User.findOne = () => ({ select: async () => ({ _id: "68f000000000000000000001", email: "person@example.com" }) });
  PasswordResetToken.deleteMany = async (filter) => {
    if (filter.user === "68f000000000000000000001") deletedForUser = true;
    return { deletedCount: 1 };
  };
  PasswordResetToken.create = async () => ({});
  t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail() { throw new Error("SMTP unavailable"); },
    close() {}
  }));

  const response = await fetch(`${baseUrl}/api/auth/password-reset/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "person@example.com" })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    message: "If an account exists for that email, password reset instructions will be sent."
  });
  assert.equal(deletedForUser, true);
});
