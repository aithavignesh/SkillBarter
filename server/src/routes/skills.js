import { Router } from "express";
import mongoose from "mongoose";
import Skill from "../models/Skill.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
  const escaped = q.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  const filter = q ? { $or: [{ name: { $regex: escaped, $options: "i" } }, { category: { $regex: escaped, $options: "i" } }] } : {};
  const skills = await Skill.find(filter).select("name category description createdBy").sort({ name: 1 }).limit(50);
  return res.json({ skills });
});

router.post("/", async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const category = typeof req.body?.category === "string" ? req.body.category.trim().slice(0, 80) : "Other";
    const description = typeof req.body?.description === "string" ? req.body.description.trim().slice(0, 500) : "";
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: "Skill name must be between 2 and 80 characters." });
    const normalizedName = name.toLowerCase();
    let skill = await Skill.findOne({ normalizedName });
    if (!skill) {
      try { skill = await Skill.create({ name, normalizedName, category, description, createdBy: req.user._id }); }
      catch (error) { if (error?.code !== 11000) throw error; skill = await Skill.findOne({ normalizedName }); }
    }
    return res.status(201).json({ skill });
  } catch (error) { return next(error); }
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid skill ID." });
  const skill = await Skill.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!skill) return res.status(404).json({ error: "Skill not found or you cannot delete it." });
  await skill.deleteOne();
  return res.json({ success: true });
});

export default router;
