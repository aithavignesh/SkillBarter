import { Router } from "express";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import { hashResetToken } from "../utils/security.js";

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const genericResponse = { message: "If an account exists for that email, password reset instructions will be sent." };

router.post("/request", limiter, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(200).json(genericResponse);
    const mailConfig = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "PASSWORD_RESET_URL"];
    if (mailConfig.some((key) => !process.env[key])) {
      return res.status(503).json({ error: "Password recovery is temporarily unavailable." });
    }
    const user = await User.findOne({ email, isActive: true }).select("_id email");
    if (!user) return res.status(200).json(genericResponse);

    await PasswordResetToken.deleteMany({ user: user._id });
    const rawToken = randomBytes(32).toString("hex");
    await PasswordResetToken.create({ user: user._id, tokenHash: hashResetToken(rawToken), expiresAt: new Date(Date.now() + 15 * 60 * 1000) });

    const base = process.env.PASSWORD_RESET_URL;
    if (!/^https?:\/\//i.test(base)) {
      await PasswordResetToken.deleteMany({ user: user._id });
      return res.status(503).json({ error: "Password recovery is temporarily unavailable." });
    }
    const { sendPasswordResetEmail } = await import("../services/resetEmail.js");
    try {
      await sendPasswordResetEmail(user.email, new URL(`?token=${rawToken}`, base).toString());
    } catch (mailError) {
      await PasswordResetToken.deleteMany({ user: user._id });
      return res.status(503).json({ error: "Password recovery delivery is temporarily unavailable." });
    }
    return res.status(200).json(genericResponse);
  } catch (error) {
    return next(error);
  }
});

router.post("/confirm", limiter, async (req, res, next) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!/^[a-f0-9]{64}$/.test(token) || password.length < 10 || password.length > 128) {
      return res.status(400).json({ error: "Provide a valid reset token and a password of 10–128 characters." });
    }
    const tokenHash = hashResetToken(token);
    const record = await PasswordResetToken.findOneAndDelete({ tokenHash, expiresAt: { $gt: new Date() } });
    if (!record) return res.status(400).json({ error: "This reset link is invalid or expired. Request a new one." });

    const passwordHash = await bcrypt.hash(password, 12);
    // Increment tokenVersion so every existing JWT is revoked after a password change.
    const user = await User.findByIdAndUpdate(
      record.user,
      { $set: { passwordHash }, $inc: { tokenVersion: 1 } },
      { new: true }
    );
    await PasswordResetToken.deleteMany({ user: record.user });
    if (!user) return res.status(400).json({ error: "This reset link is invalid or expired. Request a new one." });
    return res.json({ message: "Password updated. Please sign in again." });
  } catch (error) {
    return next(error);
  }
});

export default router;
