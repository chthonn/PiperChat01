import express from "express";
import mongoose from "mongoose";
import shortid from "shortid";

import Invite from "../models/Invite.js";
import User from "../models/User.js";
import { checkInviteLink } from "../services/inviteService.js";
import {
  addServerToUser,
  addUserToServer,
  checkServerInUser,
} from "../services/serverService.js";
import { getIO } from "../socket/runtime.js";

const router = express.Router();

router.post("/create_invite_link", async (req, res) => {
  const {
    inviter_name,
    inviter_id,
    server_name,
    server_id,
    server_pic,
  } = req.body;

  const response = await checkInviteLink(inviter_id, server_id);

  if (
    !response[0].invites ||
    response[0].invites.length === 0
  ) {
    const timestamp = Date.now();
    const invite_code = shortid();

    const addNewInviteLink = new Invite({
      invite_code,
      inviter_name,
      inviter_id,
      server_name,
      server_id,
      server_pic,
      timestamp: String(timestamp),
    });
    try {
      await addNewInviteLink.save();
    } catch (err) {
      return res.status(500).json({ status: 500, message: "Server error" });
    }

    const userInvitesList = {
      $push: {
        invites: [
          {
            server_id,
            invite_code,
            timestamp: String(timestamp),
          },
        ],
      },
    };
    try {
      await User.updateOne(
        { _id: new mongoose.Types.ObjectId(inviter_id) },
        userInvitesList
      );
    } catch (err) {
      return res.status(500).json({ status: 500, message: "Server error" });
    }
    return res.json({ status: 200, invite_code });
  }

  res.json({
    status: 200,
    invite_code: response[0].invites[0].invite_code,
  });
});

router.post("/invite_link_info", async (req, res) => {
  const { invite_link } = req.body;
  try {
    const invite = await Invite.findOne({ invite_code: invite_link }).lean();
    if (!invite) {
      return res.json({ status: 404 });
    }
    const { inviter_name, server_name, server_pic, server_id, inviter_id } =
      invite;
    return res.json({
      status: 200,
      inviter_name,
      server_name,
      server_pic,
      server_id,
      inviter_id,
    });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error" });
  }
});

router.post("/accept_invite", async (req, res) => {
  const { user_details, server_details } = req.body;
  const { id } = user_details;
  const server_id = server_details.invite_details.server_id;

  const checkUser = await checkServerInUser(id, server_id);
  if (
    !checkUser[0] ||
    !checkUser[0].servers ||
    checkUser[0].servers.length > 0
  ) {
    return res.json({ status: 403 });
  }

  const addUser = await addUserToServer(user_details, server_id);
  if (!addUser) {
    return res.status(500).json({ message: "something went wrong in add_user" });
  }

  await addServerToUser(
    id,
    server_details.invite_details,
    "member"
  );

  const io = getIO();
  if (io) {
    io.to(String(id)).emit("user_servers_updated", { user_id: String(id) });
    io.to(`server:${String(server_id)}`).emit("server_updated", {
      server_id: String(server_id),
      reason: "member_joined",
      user_id: String(id),
    });
  }
  res.json({ status: 200 });
});

export default router;
