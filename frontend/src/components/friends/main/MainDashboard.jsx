import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MessageCircle,
  Check,
  X,
  UserMinus,
  Loader2,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import online_wumpus from "../../../images/online.svg";
import friends_wumpus from "../../../images/friends_2.svg";
import pending_wumpus from "../../../images/pending.svg";
import blocked_wumpus from "../../../images/blocked.svg";
import add_friend_wumpus from "../../../images/friends_2.svg";
import { update_options } from "../../../store/optionsSlice";
import socket from "../../socket/Socket";
import { resolveProfilePic } from "../../../shared/imageFallbacks";
import { open_direct_message } from "../../../store/directMessageSlice";
import { API_BASE_URL } from "../../../config";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

const OPTION_IMAGES = [
  online_wumpus,
  friends_wumpus,
  pending_wumpus,
  blocked_wumpus,
  add_friend_wumpus,
];

function MainDashboard({ user_relations }) {
  const dispatch = useDispatch();
  const option_check = useSelector((state) => state.selected_option.value);
  const option_name_check = useSelector(
    (state) => state.selected_option.option_name
  );
  const option_status = useSelector((state) => state.selected_option.status);
  const option_text = useSelector((state) => state.selected_option.text);
  const onlineUsers = useSelector((state) => state.presence.byId);

  // user details from redux
  const username = useSelector((state) => state.user_info.username);
  const profile_pic = useSelector((state) => state.user_info.profile_pic);
  const id = useSelector((state) => state.user_info.id);

  const [button_state, setbutton_state] = useState(true);
  const [input, setinput] = useState("");
  const [query, setQuery] = useState("");
  const [actionBusy, setActionBusy] = useState({});
  const image = OPTION_IMAGES[option_check] || OPTION_IMAGES[0];
  const [alert, setalert] = useState({ style: "none", message: "none" });

  const { incoming_reqs, outgoing_reqs, friends } = user_relations;
  const pending_reqs = useMemo(
    () => [...(incoming_reqs || []), ...(outgoing_reqs || [])],
    [incoming_reqs, outgoing_reqs]
  );
  const url = API_BASE_URL;

  const option_data = useMemo(() => {
    if (option_check === 2) return pending_reqs;
    if (option_check === 1) return friends || [];
    if (option_check === 0) {
      return (friends || []).filter((entry) =>
        Boolean(onlineUsers[String(entry.id)])
      );
    }
    return [];
  }, [pending_reqs, friends, option_check, onlineUsers]);

  const button_clicked = async (message, friend_data) => {
    if (message === "Message") {
      dispatch(open_direct_message(friend_data));
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setalert({
        style: "flex",
        message: "Session expired. Please log in again.",
      });
      return;
    }

    const friendPayload = {
      id: String(friend_data?.id || ""),
      username: friend_data?.username || "",
      tag: friend_data?.tag || "",
      profile_pic: friend_data?.profile_pic || "",
      status: friend_data?.status,
    };

    const busyKey = `${message}:${friendPayload.id}`;
    setActionBusy((prev) => ({ ...prev, [busyKey]: true }));
    setalert({ ...alert, style: "none" });

    try {
      const res = await fetch(`${url}/process_req`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({
          friend_data: friendPayload,
          message,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      const status = data?.status ?? res.status;
      const serverMessage =
        data?.message ||
        (status === 200 ? "Success" : "Something went wrong");

      if (status === 200) {
        dispatch(update_options());
        if (message === "Accept") {
          socket.emit(
            "req_accepted",
            id,
            friendPayload.id,
            username,
            profile_pic
          );
        }
        if ((message === "Ignore" || message === "Cancel") && friendPayload.id) {
          socket.emit("req_removed", friendPayload.id);
        }
        return;
      }

      if (status === 401) {
        setalert({
          style: "flex",
          message: "Unauthorized. Please log in again.",
        });
        return;
      }

      setalert({
        style: "flex",
        message: serverMessage,
      });
    } catch {
      setalert({
        style: "flex",
        message: "Network error. Please try again.",
      });
    } finally {
      setActionBusy((prev) => {
        const next = { ...prev };
        delete next[busyKey];
        return next;
      });
    }
  };

  function ActionButton({
    label,
    variant = "secondary",
    children,
    onClick,
    disabled,
    loading,
  }) {
    const firedFromPointer = useRef(false);

    const activate = () => {
      if (disabled || loading) return;
      onClick?.();
    };

    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-disabled={disabled || loading ? "true" : "false"}
        disabled={disabled || loading}
        onClick={(e) => {
          e.stopPropagation();
          if (firedFromPointer.current) {
            firedFromPointer.current = false;
            return;
          }
          activate();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => {
          e.stopPropagation();
          firedFromPointer.current = true;
          activate();
        }}
        className={[
          "relative z-30 inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-white/80 transition",
          variant === "danger"
            ? "border-red-400/20 bg-red-500/10 hover:bg-red-500/15 hover:text-white"
            : "border-white/10 bg-white/5 hover:bg-white/10 hover:text-white",
          disabled || loading
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        ].join(" ")}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
      </button>
    );
  }

  const add_friend = async (e) => {
    e.preventDefault();

    const res = await fetch(`${url}/add_friend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        friend: input,
      }),
    });
    const data = await res.json();

    if (
      data.status === 404 ||
      data.status === 201 ||
      data.status === 202 ||
      data.status === 203
    ) {
      setalert({ style: "flex", message: data.message });
    }

    if (data.status === 201 || data.status === 203) {
      dispatch(update_options());
      if (data.status === 203) {
        socket.emit("send_req", data.receiver_id, id, profile_pic, username);
      }
    } else if (data.status === 400) {
      setalert({ style: "flex", message: data.message });
    }
  };

  useEffect(() => {
    if (input.length >= 1) {
      setbutton_state(false);
    } else {
      setbutton_state(true);
    }
  }, [input]);

  function handle_input(e) {
    setinput(e.target.value);
    setalert({ ...alert, style: "none" });
    let current_key = e.nativeEvent.data;
    let input_size = input.length;
    if (
      input[input_size - 1] === "#" &&
      /[0-9]/.test(current_key) === false &&
      current_key != null
    ) {
      setinput(input);
    } else if (
      (input[input_size - 5] === "#" &&
        /[a-zA-z0-9]/.test(current_key) === true &&
        current_key != null) ||
      (input[input_size - 5] === "#" &&
        /[^a-zA-z0-9]/.test(current_key) === true &&
        current_key != null)
    ) {
      setinput(input);
    }
  }

  const filteredOptionData = option_data.filter((elem) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      String(elem.username || "")
        .toLowerCase()
        .includes(q) || String(elem.tag || "").includes(q)
    );
  });

  const shouldShowList =
    option_check === 0 ? filteredOptionData.length > 0 : option_status;

  return (
    <>
      {shouldShowList === false ? (
        <>
          {option_check === 4 ? (
            <>
              <div className="grid h-full gap-6 p-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-white/10 bg-panel/70 p-6 shadow-soft backdrop-blur-xl">
                  <div className="text-xs font-extrabold tracking-[0.25em] text-white/60">
                    ADD FRIEND
                  </div>
                  <div className="mt-3 text-2xl font-black tracking-tight text-white">
                    Grow your circle
                  </div>
                  <div className="mt-2 max-w-xl text-sm font-semibold text-white/60">
                    Add a friend with their Discord Tag. Use{" "}
                    <span className="font-extrabold text-white/80">
                      Username#0001
                    </span>{" "}
                    or just{" "}
                    <span className="font-extrabold text-white/80">#0001</span>.
                  </div>

                  <form
                    onSubmit={add_friend}
                    className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <Input
                        onChange={handle_input}
                        value={input}
                        placeholder="Enter Username#0001 or #0001"
                      />
                    </div>
                    <Button type="submit" disabled={button_state}>
                      Send request
                    </Button>
                  </form>

                  {alert.style === "flex" ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70">
                      {alert.message}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-soft backdrop-blur-xl">
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <img
                      src={image}
                      alt=""
                      className="h-44 w-44 opacity-90"
                    />
                    <div className="mt-4 text-sm font-semibold text-white/70">
                      {option_text}
                    </div>
                    <div className="mt-2 text-xs font-extrabold tracking-widest text-white/45">
                      Tip: keep it short, keep it real.
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center p-6">
              <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-10 text-center shadow-soft backdrop-blur-xl sm:max-w-3xl">
                <div className="pointer-events-none absolute inset-0 opacity-70">
                  <div className="absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-neon-violet/10 blur-3xl" />
                  <div className="absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-neon-cyan/10 blur-3xl" />
                </div>
                <img
                  src={image}
                  alt=""
                  className="relative mx-auto h-56 w-56 opacity-90"
                />
                <div className="relative mt-6 text-base font-semibold text-white/70">
                  {option_text}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {alert.style === "flex" ? (
            <div className="px-4 pt-4">
              <div
                role="alert"
                className="flex items-start justify-between gap-4 rounded-3xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white/80 shadow-soft backdrop-blur-xl"
              >
                <div className="min-w-0">{alert.message}</div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setalert({ ...alert, style: "none" })}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          {/* search bar */}
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-panel/70 p-4 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
                  <Search className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold tracking-tight text-white">
                    {option_name_check}
                  </div>
                  <div className="text-xs font-semibold text-white/55">
                    {filteredOptionData.length} shown
                    {filteredOptionData.length !== option_data.length
                      ? ` • ${option_data.length} total`
                      : ""}
                  </div>
                </div>
              </div>

              <div className="relative flex-1 sm:max-w-sm">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search friends by name or tag"
                  className="pl-11"
                />
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              </div>
            </div>

            <div className="space-y-3">
              {filteredOptionData.map((elem) => {
            const isOnline = Boolean(onlineUsers[String(elem.id)]);

            return (
              <div
                key={elem.id}
                className={[
                  "group relative overflow-visible rounded-3xl border border-white/10 bg-black/25 shadow-soft backdrop-blur-xl",
                  option_check === 0 || option_check === 1
                    ? "cursor-pointer"
                    : "",
                ].join(" ")}
                role={option_check === 0 || option_check === 1 ? "button" : undefined}
                tabIndex={option_check === 0 || option_check === 1 ? 0 : undefined}
                onClick={() => {
                  if (option_check === 0 || option_check === 1) {
                    dispatch(open_direct_message(elem));
                  }
                }}
                onKeyDown={(e) => {
                  if ((option_check === 0 || option_check === 1) && e.key === "Enter") {
                    dispatch(open_direct_message(elem));
                  }
                }}
              >
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-brand-400/10 blur-3xl" />
                  <div className="absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-neon-cyan/10 blur-3xl" />
                </div>

                <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 overflow-visible rounded-2xl border border-white/10 bg-black/40">
                      <div className="h-12 w-12 overflow-hidden rounded-2xl">
                        <img
                          src={resolveProfilePic(elem.profile_pic, elem.username)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span
                        className={[
                          "absolute -bottom-0.5 -right-0.5 z-10 h-3.5 w-3.5 rounded-full shadow-soft",
                          isOnline
                            ? "border-2 border-zinc-950 bg-emerald-400"
                            : "bg-zinc-400",
                        ].join(" ")}
                        aria-label={isOnline ? "Online" : "Offline"}
                        title={isOnline ? "Online" : "Offline"}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-extrabold text-white">
                          {elem.username}
                        </div>
                        <div
                          className={[
                            "hidden sm:inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-extrabold tracking-widest",
                            isOnline
                              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                              : "border-white/10 bg-white/5 text-white/55",
                          ].join(" ")}
                        >
                          {isOnline ? "ONLINE" : "OFFLINE"}
                        </div>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-white/55">
                        <span className="font-extrabold text-white/70">#</span>
                        {elem.tag}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center gap-2 sm:justify-end">
                    {option_check === 2 ? (
                      <>
                        {elem.status === "incoming" ? (
                          <>
                            <ActionButton
                              label="Accept"
                              loading={Boolean(
                                actionBusy[`Accept:${String(elem.id)}`]
                              )}
                              onClick={() => button_clicked("Accept", elem)}
                            >
                              <Check className="h-5 w-5" />
                            </ActionButton>
                            <ActionButton
                              label="Ignore"
                              variant="danger"
                              loading={Boolean(
                                actionBusy[`Ignore:${String(elem.id)}`]
                              )}
                              onClick={() => button_clicked("Ignore", elem)}
                            >
                              <X className="h-5 w-5" />
                            </ActionButton>
                          </>
                        ) : (
                          <ActionButton
                            label="Cancel"
                            variant="danger"
                            loading={Boolean(
                              actionBusy[`Cancel:${String(elem.id)}`]
                            )}
                            onClick={() => button_clicked("Cancel", elem)}
                          >
                            <X className="h-5 w-5" />
                          </ActionButton>
                        )}
                      </>
                    ) : (
                      <>
                        {option_check === 3 ? (
                          <ActionButton
                            label="Unblock"
                            onClick={() => button_clicked("Unblock", elem)}
                          >
                            <UserMinus className="h-5 w-5" />
                          </ActionButton>
                        ) : (
                          <>
                            <ActionButton
                              label="Message"
                              onClick={() => button_clicked("Message", elem)}
                            >
                              <MessageCircle className="h-5 w-5" />
                            </ActionButton>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default MainDashboard;
