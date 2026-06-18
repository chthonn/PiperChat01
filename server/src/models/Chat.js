import mongoose from "mongoose";
import { MESSAGE_MAX_LENGTH } from "../lib/validation.js";

const chatSchema = new mongoose.Schema({
  server_id: String,
  channels: [
    {
      channel_id: String,
      channel_name: String,
      chat_details: [
        {
          content: { type: String, maxlength: MESSAGE_MAX_LENGTH },
          sender_id: String,
          sender_name: String,
          sender_pic: String,
          sender_tag: String,
          timestamp: String,
          is_pinned: { type: Boolean, default: false },
        },
      ],
    },
  ],
});

export default mongoose.model("discord_chats", chatSchema);
