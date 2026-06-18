import User from "../models/User.js";
import { buildServerTypingEvent } from "../lib/typingEvents.js";

const onlineUsers = new Map();
const strangerQueue = [];
const activeStrangerMatches = new Map();

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

async function isBlockedBetween(userId, partnerId) {
  if (!userId || !partnerId || userId === partnerId) {
    return true;
  }

  try {
    const user = await User.findById(userId).lean();
    const partner = await User.findById(partnerId).lean();
    if (!user || !partner) {
      return true;
    }

    const userBlocked = user.blocked?.some((entry) => String(entry.id) === String(partnerId));
    const partnerBlocked = partner.blocked?.some((entry) => String(entry.id) === String(userId));
    return Boolean(userBlocked || partnerBlocked);
  } catch {
    return true;
  }
}

function emitPresenceSnapshot(socket) {
  socket.emit("presence_snapshot", {
    online_user_ids: Array.from(onlineUsers.keys()),
  });
}

function setUserOnline(io, userId, socketId) {
  const normalizedUserId = String(userId);
  const activeSockets = onlineUsers.get(normalizedUserId) || new Set();
  const wasOnline = activeSockets.size > 0;

  activeSockets.add(socketId);
  onlineUsers.set(normalizedUserId, activeSockets);

  if (!wasOnline) {
    io.emit("presence_updated", {
      user_id: normalizedUserId,
      online: true,
    });
  }
}

function setUserOffline(io, userId, socketId) {
  if (!userId) {
    return;
  }

  const normalizedUserId = String(userId);
  const activeSockets = onlineUsers.get(normalizedUserId);

  if (!activeSockets) {
    return;
  }

  activeSockets.delete(socketId);

  if (activeSockets.size === 0) {
    onlineUsers.delete(normalizedUserId);
    io.emit("presence_updated", {
      user_id: normalizedUserId,
      online: false,
    });
    return;
  }

  onlineUsers.set(normalizedUserId, activeSockets);
}

function removeFromStrangerQueue(userId) {
  const normalizedUserId = String(userId);
  const index = strangerQueue.findIndex((entry) => entry.userId === normalizedUserId);
  if (index !== -1) {
    strangerQueue.splice(index, 1);
  }
}

function getSocketById(io, socketId) {
  return io.sockets.sockets.get(socketId);
}

function endStrangerMatch(io, normalizedUserId, reason = "The stranger conversation has ended.") {
  const match = activeStrangerMatches.get(normalizedUserId);
  if (!match) {
    return;
  }

  const partnerId = String(match.partnerId);
  const roomId = match.roomId;

  activeStrangerMatches.delete(normalizedUserId);
  activeStrangerMatches.delete(partnerId);

  io.to(roomId).emit("stranger_match_ended", { reason });
}

async function matchStrangerPair(io, first, second) {
  const firstSocket = getSocketById(io, first.socketId);
  const secondSocket = getSocketById(io, second.socketId);
  if (!firstSocket || !secondSocket) {
    removeFromStrangerQueue(first.userId);
    removeFromStrangerQueue(second.userId);
    return;
  }

  const roomId = `stranger:${Date.now()}:${first.userId}:${second.userId}`;
  firstSocket.join(roomId);
  secondSocket.join(roomId);

  activeStrangerMatches.set(first.userId, {
    partnerId: second.userId,
    roomId,
  });
  activeStrangerMatches.set(second.userId, {
    partnerId: first.userId,
    roomId,
  });

  firstSocket.emit("stranger_matched", {
    room_id: roomId,
    partner: {
      id: second.userId,
      display_name: second.anonymous ? "Anonymous" : second.username || "Anonymous",
      profile_pic: second.anonymous ? "" : second.profile_pic || "",
    },
  });

  secondSocket.emit("stranger_matched", {
    room_id: roomId,
    partner: {
      id: first.userId,
      display_name: first.anonymous ? "Anonymous" : first.username || "Anonymous",
      profile_pic: first.anonymous ? "" : first.profile_pic || "",
    },
  });
}

async function attemptStrangerMatch(io) {
  while (strangerQueue.length >= 2) {
    const first = strangerQueue.shift();
    if (!first) {
      continue;
    }

    const partnerIndex = strangerQueue.findIndex(
      (entry) => entry.userId !== first.userId
    );
    if (partnerIndex === -1) {
      strangerQueue.unshift(first);
      break;
    }

    const second = strangerQueue.splice(partnerIndex, 1)[0];
    const blocked = await isBlockedBetween(first.userId, second.userId);
    if (blocked) {
      strangerQueue.push(first);
      continue;
    }

    await matchStrangerPair(io, first, second);
  }
}

function attachSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("channelCreated", (data) => {
      io.emit("newChannel", data);
    });
  });

  io.on("connection", (socket) => {
    socket.on("get_userid", (user_id) => {
      const normalizedUserId = String(user_id);

      if (socket.data.user_id === normalizedUserId) {
        socket.join(normalizedUserId);
        emitPresenceSnapshot(socket);
        return;
      }

      if (socket.data.user_id) {
        setUserOffline(io, socket.data.user_id, socket.id);
      }

      socket.data.user_id = normalizedUserId;
      socket.join(normalizedUserId);
      setUserOnline(io, normalizedUserId, socket.id);
      emitPresenceSnapshot(socket);
    });

    socket.on(
      "send_req",
      async (receiver_id, sender_id, sender_profile_pic, sender_name) => {
        const shouldNotify = await shouldSendNotification(receiver_id, "friend_requests");
        if (shouldNotify) {
          socket.to(receiver_id).emit("recieve_req", {
            sender_name: sender_name,
            sender_profile_pic: sender_profile_pic,
            sender_id,
          });
        }
      },
    );

    socket.on(
      "req_accepted",
      (sender_id, friend_id, friend_name, friend_profile_pic) => {
        socket.to(friend_id).emit("req_accepted_notif", {
          sender_id,
          friend_name: friend_name,
          friend_profile_pic: friend_profile_pic,
        });
      },
    );

    socket.on("req_removed", (receiver_id) => {
      socket.to(receiver_id).emit("request_updated");
    });

    socket.on("join_stranger_queue", async ({ anonymous = true } = {}) => {
      const userId = socket.data.user_id;
      if (!userId) {
        return;
      }

      removeFromStrangerQueue(userId);
      const normalizedUserId = String(userId);
      let userRecord;
      try {
        userRecord = await User.findById(userId).lean();
      } catch {
        userRecord = null;
      }

      strangerQueue.push({
        userId: normalizedUserId,
        socketId: socket.id,
        anonymous: Boolean(anonymous),
        username: userRecord?.username || "Anonymous",
        profile_pic: userRecord?.profile_pic || "",
      });
      socket.emit("stranger_queue_status", { status: "waiting" });
      await attemptStrangerMatch(io);
    });

    socket.on("leave_stranger_queue", () => {
      removeFromStrangerQueue(socket.data.user_id);
      socket.emit("stranger_queue_status", { status: "idle" });
    });

    socket.on("leave_stranger_chat", () => {
      if (!socket.data.user_id) {
        return;
      }
      endStrangerMatch(io, String(socket.data.user_id), "The conversation has ended.");
    });

    socket.on("request_next_stranger", async ({ anonymous = true } = {}) => {
      const userId = socket.data.user_id;
      if (!userId) {
        return;
      }

      endStrangerMatch(io, String(userId), "You have left the conversation to find a new match.");
      removeFromStrangerQueue(userId);
      const normalizedUserId = String(userId);
      let userRecord;
      try {
        userRecord = await User.findById(userId).lean();
      } catch {
        userRecord = null;
      }

      strangerQueue.push({
        userId: normalizedUserId,
        socketId: socket.id,
        anonymous: Boolean(anonymous),
        username: userRecord?.username || "Anonymous",
        profile_pic: userRecord?.profile_pic || "",
      });
      socket.emit("stranger_queue_status", { status: "waiting" });
      await attemptStrangerMatch(io);
    });

    socket.on("report_stranger", async ({ partner_id }) => {
      const userId = socket.data.user_id;
      if (!userId || !partner_id) {
        return;
      }

      try {
        const partner = await User.findById(partner_id).lean();
        if (!partner) {
          return;
        }

        await User.updateOne(
          { _id: userId, "blocked.id": { $ne: partner_id } },
          {
            $push: {
              blocked: {
                id: partner_id,
                username: partner.username || "Anonymous",
                profile_pic: partner.profile_pic || "",
                tag: partner.tag || "0000",
              },
            },
          },
        );
      } catch {
        // ignore failures for reporting
      }

      endStrangerMatch(io, String(userId), "The conversation ended after reporting the user.");
    });

    socket.on("block_stranger", async ({ partner_id }) => {
      const userId = socket.data.user_id;
      if (!userId || !partner_id) {
        return;
      }

      try {
        const partner = await User.findById(partner_id).lean();
        if (!partner) {
          return;
        }

        await User.updateOne(
          { _id: userId, "blocked.id": { $ne: partner_id } },
          {
            $push: {
              blocked: {
                id: partner_id,
                username: partner.username || "Anonymous",
                profile_pic: partner.profile_pic || "",
                tag: partner.tag || "0000",
              },
            },
          },
        );
      } catch {
        // ignore failures for blocking
      }

      endStrangerMatch(io, String(userId), "The user has been blocked and removed from the chat.");
    });

    socket.on("stranger_message", (room_id, message_data) => {
      if (!room_id || !message_data) {
        return;
      }

      socket.to(room_id).emit("stranger_message", {
        room_id,
        message_data,
      });
    });

    socket.on("join_chat", (data) => {
      const channel_id = typeof data === "object" ? data.channel_id : data;
      const normalizedChannelId = String(channel_id || "");

      // console.log("Socket room report...debug");
      // console.log("Current rooms:", socket.rooms);

      if (!normalizedChannelId) {
        return;
      }

      //now we are checking if a user is already there in another channel
      if (
        socket.data.active_channel_id &&
        socket.data.active_channel_id !== normalizedChannelId
      ) {
        socket.leave(socket.data.active_channel_id);
        socket.leave(`channel:${socket.data.active_channel_id}`);
        // console.log(
        //   `Socket ${socket.id} left the channel: ${socket.data.active_channel_id}`,
        // );
      }

      socket.data.active_channel_id = normalizedChannelId;
      socket.join(`channel:${normalizedChannelId}`);
      // console.log("Now in thr room:", `channel:${normalizedChannelId}`);
    });

    socket.on("join_server", (server_id) => {
      const normalizedServerId = String(server_id || "");
      if (!normalizedServerId || normalizedServerId === "@me") {
        return;
      }

      if (
        socket.data.server_id &&
        socket.data.server_id !== normalizedServerId
      ) {
        socket.leave(`server:${socket.data.server_id}`);
      }

      socket.data.server_id = normalizedServerId;
      socket.join(`server:${normalizedServerId}`);
    });

    socket.on(
      "send_message",
      (channel_id, message, timestamp, sender_name, sender_tag, sender_pic) => {
        socket.to(`channel:${channel_id}`).emit("recieve_message", {
          message_data: {
            message,
            timestamp,
            sender_name,
            sender_tag,
            sender_pic,
          },
        });
      },
    );

    socket.on("dm_typing", ({ to }) => {
      socket.to(String(to)).emit("dm_typing", { from: socket.data.user_id });
    });

    socket.on("dm_stop_typing", ({ to }) => {
      socket.to(String(to)).emit("dm_stop_typing", { from: socket.data.user_id });
    });

    socket.on("server_typing", ({ channel_id, server_id, username } = {}) => {
      if (
        String(socket.data.active_channel_id || "") !== String(channel_id || "") ||
        String(socket.data.server_id || "") !== String(server_id || "")
      ) {
        return;
      }

      const typingEvent = buildServerTypingEvent({
        channel_id,
        server_id,
        from: socket.data.user_id,
        username,
      });

      if (!typingEvent) {
        return;
      }

      socket.to(`channel:${typingEvent.channel_id}`).emit("server_typing", typingEvent);
    });

    socket.on("server_stop_typing", ({ channel_id, server_id } = {}) => {
      if (
        String(socket.data.active_channel_id || "") !== String(channel_id || "") ||
        String(socket.data.server_id || "") !== String(server_id || "")
      ) {
        return;
      }

      const typingEvent = buildServerTypingEvent({
        channel_id,
        server_id,
        from: socket.data.user_id,
      });

      if (!typingEvent) {
        return;
      }

      socket
        .to(`channel:${typingEvent.channel_id}`)
        .emit("server_stop_typing", typingEvent);
    });

    socket.on("disconnect", () => {
      setUserOffline(io, socket.data.user_id, socket.id);
      removeFromStrangerQueue(socket.data.user_id);
      if (socket.data?.user_id) {
        endStrangerMatch(io, String(socket.data.user_id), "The stranger has disconnected.");
      }
    });
  });
}

export { attachSocketHandlers };
