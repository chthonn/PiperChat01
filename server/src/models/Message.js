import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["channel", "dm"],
      required: true,
    },
    server_id: {
      type: String,
      required: function () {
        return this.type === "channel";
      },
    },
    channel_id: {
      type: String,
      required: function () {
        return this.type === "channel";
      },
    },
    participants: {
      type: [String],
      required: function () {
        return this.type === "dm";
      },
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: "Direct message records must have exactly two participants.",
      },
    },
    content: String,
    sender_id: String,
    sender_name: String,
    sender_tag: String,
    sender_pic: String,
    timestamp: Number,
    edited_at: Number,
  },
  { timestamps: true },
);

messageSchema.index({ type: 1, server_id: 1, channel_id: 1, timestamp: -1 });
messageSchema.index({ type: 1, participants: 1, timestamp: -1 });

export default mongoose.model("Message", messageSchema);
