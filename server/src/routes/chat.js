import config from "../config/index.js";

import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import Message from "../models/Message.js";
import Server from "../models/Server.js";
import User from "../models/User.js";
import * as cache from "../lib/cache.js";
import { isServerOwner } from "../lib/serverAuthorization.js";
import logger from "../lib/winston.js";
import { incrementServerUnread } from "../services/unreadService.js";
import { getIO } from "../socket/runtime.js";

import expressRateLimit from "../middleware/rateLimit.js";

const router = express.Router();

async function shouldSendNotification(userId, preferenceKey) {
  try {
    const user = await User.findById(userId).lean();
    if (!user) return false;
    const prefs = user.notification_preferences || {};
    return prefs[preferenceKey] !== false;
  } catch {
    return true;
  }
}

function getAuthorizedUser(req, res) {
  try {
    return jwt.verify(req.headers["x-auth-token"], config.ACCESS_TOKEN);
  } catch (e) {
    res.status(401).json({ message: "Unauthorized", status: 401 });
    return null;
  }
}

function normalizeChatMessages(chatDetails = []) {
  return chatDetails.flatMap((entry) =>
    Array.isArray(entry) ? entry.filter(Boolean) : [entry].filter(Boolean),
  );
}

function findChatMessage(channel, timestamp, senderId) {
  const messages = normalizeChatMessages(channel?.chat_details || []);
  return messages.find(
    (entry) =>
      String(entry?.timestamp) === String(timestamp) &&
      String(entry?.sender_id) === String(senderId),
  );
}

router.post("/store_message", expressRateLimit("chat"), async (req, res) => {
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }

  const {
    message,
    server_id,
    channel_id,
    channel_name,
    timestamp,
  } = req.body;

  const chatMessage = {
    channel_id,
    content: message,
    sender_id: user.id,
    sender_name: user.username || user.email,
    sender_pic: user.profile_pic || "",
    sender_tag: user.tag || "",
    timestamp,
    is_pinned: false,
  };

  const server = await Server.findById(server_id).lean();
  if (!server) {
    return res.status(404).json({ status: 404, message: "Server not found" });
  }

  const isMember = (server.users || []).some(
    (entry) => String(entry.user_id) === String(user.id),
  );
  if (!isMember) {
    return res.status(403).json({ status: 403, message: "Forbidden" });
  }

  async function notifyServerRecipients() {
    const server = await Server.findOne({ _id: server_id }).lean();
    const io = getIO();

    if (!server || !io) {
      return;
    }

    const recipients = (server.users || []).filter(
      (entry) => entry.user_id !== user.id,
    );
    for (const recipient of recipients) {
      await incrementServerUnread(recipient.user_id, server_id, channel_id);
      const shouldNotify = await shouldSendNotification(recipient.user_id, "server_messages");
      if (shouldNotify) {
        io.to(recipient.user_id).emit("server_message_notification", {
          server_id,
          channel_id,
          channel_name,
          sender_name: user.username || user.email,
        });
      }
    }
  }

  try {
    await Message.create({
      type: "channel",
      server_id,
      channel_id,
      content: message,
      sender_id: user.id,
      sender_name: user.username || user.email,
      sender_pic: user.profile_pic || "",
      sender_tag: user.tag || "",
      timestamp: Number(timestamp),
    });

    await cache.del(`chat:${server_id}:${channel_id}:latest`);
    await notifyServerRecipients();
    const io = getIO();
    if (io) {
      io.to(`channel:${channel_id}`).emit("server_message_received", chatMessage);
    }
    return res.json({ status: 200, message: chatMessage });
  } catch (err) {
    logger.error(`Error storing message: ${err.message}`);
    return res.status(500).json({ status: 500, message: "Server error" });
  }
});

router.post("/get_messages", async (req, res) => {
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }

  const { channel_id, server_id } = req.body;

  if (!channel_id || !server_id) {
    return res
      .status(400)
      .json({ error: "Invalid request. Missing channel_id or server_id." });
  }

  try {
    const cacheKey = `chat:${server_id}:${channel_id}:latest`;
    const cached = await cache.getJson(cacheKey);
    if (cached && Array.isArray(cached.chats)) {
      return res.json({ chats: cached.chats, cached: true });
    }

    const limit = Math.min(Math.max(Number(req.body.limit) || 50, 1), 100);
    const beforeTimestamp = req.body.before
      ? Number(req.body.before)
      : undefined;

    const query = {
      type: "channel",
      server_id,
      channel_id,
    };

    if (beforeTimestamp) {
      query.timestamp = { $lt: beforeTimestamp };
    }

    const chats = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    const ordered = chats.reverse();
    if (!beforeTimestamp) {
      await cache.setJson(cacheKey, { chats: ordered });
    }

    return res.json({ chats: ordered });
  } catch (error) {
    logger.error(`Error retrieving chats: ${error.message}`);
    res.status(500).json({ error: "Failed to retrieve chats." });
  }
});

router.post("/edit_server_message", async (req, res) => {
  const { server_id, channel_id, timestamp, content } = req.body;
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }
  const senderId = user.id;

  if (!server_id || !channel_id || !timestamp || !content || !content.trim()) {
    return res.status(400).json({ status: 400, message: "Invalid input" });
  }

  try {
    const updated = await Message.findOneAndUpdate(
      {
        type: "channel",
        server_id,
        channel_id,
        timestamp: Number(timestamp),
        sender_id: senderId,
      },
      { content: content.trim(), edited_at: Date.now() },
      { new: true }
    ).lean();

    if (!updated) {
      return res
        .status(404)
        .json({ status: 404, message: "Message not found" });
    }

    await cache.del(`chat:${server_id}:${channel_id}:latest`);

    const io = getIO();
    if (io) {
      io.to(`channel:${channel_id}`).emit("server_message_updated", {
        channel_id,
        timestamp,
        sender_id: senderId,
        content: updated.content,
      });
    }

    res.status(200).json({ status: 200, message: "Message updated" });
  } catch (error) {
    logger.error(`Error editing message: ${error.message}`);
    res.status(500).json({ status: 500, message: "Failed to edit message" });
  }
});

router.post("/toggle_server_message_pin", async (req, res) => {
  const { server_id, channel_id, timestamp, sender_id } = req.body;
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }

  if (
    !server_id ||
    !mongoose.isValidObjectId(server_id) ||
    !channel_id ||
    !timestamp ||
    !sender_id
  ) {
    return res.status(400).json({ status: 400, message: "Invalid input" });
  }

  try {
    const server = await Server.findById(server_id).lean();
    if (!server) {
      return res.status(404).json({ status: 404, message: "Server not found" });
    }

    if (!isServerOwner(server, user.id)) {
      return res
        .status(403)
        .json({ status: 403, message: "Only the server owner can pin messages" });
    }

    const chatDoc = await Chat.findOne({
      server_id,
      "channels.channel_id": channel_id,
    });
    if (!chatDoc) {
      return res.status(404).json({ status: 404, message: "Chat not found" });
    }

    const channel = chatDoc.channels.find(
      (entry) => entry.channel_id === channel_id,
    );
    const message = findChatMessage(channel, timestamp, sender_id);

    if (!message) {
      return res
        .status(404)
        .json({ status: 404, message: "Message not found" });
    }

    message.is_pinned = !message.is_pinned;
    await chatDoc.save();
    await cache.del(`chat:${server_id}:${channel_id}`);

    const io = getIO();
    if (io) {
      io.to(`channel:${channel_id}`).emit("server_message_pin_updated", {
        timestamp,
        sender_id,
        is_pinned: message.is_pinned,
        channel_id,
        server_id,
      });
    }

    res.status(200).json({
      status: 200,
      message: message.is_pinned ? "Message pinned" : "Message unpinned",
      is_pinned: message.is_pinned,
    });
  } catch (error) {
    logger.error(`Error toggling pinned message: ${error.message}`);
    res
      .status(500)
      .json({ status: 500, message: "Failed to toggle pinned message" });
  }
});

router.post("/delete_server_message", async (req, res) => {
  const { server_id, channel_id, timestamp } = req.body;
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }
  const senderId = user.id;

  if (!server_id || !channel_id || !timestamp) {
    return res.status(400).json({ status: 400, message: "Invalid input" });
  }

  try {
    const deleted = await Message.deleteOne({
      type: "channel",
      server_id,
      channel_id,
      timestamp: Number(timestamp),
      sender_id: senderId,
    });

    if (!deleted || deleted.deletedCount === 0) {
      return res
        .status(404)
        .json({ status: 404, message: "Message not found" });
    }

    await cache.del(`chat:${server_id}:${channel_id}:latest`);

    const io = getIO();
    if (io) {
      io.to(`channel:${channel_id}`).emit("server_message_deleted", {
        channel_id,
        timestamp,
        sender_id: senderId,
      });
    }

    res.status(200).json({ status: 200, message: "Message deleted" });
  } catch (error) {
    logger.error(`Error deleting message: ${error.message}`);
    res.status(500).json({ status: 500, message: "Failed to delete message" });
  }
});

export default router;
