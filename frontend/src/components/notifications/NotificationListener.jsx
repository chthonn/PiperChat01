import { useEffect, useCallback, useRef } from "react";
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

/**
 * NotificationListener
 *
 * Mounts as an invisible component near the app root.  It:
 *  • Fetches the initial unread summary from the server.
 *  • Re-fetches the summary whenever the socket reconnects (handles
 *    disconnect / page-background / Redis-restart scenarios).
 *  • Listens for real-time DM and server-message notifications and either
 *    increments the badge or immediately marks the message as read when the
 *    relevant conversation is already active.
 *  • Maintains presence (online/offline) state.
 *
 * Active-conversation logic
 * -------------------------
 * DM: a message is silently marked read when:
 *   - The user is on the dashboard ( @me route ), AND
 *   - The sending friend's conversation is open (activeFriend.id === friend_id).
 *
 * Server channel: a message is silently marked read when:
 *   - The user is inside the same server, AND
 *   - The active channel matches the incoming channel_id.
 */
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

  // ─── Fetch unread summary ─────────────────────────────────────────────────

  const fetchUnreadSummary = useCallback(async () => {
    try {
      const res = await fetch(`${url}/notifications/unread_summary`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
      });

      if (!res.ok) {
        console.warn("Unread summary fetch returned non-OK status:", res.status);
        return;
      }

      const data = await res.json();
      if (data.status === 200) {
        dispatch(set_unread_summary(data.summary));
      }
    } catch (err) {
      console.error("Failed to fetch unread summary:", err);
    }
  }, [url, dispatch]);

  // ─── Effect 1: presence + unread summary (runs once per authenticated user)
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

    // Socket uses autoConnect:false — explicitly connect when a user is present.
    if (!socket.connected) {
      socket.connect();
    }

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

    // Fetch the summary on mount (first connection).
    fetchUnreadSummary();

    /**
     * Reconnect handler — re-fetches the unread summary whenever the socket
     * reconnects.  This covers scenarios such as:
     *   - The user's device went to sleep and woke up.
     *   - The server restarted (and with it, the in-memory store).
     *   - Redis was temporarily unavailable and has come back.
     */
    const handleReconnect = () => {
      console.log("Socket reconnected — refreshing unread summary.");
      fetchUnreadSummary();
    };

    socket.on("connect", handleReconnect);

    return () => {
      socket.off("presence_snapshot", handlePresenceSnapshot);
      socket.off("presence_updated", handlePresenceUpdated);
      socket.off("user_servers_updated", handleUserServersUpdated);
      socket.off("connect", handleReconnect);
    };
  }, [userId, fetchUnreadSummary, dispatch]);

  // ─── Effect 2: DM and server message notifications ────────────────────────

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

  useEffect(() => {
    /**
     * handleDmNotification
     *
     * When a DM arrives:
     *  - If the sending friend's conversation is already open on the dashboard,
     *    dispatch a clear (no-op if already 0) and tell the server the message
     *    has been read.
     *  - Otherwise, increment the badge.
     */
    const handleDmNotification = ({ friend_id }) => {
      const isActiveDm =
        isDashboard && activeFriend?.id === friend_id;

      if (isActiveDm) {
        // Conversation is open — mark as read immediately.
        dispatch(clear_dm_unread({ friend_id }));
        fetch(`${url}/notifications/mark_direct_messages_read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": localStorage.getItem("token"),
          },
          body: JSON.stringify({ friend_id }),
        }).catch((err) =>
          console.error("Failed to mark DM read on server:", err)
        );
        return;
      }

      if (!canReceiveDMs) return;

      dispatch(increment_dm_unread({ friend_id }));
    };

    /**
     * handleServerNotification
     *
     * When a server-channel message arrives:
     *  - If the user is already viewing that exact channel, dispatch a clear
     *    (no-op if already 0) and tell the server it has been read.
     *  - Otherwise, increment the badge.
     */
    const handleServerNotification = ({ server_id, channel_id }) => {
      const isActiveChannel =
        !isDashboard &&
        activeServerId === server_id &&
        activeChannelId === channel_id;

      if (isActiveChannel) {
        // Channel is open — mark as read immediately.
        dispatch(clear_channel_unread({ server_id, channel_id }));
        fetch(`${url}/notifications/mark_channel_read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": localStorage.getItem("token"),
          },
          body: JSON.stringify({ server_id, channel_id }),
        }).catch((err) =>
          console.error("Failed to mark channel read on server:", err)
        );
        return;
      }

      if (!canReceiveServerMessages) return;

      dispatch(increment_server_unread({ server_id, channel_id }));
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

export default NotificationListener;
