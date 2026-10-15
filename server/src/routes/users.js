import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Block from "../models/Block.js";
import Skill from "../models/Skill.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

const safeProfile = (user) => ({
  id: user.id,
  fullName: user.fullName,
  username: user.username,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  headline: user.headline,
  skillsToTeach: user.skillsToTeach,
  skillsToLearn: user.skillsToLearn,
  onboardingCompleted: user.onboardingCompleted,
  createdAt: user.createdAt
});

router.get("/me", async (req, res) => {
  const user = await User.findById(req.user.id).populate("skillsToTeach", "name category").populate("skillsToLearn", "name category");
  if (!user) return res.status(404).json({ error: "Account not found." });
  return res.json({ user: safeProfile(user) });
});

router.patch("/me", async (req, res, next) => {
  try {
    const allowed = ["fullName", "bio", "headline", "avatarUrl", "phone", "onboardingCompleted", "skillsToTeach", "skillsToLearn"];
    const update = {};
    for (const key of allowed) {
      if (Object.hasOwn(req.body || {}, key)) update[key] = req.body[key];
    }
    if (typeof update.fullName === "string" && (update.fullName.trim().length < 2 || update.fullName.trim().length > 100)) {
      return res.status(400).json({ error: "Name must be between 2 and 100 characters." });
    }
    if (typeof update.bio === "string" && update.bio.length > 1000) return res.status(400).json({ error: "Bio is too long." });
    if (typeof update.headline === "string" && update.headline.length > 160) return res.status(400).json({ error: "Headline is too long." });
    if (typeof update.fullName === "string") update.fullName = update.fullName.trim();
    if (typeof update.phone === "string" && update.phone.length > 30) return res.status(400).json({ error: "Phone number is too long." });
    for (const key of ["skillsToTeach", "skillsToLearn"]) {
      if (update[key] && (!Array.isArray(update[key]) || update[key].length > 30 || update[key].some((id) => !mongoose.isValidObjectId(id)))) {
        return res.status(400).json({ error: "Skill selections are invalid." });
      }
    }
    if (Object.hasOwn(update, "onboardingCompleted") && typeof update.onboardingCompleted !== "boolean") {
      return res.status(400).json({ error: "onboardingCompleted must be a boolean." });
    }
    if (Object.hasOwn(update, "phone") && typeof update.phone !== "string") {
      return res.status(400).json({ error: "Phone number must be a string." });
    }
    if (update.onboardingCompleted === true) {
      const current = await User.findById(req.user._id).select("skillsToTeach skillsToLearn");
      if (!current) return res.status(404).json({ error: "Account not found." });
      const finalTeach = update.skillsToTeach ?? current.skillsToTeach;
      const finalLearn = update.skillsToLearn ?? current.skillsToLearn;
      if (!finalTeach.length || !finalLearn.length) {
        return res.status(400).json({ error: "Choose at least one skill to teach and one skill to learn before completing onboarding." });
      }
    }
    const skillIds = [...new Set([...(update.skillsToTeach || []), ...(update.skillsToLearn || [])].map(String))];
    if (skillIds.length) {
      const existingCount = await Skill.countDocuments({ _id: { $in: skillIds } });
      if (existingCount !== skillIds.length) return res.status(400).json({ error: "One or more selected skills do not exist." });
    }
    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true, runValidators: true })
      .populate("skillsToTeach", "name category").populate("skillsToLearn", "name category");
    if (!user) return res.status(404).json({ error: "Account not found." });
    return res.json({ user: safeProfile(user) });
  } catch (error) { return next(error); }
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid user ID." });
  const user = await User.findById(req.params.id).populate("skillsToTeach", "name category").populate("skillsToLearn", "name category");
  if (!user || !user.isActive) return res.status(404).json({ error: "User not found." });

  const blocked = await Block.exists({
    $or: [
      { blocker: req.user._id, blocked: user._id },
      { blocker: user._id, blocked: req.user._id }
    ]
  });
  if (blocked) return res.status(404).json({ error: "User not found." });

  return res.json({ user: safeProfile(user) });
});

router.get("/", async (req, res) => {
  const rawLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 30) : 20;
  const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
  const blocks = await Block.find({ $or: [{ blocker: req.user._id }, { blocked: req.user._id }] }).select("blocker blocked");
  const excludedIds = blocks.map((block) => String(block.blocker) === String(req.user._id) ? block.blocked : block.blocker);
  const filter = { isActive: true, _id: { $ne: req.user._id, $nin: excludedIds } };
  if (query) filter.$text = { $search: query };
  const users = await User.find(filter).select("fullName username avatarUrl bio headline skillsToTeach skillsToLearn onboardingCompleted createdAt")
    .populate("skillsToTeach", "name category").populate("skillsToLearn", "name category").limit(limit).sort({ createdAt: -1 });
  return res.json({ users: users.map(safeProfile) });
});

export default router;
