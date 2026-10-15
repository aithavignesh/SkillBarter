import { Router } from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user._id }).populate("actor", "fullName username avatarUrl").sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ recipient: req.user._id, readAt: null })
  ]);
  return res.json({ notifications, unreadCount });
});

router.patch("/read-all", async (req, res) => {
  const result = await Notification.updateMany({ recipient: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  return res.json({ success: true, updatedCount: result.modifiedCount });
});

router.patch("/:id/read", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid notification ID." });
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { readAt: new Date() } }, { new: true }
  );
  if (!notification) return res.status(404).json({ error: "Notification not found." });
  return res.json({ notification });
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid notification ID." });
  const result = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  if (!result) return res.status(404).json({ error: "Notification not found." });
  return res.json({ success: true });
});

export default router;
