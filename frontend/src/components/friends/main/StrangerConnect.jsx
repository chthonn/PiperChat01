import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  RotateCcw,
  Flag,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useSelector } from "react-redux";
import socket from "../../socket/Socket";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { resolveProfilePic, handleImageError } from "../../../shared/imageFallbacks";

function StrangerConnect() {
  const username = useSelector((state) => state.user_info.username);
  const rawProfilePic = useSelector((state) => state.user_info.profile_pic);
  const profile_pic = resolveProfilePic(rawProfilePic, username);

  const [anonymous, setAnonymous] = useState(true);
  const [queueState, setQueueState] = useState("idle");
  const [matchPartner, setMatchPartner] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "Join the queue and connect with someone new right now."
  );
  const [busy, setBusy] = useState(false);
  const [systemNotice, setSystemNotice] = useState(null);
  const [reportSent, setReportSent] = useState(false);

  const messageListRef = useRef(null);

  const canSendMessage = Boolean(matchPartner && roomId && input.trim());

  useEffect(() => {
    const handleMatched = (payload) => {
      setMatchPartner(payload.partner);
      setRoomId(payload.room_id || "");
      setQueueState("matched");
      setStatusMessage("Matched! Start chatting anonymously.");
      setSystemNotice(null);
      setMessages((current) => [
        ...current,
        {
          id: `sys-${Date.now()}`,
          type: "system",
          text: "You have been matched. Say hello!",
        },
      ]);
    };

    const handleMessage = ({ room_id, message_data }) => {
      if (room_id !== roomId) {
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: `peer-${Date.now()}`,
          type: "peer",
          text: message_data.message,
          sender: message_data.sender_name || "Stranger",
          timestamp: message_data.timestamp,
        },
      ]);
    };

    const handleMatchEnded = ({ reason }) => {
      setSystemNotice(reason || "The conversation has ended.");
      setQueueState("idle");
      setMatchPartner(null);
      setRoomId("");
      setStatusMessage("Your connection ended. You can join the queue again.");
      setMessages((current) => [
        ...current,
        {
          id: `end-${Date.now()}`,
          type: "system",
          text: reason || "Your partner has left the chat.",
        },
      ]);
    };

    const handleQueueStatus = ({ status }) => {
      if (status === "waiting") {
        setQueueState("waiting");
        setStatusMessage("Waiting for another online user to match...");
      } else {
        setQueueState("idle");
        setStatusMessage("Join the queue and connect with someone new right now.");
      }
    };

    socket.on("stranger_matched", handleMatched);
    socket.on("stranger_message", handleMessage);
    socket.on("stranger_match_ended", handleMatchEnded);
    socket.on("stranger_queue_status", handleQueueStatus);

    return () => {
      socket.off("stranger_matched", handleMatched);
      socket.off("stranger_message", handleMessage);
      socket.off("stranger_match_ended", handleMatchEnded);
      socket.off("stranger_queue_status", handleQueueStatus);
    };
  }, [roomId]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (queueState === "waiting") {
        socket.emit("leave_stranger_queue");
      }
      if (queueState === "matched") {
        socket.emit("leave_stranger_chat");
      }
    };
  }, [queueState]);

  const joinQueue = () => {
    setBusy(true);
    socket.emit("join_stranger_queue", { anonymous });
    setQueueState("waiting");
    setStatusMessage("Searching for a match...");
    setBusy(false);
  };

  const leaveQueue = () => {
    socket.emit("leave_stranger_queue");
    setQueueState("idle");
    setStatusMessage("You left the queue. Join again to meet a new stranger.");
  };

  const leaveChat = () => {
    setBusy(true);
    socket.emit("leave_stranger_chat");
    setBusy(false);
  };

  const nextPerson = () => {
    setBusy(true);
    socket.emit("request_next_stranger", { anonymous });
    setBusy(false);
    setSystemNotice(null);
    setMessages((current) => [
      ...current,
      {
        id: `next-${Date.now()}`,
        type: "system",
        text: "Looking for the next person...",
      },
    ]);
  };

  const reportPartner = () => {
    if (!matchPartner?.id) return;
    socket.emit("report_stranger", { partner_id: matchPartner.id });
    setReportSent(true);
    setSystemNotice("Report submitted. You will be returned to the queue.");
  };

  const blockPartner = () => {
    if (!matchPartner?.id) return;
    socket.emit("block_stranger", { partner_id: matchPartner.id });
    setReportSent(true);
    setSystemNotice("The user has been blocked and removed from your queue.");
  };

  const sendMessage = () => {
    if (!canSendMessage) return;
    const payload = {
      message: input.trim(),
      timestamp: new Date().toISOString(),
      sender_name: anonymous ? "Anonymous" : username,
      sender_pic: anonymous ? "" : profile_pic,
    };

    socket.emit("stranger_message", roomId, payload);
    setMessages((current) => [
      ...current,
      {
        id: `me-${Date.now()}`,
        type: "me",
        text: input.trim(),
        timestamp: payload.timestamp,
      },
    ]);
    setInput("");
  };

  const displayPartner = matchPartner
    ? matchPartner.display_name || "Anonymous"
    : "Waiting...";

  const statusLabel = useMemo(() => {
    if (queueState === "waiting") return "Waiting";
    if (queueState === "matched") return "Connected";
    return "Idle";
  }, [queueState]);

  return (
    <div className="grid h-full gap-6 p-4 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-3xl border border-white/10 bg-panel/70 p-6 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-extrabold tracking-[0.25em] text-white/60">
                STRANGER CONNECT
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-white">
                Meet a new online user instantly.
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              {statusLabel}
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white/80">Anonymous chat</div>
                <div className="text-xs text-white/50">
                  Keep your identity private while matching. Disable this to show your username.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAnonymous((current) => !current)}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                {anonymous ? "Anonymous" : "Visible"}
              </button>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              {statusMessage}
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white/80">Current match</div>
                <div className="text-xs text-white/50">
                  {queueState === "matched"
                    ? "You are connected. Messages are private in this room."
                    : "No match yet. Join the queue to start connecting."}
                </div>
              </div>

              {queueState !== "matched" ? (
                <div className="flex flex-wrap gap-2">
                  {queueState === "waiting" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={leaveQueue}
                      disabled={busy}
                    >
                      Leave queue
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={joinQueue}
                      disabled={busy}
                    >
                      Join queue
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={nextPerson} disabled={busy}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Next person
                  </Button>
                  <Button type="button" variant="secondary" onClick={leaveChat}>
                    Leave chat
                  </Button>
                  <Button type="button" variant="secondary" onClick={reportPartner}>
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={blockPartner}
                  >
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Block
                  </Button>
                </div>
              )}
            </div>

            {queueState === "matched" ? (
              <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                  <img
                    src={matchPartner.profile_pic || profile_pic}
                    alt={displayPartner}
                    className="h-full w-full object-cover"
                    onError={handleImageError}
                  />
                </div>
                <div className="min-w-0 text-sm">
                  <div className="font-extrabold text-white">{displayPartner}</div>
                  <div className="text-xs text-white/60">Anonymous stranger</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-[420px] flex-col rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="mb-4 flex items-center justify-between text-sm text-white/60">
              <div>Chat room</div>
              <div>{queueState === "waiting" ? "Waiting for match..." : "Type when connected."}</div>
            </div>

            <div
              ref={messageListRef}
              className="flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-white/80"
            >
              {messages.length === 0 ? (
                <div className="text-center text-sm text-white/50">
                  {queueState === "matched"
                    ? "Start the conversation by sending your first message."
                    : "Join the queue and your stranger chat history will appear here."}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      {msg.type === "system" ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-white/60">
                          {msg.text}
                        </div>
                      ) : (
                        <div
                          className={[
                            "rounded-3xl p-3 text-sm shadow-soft",
                            msg.type === "me"
                              ? "ml-auto max-w-[80%] bg-brand-400/15 text-white"
                              : "max-w-[80%] bg-white/5 text-white/80",
                          ].join(" ")}
                        >
                          {msg.type === "peer" ? (
                            <div className="mb-2 text-xs uppercase tracking-[0.25em] text-white/50">
                              {msg.sender}
                            </div>
                          ) : null}
                          <div>{msg.text}</div>
                          {msg.timestamp ? (
                            <div className="mt-2 text-[10px] text-white/40">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  queueState === "matched"
                    ? "Send a private message to your stranger..."
                    : "Join the queue to start chatting."
                }
                disabled={queueState !== "matched"}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={sendMessage}
                disabled={!canSendMessage}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {systemNotice ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                {systemNotice}
              </div>
            ) : null}
            {reportSent ? (
              <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Thank you. The report has been sent.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-6 shadow-soft backdrop-blur-xl">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-white/70">
          <div className="font-semibold text-white">How it works</div>
          <div className="mt-2 space-y-2">
            <p>• Join the queue and wait for a random online user.</p>
            <p>• Your username stays hidden if anonymous mode is on.</p>
            <p>• Use Next Person to rematch instantly.</p>
            <p>• Report or block any user for safety.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-white/70">
          <div className="font-semibold text-white">Safety guidelines</div>
          <div className="mt-2 space-y-2">
            <p>• Keep personal details private until you trust the person.</p>
            <p>• Use report or block if someone behaves badly.</p>
            <p>• You can leave the chat at any time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StrangerConnect;
