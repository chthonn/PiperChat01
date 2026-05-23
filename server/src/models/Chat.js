import mongoose from "mongoose";
const chatSchema = new mongoose.Schema({
  server_id: String,
  channels: [
    {
      channel_id: String,
      channel_name: String,
    },
  ],
});

export default mongoose.model("discord_chats", chatSchema);
