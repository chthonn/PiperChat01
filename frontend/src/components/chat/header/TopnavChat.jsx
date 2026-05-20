import {
  Bell,
  Hash,
  Inbox,
  LogOut,
  Menu,
  Pin,
  Search,
  UsersRound,
} from "lucide-react";
import { useSelector } from "react-redux";
import { logout } from "../../../lib/logout";


function TopnavChat({ onToggleSidebar }) {

  const channel_name = useSelector(state=>state.currentPage.page_name)
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Pinned messages"
            aria-label="Pinned messages"
          >
            <Pin className="h-5 w-5" />
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
    </>
  )
}

export default TopnavChat
