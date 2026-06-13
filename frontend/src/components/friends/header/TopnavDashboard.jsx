import { useState } from "react";
import friends_icon from "../../../images/friends.svg";
import {
  Inbox,
  LogOut,
  Menu,
  MessageSquarePlus,
  Palette,
  UserPlus,
  Users,
  Clock,
  Ban,
  CircleDot,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../../../context/ThemeContext";
import { logout } from "../../../lib/logout";
import {
  change_option,
  change_option_name,
  option_status,
  option_text,
} from "../../../store/optionsSlice";
import { close_direct_message } from "../../../store/directMessageSlice";

function TopnavDashboard({button_status, onToggleSidebar}) {

    const {pending , pending_count, all_friends} = button_status
    const dispatch = useDispatch();
    const active = useSelector((state) => state.selected_option.value);
    const { setTheme } = useTheme();
    const [showThemes, setShowThemes] = useState(false);

  function change_option_value(option_number,option_name,status,text){
    dispatch(close_direct_message())
    dispatch(change_option(option_number))
    dispatch(change_option_name(option_name))
    dispatch(option_status(status))
    dispatch(option_text(text))
  }

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
          <div className="flex items-center gap-2 min-w-0">
            <img src={friends_icon} alt="" className="h-5 w-5 opacity-80" />
            <div className="truncate text-sm font-extrabold tracking-tight text-white">
              Friends
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() =>
              change_option_value(
                0,
                "ONLINE",
                false,
                "No one's around to play with Wumpus."
              )
            }
            className={[
              "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold tracking-wider transition",
              active === 0
                ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <CircleDot className="h-4 w-4" />
            Online
          </button>

          <button
            type="button"
            onClick={() =>
              change_option_value(
                1,
                "ALL FRIENDS",
                all_friends,
                "Wumpus is waiting on friends. You don't have to, though!"
              )
            }
            className={[
              "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold tracking-wider transition",
              active === 1
                ? "border-brand-400/40 bg-brand-400/10 text-brand-300"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <Users className="h-4 w-4" />
            All
          </button>

          <button
            type="button"
            onClick={() =>
              change_option_value(
                2,
                "PENDING",
                pending,
                "There are no pending friend requests. Here's Wumpus for now."
              )
            }
            className={[
              "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold tracking-wider transition",
              active === 2
                ? "border-neon-violet/40 bg-neon-violet/10 text-neon-violet"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <Clock className="h-4 w-4" />
            Pending
            {pending_count > 0 ? (
              <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-400 px-2 text-[11px] font-black text-black">
                {pending_count}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() =>
              change_option_value(
                3,
                "BLOCKED",
                false,
                "You can't unblock the Wumpus."
              )
            }
            className={[
              "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold tracking-wider transition",
              active === 3
                ? "border-red-400/40 bg-red-500/10 text-red-200"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <Ban className="h-4 w-4" />
            Blocked
          </button>

          <button
            type="button"
            onClick={() =>
              change_option_value(
                4,
                "ADD FRIENDS",
                false,
                "Wumpus is waiting on friends. You don't have to, though!"
              )
            }
            className={[
              "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold tracking-wider transition",
              active === 4
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <UserPlus className="h-4 w-4" />
            Add Friend
          </button>
        </div>


      <div className="flex items-center gap-2">

  <div className="relative">
    <button
      type="button"
      onClick={() => setShowThemes(!showThemes)}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      <Palette className="h-5 w-5" />
      <span className="hidden sm:block">Theme</span>
    </button>

    {showThemes && (
      <div className="absolute right-0 top-14 z-50 w-72 rounded-3xl border border-white/10 bg-[#111827] p-4 shadow-2xl backdrop-blur-xl">

        <p className="mb-4 text-sm font-semibold text-white/70">
          Color Themes
        </p>

        <div className="grid grid-cols-4 gap-2">

          <button
            onClick={() => setTheme("forestDark")}
            className="h-12 rounded-xl bg-[#3f5a46] transition hover:scale-105"
          />

          <button
            onClick={() => setTheme("peach")}
            className="h-12 rounded-xl bg-[#e7b79d] transition hover:scale-105"
          />

          <button
            onClick={() => setTheme("pastelBlue")}
            className="h-12 rounded-xl bg-[#aeb8d6] transition hover:scale-105"
          />

          <button
            onClick={() => setTheme("pastelGreen")}
            className="h-12 rounded-xl bg-[#d9dec2] transition hover:scale-105"
          />

          <button
            onClick={() => setTheme("redDark")}
            className="h-12 rounded-xl bg-[#250000] transition hover:scale-105"
          />

          <button
            onClick={() => setTheme("purpleDark")}
            className="h-12 rounded-xl bg-[#120a2c] transition hover:scale-105"
          />

          <button
            onClick={() => setTheme("brownDark")}
            className="h-12 rounded-xl bg-[#6d4037] transition hover:scale-105"
          />

          <button
            onClick={() => setTheme("greyBlue")}
            className="h-12 rounded-xl bg-[#66708f] transition hover:scale-105"
          />

        </div>
      </div>
    )}
  </div>

  <button
    type="button"
    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
    title="New Group DM"
    aria-label="New Group DM"
  >
    <MessageSquarePlus className="h-5 w-5" />
  </button>

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
      </div>
    </>
  )
}

export default TopnavDashboard
