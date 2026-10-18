import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  createdBy: { type: String, required: true },
  admins: [{ type: String }],
  members: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Group", groupSchema);