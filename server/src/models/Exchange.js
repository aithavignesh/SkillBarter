import mongoose from "mongoose";

const exchangeSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  skillOffered: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", required: true },
  skillRequested: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", required: true },
  message: { type: String, trim: true, maxlength: 2000, default: "" },
  status: { type: String, enum: ["pending", "accepted", "scheduled", "active", "completed", "declined", "cancelled"], default: "pending", index: true },
  scheduledAt: { type: Date, default: null },
  completedByRequester: { type: Boolean, default: false },
  completedByRecipient: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

exchangeSchema.index({ requester: 1, recipient: 1, status: 1 });

export default mongoose.models.Exchange || mongoose.model("Exchange", exchangeSchema);
