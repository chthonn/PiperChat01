import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import socket from "../socket/Socket";
import { update_options } from "../../store/optionsSlice";
import {
  clear_channel_unread,
  clear_dm_unread,
  increment_dm_unread,
  increment_server_unread,
  set_unread_summary,
} from "../../store/unreadSlice";
import {
  set_online_users,
  set_user_presence,
} from "../../store/presenceSlice";
import { API_BASE_URL } from "../../config";

function NotificationListener() {
  const dispatch = useDispatch();
  const location = useLocation();
  const userId = useSelector((state) => state.user_info.id);
  const notificationPrefs = useSelector((state) => state.user_info.notification_preferences);
  const activeFriend = useSelector((state) => state.direct_message.activeFriend);
  const activeChannelId = useSelector((state) => state.currentPage.page_id);
  const url = API_BASE_URL;

  const canReceiveDMs = notificationPrefs?.direct_messages ?? true;
  const canReceiveServerMessages = notificationPrefs?.server_messages ?? true;

  const pathParts = location.pathname.split("/");
  const activeServerId = pathParts[2];
  const isDashboard = activeServerId === "@me" || activeServerId === undefined;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const handlePresenceSnapshot = ({ online_user_ids = [] }) => {
      dispatch(set_online_users(online_user_ids));
    };

    const handlePresenceUpdated = ({ user_id, online }) => {
      dispatch(set_user_presence({ user_id, online }));
    };

    socket.on("presence_snapshot", handlePresenceSnapshot);
    socket.on("presence_updated", handlePresenceUpdated);
    socket.emit("get_userid", userId);

    const handleUserServersUpdated = ({ user_id }) => {
      if (String(user_id) !== String(userId)) {
        return;
      }
      dispatch(update_options());
    };

    socket.on("user_servers_updated", handleUserServersUpdated);

    const fetchUnreadSummary = async () => {
      const res = await fetch(`${url}/notifications/unread_summary`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
      });
      const data = await res.json();
      if (data.status === 200) {
        dispatch(set_unread_summary(data.summary));
      }
    };

    fetchUnreadSummary();

    return () => {
      socket.off("presence_snapshot", handlePresenceSnapshot);
      socket.off("presence_updated", handlePresenceUpdated);
      socket.off("user_servers_updated", handleUserServersUpdated);
    };
  }, [userId, url, dispatch]);

  const prevPrefsRef = useRef(notificationPrefs);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const prev = prevPrefsRef.current;
    const reEnabled =
      (prev?.direct_messages === false && canReceiveDMs) ||
      (prev?.server_messages === false && canReceiveServerMessages);

    if (reEnabled) {
      const res = fetch(`${url}/notifications/unread_summary`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
      }).then((r) => r.json());
      res.then((data) => {
        if (data.status === 200) {
          dispatch(set_unread_summary(data.summary));
        }
      });
    }

    prevPrefsRef.current = notificationPrefs;
  }, [
    userId,
    url,
    dispatch,
    notificationPrefs,
    canReceiveDMs,
    canReceiveServerMessages,
  ]);

  const unreadCountRef = useRef(0);

  const incrementTabUnread = () => {
    unreadCountRef.current += 1;
    document.title = `(${unreadCountRef.current}) PiperChat`;
    drawFaviconBadge(true);
  };

  const resetTabUnread = () => {
    unreadCountRef.current = 0;
    document.title = "PiperChat";
    drawFaviconBadge(false);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetTabUnread();
      }
    };

    const handleFocus = () => {
      resetTabUnread();
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    const handleDmNotification = ({ friend_id }) => {
      if (activeFriend?.id === friend_id && isDashboard) {
        dispatch(clear_dm_unread({ friend_id }));
        fetch(`${url}/notifications/mark_direct_messages_read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": localStorage.getItem("token"),
          },
          body: JSON.stringify({ friend_id }),
        });
        if (document.hidden) {
          incrementTabUnread();
        }
        return;
      }

      if (!canReceiveDMs) return;

      dispatch(increment_dm_unread({ friend_id }));
      if (document.hidden) {
        incrementTabUnread();
      }
    };

    const handleServerNotification = ({ server_id, channel_id }) => {
      if (
        !isDashboard &&
        activeServerId === server_id &&
        activeChannelId === channel_id
      ) {
        dispatch(clear_channel_unread({ server_id, channel_id }));
        fetch(`${url}/notifications/mark_channel_read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": localStorage.getItem("token"),
          },
          body: JSON.stringify({ server_id, channel_id }),
        });
        if (document.hidden) {
          incrementTabUnread();
        }
        return;
      }

      if (!canReceiveServerMessages) return;

      dispatch(increment_server_unread({ server_id, channel_id }));
      if (document.hidden) {
        incrementTabUnread();
      }
    };

    socket.on("direct_message_notification", handleDmNotification);
    socket.on("server_message_notification", handleServerNotification);

    return () => {
      socket.off("direct_message_notification", handleDmNotification);
      socket.off("server_message_notification", handleServerNotification);
    };
  }, [activeFriend, activeServerId, activeChannelId, isDashboard, canReceiveDMs, canReceiveServerMessages, url, dispatch]);

  return null;
}

const drawFaviconBadge = (hasBadge) => {
  const favicon = document.querySelector("link[rel~='icon']");
  if (!favicon) return;

  if (!hasBadge) {
    favicon.href = "/favicon.png";
    return;
  }

  const img = new Image();
  img.src = "/favicon.png";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width || 32;
    canvas.height = img.height || 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw original favicon
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw red badge in top-right corner
    const radius = canvas.width * 0.25;
    const x = canvas.width - radius;
    const y = radius;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = "#FF0000";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();

    favicon.href = canvas.toDataURL("image/png");
  };
};

export default NotificationListener;

