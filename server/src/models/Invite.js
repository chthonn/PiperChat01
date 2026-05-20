import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema({
  invite_code: String,
  inviter_name: String,
  inviter_id: String,
  server_name: String,
  server_id: String,
  server_pic: String,
  timestamp: String,
});

export default mongoose.model("discord_invites", inviteSchema);
