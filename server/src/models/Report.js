import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  targetType: { type: String, enum: ["user", "post", "message", "exchange"], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 120 },
  details: { type: String, trim: true, maxlength: 2000, default: "" },
  status: { type: String, enum: ["open", "reviewing", "resolved", "dismissed"], default: "open", index: true },
  resolutionNote: { type: String, trim: true, maxlength: 2000, default: "" },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true, versionKey: false });

export default mongoose.models.Report || mongoose.model("Report", reportSchema);
