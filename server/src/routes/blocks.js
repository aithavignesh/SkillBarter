import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Block from "../models/Block.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { blockLimiter } from "../middleware/writeLimiters.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const blocks = await Block.find({ blocker: req.user._id }).populate("blocked", "fullName username avatarUrl").sort({ createdAt: -1 });
  return res.json({ blocks });
});

router.post("/:userId", blockLimiter, async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: "Invalid user ID." });
  if (String(userId) === String(req.user._id)) return res.status(400).json({ error: "You cannot block your own account." });
  const user = await User.findOne({ _id: userId, isActive: true }).select("_id");
  if (!user) return res.status(404).json({ error: "User not found." });
  try {
    const block = await Block.create({ blocker: req.user._id, blocked: user._id });
    return res.status(201).json({ block });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "This user is already blocked." });
    throw error;
  }
});

router.delete("/:userId", blockLimiter, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ error: "Invalid user ID." });
  const result = await Block.findOneAndDelete({ blocker: req.user._id, blocked: req.params.userId });
  if (!result) return res.status(404).json({ error: "Block not found." });
  return res.json({ success: true });
});

export default router;
