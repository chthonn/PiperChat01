import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: String,
    tag: String,
    email: String,
    password: String,
    dob: String,
    profile_pic: String,
    authorized: Boolean,
    servers: [
      {
        server_name: String,
        server_pic: String,
        server_role: String,
        server_id: String,
      },
    ],
    incoming_reqs: [
      {
        id: String,
        username: String,
        profile_pic: String,
        tag: String,
        status: String,
      },
    ],
    outgoing_reqs: [
      {
        id: String,
        username: String,
        profile_pic: String,
        tag: String,
        status: String,
      },
    ],
    friends: [
      {
        id: String,
        username: String,
        profile_pic: String,
        tag: String,
      },
    ],
    blocked: [
      {
        id: String,
        username: String,
        profile_pic: String,
        tag: String,
      },
    ],
    verification: [
      {
        timestamp: Number,
        code: String,
      },
    ],
    invites: [
      {
        server_id: String,
        invite_code: String,
        timestamp: String,
      },
    ],
    notification_preferences: {
      direct_messages: Boolean,
      friend_requests: Boolean,
      server_messages: Boolean,
      server_invites: Boolean,
    },
  },
  { typeKey: "$type" }
);

export default mongoose.model("discord_user", userSchema);
