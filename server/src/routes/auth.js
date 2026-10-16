import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";
import rateLimit from "express-rate-limit";
import EmailOtpChallenge from "../models/EmailOtpChallenge.js";
import { sendEmailLoginOtp } from "../services/authEmail.js";
import { emailOtpMatches, generateEmailOtp, hashEmailOtp } from "../utils/emailOtp.js";
import { isPhoneOtpConfigured, requestPhoneVerification, checkPhoneVerification } from "../services/phoneOtp.js";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Too many authentication attempts. Please try again later." } });
const otpRequestLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { error: "Too many code requests. Please try again later." } });
const otpVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Too many verification attempts. Please request a new code later." } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;

function normalizeE164Phone(value) {
  if (typeof value !== "string") return "";
  const phone = value.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : "";
}

function issueToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  return jwt.sign({ sub: user.id, tokenVersion: user.tokenVersion ?? 0 }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || "1h", issuer: "skillbarter-api", audience: "skillbarter-web" });
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    headline: user.headline,
    onboardingCompleted: user.onboardingCompleted,
    isAdmin: user.isAdmin
  };
}

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
    const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (fullName.length < 2 || fullName.length > 100) return res.status(400).json({ error: "Enter a name between 2 and 100 characters." });
    if (!usernamePattern.test(username)) return res.status(400).json({ error: "Username must be 3–30 characters using letters, numbers, or underscores." });
    if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < 10 || password.length > 128) return res.status(400).json({ error: "Password must be between 10 and 128 characters." });

    const phone = normalizeE164Phone(req.body?.phone);
    const phoneVerificationToken = typeof req.body?.phoneVerificationToken === "string" ? req.body.phoneVerificationToken : "";
    if (!phone) return res.status(400).json({ error: "Enter a valid mobile number in international format, such as +919876543210." });

    let phoneProof;
    try {
      phoneProof = jwt.verify(phoneVerificationToken, process.env.JWT_SECRET, {
        issuer: "skillbarter-api",
        audience: "skillbarter-web"
      });
    } catch {
      phoneProof = null;
    }
    if (phoneProof?.purpose !== "phone_registration" || phoneProof?.phone !== phone) {
      return res.status(403).json({ error: "Verify your mobile number before creating an account." });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }, { phone }] }).select("_id email username phone");
    if (existing) {
      if (existing.email === email) return res.status(409).json({ error: "An account with this email already exists." });
      if (existing.username === username) return res.status(409).json({ error: "This username is already taken." });
      return res.status(409).json({ error: "This mobile number is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, username, email, phone, passwordHash });
    return res.status(201).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Email, username, or mobile number is already registered." });
    return next(error);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!emailPattern.test(email) || !password || password.length > 128) {
      return res.status(400).json({ error: "Enter your email and password; password must be at most 128 characters." });
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    return res.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/otp/request", otpRequestLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!emailPattern.test(email) || email.length > 254) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    const smtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"];
    if (smtpKeys.some((key) => !process.env[key]?.trim())) {
      return res.status(503).json({ error: "Email OTP sign-in is temporarily unavailable." });
    }

    const genericResponse = { message: "If an active account exists for that email, a sign-in code will be sent." };
    const user = await User.findOne({ email, isActive: true }).select("_id email");
    if (!user) return res.json(genericResponse);

    await EmailOtpChallenge.deleteMany({ email, purpose: "login" });
    const code = generateEmailOtp();
    await EmailOtpChallenge.create({
      email,
      purpose: "login",
      codeHash: hashEmailOtp(email, code),
      attempts: 0,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    try {
      await sendEmailLoginOtp(email, code);
    } catch {
      await EmailOtpChallenge.deleteMany({ email, purpose: "login" });
      return res.status(503).json({ error: "Email OTP sign-in is temporarily unavailable." });
    }
    return res.json(genericResponse);
  } catch (error) {
    return next(error);
  }
});

router.post("/otp/verify", otpVerifyLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!emailPattern.test(email) || email.length > 254 || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Enter a valid email address and 6-digit code." });
    }

    const challenge = await EmailOtpChallenge.findOne({
      email,
      purpose: "login",
      consumedAt: null,
      expiresAt: { $gt: new Date() }
    }).select("+codeHash").sort({ createdAt: -1 });

    if (!challenge || challenge.attempts >= 5 || !emailOtpMatches(challenge.codeHash, email, code)) {
      if (challenge && challenge.attempts < 5) {
        await EmailOtpChallenge.updateOne(
          { _id: challenge._id, consumedAt: null, attempts: challenge.attempts },
          { $inc: { attempts: 1 } }
        );
      }
      return res.status(401).json({ error: "The sign-in code is invalid or expired. Request a new code and try again." });
    }

    const consumed = await EmailOtpChallenge.findOneAndUpdate(
      { _id: challenge._id, consumedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
      { $set: { consumedAt: new Date() } },
      { new: true }
    );
    if (!consumed) return res.status(401).json({ error: "The sign-in code is invalid or expired. Request a new code and try again." });

    const user = await User.findOne({ email, isActive: true }).select("_id email username fullName phone avatarUrl bio headline onboardingCompleted isAdmin tokenVersion");
    if (!user) return res.status(401).json({ error: "The sign-in code is invalid or expired. Request a new code and try again." });
    return res.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/phone-otp/request", otpRequestLimiter, async (req, res, next) => {
  try {
    const phone = normalizeE164Phone(req.body?.phone);
    const purpose = req.body?.purpose === "register" ? "register" : "login";
    if (!phone) return res.status(400).json({ error: "Enter a valid mobile number in international format, such as +919876543210." });
    if (!isPhoneOtpConfigured()) return res.status(503).json({ error: "SMS OTP is not configured on the server." });

    if (purpose === "register") {
      const existing = await User.findOne({ phone }).select("_id");
      if (existing) return res.status(409).json({ error: "This mobile number is already registered." });
    } else {
      const user = await User.findOne({ phone, isActive: true }).select("_id");
      if (!user) return res.json({ message: "If an active account is linked to that number, a verification code will be sent." });
    }

    try {
      await requestPhoneVerification(phone);
    } catch {
      return res.status(503).json({ error: "SMS OTP delivery is temporarily unavailable." });
    }
    return res.json({ message: "If the mobile number can be used, a verification code has been sent." });
  } catch (error) {
    return next(error);
  }
});

router.post("/phone-otp/verify", otpVerifyLimiter, async (req, res, next) => {
  try {
    const phone = normalizeE164Phone(req.body?.phone);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const purpose = req.body?.purpose === "register" ? "register" : "login";
    if (!phone || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Enter a valid mobile number and 6-digit SMS code." });
    }
    if (!isPhoneOtpConfigured()) return res.status(503).json({ error: "SMS OTP is not configured on the server." });

    let approved = false;
    try {
      approved = await checkPhoneVerification(phone, code);
    } catch {
      return res.status(503).json({ error: "SMS verification is temporarily unavailable." });
    }
    if (!approved) return res.status(401).json({ error: "The SMS code is invalid or expired. Request a new code and try again." });

    if (purpose === "register") {
      const existing = await User.findOne({ phone }).select("_id");
      if (existing) return res.status(409).json({ error: "This mobile number is already registered." });
      const phoneVerificationToken = jwt.sign(
        { purpose: "phone_registration", phone },
        process.env.JWT_SECRET,
        { expiresIn: "10m", issuer: "skillbarter-api", audience: "skillbarter-web" }
      );
      return res.json({ verified: true, phone, phoneVerificationToken });
    }

    const user = await User.findOne({ phone, isActive: true }).select("_id email username fullName phone avatarUrl bio headline onboardingCompleted isAdmin tokenVersion");
    if (!user) return res.status(401).json({ error: "The SMS code is invalid or expired. Request a new code and try again." });
    return res.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    // Revoke the current JWT immediately rather than relying only on cookie deletion.
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } }, { new: true });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });
  return res.json({ user: publicUser(user) });
});

export default router;
