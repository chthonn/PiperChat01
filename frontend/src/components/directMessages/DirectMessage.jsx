import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { resolveProfilePic, handleImageError } from "../../shared/imageFallbacks";
import socket from "../socket/Socket";
import { clear_dm_unread } from "../../store/unreadSlice";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Pencil, Trash2, Save, Send } from "lucide-react";
import { API_BASE_URL } from "../../config";

function DirectMessage() {
  const dispatch = useDispatch();
  const activeFriend = useSelector((state) => state.direct_message.activeFriend);
  const currentUser = useSelector((state) => state.user_info);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [editingTimestamp, setEditingTimestamp] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const url = API_BASE_URL;

  const loadMessages = useCallback(async () => {
    if (!activeFriend) {
      return;
    }

    const res = await fetch(`${url}/direct-messages/get_direct_messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({ friend_id: activeFriend.id }),
    });
    const data = await res.json();
    if (data.status === 200) {
      setMessages(data.messages);
    }
  }, [activeFriend, url]);

  useEffect(() => {
    loadMessages();
    if (activeFriend) {
      dispatch(clear_dm_unread({ friend_id: activeFriend.id }));
      fetch(`${url}/notifications/mark_direct_messages_read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ friend_id: activeFriend.id }),
      });
    }
  }, [activeFriend, dispatch, loadMessages, url]);

  useEffect(() => {
    const handleIncomingMessage = (message) => {
      if (!activeFriend || message.friend_id !== activeFriend.id) {
        return;
      }

      setMessages((currentMessages) => {
        const alreadyExists = currentMessages.some(
          (entry) =>
            String(entry.timestamp) === String(message.timestamp) &&
            entry.sender_id === message.sender_id
        );

        if (alreadyExists) {
          return currentMessages;
        }

        return [
          ...currentMessages,
          {
            sender_id: message.sender_id,
            sender_name: message.sender_name,
            sender_tag: message.sender_tag,
            sender_pic: message.sender_pic,
            content: message.content,
            timestamp: message.timestamp,
          },
        ];
      });
    };

    const handleUpdatedMessage = (message) => {
      if (!activeFriend || message.friend_id !== activeFriend.id) {
        return;
      }

      setMessages((currentMessages) =>
        currentMessages.map((entry) =>
          String(entry.timestamp) === String(message.timestamp) &&
          entry.sender_id === message.friend_id
            ? { ...entry, content: message.content }
            : entry
        )
      );
    };

    const handleDeletedMessage = (message) => {
      if (!activeFriend || message.friend_id !== activeFriend.id) {
        return;
      }

      setMessages((currentMessages) =>
        currentMessages.filter(
          (entry) =>
            !(
              String(entry.timestamp) === String(message.timestamp) &&
              entry.sender_id === message.friend_id
            )
        )
      );
    };

    const handleTyping = ({ from }) => {
      if (activeFriend && String(from) === String(activeFriend.id)) {
        setFriendIsTyping(true);
      }
    };
    const handleStopTyping = ({ from }) => {
      if (activeFriend && String(from) === String(activeFriend.id)) {
        setFriendIsTyping(false);
      }
    };

    const handleDmReactionUpdated = ({ timestamp, reactions, friend_id: fid }) => {
      if (!activeFriend || fid !== activeFriend.id) return;
      setMessages((currentMessages) =>
        (currentMessages || []).map((entry) =>
          String(entry.timestamp) === String(timestamp)
            ? { ...entry, reactions }
            : entry
        )
      );
    };

    socket.on("dm_reaction_updated", handleDmReactionUpdated);
    socket.on("direct_message_received", handleIncomingMessage);
    socket.on("direct_message_updated", handleUpdatedMessage);
    socket.on("direct_message_deleted", handleDeletedMessage);
    socket.on("dm_typing", handleTyping);
    socket.on("dm_stop_typing", handleStopTyping);
    return () => {
      socket.off("dm_reaction_updated", handleDmReactionUpdated);
      socket.off("direct_message_received", handleIncomingMessage);
      socket.off("direct_message_updated", handleUpdatedMessage);
      socket.off("direct_message_deleted", handleDeletedMessage);
      socket.off("dm_typing", handleTyping);
      socket.off("dm_stop_typing", handleStopTyping);
      setFriendIsTyping(false);
    };
  }, [activeFriend]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!activeFriend) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("dm_typing", { to: activeFriend.id });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("dm_stop_typing", { to: activeFriend.id });
    }, 2000);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeFriend) return;

    const message = input.trim();
    setInput("");
    clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    socket.emit("dm_stop_typing", { to: activeFriend.id });

    const res = await fetch(`${url}/direct-messages/send_direct_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        friend_id: activeFriend.id,
        content: message,
      }),
    });
    const data = await res.json();
    if (data.status !== 200) {
      setInput(message);
    }
  };

  const startEditing = (message) => {
    setEditingTimestamp(message.timestamp);
    setEditingContent(message.content);
  };

  const editMessage = async (message) => {
    const res = await fetch(`${url}/direct-messages/edit_direct_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        friend_id: activeFriend.id,
        timestamp: message.timestamp,
        content: editingContent,
      }),
    });
    const data = await res.json();

    if (data.status === 200) {
      setMessages((currentMessages) =>
        currentMessages.map((entry) =>
          String(entry.timestamp) === String(message.timestamp) &&
          entry.sender_id === currentUser.id
            ? { ...entry, content: editingContent.trim() }
            : entry
        )
      );
      setEditingTimestamp(null);
      setEditingContent("");
    }
  };

  const toggleDmReaction = async (message, emoji) => {
    const res = await fetch(`${url}/direct-messages/toggle_dm_reaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        friend_id: activeFriend.id,
        timestamp: message.timestamp,
        emoji,
      }),
    });
    const data = await res.json();
    if (data.status === 200 && data.reactions) {
      setMessages((currentMessages) =>
        (currentMessages || []).map((entry) =>
          String(entry.timestamp) === String(message.timestamp)
            ? { ...entry, reactions: data.reactions }
            : entry
        )
      );
    }
    setShowEmojiPicker(null);
  };

  const deleteMessage = async (message) => {
    const res = await fetch(`${url}/direct-messages/delete_direct_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        friend_id: activeFriend.id,
        timestamp: message.timestamp,
      }),
    });
    const data = await res.json();

    if (data.status === 200) {
      setMessages((currentMessages) =>
        currentMessages.filter(
          (entry) =>
            !(String(entry.timestamp) === String(message.timestamp) && entry.sender_id === currentUser.id)
        )
      );
    }
  };

  if (!activeFriend) {
    return null;
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 bg-black/25 px-4 py-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <img
            src={resolveProfilePic(activeFriend.profile_pic, activeFriend.username)}
            alt=""
            className="h-full w-full object-cover"
            onError={handleImageError}
          />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-white">
            {activeFriend.username}
          </div>
          <div className="text-xs font-semibold text-white/50">
            #{activeFriend.tag}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {messages.map((message) => {
            const mine = message.sender_id === currentUser.id;
            const isEditing = editingTimestamp === message.timestamp && mine;
            return (
              <div
                className={[
                  "group flex gap-3",
                  mine ? "justify-end" : "justify-start",
                ].join(" ")}
                key={`${message.timestamp}-${message.sender_id}`}
              >
                {!mine ? (
                  <div className="relative mt-0.5 h-9 w-9 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    <img
                      src={resolveProfilePic(message.sender_pic, message.sender_name)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={handleImageError}
                    />
                  </div>
                ) : null}

                <div className={mine ? "max-w-[78%] sm:max-w-[62%]" : "max-w-[78%] sm:max-w-[62%]"}>
                  <div className={mine ? "flex justify-end" : "flex justify-start"}>
                    <div className="text-[11px] font-extrabold tracking-widest text-white/35">
                      {mine ? "YOU" : activeFriend.username}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingContent.trim()) {
                            editMessage(message);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => editMessage(message)}
                        disabled={!editingContent.trim()}
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="relative mt-2">
                      <div
                        className={[
                          "rounded-2xl border px-3 py-2 text-sm leading-relaxed",
                          mine
                            ? "border-brand-400/20 bg-brand-400/10 text-white"
                            : "border-white/10 bg-white/5 text-white/85",
                        ].join(" ")}
                      >
                        {message.content}
                      </div>

                      {(Array.isArray(message.reactions) && message.reactions.length > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {message.reactions.map((r) => (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() => toggleDmReaction(message, r.emoji)}
                              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                                r.users.includes(currentUser.id)
                                  ? "border-brand-300/50 bg-brand-300/20 text-brand-300"
                                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                              }`}
                            >
                              {r.emoji} {r.users.length}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="relative">
                        <div className={["absolute -top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100", mine ? "right-10" : "left-0"].join(" ")}>
                          <button
                            type="button"
                            className="rounded-xl border border-white/10 bg-zinc-950/70 p-1.5 text-white/65 shadow-soft backdrop-blur transition hover:bg-zinc-950/85 hover:text-white"
                            onClick={() => setShowEmojiPicker(showEmojiPicker === message.timestamp ? null : message.timestamp)}
                            title="React"
                          >
                            😊
                          </button>
                        </div>
                        {showEmojiPicker === message.timestamp && (
                          <div className="absolute bottom-full left-0 z-50 mb-1 flex gap-1 rounded-xl border border-white/10 bg-[#1e1f22] p-2 shadow-xl">
                            {["👍","❤️","😂","😮","😢","🔥","🎉","👀"].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className="rounded-lg p-1 text-lg transition hover:bg-white/10"
                                onClick={() => toggleDmReaction(message, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {mine ? (
                        <div
                          className={[
                            "absolute -top-2 right-2 flex items-center gap-1",
                            "opacity-0 transition-opacity",
                            "group-hover:opacity-100 focus-within:opacity-100",
                          ].join(" ")}
                        >
                          <button
                            type="button"
                            className="rounded-xl border border-white/10 bg-zinc-950/70 p-1.5 text-white/65 shadow-soft backdrop-blur transition hover:bg-zinc-950/85 hover:text-white"
                            onClick={() => startEditing(message)}
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-white/10 bg-zinc-950/70 p-1.5 text-white/65 shadow-soft backdrop-blur transition hover:bg-zinc-950/85 hover:text-white"
                            onClick={() => deleteMessage(message)}
                            title="Delete"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {mine ? (
                  <div className="relative mt-0.5 h-9 w-9 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    <img
                      src={resolveProfilePic(currentUser.profile_pic, currentUser.username)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={handleImageError}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {friendIsTyping && (
        <div className="px-4 pb-1 text-xs text-white/40 italic">
          {activeFriend.username} is typing...
        </div>
      )}
      <div className="border-t border-white/10 bg-black/25 p-3">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={`Message @${activeFriend.username}`}
            className="h-11"
          />
          <Button type="submit" disabled={!input.trim()} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default DirectMessage;
