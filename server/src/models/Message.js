import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DirectMessageThread",
    },
    content: {
      type: String,
      required: true,
    },
    sender_name: String,
    sender_pic: String,
    sender_tag: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

messageSchema.index({ channelId: 1, timestamp: -1 });
messageSchema.index({ threadId: 1, timestamp: -1 });

export default mongoose.model("Message", messageSchema);
