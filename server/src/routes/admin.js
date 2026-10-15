import { Router } from "express";
import User from "../models/User.js";
import Exchange from "../models/Exchange.js";
import Report from "../models/Report.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/stats", async (_req, res) => {
  const [users, activeUsers, exchanges, pendingExchanges, openReports] = await Promise.all([
    User.countDocuments(), User.countDocuments({ isActive: true }),
    Exchange.countDocuments(), Exchange.countDocuments({ status: "pending" }),
    Report.countDocuments({ status: "open" })
  ]);
  return res.json({ stats: { users, activeUsers, exchanges, pendingExchanges, openReports } });
});

router.get("/users", async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
  const users = await User.find().select("fullName username email isActive isAdmin onboardingCompleted createdAt")
    .sort({ createdAt: -1 }).limit(limit);
  return res.json({ users });
});

router.patch("/users/:id/status", async (req, res) => {
  const { id } = req.params;
  if (!/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({ error: "Invalid user ID." });
  if (id === String(req.user._id)) return res.status(400).json({ error: "You cannot deactivate your own account." });
  if (typeof req.body?.isActive !== "boolean") return res.status(400).json({ error: "isActive must be a boolean." });
  const user = await User.findByIdAndUpdate(id, { $set: { isActive: req.body.isActive } }, { new: true })
    .select("fullName username email isActive isAdmin");
  if (!user) return res.status(404).json({ error: "User not found." });
  return res.json({ user });
});

router.get("/exchanges", async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
  const exchanges = await Exchange.find().populate("requester", "fullName username email")
    .populate("recipient", "fullName username email").populate("skillOffered", "name")
    .populate("skillRequested", "name").sort({ createdAt: -1 }).limit(limit);
  return res.json({ exchanges });
});

router.get("/reports", async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
  const reports = await Report.find().populate("reporter", "fullName username email")
    .populate("targetUser", "fullName username email").populate("resolvedBy", "fullName username")
    .sort({ createdAt: -1 }).limit(limit);
  return res.json({ reports });
});

router.patch("/reports/:id", async (req, res) => {
  const { id } = req.params;
  if (!/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({ error: "Invalid report ID." });
  const { status, resolutionNote = "" } = req.body || {};
  if (!["reviewing", "resolved", "dismissed", "open"].includes(status)) return res.status(400).json({ error: "Invalid report status." });
  if (typeof resolutionNote !== "string" || resolutionNote.length > 2000) return res.status(400).json({ error: "Resolution note is too long." });
  const report = await Report.findByIdAndUpdate(id, { $set: { status, resolutionNote, resolvedBy: req.user._id } }, { new: true, runValidators: true });
  if (!report) return res.status(404).json({ error: "Report not found." });
  return res.json({ report });
});

export default router;
