import User from "../models/User.js";
import Chat from "../models/Chat.js";
import Server from "../models/Server.js";
import { buildServerTypingEvent } from "../lib/typingEvents.js";

const onlineUsers = new Map();

async function verifyChannelAccess(userId, channelId, serverId = null) {
  try {
    const chat = await Chat.findById(channelId).lean();
    if (!chat) return false;

    if (chat.type === "dm") {
      return String(chat.user1) === String(userId) || String(chat.user2) === String(userId);
    }

    if (serverId) {
      const server = await Server.findById(serverId).lean();
      if (!server) return false;

      const isOwner = String(server.owner) === String(userId);
      const isMember = server.members?.some((m) => String(m.userId) === String(userId));

      return isOwner || isMember;
    }

    return false;
  } catch (error) {
    console.error("Error verifying channel access:", error);
    return false;
  }
}

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

    socket.on("join_chat", async (data) => {
      try {
        const channel_id = typeof data === "object" ? data.channel_id : data;
        const normalizedChannelId = String(channel_id || "");
        const userId = socket.data.user_id;

        if (!normalizedChannelId || !userId) {
          socket.emit("error", { message: "Invalid channel or user" });
          return;
        }

        const hasAccess = await verifyChannelAccess(
          userId,
          normalizedChannelId,
          socket.data.server_id
        );

        if (!hasAccess) {
          console.warn(
            `[SECURITY] Unauthorized channel join attempt: User ${userId} tried to join channel ${normalizedChannelId}`
          );
          socket.emit("error", { message: "You do not have access to this channel" });
          return;
        }

        if (
          socket.data.active_channel_id &&
          socket.data.active_channel_id !== normalizedChannelId
        ) {
          socket.leave(socket.data.active_channel_id);
          socket.leave(`channel:${socket.data.active_channel_id}`);
        }

        socket.data.active_channel_id = normalizedChannelId;
        socket.join(`channel:${normalizedChannelId}`);
      } catch (error) {
        console.error("Error in join_chat handler:", error);
        socket.emit("error", { message: "Failed to join channel" });
      }
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
      async (channel_id, message, timestamp, sender_name, sender_tag, sender_pic) => {
        try {
          const normalizedChannelId = String(channel_id || "");
          const userId = socket.data.user_id;

          if (!normalizedChannelId || !userId) {
            return;
          }

          const hasAccess = await verifyChannelAccess(
            userId,
            normalizedChannelId,
            socket.data.server_id
          );

          if (!hasAccess) {
            console.warn(
              `[SECURITY] Unauthorized message attempt: User ${userId} tried to send message to channel ${normalizedChannelId}`
            );
            socket.emit("error", { message: "You do not have access to this channel" });
            return;
          }

          if (String(socket.data.active_channel_id || "") !== normalizedChannelId) {
            console.warn(
              `[SECURITY] Channel mismatch: User ${userId} is not in channel ${normalizedChannelId}`
            );
            return;
          }

          socket.to(`channel:${normalizedChannelId}`).emit("recieve_message", {
            message_data: {
              message,
              timestamp,
              sender_name,
              sender_tag,
              sender_pic,
            },
          });
        } catch (error) {
          console.error("Error in send_message handler:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
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
    });
  });
}

export { attachSocketHandlers };
