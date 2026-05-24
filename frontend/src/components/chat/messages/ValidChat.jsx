import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Hash, Pencil, Trash2, Save, SendHorizontal, Loader2, AlertCircle,Reply, Pin, X } from "lucide-react";
import socket from "../../socket/Socket";
import { useParams } from "react-router-dom";
import { clear_channel_unread } from "../../../store/unreadSlice";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { resolveProfilePic, handleImageError } from "../../../shared/imageFallbacks";
import { API_BASE_URL } from "../../../config";

function ValidChat() {
  const dispatch = useDispatch();
  const url = API_BASE_URL;
  const { server_id } = useParams();

  // channel creds from redux
  const channel_id = useSelector((state) => state.currentPage.page_id);
  const channel_name = useSelector((state) => state.currentPage.page_name);

  // user creds from redux
  const username = useSelector((state) => state.user_info.username);
  const tag = useSelector((state) => state.user_info.tag);
  const profile_pic = useSelector((state) => state.user_info.profile_pic);
  const id = useSelector((state) => state.user_info.id);
  const serverRole = useSelector((state) => state.currentPage.role);
  const isServerOwner = serverRole === "author";

  const [chat_message, setchat_message] = useState("");
  const [all_messages, setall_messages] = useState([]);
  const [editingTimestamp, setEditingTimestamp] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showPinned, setShowPinned] = useState(false);
  const pinnedMessages = all_messages.filter(
  (message) => message.isPinned
  );

  useEffect(() => {
    if(socket && channel_id){
      socket.emit("join_chat", {
        channel_id: channel_id,
        server_id: server_id
      })
    }
  }, [channel_id,server_id]);

  const sendNow = async () => {
    if (!chat_message.trim()) return;
    const message_to_send = chat_message;
    const timestamp = Date.now();
    setchat_message("");
    stopTyping();
    await store_message(message_to_send, timestamp);
  };

  const store_message = async (chat_message, timestamp) => {
    const res = await fetch(`${url}/chat/store_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        message: chat_message,
        server_id,
        channel_id,
        channel_name,
        timestamp,
        username,
        tag,
        id,
        profile_pic,
        replyTo,
      }),
    });
    const data = await res.json();
    if (data.status !== 200) {
      setchat_message(chat_message);
    }
    if (data.status === 200) {
    setReplyTo(null);
    }
  };

  useEffect(() => {
    if (channel_id !== "") {
      setall_messages([]);
      setTypingUsers({});
      setIsLoading(true);
      setError(null);

      dispatch(clear_channel_unread({ server_id, channel_id }));
      fetch(`${url}/notifications/mark_channel_read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ server_id, channel_id }),
      });
      get_messages();
    }
    return () => {
      stopTyping();
      Object.values(typingUserTimeoutsRef.current).forEach(clearTimeout);
      typingUserTimeoutsRef.current = {};
      setTypingUsers({});
    };
    // eslint-disable-next-line
  }, [channel_id]);

  const get_messages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${url}/chat/get_messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({
          channel_id,
          server_id,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to load messages");
      }

      const data = await res.json();
      setall_messages(data.chats ? data.chats : []);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const editMessage = async (message) => {
    const res = await fetch(`${url}/chat/edit_server_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        server_id,
        channel_id,
        timestamp: message.timestamp,
        content: editingContent,
      }),
    });
    const data = await res.json();
    if (data.status === 200) {
      setall_messages((currentMessages) =>
        currentMessages.map((entry) =>
          String(entry.timestamp) === String(message.timestamp) &&
          entry.sender_id === id
            ? { ...entry, content: editingContent.trim() }
            : entry
        )
      );
      setEditingTimestamp(null);
      setEditingContent("");
    }
  };

  const deleteMessage = async (message) => {
    const res = await fetch(`${url}/chat/delete_server_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        server_id,
        channel_id,
        timestamp: message.timestamp,
      }),
    });
    const data = await res.json();
    if (data.status === 200) {
      setall_messages((currentMessages) =>
        currentMessages.filter(
          (entry) =>
            !(String(entry.timestamp) === String(message.timestamp) && entry.sender_id === id)
        )
      );
    }
  };

  const togglePinMessage = async (message) => {
  const res = await fetch(`${url}/chat/toggle_pin_message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-auth-token": localStorage.getItem("token"),
    },
    body: JSON.stringify({
      server_id,
      channel_id,
      timestamp: message.timestamp,
    }),
  });

  const data = await res.json();

  if (data.status === 200) {
    setall_messages((currentMessages) =>
      currentMessages.map((entry) =>
        String(entry.timestamp) === String(message.timestamp)
          ? { ...entry, isPinned: data.isPinned }
          : entry
      )
    );
  }
};

  useEffect(() => {
    const handleReceiveMessage = (messageData) => {
      setTypingUsers((currentUsers) => {
        const nextUsers = { ...currentUsers };
        delete nextUsers[String(messageData.sender_id)];
        return nextUsers;
      });
      clearTimeout(typingUserTimeoutsRef.current[String(messageData.sender_id)]);
      delete typingUserTimeoutsRef.current[String(messageData.sender_id)];

      setall_messages((currentMessages) => {
        const existingMessages = currentMessages || [];
        const alreadyExists = existingMessages.some(
          (entry) =>
            String(entry.timestamp) === String(messageData.timestamp) &&
            entry.sender_id === messageData.sender_id
        );

        if (alreadyExists) {
          return existingMessages;
        }

        return [...existingMessages, messageData];
      });
    };

    const handleUpdatedMessage = (message_data) => {
      setall_messages((currentMessages) =>
        (currentMessages || []).map((entry) =>
          String(entry.timestamp) === String(message_data.timestamp) &&
          entry.sender_id === message_data.sender_id
            ? { ...entry, content: message_data.content }
            : entry
        )
      );
    };

    const handleDeletedMessage = (message_data) => {
      setall_messages((currentMessages) =>
        (currentMessages || []).filter(
          (entry) =>
            !(
              String(entry.timestamp) === String(message_data.timestamp) &&
              entry.sender_id === message_data.sender_id
            )
        )
      );
    };
    const handlePinUpdated = (message_data) => {
      setall_messages((currentMessages) =>
        (currentMessages || []).map((entry) =>
          String(entry.timestamp) === String(message_data.timestamp)
            ? { ...entry, isPinned: message_data.isPinned }
            : entry
        )
      );
    };
    //earlier it was server_message_receive which was wrong
    socket.on("server_message_received", handleReceiveMessage);
    socket.on("server_message_updated", handleUpdatedMessage);
    socket.on("server_message_deleted", handleDeletedMessage);
    socket.on("server_message_pin_updated", handlePinUpdated);

    return () => {
      socket.off("server_message_received", handleReceiveMessage);
      socket.off("server_message_updated", handleUpdatedMessage);
      socket.off("server_message_deleted", handleDeletedMessage);
      socket.off("server_message_pin_updated", handlePinUpdated);
    };
  }, [channel_id, id, server_id]);

  const typingNames = Object.values(typingUsers);
  const typingText =
    typingNames.length === 1
      ? `${typingNames[0]} is typing...`
      : typingNames.length > 1
        ? `${typingNames.slice(0, 2).join(", ")}${typingNames.length > 2 ? " and others" : ""} are typing...`
        : "";

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-300" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <div className="text-white/80">{error}</div>
            <Button variant="outline" onClick={get_messages}>
              Retry
            </Button>
          </div>
        ) : all_messages && all_messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/5">
              <Hash className="h-8 w-8 text-brand-300" />
            </div>
           <div className="flex items-center gap-3">
              <div className="text-xl font-extrabold tracking-tight text-white">
                Welcome to #{channel_name}
              </div>

              <button
                type="button"
                onClick={() => setShowPinned(!showPinned)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10"
              >
                <Pin className="h-4 w-4" />
              </button>
            </div>
            <div className="text-white/60">
              This is the start of the #{channel_name} channel. Send a message to start the conversation!
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5 shadow-soft backdrop-blur-xl">
              <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
              <Hash className="h-5 w-5 text-brand-300" />
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight text-white">
                Welcome to #{channel_name}
              </div>
              <div className="text-sm text-white/60">
                This is the start of the #{channel_name} channel.
              </div>
            </div>
          </div>
        </div>

          {showPinned && (
            <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="mb-3 font-bold text-yellow-300">
                📌 Pinned Messages
              </div>

              {pinnedMessages.length === 0 ? (
                <div className="text-sm text-white/60">
                  No pinned messages yet.
                </div>
              ) : (
                pinnedMessages.map((msg) => (
                  <div
                    key={`pin-${msg.timestamp}`}
                    className="mb-2 rounded-lg bg-black/20 p-3"
                  >
                    <div className="text-xs text-yellow-300">
                      {msg.sender_name}
                    </div>

                    <div className="text-sm text-white">
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPinned(!showPinned)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                <Pin className="h-4 w-4" />
                Pinned Messages ({pinnedMessages.length})
              </button>
            </div>

            {showPinned && (
              <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="mb-3 font-bold text-yellow-300">
                  📌 Pinned Messages
                </div>

                {pinnedMessages.length === 0 ? (
                  <div className="text-sm text-white/60">
                    No pinned messages yet.
                  </div>
                ) : (
                  pinnedMessages.map((msg) => (
                    <button
                      key={`pin-${msg.timestamp}`}
                      type="button"
                      onClick={() => {
                        document
                          .getElementById(`message-${msg.timestamp}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className="mb-2 block w-full rounded-lg bg-black/20 p-3 text-left hover:bg-black/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-yellow-300">
                            {msg.sender_name}
                          </div>

                          <div className="truncate text-sm text-white">
                            {msg.content}
                          </div>

                          <div className="mt-1 text-[10px] text-white/40">
                            Click to jump to message
                          </div>
                        </div>

                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinMessage(msg);
                          }}
                          className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-1 text-yellow-300 hover:bg-yellow-500/20"
                          title="Unpin message"
                        >
                          <Pin className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

        <div className="mt-5 space-y-1.5 sm:space-y-2">
          {(all_messages || []).map((elem) => {
            const date = new Date(Number(elem.timestamp));
            const timestamp = `${date.toDateString()}, ${String(
              date.getHours()
            ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

            const mine = elem.sender_id === id;
            const isEditing = editingTimestamp === elem.timestamp && mine;

            return (
              <div
               id={`message-${elem.timestamp}`}
                key={`${elem.timestamp}-${elem.sender_id}`}
                className={`group flex gap-2 rounded-2xl px-1 py-1.5 transition hover:bg-white/5 sm:gap-3 sm:px-2 sm:py-2 ${elem.is_pinned ? "border border-brand-300/20 bg-brand-300/5" : ""}`}
              >
                <div className="relative mt-4 h-9 w-9 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/40 sm:mt-3 sm:h-10 sm:w-10">
                  <img
                    src={resolveProfilePic(elem.sender_pic, elem.sender_name)}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={handleImageError}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <div className="text-sm font-extrabold text-white/85">
                      {elem.sender_name}
                    </div>
                    <div className="text-[10px] leading-none text-white/35">
                      {timestamp}
                    </div>
                  {mine ? (
                    <div className="ml-auto flex items-center gap-1 flex-nowrap opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                        onClick={() =>
                          setReplyTo({
                            sender_name: elem.sender_name,
                            content: elem.content,
                            timestamp: elem.timestamp,
                          })
                        }
                        title="Reply"
                        aria-label="Reply"
                      >
                        <Reply className="h-4 w-4" />
                      </button>

                        <button
                          type="button"
                          className={`h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 transition ${
                            elem.isPinned
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                          }`}
                          onClick={() => togglePinMessage(elem)}
                          title="Pin Message"
                        >
                          <Pin className="h-4 w-4" />
                        </button>

                      <button
                        type="button"
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          setEditingTimestamp(elem.timestamp);
                          setEditingContent(elem.content);
                        }}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                        onClick={() => deleteMessage(elem)}
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                  </div>

                  {isEditing ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingContent.trim()) {
                            editMessage(elem);
                          }
                          // GSSoC Fix: Close edit mode on Escape key press
                          if (e.key === "Escape") {
                            setEditingTimestamp(null);
                            setEditingContent("");
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => editMessage(elem)}
                        disabled={!editingContent.trim()}
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  ) : (
                   <div className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-[1.45] text-white/85">
                    {elem.replyTo && (
                      <div className="mb-2 w-fit max-w-md rounded-lg border-l-2 border-blue-400 bg-white/5 px-3 py-2 text-xs">
                        <div className="font-semibold text-blue-300">
                          {elem.replyTo.sender_name}
                        </div>
                        <div className="truncate text-white/60">
                          {elem.replyTo.content}
                        </div>
                      </div>
                    )}

                    {elem.content}
                  </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>

      {typingText ? (
        <div className="px-4 pb-1 text-xs italic text-white/40">
          {typingText}
        </div>
      ) : null}

      <div className="border-t border-white/10 bg-black/25 p-3">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-2">
              <div>
                <div className="text-xs font-semibold text-blue-300">
                  Replying to {replyTo.sender_name}
                </div>
                <div className="text-xs text-white/70">
                  {replyTo.content}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        <div className="flex items-center gap-2">
          <Input
            value={chat_message}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendNow();
              }
            }}
            onChange={handleMessageChange}
            placeholder={`Message #${channel_name}`}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={sendNow}
            disabled={!chat_message.trim()}
            className="h-10 rounded-2xl"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ValidChat;
