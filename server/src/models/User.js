import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  username: { type: String, required: true, trim: true, lowercase: true, minlength: 3, maxlength: 30, unique: true, index: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  // Increment this value to revoke every previously issued JWT for the user.
  tokenVersion: { type: Number, default: 0, min: 0 },
  phone: { type: String, trim: true, default: "" },
  avatarUrl: { type: String, default: "" },
  bio: { type: String, maxlength: 1000, default: "" },
  headline: { type: String, maxlength: 160, default: "" },
  skillsToTeach: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
  skillsToLearn: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
  onboardingCompleted: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $gt: "" } } });
userSchema.index({ fullName: "text", username: "text", headline: "text", bio: "text" });

export default mongoose.models.User || mongoose.model("User", userSchema);
