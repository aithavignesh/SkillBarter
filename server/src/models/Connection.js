import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema({
  // PostgreSQL integer IDs are converted with deterministicObjectId("users", sourceId)
  // during migration so references resolve to the same target User documents.
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  connectedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  // Keep this open-ended until source status values have been inventoried.
  status: { type: String, default: "ACCEPTED", trim: true },
  createdAt: { type: Date, default: null }
}, { timestamps: false, versionKey: false });

connectionSchema.index({ user: 1, connectedUser: 1 }, { unique: true });
connectionSchema.pre("validate", function preventSelfConnection(next) {
  if (this.user && this.connectedUser && String(this.user) === String(this.connectedUser)) {
    return next(new Error("You cannot create a connection with your own account."));
  }
  return next();
});

export default mongoose.models.Connection || mongoose.model("Connection", connectionSchema);
