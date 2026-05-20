import express from "express";
import jwt from "jsonwebtoken";

import { authToken } from "../middleware/auth.js";
import User from "../models/User.js";
import {
  clearDmUnread,
  clearServerChannelUnread,
  getUnreadSummary,
} from "../services/unreadService.js";

const router = express.Router();

function getAuthorizedUser(req) {
  return jwt.verify(req.headers["x-auth-token"], process.env.ACCESS_TOKEN);
}

router.get("/unread_summary", authToken, async (req, res) => {
  try {
    const user = getAuthorizedUser(req);
    const currentUser = await User.findOne({ _id: user.id }).lean();
    const serverIds = (currentUser?.servers || []).map((server) => server.server_id);
    const summary = await getUnreadSummary(user.id, serverIds);

    res.status(200).json({ status: 200, summary });
  } catch (error) {
    console.error("Unread summary error:", error);
    res.status(500).json({ status: 500, message: "Failed to load unread summary" });
  }
});

router.post("/mark_direct_messages_read", authToken, async (req, res) => {
  try {
    const user = getAuthorizedUser(req);
    await clearDmUnread(user.id, req.body.friend_id);
    res.status(200).json({ status: 200 });
  } catch (error) {
    console.error("Mark DM read error:", error);
    res.status(500).json({ status: 500, message: "Failed to clear DM unread" });
  }
});

router.post("/mark_channel_read", authToken, async (req, res) => {
  try {
    const user = getAuthorizedUser(req);
    const { server_id, channel_id } = req.body;
    await clearServerChannelUnread(user.id, server_id, channel_id);
    res.status(200).json({ status: 200 });
  } catch (error) {
    console.error("Mark channel read error:", error);
    res.status(500).json({ status: 500, message: "Failed to clear channel unread" });
  }
});

export default router;
