import {
  Bell,
  Hash,
  Inbox,
  LogOut,
  Menu,
  Pin,
  Loader2,
  Search,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { logout } from "../../../lib/logout";
import socket from "../../socket/Socket";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../ui/dialog";
import { API_BASE_URL } from "../../../config";


function TopnavChat({ onToggleSidebar }) {
  const [pinnedMessagesOpen, setPinnedMessagesOpen] = useState(false);
  const [channelMessages, setChannelMessages] = useState([]);
  const [loadingPinnedMessages, setLoadingPinnedMessages] = useState(false);

  const { server_id } = useParams();
  const channel_id = useSelector((state) => state.currentPage.page_id);
  const channel_name = useSelector((state) => state.currentPage.page_name);
  const serverRole = useSelector((state) => state.currentPage.role);
  const isServerOwner = serverRole === "author";
  const pinnedMessages = channelMessages.filter((message) => message.is_pinned);

  const fetchChannelMessages = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/chat/get_messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({ server_id, channel_id }),
    });

    const data = await res.json();
    setChannelMessages(data.chats || []);
  }, [channel_id, server_id]);

  useEffect(() => {
    if (!pinnedMessagesOpen || !server_id || !channel_id) {
      return;
    }

    let isActive = true;

    const refreshPinnedMessages = async () => {
      setLoadingPinnedMessages(true);
      try {
        if (!isActive) {
          return;
        }

        await fetchChannelMessages();
      } catch {
        if (isActive) {
          setChannelMessages([]);
        }
      } finally {
        if (isActive) {
          setLoadingPinnedMessages(false);
        }
      }
    };

    const handlePinnedUpdate = (messageData) => {
      if (
        String(messageData?.server_id) !== String(server_id) ||
        String(messageData?.channel_id) !== String(channel_id)
      ) {
        return;
      }

      refreshPinnedMessages();
    };

    refreshPinnedMessages();
    socket.on("server_message_pin_updated", handlePinnedUpdate);

    return () => {
      isActive = false;
      socket.off("server_message_pin_updated", handlePinnedUpdate);
    };
  }, [pinnedMessagesOpen, channel_id, fetchChannelMessages, server_id]);

  const handleTogglePin = async (message) => {
    const res = await fetch(`${API_BASE_URL}/chat/toggle_server_message_pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        server_id,
        channel_id,
        timestamp: message.timestamp,
        sender_id: message.sender_id,
      }),
    });

    if (res.ok) {
      await fetchChannelMessages();
    }
  };

  return (
    <>
      <div className="flex h-full items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <Hash className="h-4 w-4 text-brand-300" />
            <div className="truncate text-sm font-extrabold text-white">
              {channel_name || "channel"}
            </div>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-end gap-2 lg:flex">
          <button
            type="button"
            onClick={() => setPinnedMessagesOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Pin messages"
            aria-label="Pin messages"
          >
            <Pin className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Members"
            aria-label="Members"
          >
            <UsersRound className="h-5 w-5" />
          </button>

          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              placeholder="Search"
              className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-neon-cyan/40 focus:ring-2 focus:ring-neon-cyan/15"
            />
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Inbox"
            aria-label="Inbox"
          >
            <Inbox className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Logout"
            aria-label="Logout"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Logout"
            aria-label="Logout"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Dialog open={pinnedMessagesOpen} onOpenChange={setPinnedMessagesOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Pinned messages</DialogTitle>
          <DialogDescription className="mt-2">
            Manage pinned messages in #{channel_name || "channel"}.
          </DialogDescription>

          <div className="mt-5 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {loadingPinnedMessages ? (
              <div className="flex items-center justify-center py-10 text-white/60">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading messages...
              </div>
            ) : pinnedMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/55">
                No pinned messages yet.
              </div>
            ) : (
              pinnedMessages.map((message) => {
                const date = new Date(Number(message.timestamp));
                const formattedTime = `${date.toDateString()}, ${String(
                  date.getHours(),
                ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

                return (
                  <div
                    key={`${message.timestamp}-${message.sender_id}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Pin className="h-4 w-4 text-brand-300" />
                      <span>{message.sender_name}</span>
                      <span className="text-xs font-normal text-white/40">{formattedTime}</span>
                      {message.is_pinned ? (
                        <span className="rounded-full border border-brand-300/25 bg-brand-300/10 px-2 py-0.5 text-[10px] font-semibold text-brand-200">
                          Pinned
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/80">
                      {message.content}
                    </div>
                    {isServerOwner ? (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(message)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
                        >
                          <Pin className="h-4 w-4" />
                          Unpin
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TopnavChat
