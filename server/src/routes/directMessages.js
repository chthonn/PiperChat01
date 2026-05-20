import config from "../config/index.js";

import express from "express";
import jwt from "jsonwebtoken";

import DirectMessageThread from "../models/DirectMessageThread.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import * as cache from "../lib/cache.js";
import { incrementDmUnread } from "../services/unreadService.js";
import { getIO } from "../socket/runtime.js";

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

function getThreadParticipants(userId, friendId) {
  return [userId, friendId].sort();
}

function toClientTimestamp(timestamp) {
  return new Date(timestamp).getTime();
}

router.post("/get_direct_messages", async (req, res) => {
  const user = getAuthorizedUser(req, res);
  if (!user) return;

  const { friend_id, cursor } = req.body;
  if (!friend_id) {
    return res
      .status(400)
      .json({ message: "friend_id is required", status: 400 });
  }

  const participants = getThreadParticipants(user.id, friend_id);
  const cacheKey = `dm:${participants[0]}:${participants[1]}`;

  if (!cursor) {
    const cached = await cache.getJson(cacheKey);
    if (cached && Array.isArray(cached.messages)) {
      return res
        .status(200)
        .json({ status: 200, messages: cached.messages, cached: true });
    }
  }

  try {
    const thread = await DirectMessageThread.findOne({ participants }).lean();

    if (!thread) {
      return res.status(200).json({ status: 200, messages: [] });
    }

    let query = { threadId: thread._id };
    if (cursor) {
      query.timestamp = { $lt: cursor };
    }

    const msgs = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const reversedMsgs = msgs.reverse();

    const messages = reversedMsgs.map((m) => ({
      sender_id: String(m.sender),
      sender_name: m.sender_name,
      sender_tag: m.sender_tag,
      sender_pic: m.sender_pic,
      content: m.content,
      timestamp: toClientTimestamp(m.timestamp),
    }));

    if (!cursor) {
      await cache.setJson(cacheKey, { messages });
    }

    return res.status(200).json({ status: 200, messages });
  } catch (error) {
    console.error("Error retrieving DMs:", error);
    return res.status(500).json({ message: "Server error", status: 500 });
  }
});

router.post("/send_direct_message", async (req, res) => {
  const user = getAuthorizedUser(req, res);
  if (!user) return;

  const { friend_id, content } = req.body;

  if (!friend_id || !content || !content.trim()) {
    return res.status(400).json({ message: "Invalid input", status: 400 });
  }

  const currentUser = await User.findOne({ _id: user.id }).lean();
  const friend = await User.findOne({ _id: friend_id }).lean();

  if (!currentUser || !friend) {
    return res.status(404).json({ message: "User isn't found", status: 404 });
  }

  const isFriend = (currentUser.friends || []).some(
    (entry) => entry.id === friend_id,
  );
  if (!isFriend) {
    return res
      .status(403)
      .json({ message: "Users aren't friends", status: 403 });
  }

  const currentUserId = String(currentUser._id);
  const friendUserId = String(friend._id);
  const timestamp = Date.now();

  const participants = getThreadParticipants(currentUserId, friendUserId);

  try {
    const thread = await DirectMessageThread.findOneAndUpdate(
      { participants },
      { $setOnInsert: { participants } },
      { upsert: true, new: true },
    );

    const newMessage = new Message({
      sender: currentUserId,
      threadId: thread._id,
      content: content.trim(),
      timestamp: timestamp,
      sender_name: currentUser.username,
      sender_tag: currentUser.tag,
      sender_pic: currentUser.profile_pic,
    });

    await newMessage.save();
    await cache.del(`dm:${participants[0]}:${participants[1]}`);

    const io = getIO();
    if (io) {
      await incrementDmUnread(friendUserId, currentUserId);
      const socketMessage = {
        friend_id: currentUserId,
        sender_id: currentUserId,
        sender_name: currentUser.username,
        sender_tag: currentUser.tag,
        sender_pic: currentUser.profile_pic,
        content: newMessage.content,
        timestamp: toClientTimestamp(newMessage.timestamp),
      };

      io.to(friendUserId).emit("direct_message_received", socketMessage);

      socketMessage.friend_id = friendUserId;
      io.to(currentUserId).emit("direct_message_received", socketMessage);

      const shouldNotify = await shouldSendNotification(
        friendUserId,
        "direct_messages",
      );
      if (shouldNotify) {
        io.to(friendUserId).emit("direct_message_notification", {
          friend_id: currentUserId,
          sender_name: currentUser.username,
        });
      }
    }

    return res.status(200).json({
      status: 200,
      message: "Message sent",
      data: {
        sender_id: currentUserId,
        sender_name: currentUser.username,
        sender_tag: currentUser.tag,
        sender_pic: currentUser.profile_pic,
        content: newMessage.content,
        timestamp: toClientTimestamp(newMessage.timestamp),
      },
    });
  } catch (error) {
    console.error("Error sending DM:", error);
    return res.status(500).json({ message: "Server error", status: 500 });
  }
});

router.post("/edit_direct_message", async (req, res) => {
  const user = getAuthorizedUser(req, res);
  if (!user) return;

  const { friend_id, timestamp, content } = req.body;
  if (!friend_id || !timestamp || !content || !content.trim()) {
    return res.status(400).json({ status: 400, message: "Invalid input" });
  }

  const participants = getThreadParticipants(user.id, friend_id);

  try {
    const thread = await DirectMessageThread.findOne({ participants }).lean();
    if (!thread) {
      return res.status(404).json({ status: 404, message: "Thread not found" });
    }

    const updatedMsg = await Message.findOneAndUpdate(
      { threadId: thread._id, timestamp: timestamp, sender: user.id },
      { content: content.trim(), isEdited: true },
      { new: true },
    );

    if (!updatedMsg) {
      return res
        .status(404)
        .json({ status: 404, message: "Message not found" });
    }

    await cache.del(`dm:${participants[0]}:${participants[1]}`);

    const io = getIO();
    if (io) {
      io.to(friend_id).emit("direct_message_updated", {
        friend_id: user.id,
        timestamp,
        content: updatedMsg.content,
        sender_id: user.id,
      });
      io.to(user.id).emit("direct_message_updated", {
        friend_id,
        timestamp,
        content: updatedMsg.content,
        sender_id: user.id,
      });
    }

    return res.status(200).json({ status: 200, message: "Message updated" });
  } catch (error) {
    console.error("Error editing DM:", error);
    return res.status(500).json({ message: "Server error", status: 500 });
  }
});

router.post("/delete_direct_message", async (req, res) => {
  const user = getAuthorizedUser(req, res);
  if (!user) return;

  const { friend_id, timestamp } = req.body;
  if (!friend_id || !timestamp) {
    return res.status(400).json({ status: 400, message: "Invalid input" });
  }

  const participants = getThreadParticipants(user.id, friend_id);

  try {
    const thread = await DirectMessageThread.findOne({ participants }).lean();
    if (!thread) {
      return res
        .status(404)
        .json({ status: 404, message: "Thread is not found" });
    }

    const deletedMsg = await Message.findOneAndDelete({
      threadId: thread._id,
      timestamp: timestamp,
      sender: user.id,
    });

    if (!deletedMsg) {
      return res
        .status(404)
        .json({ status: 404, message: "Message isn't found" });
    }

    await cache.del(`dm:${participants[0]}:${participants[1]}`);

    const io = getIO();
    if (io) {
      io.to(friend_id).emit("direct_message_deleted", {
        friend_id: user.id,
        timestamp,
        sender_id: user.id,
      });
      io.to(user.id).emit("direct_message_deleted", {
        friend_id,
        timestamp,
        sender_id: user.id,
      });
    }

    return res.status(200).json({ status: 200, message: "Message deleted" });
  } catch (error) {
    console.error("Error deleting DM:", error);
    return res.status(500).json({ message: "Server error", status: 500 });
  }
});

export default router;
