import mongoose from "mongoose";
import { SERVER_NAME_MAX_LENGTH } from "../lib/validation.js";

const serverSchema = new mongoose.Schema({
  server_name: { type: String, maxlength: SERVER_NAME_MAX_LENGTH },
  server_pic: String,
  users: [
    {
      user_name: String,
      user_profile_pic: String,
      user_tag: String,
      user_id: String,
      user_role: String,
    },
  ],
  categories: [
    {
      category_name: String,
      channels: [
        {
          channel_name: String,
          channel_type: String,
        },
      ],
    },
  ],
  active: Boolean,
});

export default mongoose.model("discord_server", serverSchema);
