import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  exchange: { type: mongoose.Schema.Types.ObjectId, ref: "Exchange", required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  body: { type: String, required: true, trim: true, maxlength: 5000 },
  readAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

messageSchema.index({ exchange: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
