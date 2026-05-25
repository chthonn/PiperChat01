import mongoose from "mongoose";
import { MESSAGE_MAX_LENGTH } from "../lib/validation.js";

const directMessageThreadSchema = new mongoose.Schema({
  participants: [String],
  messages: [
    {
      sender_id: String,
      sender_name: String,
      sender_tag: String,
      sender_pic: String,
      content: { type: String, maxlength: MESSAGE_MAX_LENGTH },
      timestamp: Number,
    },
  ],
});

export default mongoose.model("direct_message_threads", directMessageThreadSchema);
