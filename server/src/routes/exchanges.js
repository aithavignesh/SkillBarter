import { Router } from "express";
import mongoose from "mongoose";
import Exchange from "../models/Exchange.js";
import Skill from "../models/Skill.js";
import User from "../models/User.js";
import Block from "../models/Block.js";
import { validateScheduledAt } from "../utils/security.js";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { exchangeLimiter } from "../middleware/writeLimiters.js";
import { recordAnalyticsEvent } from "../services/analytics.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const filter = { $or: [{ requester: req.user._id }, { recipient: req.user._id }] };
  if (typeof req.query.status === "string" && ["pending", "accepted", "scheduled", "active", "completed", "declined", "cancelled"].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  const exchanges = await Exchange.find(filter).populate("requester", "fullName username avatarUrl")
    .populate("recipient", "fullName username avatarUrl").populate("skillOffered", "name category")
    .populate("skillRequested", "name category").sort({ updatedAt: -1 }).limit(100);
  return res.json({ exchanges });
});

router.post("/", exchangeLimiter, async (req, res) => {
  const { recipientId, skillOfferedId, skillRequestedId, message = "" } = req.body || {};
  if (![recipientId, skillOfferedId, skillRequestedId].every(mongoose.isValidObjectId)) {
    return res.status(400).json({ error: "Recipient and both skill IDs are required." });
  }
  if (String(req.user._id) === String(recipientId)) return res.status(400).json({ error: "You cannot request an exchange with yourself." });
  const blocked = await Block.exists({ $or: [{ blocker: req.user._id, blocked: recipientId }, { blocker: recipientId, blocked: req.user._id }] });
  if (blocked) return res.status(403).json({ error: "An exchange cannot be requested across a blocked relationship." });
  if (typeof message !== "string" || message.length > 2000) return res.status(400).json({ error: "Message must be 2000 characters or fewer." });

  const [recipient, offered, requested] = await Promise.all([
    User.findOne({ _id: recipientId, isActive: true }).select("skillsToTeach"),
    Skill.findOne({ _id: skillOfferedId }),
    Skill.findById(skillRequestedId)
  ]);
  if (!recipient) return res.status(404).json({ error: "Recipient account not found." });
  if (!offered || !req.user.skillsToTeach.some((skillId) => String(skillId) === String(offered._id))) return res.status(400).json({ error: "The offered skill must be in your teaching skills." });
  if (!requested) return res.status(404).json({ error: "Requested skill not found." });
  if (!recipient.skillsToTeach.some((skillId) => String(skillId) === String(requested._id))) return res.status(400).json({ error: "The recipient must list the requested skill among their teaching skills." });

  const exchange = await Exchange.create({
    requester: req.user._id, recipient: recipient._id,
    skillOffered: offered._id, skillRequested: requested._id, message: message.trim()
  });
  await Notification.create({ recipient: recipient._id, actor: req.user._id, type: "exchange_request", title: "New exchange request", body: `${req.user.fullName} wants to exchange ${offered.name} for ${requested.name}.`, resourceType: "exchange", resourceId: exchange._id });
  await recordAnalyticsEvent({ actor: req.user._id, name: "exchange_request_created", path: "/matches" });
  await exchange.populate([
    { path: "requester", select: "fullName username avatarUrl" },
    { path: "recipient", select: "fullName username avatarUrl" },
    { path: "skillOffered", select: "name category" },
    { path: "skillRequested", select: "name category" }
  ]);
  return res.status(201).json({ exchange });
});

router.patch("/:id/status", exchangeLimiter, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid exchange ID." });
  const nextStatus = req.body?.status;
  if (!["accepted", "declined", "cancelled", "scheduled", "active", "completed"].includes(nextStatus)) {
    return res.status(400).json({ error: "Unsupported exchange status." });
  }
  const exchange = await Exchange.findById(req.params.id);
  if (!exchange) return res.status(404).json({ error: "Exchange not found." });
  const requester = String(exchange.requester) === String(req.user._id);
  const recipient = String(exchange.recipient) === String(req.user._id);
  if (!requester && !recipient) return res.status(403).json({ error: "You are not a participant in this exchange." });

  if (nextStatus === "accepted" || nextStatus === "declined") {
    if (!recipient || exchange.status !== "pending") return res.status(403).json({ error: "Only the recipient can respond to a pending request." });
  } else if (nextStatus === "cancelled") {
    if (!requester || !["pending", "accepted", "scheduled"].includes(exchange.status)) return res.status(403).json({ error: "This exchange cannot be cancelled by you." });
  } else if (nextStatus === "scheduled") {
    if (exchange.status !== "accepted") return res.status(409).json({ error: "Only accepted exchanges can be scheduled." });

    const scheduling = validateScheduledAt(req.body?.scheduledAt);
    if (scheduling.error) return res.status(400).json({ error: scheduling.error });
    const scheduledAtMs = scheduling.date.getTime();

    // A block may be created after the exchange request was accepted.
    // Re-check at scheduling time so the relationship cannot bypass a block.
    const blocked = await Block.exists({
      $or: [
        { blocker: exchange.requester, blocked: exchange.recipient },
        { blocker: exchange.recipient, blocked: exchange.requester }
      ]
    });
    if (blocked) return res.status(403).json({ error: "This exchange cannot be scheduled because one participant has blocked the other." });

    exchange.scheduledAt = new Date(scheduledAtMs);
  } else if (nextStatus === "active") {
    if (!["accepted", "scheduled"].includes(exchange.status)) return res.status(409).json({ error: "Only accepted or scheduled exchanges can become active." });
    // Check both accepted and scheduled exchanges. A block can be added
    // after acceptance, so direct activation must not bypass block enforcement.
    const blocked = await Block.exists({
      $or: [
        { blocker: exchange.requester, blocked: exchange.recipient },
        { blocker: exchange.recipient, blocked: exchange.requester }
      ]
    });
    if (blocked) return res.status(403).json({ error: "This exchange cannot start because one participant has blocked the other." });
  } else if (nextStatus === "completed") {
    if (!["active", "scheduled"].includes(exchange.status)) return res.status(409).json({ error: "Only active or scheduled exchanges can be completed." });
    if (requester) exchange.completedByRequester = true;
    if (recipient) exchange.completedByRecipient = true;
    if (!exchange.completedByRequester || !exchange.completedByRecipient) {
      await exchange.save();
      return res.json({ exchange, awaitingOtherParticipant: true });
    }
  }

  exchange.status = nextStatus;
  await exchange.save();
  const notifyUserId = requester ? exchange.recipient : exchange.requester;
  await Notification.create({ recipient: notifyUserId, actor: req.user._id, type: "exchange_update", title: "Exchange updated", body: `Your exchange request was marked ${nextStatus}.`, resourceType: "exchange", resourceId: exchange._id });
  await exchange.populate([
    { path: "requester", select: "fullName username avatarUrl" },
    { path: "recipient", select: "fullName username avatarUrl" },
    { path: "skillOffered", select: "name category" },
    { path: "skillRequested", select: "name category" }
  ]);
  return res.json({ exchange });
});

export default router;
