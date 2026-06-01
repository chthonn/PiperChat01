import config from "../config/index.js";

import express from "express";
import jwt from "jsonwebtoken";

import { authToken } from "../middleware/auth.js";
import logger from "../lib/winston.js";
import User from "../models/User.js";
import {
  clearDmUnread,
  clearServerChannelUnread,
  getUnreadSummary,
  isUsingRedis,
} from "../services/unreadService.js";

const router = express.Router();

function getAuthorizedUser(req) {
  return jwt.verify(req.headers["x-auth-token"], config.ACCESS_TOKEN);
}

// GET /unread_summary
// Returns the full unread summary (DMs + server channels) for the logged-in user.
router.get("/unread_summary", authToken, async (req, res) => {
  try {
    const user = getAuthorizedUser(req);
    const currentUser = await User.findOne({ _id: user.id }).lean();
    const serverIds = (currentUser?.servers || []).map(
      (server) => server.server_id
    );
    const summary = await getUnreadSummary(user.id, serverIds);

    res.status(200).json({ status: 200, summary });
  } catch (error) {
    logger.error(`Unread summary error: ${error.message}`);
    res.status(500).json({ status: 500, message: "Failed to load unread summary" });
  }
});

// POST /mark_direct_messages_read
// Clears the DM unread count between the logged-in user and a friend.
// Body: { friend_id: string }
router.post("/mark_direct_messages_read", authToken, async (req, res) => {
  try {
    const { friend_id } = req.body;

    if (!friend_id) {
      return res
        .status(400)
        .json({ status: 400, message: "friend_id is required" });
    }

    const user = getAuthorizedUser(req);
    await clearDmUnread(user.id, friend_id);
    res.status(200).json({ status: 200 });
  } catch (error) {
    logger.error(`Mark DM read error: ${error.message}`);
    res.status(500).json({ status: 500, message: "Failed to clear DM unread" });
  }
});

// POST /mark_channel_read
// Clears the unread count for a specific server channel.
// Body: { server_id: string, channel_id: string }
router.post("/mark_channel_read", authToken, async (req, res) => {
  try {
    const { server_id, channel_id } = req.body;

    if (!server_id || !channel_id) {
      return res
        .status(400)
        .json({ status: 400, message: "server_id and channel_id are required" });
    }

    const user = getAuthorizedUser(req);
    await clearServerChannelUnread(user.id, server_id, channel_id);
    res.status(200).json({ status: 200 });
  } catch (error) {
    logger.error(`Mark channel read error: ${error.message}`);
    res.status(500).json({ status: 500, message: "Failed to clear channel unread" });
  }
});

// GET /unread_storage_mode
// Diagnostic endpoint — returns whether Redis or the in-memory fallback is active.
// Useful during development and for automated health checks.
router.get("/unread_storage_mode", authToken, async (_req, res) => {
  try {
    const redis = await isUsingRedis();
    res.status(200).json({
      status: 200,
      storage: redis ? "redis" : "memory",
      note: redis
        ? "Counts are persisted in Redis."
        : "Counts are stored in-process memory and will be lost on restart.",
    });
  } catch (error) {
    logger.error(`Storage mode check error: ${error.message}`);
    res.status(500).json({ status: 500, message: "Failed to check storage mode" });
  }
});

export default router;
