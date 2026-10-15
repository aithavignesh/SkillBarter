import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  exchange: { type: mongoose.Schema.Types.ObjectId, ref: "Exchange", required: true, index: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 2000, default: "" }
}, { timestamps: true, versionKey: false });

reviewSchema.index({ exchange: 1, reviewer: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
