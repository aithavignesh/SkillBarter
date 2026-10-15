import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  visibility: { type: String, enum: ["public", "connections"], default: "public", index: true },
  isHidden: { type: Boolean, default: false, index: true }
}, { timestamps: true, versionKey: false });

postSchema.index({ createdAt: -1 });
export default mongoose.models.Post || mongoose.model("Post", postSchema);
