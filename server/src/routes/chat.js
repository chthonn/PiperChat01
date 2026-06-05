import config from "../config/index.js";

import express from "express";
import jwt from "jsonwebtoken";

import Chat from "../models/Chat.js";
import Server from "../models/Server.js";
import User from "../models/User.js";
import * as cache from "../lib/cache.js";
import logger from "../lib/winston.js";
import { getChats } from "../services/chatService.js";
import { incrementServerUnread } from "../services/unreadService.js";
import { getIO } from "../socket/runtime.js";

import expressRateLimit from "../middleware/rateLimit.js";

import { deleteServerMessageValidator, editServerMessageValidator, getMessagesValidator, storeMessageValidator } from "../validators/chat.js";
import validate from "../middleware/validate.js";

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

router.post("/store_message", expressRateLimit("chat"), storeMessageValidator, validate, async (req, res) => {
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

  const response = await Chat.find({
    server_id,
    "channels.channel_id": channel_id,
  });

  async function notifyServerRecipients() {
    const server = await Server.findOne({ _id: server_id }).lean();
    const io = getIO();

    if (!server || !io) {
      return;
    }

    const recipients = (server.users || []).filter(
      (user) => user.user_id !== id,
    );
    for (const recipient of recipients) {
      await incrementServerUnread(recipient.user_id, server_id, channel_id);
      const shouldNotify = await shouldSendNotification(recipient.user_id, "server_messages");
      if (shouldNotify) {
        io.to(recipient.user_id).emit("server_message_notification", {
          server_id,
          channel_id,
          channel_name,
          sender_name: username,
        });
      }
    }
  }

  if (!response || response.length === 0) {
    const pushNewChannel = {
      $push: {
        channels: [
          {
            channel_id,
            channel_name,
            chat_details: [chatMessage],
          },
        ],
      },
    };
    try {
      const data = await Chat.updateOne({ server_id }, pushNewChannel);
      if (data && data.modifiedCount > 0) {
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
      }
      return res.status(500).json({ status: 500, message: "Update failed" });
    } catch (err) {
      return res.status(500).json({ status: 500, message: "Server error" });
    }
  } else {
    const pushNewChat = {
      $push: {
        "channels.$.chat_details": [chatMessage],
      },
    };
    try {
      const data = await Chat.updateOne(
        { server_id, "channels.channel_id": channel_id },
        pushNewChat,
      );
      if (data && data.modifiedCount > 0) {
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
      }
      return res.status(500).json({ status: 500, message: "Update failed" });
    } catch (err) {
      return res.status(500).json({ status: 500, message: "Server error" });
    }
  }
});

router.post("/get_messages", getMessagesValidator, validate, async (req, res) => {
  const { channel_id, server_id } = req.body;

  try {
    const cacheKey = `chat:${server_id}:${channel_id}`;
    const cached = await cache.getJson(cacheKey);
    if (cached && Array.isArray(cached.chats)) {
      return res.json({ chats: cached.chats, cached: true });
    }

    const response = await getChats(server_id, channel_id);
    if (
      !response ||
      !response[0] ||
      !response[0].channels ||
      response[0].channels.length === 0
    ) {
      return res.json({ chats: [] });
    }
    const chats = response[0].channels[0].chat_details || [];
    await cache.setJson(cacheKey, { chats });
    return res.json({ chats });
  } catch (error) {
    logger.error(`Error retrieving chats: ${error.message}`);
    res.status(500).json({ error: "Failed to retrieve chats." });
  }
});

router.post("/edit_server_message", editServerMessageValidator, validate, async (req, res) => {
  const { server_id, channel_id, timestamp, content } = req.body;
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }
  const senderId = user.id;

  try {
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
    const message = channel?.chat_details.find(
      (entry) =>
        String(entry.timestamp) === String(timestamp) &&
        entry.sender_id === senderId,
    );

    if (!message) {
      return res
        .status(404)
        .json({ status: 404, message: "Message not found" });
    }

    message.content = content.trim();
    await chatDoc.save();
    await cache.del(`chat:${server_id}:${channel_id}`);

    const io = getIO();
    if (io) {
      io.to(`channel:${channel_id}`).emit("server_message_updated", {
        timestamp,
        sender_id: senderId,
        content: message.content,
      });
    }

    res.status(200).json({ status: 200, message: "Message updated" });
  } catch (error) {
    logger.error(`Error editing message: ${error.message}`);
    res.status(500).json({ status: 500, message: "Failed to edit message" });
  }
});

router.post("/delete_server_message", deleteServerMessageValidator, validate, async (req, res) => {
  const { server_id, channel_id, timestamp } = req.body;
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }
  const senderId = user.id;

  try {
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
    const originalLength = channel?.chat_details.length || 0;

    channel.chat_details = channel.chat_details.filter(
      (entry) =>
        !(
          String(entry.timestamp) === String(timestamp) &&
          entry.sender_id === senderId
        ),
    );

    if (channel.chat_details.length === originalLength) {
      return res
        .status(404)
        .json({ status: 404, message: "Message not found" });
    }

    await chatDoc.save();
    await cache.del(`chat:${server_id}:${channel_id}`);

    const io = getIO();
    if (io) {
      io.to(`channel:${channel_id}`).emit("server_message_deleted", {
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
