import mongoose from "mongoose";

const directMessageThreadSchema = new mongoose.Schema({
  participants: [String],
});

export default mongoose.model(
  "direct_message_threads",
  directMessageThreadSchema,
);
