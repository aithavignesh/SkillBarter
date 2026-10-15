import mongoose from "mongoose";

const blockSchema = new mongoose.Schema({
  blocker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  blocked: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
}, { timestamps: true, versionKey: false });

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.pre("validate", function preventSelfBlock(next) {
  if (String(this.blocker) === String(this.blocked)) return next(new Error("You cannot block your own account."));
  return next();
});

export default mongoose.models.Block || mongoose.model("Block", blockSchema);
