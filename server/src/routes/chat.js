import config from "../config/index.js";

import express from "express";
import jwt from "jsonwebtoken";

import Chat from "../models/Chat.js";
import Server from "../models/Server.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import * as cache from "../lib/cache.js";
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

router.post("/store_message", expressRateLimit("chat"), async (req, res) => {
  const {
    message,
    server_id,
    channel_id,
    channel_name,
    timestamp,
    username,
    tag,
    id,
    profile_pic,
  } = req.body;

  const chatMessage = {
    content: message,
    sender_id: id,
    sender_name: username,
    sender_pic: profile_pic,
    sender_tag: tag,
    timestamp,
  };

  async function notifyServerRecipients() {
    const server = await Server.findOne({ _id: server_id }).lean();
    const io = getIO();

    if (!server || !io) return;

    const recipients = (server.users || []).filter(
      (user) => user.user_id !== id,
    );
    for (const recipient of recipients) {
      await incrementServerUnread(recipient.user_id, server_id, channel_id);
      const shouldNotify = await shouldSendNotification(
        recipient.user_id,
        "server_messages",
      );
      if (shouldNotify) {
        io.to(recipient.user_id).emit("server_messaage_notification", {
          server_id,
          channel_id,
          channel_name,
          sender_name: username,
        });
      }
    }
  }

  try {
    const newMessage = new Message({
      sender: id,
      channelId: channel_id,
      content: message,
      timestamp: timestamp,
      sender_name: username,
      sender_pic: profile_pic,
      sender_tag: tag,
    });

    await newMessage.save();

    await Chat.updateOne(
      { server_id, "channels.channel_id": channel_id },
      { $setOnInsert: { server_id, channels: [{ channel_id, channel_name }] } },
      { upsert: true },
    );

    await cache.del(`chat:${server_id}:${channel_id}`);
    await notifyServerRecipients();

    const io = getIO();
    if (io) {
      io.to(`channel:${channel_id}`).emit(
        "server_message_received",
        chatMessage,
      );
    }

    return res.json({ status: 200, message: chatMessage });
  } catch (err) {
    console.error("Store message error:", err);
    return res.status(500).json({ status: 500, message: "Server error" });
  }
});

router.post("/get_messages", async (req, res) => {
  const { channel_id, server_id, cursor } = req.body;

  if (!channel_id || !server_id) {
    return res
      .status(400)
      .json({ error: "Invalid request.. Missing channel_id or server_id." });
  }

  try {
    const cacheKey = `chat:${server_id}:${channel_id}`;

    if (!cursor) {
      const cached = await cache.getJson(cacheKey);
      if (cached && Array.isArray(cached.chats)) {
        return res.json({ chats: cached.chats, cached: true });
      }
    }

    let query = { channelId: channel_id };
    if (cursor) {
      query.timestamp = { $lt: cursor };
    }

    const msgs = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const reversedMsgs = msgs.reverse();
    const chats = reversedMsgs.map((m) => ({
      content: m.content,
      sender_id: String(m.sender),
      sender_name: m.sender_name,
      sender_pic: m.sender_pic,
      sender_tag: m.sender_tag,
      timestamp: new Date(m.timestamp).getTime(),
    }));

    if (!cursor) {
      await cache.setJson(cacheKey, { chats });
    }

    return res.json({ chats });
  } catch (error) {
    logger.error(`Error retrieving chats: ${error.message}`);
    res.status(500).json({ error: "Failed to retrieve chats." });
  }
});

router.post("/edit_server_message", async (req, res) => {
  const { server_id, channel_id, timestamp, content } = req.body;
  const user = getAuthorizedUser(req, res);
  if (!user) return;

  if (!channel_id || !timestamp || !content || !content.trim()) {
    return res.status(400).json({ status: 400, message: "Invalid input" });
  }

  try {
    const updatedMsg = await Message.findOneAndUpdate(
      { channelId: channel_id, timestamp: timestamp, sender: user.id },
      { content: content.trim(), isEdited: true },
      { new: true },
    );

    if (!updatedMsg) {
      return res
        .status(404)
        .json({ status: 404, message: "Message isn't found" });
    }

    await cache.del(`chat:${server_id}:${channel_id}`);

    const io = getIO();
    if (io) {
      io.to(`channel:${channel_id}`).emit("server_message_updated", {
        timestamp,
        sender_id: user.id,
        content: updatedMsg.content,
      });
    }

    res.status(200).json({ status: 200, message: "Message updated" });
  } catch (error) {
    logger.error(`Error editing message: ${error.message}`);
    res.status(500).json({ status: 500, message: "Failed to edit message" });
  }
});

router.post("/delete_server_message", async (req, res) => {
  const { server_id, channel_id, timestamp } = req.body;
  const user = getAuthorizedUser(req, res);
  if (!user) return;

  if (!channel_id || !timestamp) {
    return res.status(400).json({ status: 400, message: "Invalid input" });
  }

  try {
    const deletedMsg = await Message.findOneAndDelete({
      channelId: channel_id,
      timestamp: timestamp,
      sender: user.id,
    });

    if (!deletedMsg) {
      return res
        .status(404)
        .json({ status: 404, message: "Message not found" });
    }

    await cache.del(`chat:${server_id}:${channel_id}`);

    const io = getIO();
    if (io) {
      io.to(`channel:${channel_id}`).emit("server_message_deleted", {
        timestamp,
        sender_id: user.id,
      });
    }

    res.status(200).json({ status: 200, message: "Message is deleted" });
  } catch (error) {
    logger.error(`Error deleting message: ${error.message}`);
    res.status(500).json({ status: 500, message: "Failed to delete message" });
  }
});

export default router;
