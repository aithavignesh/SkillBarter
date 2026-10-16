import { Router } from "express";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import PostComment from "../models/PostComment.js";
import Block from "../models/Block.js";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { postLimiter } from "../middleware/writeLimiters.js";

const router = Router();
router.use(requireAuth);

async function blockedIds(userId) {
  const blocks = await Block.find({ $or: [{ blocker: userId }, { blocked: userId }] }).select("blocker blocked");
  return blocks.map((block) => String(block.blocker) === String(userId) ? block.blocked : block.blocker);
}

router.get("/", async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
  const before = typeof req.query.before === "string" && !Number.isNaN(Date.parse(req.query.before)) ? new Date(req.query.before) : null;
  const excluded = await blockedIds(req.user._id);
  const filter = { isHidden: false, author: { $nin: excluded } };
  if (before) filter.createdAt = { $lt: before };
  const posts = await Post.find(filter).populate("author", "fullName username avatarUrl").sort({ createdAt: -1 }).limit(limit);
  return res.json({ posts });
});

router.post("/", postLimiter, async (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  const tags = Array.isArray(req.body?.tags) ? req.body.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim().replace(/^#/, "").toLowerCase()).filter((tag) => /^[a-z0-9_-]{1,40}$/.test(tag)).slice(0, 10) : [];
  if (content.length < 1 || content.length > 5000) return res.status(400).json({ error: "Post content must contain 1–5000 characters." });
  const post = await Post.create({ author: req.user._id, content, tags });
  await post.populate("author", "fullName username avatarUrl");
  return res.status(201).json({ post });
});

router.get("/:id/comments", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid post ID." });
  const post = await Post.findOne({ _id: req.params.id, isHidden: false }).select("author");
  if (!post) return res.status(404).json({ error: "Post not found." });
  const blocked = await Block.exists({ $or: [
    { blocker: req.user._id, blocked: post.author },
    { blocker: post.author, blocked: req.user._id }
  ] });
  if (blocked) return res.status(403).json({ error: "Comments are unavailable because one participant has blocked the other." });
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const comments = await PostComment.find({ post: post._id })
    .populate("author", "fullName username avatarUrl")
    .sort({ createdAt: 1 }).limit(limit);
  return res.json({ comments });
});

router.post("/:id/comments", postLimiter, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid post ID." });
  const rawContent = typeof req.body?.content === "string" ? req.body.content : "";
  const content = rawContent.trim();
  if (!content || rawContent.length > 2000 || content.length > 2000) {
    return res.status(400).json({ error: "Comment must contain 1–2000 characters." });
  }
  const post = await Post.findOne({ _id: req.params.id, isHidden: false }).select("author");
  if (!post) return res.status(404).json({ error: "Post not found." });
  const blocked = await Block.exists({ $or: [
    { blocker: req.user._id, blocked: post.author },
    { blocker: post.author, blocked: req.user._id }
  ] });
  if (blocked) return res.status(403).json({ error: "Comments are unavailable because one participant has blocked the other." });
  const comment = await PostComment.create({ post: post._id, author: req.user._id, content });
  await comment.populate("author", "fullName username avatarUrl");
  if (String(post.author) !== String(req.user._id)) {
    await Notification.create({
      recipient: post.author, actor: req.user._id, type: "post_comment",
      title: "New comment on your post", body: content.slice(0, 180),
      resourceType: "post_comment", resourceId: comment._id
    });
  }
  return res.status(201).json({ comment });
});

router.delete("/comments/:commentId", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.commentId)) return res.status(400).json({ error: "Invalid comment ID." });
  const comment = await PostComment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ error: "Comment not found." });
  if (String(comment.author) !== String(req.user._id) && !req.user.isAdmin) {
    return res.status(403).json({ error: "You cannot delete this comment." });
  }
  await comment.deleteOne();
  return res.json({ success: true });
});

router.post("/:id/like", postLimiter, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid post ID." });
  const post = await Post.findOne({ _id: req.params.id, isHidden: false });
  if (!post) return res.status(404).json({ error: "Post not found." });
  const authorId = String(post.author);
  const blocked = await Block.exists({ $or: [{ blocker: req.user._id, blocked: post.author }, { blocker: post.author, blocked: req.user._id }] });
  if (blocked) return res.status(403).json({ error: "This interaction is unavailable because one participant has blocked the other." });
  const alreadyLiked = post.likes.some((id) => String(id) === String(req.user._id));
  if (alreadyLiked) post.likes.pull(req.user._id); else post.likes.addToSet(req.user._id);
  await post.save();
  if (!alreadyLiked && authorId !== String(req.user._id)) {
    await Notification.create({ recipient: post.author, actor: req.user._id, type: "post_like", title: "Someone liked your post", body: "Your community post received a like.", resourceType: "post", resourceId: post._id });
  }
  return res.json({ liked: !alreadyLiked, likesCount: post.likes.length });
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid post ID." });
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found." });
  if (String(post.author) !== String(req.user._id) && !req.user.isAdmin) return res.status(403).json({ error: "You cannot delete this post." });
  await post.deleteOne();
  return res.json({ success: true });
});

export default router;
