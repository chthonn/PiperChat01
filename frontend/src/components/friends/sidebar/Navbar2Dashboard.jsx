import person_icon from "../../../images/friends.svg";
import { Plus, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { resolveProfilePic, handleImageError } from "../../../shared/imageFallbacks";
import { open_direct_message } from "../../../store/directMessageSlice";

function Navbar2_dashboard({ friends = [], onNavigate }) {
  const dispatch = useDispatch();
  const unreadDm = useSelector((state) => state.unread.dm);
  const onlineUsers = useSelector((state) => state.presence.byId);
  
  const username = useSelector((state) => state.user_info.username);
  const rawProfilePic = useSelector((state) => state.user_info.profile_pic);
  const profile_pic = resolveProfilePic(rawProfilePic, username);

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            placeholder="Find or start a conversation"
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-neon-cyan/40 focus:ring-2 focus:ring-neon-cyan/15"
          />
        </div>
      </div>

      <button
        type="button"
        className="mx-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
      >
        <img src={person_icon} alt="" className="h-5 w-5 opacity-80" />
        Friends
      </button>

      <div className="mt-5 flex items-center justify-between px-3">
        <div className="text-xs font-extrabold tracking-widest text-white/45">
          DIRECT MESSAGES
        </div>
        <button
          type="button"
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          title="Create DM"
          aria-label="Create DM"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
        {friends.length === 0 ? (
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="relative h-10 w-10 overflow-visible rounded-2xl border border-white/10 bg-black/40">
              <div className="h-10 w-10 overflow-hidden rounded-2xl">
                <img
                  src={profile_pic}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={handleImageError}
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 z-10 h-3.5 w-3.5 rounded-full border-2 border-panel2 bg-white/15" />
            </div>
            <div className="text-sm font-semibold text-white/70">
              No friends yet
            </div>
          </div>
        ) : (
          friends.map((friend) => {
            const isOnline = Boolean(onlineUsers[String(friend.id)]);
            const unread = unreadDm[friend.id];

            return (
              <button
                type="button"
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-left text-sm text-white/80 transition hover:border-white/10 hover:bg-white/5"
                key={friend.id}
                onClick={() => {
                  dispatch(open_direct_message(friend));
                  onNavigate?.();
                }}
              >
                <div className="relative h-10 w-10 overflow-visible rounded-2xl border border-white/10 bg-black/40">
                  <div className="h-10 w-10 overflow-hidden rounded-2xl">
                    <img
                      src={resolveProfilePic(friend.profile_pic, friend.username)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={handleImageError}
                    />
                  </div>
                  <span
                    className={[
                      "absolute -bottom-0.5 -right-0.5 z-10 h-3.5 w-3.5 rounded-full border-2 border-panel2",
                      isOnline ? "bg-emerald-400" : "bg-white/20",
                    ].join(" ")}
                  />
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <div className="truncate font-semibold">
                    {friend.username}
                  </div>
                  {unread ? (
                    <div className="relative z-10 grid h-6 min-w-6 place-items-center rounded-full bg-brand-400 px-2 text-xs font-black text-black shadow-soft">
                      {unread}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Navbar2_dashboard;
