import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Exchange from "../models/Exchange.js";
import Report from "../models/Report.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { reportLimiter } from "../middleware/writeLimiters.js";

const router = Router();
router.use(requireAuth);

router.post("/", reportLimiter, async (req, res) => {
  const { targetType, targetId, reason, details = "" } = req.body || {};
  if (!["user", "exchange"].includes(targetType) || !mongoose.isValidObjectId(targetId)) {
    return res.status(400).json({ error: "Only valid user or exchange targets can be reported right now." });
  }
  if (typeof reason !== "string" || reason.trim().length < 3 || reason.length > 120) {
    return res.status(400).json({ error: "Provide a reason between 3 and 120 characters." });
  }
  if (typeof details !== "string" || details.length > 2000) return res.status(400).json({ error: "Report details are too long." });
  if (targetType === "user" && String(targetId) === String(req.user._id)) return res.status(400).json({ error: "You cannot report your own account." });
  const target = targetType === "user" ? await User.findById(targetId).select("_id") : await Exchange.findById(targetId).select("_id requester recipient");
  if (!target) return res.status(404).json({ error: "Report target not found." });
  if (targetType === "exchange" && ![String(target.requester), String(target.recipient)].includes(String(req.user._id))) {
    return res.status(403).json({ error: "Only exchange participants can report an exchange." });
  }
  const report = await Report.create({
    reporter: req.user._id,
    targetUser: targetType === "user" ? target._id : null,
    targetType, targetId, reason: reason.trim(), details: details.trim()
  });
  return res.status(201).json({ report });
});

export default router;
