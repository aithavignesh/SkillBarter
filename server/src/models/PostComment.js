import mongoose from "mongoose";

const postCommentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true, versionKey: false });

postCommentSchema.index({ post: 1, createdAt: 1 });
export default mongoose.models.PostComment || mongoose.model("PostComment", postCommentSchema);
