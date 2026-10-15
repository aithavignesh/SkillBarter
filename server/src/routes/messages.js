import { Router } from "express";
import mongoose from "mongoose";
import Exchange from "../models/Exchange.js";
import Message from "../models/Message.js";
import Block from "../models/Block.js";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { messageLimiter } from "../middleware/writeLimiters.js";

const router = Router();
router.use(requireAuth);

router.get("/exchange/:exchangeId", async (req, res) => {
  const { exchangeId } = req.params;
  if (!mongoose.isValidObjectId(exchangeId)) return res.status(400).json({ error: "Invalid exchange ID." });
  const exchange = await Exchange.findById(exchangeId).select("requester recipient");
  if (!exchange) return res.status(404).json({ error: "Exchange not found." });
  if (![String(exchange.requester), String(exchange.recipient)].includes(String(req.user._id))) {
    return res.status(403).json({ error: "Only exchange participants can view messages." });
  }
  const messages = await Message.find({ exchange: exchangeId }).populate("sender", "fullName username avatarUrl")
    .sort({ createdAt: 1 }).limit(500);
  return res.json({ messages });
});

router.post("/", messageLimiter, async (req, res) => {
  const { exchangeId, body } = req.body || {};
  if (!mongoose.isValidObjectId(exchangeId)) return res.status(400).json({ error: "A valid exchange ID is required." });
  if (typeof body !== "string" || !body.trim() || body.trim().length > 5000) {
    return res.status(400).json({ error: "Message must contain 1–5000 characters." });
  }
  const exchange = await Exchange.findById(exchangeId).select("requester recipient status");
  if (!exchange) return res.status(404).json({ error: "Exchange not found." });
  const userId = String(req.user._id);
  const requester = String(exchange.requester) === userId;
  const recipient = String(exchange.recipient) === userId;
  if (!requester && !recipient) return res.status(403).json({ error: "Only exchange participants can send messages." });
  const blocked = await Block.exists({ $or: [{ blocker: exchange.requester, blocked: exchange.recipient }, { blocker: exchange.recipient, blocked: exchange.requester }] });
  if (blocked) return res.status(403).json({ error: "Messaging is unavailable because one participant has blocked the other." });
  if (["cancelled", "declined"].includes(exchange.status)) return res.status(409).json({ error: "Messaging is disabled for this exchange." });
  const recipientId = requester ? exchange.recipient : exchange.requester;
  const message = await Message.create({ exchange: exchange._id, sender: req.user._id, recipient: recipientId, body: body.trim() });
  await Notification.create({ recipient: recipientId, actor: req.user._id, type: "message", title: "New exchange message", body: body.trim().slice(0, 180), resourceType: "message", resourceId: message._id });
  await message.populate("sender", "fullName username avatarUrl");
  return res.status(201).json({ message });
});

router.patch("/:id/read", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid message ID." });
  const message = await Message.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } }, { new: true }
  );
  if (!message) return res.status(404).json({ error: "Unread message not found." });
  return res.json({ message });
});

export default router;
