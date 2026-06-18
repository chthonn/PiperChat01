import mongoose from "mongoose";

const presenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["online", "away", "dnd", "offline"],
      default: "offline",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    currentChannel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    currentServer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
    },
    deviceType: {
      type: String,
      enum: ["web", "mobile", "desktop"],
      default: "web",
    },
    customStatus: String,
    statusEmoji: String,
  },
  { timestamps: true }
);

const Presence = mongoose.model("Presence", presenceSchema);

export default Presence;
