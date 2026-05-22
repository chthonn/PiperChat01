import User from "../models/User.js";

const onlineUsers = new Map();

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

    socket.on("disconnect", () => {
      setUserOffline(io, socket.data.user_id, socket.id);
    });
  });
}

export { attachSocketHandlers };
