import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: {
    type: String,
    enum: ["page_view", "exchange_view", "message_sent", "exchange_request_created", "exchange_status_changed", "review_submitted", "community_post_created", "comment_created"],
    required: true,
    index: true
  },
  path: { type: String, maxlength: 160, default: "" },
  properties: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true, versionKey: false });

analyticsEventSchema.index({ createdAt: -1, name: 1 });
export default mongoose.models.AnalyticsEvent || mongoose.model("AnalyticsEvent", analyticsEventSchema);
