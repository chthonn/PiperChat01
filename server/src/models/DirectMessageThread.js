import mongoose from "mongoose";

const directMessageThreadSchema = new mongoose.Schema({
  participants: [String],
  messages: [
    {
      sender_id: String,
      sender_name: String,
      sender_tag: String,
      sender_pic: String,
      content: String,
      timestamp: Number,
    },
  ],
});

export default mongoose.model("direct_message_threads", directMessageThreadSchema);
