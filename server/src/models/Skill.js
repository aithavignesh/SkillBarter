import mongoose from "mongoose";

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  normalizedName: { type: String, required: true, trim: true, lowercase: true, unique: true },
  category: { type: String, trim: true, maxlength: 80, default: "Other" },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true, versionKey: false });

export default mongoose.models.Skill || mongoose.model("Skill", skillSchema);
