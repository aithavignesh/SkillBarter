import { Router } from "express";
import Block from "../models/Block.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const teachIds = (req.user.skillsToTeach || []).map(String);
  const learnIds = (req.user.skillsToLearn || []).map(String);
  if (!teachIds.length || !learnIds.length) return res.json({ matches: [], message: "Complete your teaching and learning skills to find matches." });

  const blocks = await Block.find({ $or: [{ blocker: req.user._id }, { blocked: req.user._id }] }).select("blocker blocked");
  const excludedIds = blocks.map((block) => String(block.blocker) === String(req.user._id) ? block.blocked : block.blocker);
  const candidates = await User.find({
    _id: { $ne: req.user._id, $nin: excludedIds },
    isActive: true,
    skillsToTeach: { $in: learnIds },
    skillsToLearn: { $in: teachIds }
  }).select("fullName username avatarUrl bio headline trustScore skillsToTeach skillsToLearn")
    .populate("skillsToTeach", "name category").populate("skillsToLearn", "name category").limit(50);

  const matches = candidates.map((candidate) => {
    const candidateTeach = candidate.skillsToTeach || [];
    const candidateLearn = candidate.skillsToLearn || [];
    const skillOffered = candidateLearn.length ? (req.user.skillsToTeach || []).find((skill) => candidateLearn.some((item) => String(item._id) === String(skill))) : null;
    const skillRequested = candidateTeach.length ? candidateTeach.find((skill) => (req.user.skillsToLearn || []).some((item) => String(item) === String(skill._id))) : null;
    const offeredId = skillOffered ? String(skillOffered) : "";
    const requestedId = skillRequested ? String(skillRequested._id) : "";
    const score = (candidateTeach.filter((skill) => learnIds.includes(String(skill._id))).length + candidateLearn.filter((skill) => teachIds.includes(String(skill._id))).length);
    return {
      user: { id: candidate.id, fullName: candidate.fullName, username: candidate.username, avatarUrl: candidate.avatarUrl, bio: candidate.bio, headline: candidate.headline, trustScore: candidate.trustScore },
      score,
      suggestedExchange: offeredId && requestedId ? { skillOfferedId: offeredId, skillOfferedName: skillOffered?.name, skillRequestedId: requestedId, skillRequestedName: skillRequested?.name } : null
    };
  }).filter((match) => match.suggestedExchange);

  return res.json({ matches });
});

export default router;
