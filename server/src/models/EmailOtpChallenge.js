import mongoose from "mongoose";

const emailOtpChallengeSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  purpose: { type: String, enum: ["login"], required: true, default: "login" },
  codeHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  consumedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

emailOtpChallengeSchema.index({ email: 1, purpose: 1, createdAt: -1 });

export default mongoose.models.EmailOtpChallenge || mongoose.model("EmailOtpChallenge", emailOtpChallengeSchema);
