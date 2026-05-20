import mongoose from "mongoose";
import User from "../models/User.js";

export async function checkInviteLink(inviterId, serverId) {
  return User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(inviterId) } },
    {
      $project: {
        invites: {
          $filter: {
            input: "$invites",
            as: "invite",
            cond: { $eq: ["$$invite.server_id", serverId] },
          },
        },
      },
    },
  ]);
}
