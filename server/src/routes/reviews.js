import { Router } from "express";
import mongoose from "mongoose";
import Exchange from "../models/Exchange.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { reviewLimiter } from "../middleware/writeLimiters.js";
import { recordAnalyticsEvent } from "../services/analytics.js";

const router = Router();
router.use(requireAuth);

router.get("/user/:userId", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ error: "Invalid user ID." });
  const reviews = await Review.find({ reviewee: req.params.userId }).populate("reviewer", "fullName username avatarUrl")
    .sort({ createdAt: -1 }).limit(100);
  return res.json({ reviews });
});

router.post("/", reviewLimiter, async (req, res) => {
  const { exchangeId, rating, comment = "" } = req.body || {};
  if (!mongoose.isValidObjectId(exchangeId)) return res.status(400).json({ error: "A valid exchange ID is required." });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be an integer from 1 to 5." });
  if (typeof comment !== "string" || comment.length > 2000) return res.status(400).json({ error: "Review comment is too long." });
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) return res.status(404).json({ error: "Exchange not found." });
  if (exchange.status !== "completed" || !exchange.completedByRequester || !exchange.completedByRecipient) {
    return res.status(409).json({ error: "Reviews are available only after both participants complete the exchange." });
  }
  const userId = String(req.user._id);
  const isRequester = String(exchange.requester) === userId;
  const isRecipient = String(exchange.recipient) === userId;
  if (!isRequester && !isRecipient) return res.status(403).json({ error: "Only exchange participants can leave a review." });
  const reviewee = isRequester ? exchange.recipient : exchange.requester;
  try {
    const review = await Review.create({ exchange: exchange._id, reviewer: req.user._id, reviewee, rating, comment: comment.trim() });
    const [summary] = await Review.aggregate([
      { $match: { reviewee: new mongoose.Types.ObjectId(String(reviewee)) } },
      { $group: { _id: null, averageRating: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);
    await User.findByIdAndUpdate(reviewee, {
      $set: {
        reviewsCount: summary?.count ?? 0,
        trustScore: summary ? Math.round((summary.averageRating / 5) * 100) : 0
      }
    }, { runValidators: true });
    await Notification.create({ recipient: reviewee, actor: req.user._id, type: "review", title: "You received a review", body: `A participant left you a ${rating}-star review.`, resourceType: "review", resourceId: review._id });
    await recordAnalyticsEvent({ actor: req.user._id, name: "review_submitted", path: "/reviews" });
    await review.populate("reviewer", "fullName username avatarUrl");
    return res.status(201).json({ review });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "You have already reviewed this exchange." });
    throw error;
  }
});

export default router;
