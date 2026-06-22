import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender_name: String,
    sender_tag: String,
    sender_pic: String,
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    edited_at: Date,
    is_deleted: {
      type: Boolean,
      default: false,
    },
    reactions: [
      {
        emoji: String,
        users: [mongoose.Schema.Types.ObjectId],
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ chat_id: 1, timestamp: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
