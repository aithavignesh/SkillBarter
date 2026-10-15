import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email, resetUrl) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const username = process.env.SMTP_USER;
  const password = process.env["SMTP_PASSWORD"];
  const sender = process.env.SMTP_FROM;
  if (!host || !port || !username || !password || !sender) throw new Error("SMTP settings are missing.");
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    // Require STARTTLS on non-implicit-TLS ports so SMTP credentials are not sent over plaintext.
    requireTLS: port !== 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: { user: username, pass: password }
  });
  try {
    await transport.sendMail({
      from: sender,
      to: email,
      subject: "Reset your SkillBarter password",
      text: `Use this link within 15 minutes to reset your password: ${resetUrl}\n\nIgnore this email if you did not request a reset.`
    });
  } finally {
    transport.close();
  }
}
