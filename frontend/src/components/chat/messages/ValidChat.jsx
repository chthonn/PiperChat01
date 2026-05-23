import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Hash, Pencil, Trash2, Save, SendHorizontal, Loader2, AlertCircle } from "lucide-react";
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

  const [chat_message, setchat_message] = useState("");
  const [all_messages, setall_messages] = useState([]);
  const [editingTimestamp, setEditingTimestamp] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if(socket && channel_id){
      socket.emit("join_chat", {
        channel_id: channel_id,
        server_id: server_id
      })
    }
    return () => {
      if (socket && channel_id) {
        socket.emit("leave_chat", {
          channel_id: channel_id,
          server_id: server_id
        })
      }
    }
  }, [channel_id,server_id]);

  const sendNow = async () => {
    if (!chat_message.trim()) return;
    const message_to_send = chat_message;
    const timestamp = Date.now();
    setchat_message("");
    await store_message(message_to_send, timestamp);
  };

  const store_message = async (chat_message, timestamp) => {
    try {
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
        }),
      });
      const data = await res.json();
      if (data.status !== 200) {
        setchat_message(chat_message);
      }
    } catch {
      setchat_message(chat_message);
    }
  };

  useEffect(() => {
    if (channel_id !== "") {
      setall_messages([]);
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
  }, [channel_id, server_id]);

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
    try {
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
    } catch {
      setEditingTimestamp(null);
      setEditingContent("");
    }
  };

  const deleteMessage = async (message) => {
    try {
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
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    const handleReceiveMessage = (messageData) => {
      if (String(messageData.channel_id) !== String(channel_id)) {
        return;
      }
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
      if (String(message_data.channel_id) !== String(channel_id)) {
        return;
      }
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
      if (String(message_data.channel_id) !== String(channel_id)) {
        return;
      }
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
    //earlier it was server_message_receive which was wrong
    socket.on("server_message_received", handleReceiveMessage);
    socket.on("server_message_updated", handleUpdatedMessage);
    socket.on("server_message_deleted", handleDeletedMessage);

    return () => {
      socket.off("server_message_received", handleReceiveMessage);
      socket.off("server_message_updated", handleUpdatedMessage);
      socket.off("server_message_deleted", handleDeletedMessage);
    };
  }, [channel_id]);

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
            <div className="text-2xl font-extrabold tracking-tight text-white">
              Welcome to #{channel_name}!
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
                key={`${elem.timestamp}-${elem.sender_id}`}
                className="group flex gap-2 rounded-2xl px-1 py-1.5 transition hover:bg-white/5 sm:gap-3 sm:px-2 sm:py-2"
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
                      <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
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
                          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
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

      <div className="border-t border-white/10 bg-black/25 p-3">
        <div className="flex items-center gap-2">
          <Input
            value={chat_message}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendNow();
              }
            }}
            onChange={(e) => setchat_message(e.target.value)}
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
