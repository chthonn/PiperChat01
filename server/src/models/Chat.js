import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  server_id: String,
  channels: [
    {
      channel_id: String,
      channel_name: String,
      chat_details: [
      {
        content: String,
        sender_id: String,
        sender_name: String,
        sender_pic: String,
        sender_tag: String,
        timestamp: String,

        replyTo: {
          sender_name: String,
          content: String,
          timestamp: String,
        },

        isPinned: {
          type: Boolean,
          default: false,
        },
      },
    ],
    },
  ],
});

export default mongoose.model("discord_chats", chatSchema);
