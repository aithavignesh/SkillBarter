import nodemailer from "nodemailer";

export async function sendEmailLoginOtp(email, code) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const username = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const sender = process.env.SMTP_FROM;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !username || !password || !sender) {
    throw new Error("Email OTP delivery is not configured.");
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
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
      subject: "Your SkillBarter sign-in code",
      text: `Your SkillBarter sign-in code is ${code}. It expires in 5 minutes. If you did not request this code, you can ignore this email.`
    });
  } finally {
    transport.close();
  }
}
