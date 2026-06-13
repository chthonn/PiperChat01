import config from "../config/index.js";

import express from "express";
import jwt from "jsonwebtoken";

import DirectMessageThread from "../models/DirectMessageThread.js";
import User from "../models/User.js";
import * as cache from "../lib/cache.js";
import { validateMessageContent } from "../lib/validation.js";
import { incrementDmUnread } from "../services/unreadService.js";
import { getIO } from "../socket/runtime.js";

import {
  getDirectMessagesValidator,
  sendDirectMessageValidator,
  editDirectMessageValidator,
  deleteDirectMessageValidator,
} from "../validators/directMessages.js";
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

function getThreadParticipants(userId, friendId) {
  return [userId, friendId].sort();
}

router.post("/get_direct_messages", getDirectMessagesValidator, validate, async (req, res) => {
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }

  const { friend_id } = req.body;

  const participants = getThreadParticipants(user.id, friend_id);
  const cacheKey = `dm:${participants[0]}:${participants[1]}`;
  const cached = await cache.getJson(cacheKey);
  if (cached && Array.isArray(cached.messages)) {
    return res.status(200).json({ status: 200, messages: cached.messages, cached: true });
  }

  const thread = await DirectMessageThread.findOne({
    participants,
  }).lean();

  const messages = thread?.messages || [];
  await cache.setJson(cacheKey, { messages });

  return res.status(200).json({
    status: 200,
    messages,
  });
});

router.post("/send_direct_message", sendDirectMessageValidator, validate, async (req, res) => {
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }

  const { friend_id, content } = req.body;

  const contentValidation = validateMessageContent(content);
  if (!friend_id || !contentValidation.valid) {
    return res.status(400).json({
      message: contentValidation.message || "Invalid input",
      status: 400,
    });
  }


  const currentUser = await User.findOne({ _id: user.id }).lean();
  const friend = await User.findOne({ _id: friend_id }).lean();

  if (!currentUser || !friend) {
    return res.status(404).json({ message: "User not found", status: 404 });
  }

  const isFriend = (currentUser.friends || []).some((entry) => entry.id === friend_id);
  if (!isFriend) {
    return res.status(403).json({ message: "Users are not friends", status: 403 });
  }

  const currentUserId = String(currentUser._id);
  const friendUserId = String(friend._id);

  const message = {
    sender_id: currentUserId,
    sender_name: currentUser.username,
    sender_tag: currentUser.tag,
    sender_pic: currentUser.profile_pic,
    content: contentValidation.value,
    timestamp: Date.now(),
  };

  const participants = getThreadParticipants(currentUserId, friendUserId);

  await DirectMessageThread.findOneAndUpdate(
    { participants },
    {
      $setOnInsert: { participants },
      $push: { messages: message },
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  await cache.del(`dm:${participants[0]}:${participants[1]}`);

  const io = getIO();
  if (io) {
    await incrementDmUnread(friendUserId, currentUserId);
    io.to(friendUserId).emit("direct_message_received", {
      friend_id: currentUserId,
      sender_id: currentUserId,
      sender_name: currentUser.username,
      sender_tag: currentUser.tag,
      sender_pic: currentUser.profile_pic,
      content: message.content,
      timestamp: message.timestamp,
    });
    io.to(currentUserId).emit("direct_message_received", {
      friend_id: friendUserId,
      sender_id: currentUserId,
      sender_name: currentUser.username,
      sender_tag: currentUser.tag,
      sender_pic: currentUser.profile_pic,
      content: message.content,
      timestamp: message.timestamp,
    });
    const shouldNotify = await shouldSendNotification(friendUserId, "direct_messages");
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
    data: message,
  });
});

router.post("/edit_direct_message", editDirectMessageValidator, validate, async (req, res) => {
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }

  const { friend_id, timestamp, content } = req.body;
  const contentValidation = validateMessageContent(content);
  if (!friend_id || !timestamp || !contentValidation.valid) {
    return res.status(400).json({
      status: 400,
      message: contentValidation.message || "Invalid input",
    });
  }

  const participants = getThreadParticipants(user.id, friend_id);
  const thread = await DirectMessageThread.findOne({ participants });

  if (!thread) {
    return res.status(404).json({ status: 404, message: "Thread not found" });
  }

  const message = thread.messages.find(
    (entry) => String(entry.timestamp) === String(timestamp) && entry.sender_id === user.id
  );

  if (!message) {
    return res.status(404).json({ status: 404, message: "Message not found" });
  }

  message.content = contentValidation.value;
  await thread.save();
  await cache.del(`dm:${participants[0]}:${participants[1]}`);

  const io = getIO();
  if (io) {
    io.to(friend_id).emit("direct_message_updated", {
      friend_id: user.id,
      timestamp,
      content: message.content,
      sender_id: user.id,
    });
    io.to(user.id).emit("direct_message_updated", {
      friend_id,
      timestamp,
      content: message.content,
      sender_id: user.id,
    });
  }

  return res.status(200).json({ status: 200, message: "Message updated" });
});

router.post("/delete_direct_message", deleteDirectMessageValidator, validate, async (req, res) => {
  const user = getAuthorizedUser(req, res);
  if (!user) {
    return;
  }

  const { friend_id, timestamp } = req.body;

  const participants = getThreadParticipants(user.id, friend_id);
  const thread = await DirectMessageThread.findOne({ participants });

  if (!thread) {
    return res.status(404).json({ status: 404, message: "Thread not found" });
  }

  const originalLength = thread.messages.length;
  thread.messages = thread.messages.filter(
    (entry) => !(String(entry.timestamp) === String(timestamp) && entry.sender_id === user.id)
  );

  if (thread.messages.length === originalLength) {
    return res.status(404).json({ status: 404, message: "Message not found" });
  }

  await thread.save();
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
});

export default router;
