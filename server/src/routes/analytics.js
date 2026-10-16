import { Router } from "express";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import { requireAuth } from "../middleware/requireAuth.js";
import rateLimit from "express-rate-limit";

const router = Router();
const eventLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many analytics events. Please try again shortly." }
});
const eventNames = new Set([
  "page_view", "exchange_view", "message_sent", "exchange_request_created",
  "exchange_status_changed", "review_submitted", "community_post_created", "comment_created"
]);
const allowedPaths = new Set([
  "/", "/dashboard", "/onboarding", "/matches", "/exchanges", "/notifications",
  "/community", "/profile", "/reviews", "/settings", "/admin"
]);

router.post("/event", requireAuth, eventLimiter, async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name : "";
    if (!eventNames.has(name)) return res.status(400).json({ error: "Unsupported analytics event." });
    const rawPath = typeof req.body?.path === "string" ? req.body.path.split("?")[0] : "";
    const path = allowedPaths.has(rawPath) ? rawPath : "";
    const event = await AnalyticsEvent.create({
      actor: req.user._id,
      name,
      path,
      properties: {}
    });
    return res.status(201).json({ success: true, eventId: event._id });
  } catch (error) {
    return next(error);
  }
});

export default router;
