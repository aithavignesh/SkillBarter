import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  type: { type: String, enum: ["exchange_request", "exchange_update", "message", "review", "post_like", "system"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, trim: true, maxlength: 1000, default: "" },
  resourceType: { type: String, enum: ["exchange", "message", "review", "post", "none"], default: "none" },
  resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  readAt: { type: Date, default: null, index: true }
}, { timestamps: true, versionKey: false });

notificationSchema.index({ recipient: 1, createdAt: -1 });
export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
