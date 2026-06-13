import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Search,
  Users,
  Hash,
  Loader2,
  Sparkles,
  ArrowRight,
  Check,
  ServerCrash,
} from "lucide-react";
import { API_BASE_URL } from "../../config";
import { server_role } from "../../store/currentPage";

/* ─── animation variants ─── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.2 } },
};

/* ─── skeleton card ─── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded-lg bg-white/10" />
          <div className="h-3 w-20 animate-pulse rounded-lg bg-white/[0.06]" />
        </div>
      </div>
      <div className="mt-4 h-9 w-full animate-pulse rounded-xl bg-white/[0.06]" />
    </div>
  );
}

/* ─── main component ─── */
function ExploreServers({ onJoinSuccess }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [joiningId, setJoiningId] = useState(null);
  const [joinedIds, setJoinedIds] = useState(new Set());

  /* debounce search input */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* fetch explore servers */
  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE_URL}/servers/explore`, window.location.origin);
      if (debouncedQuery.trim()) {
        url.searchParams.set("search", debouncedQuery.trim());
      }
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
      });
      const data = await res.json();
      if (data.status === 200) {
        setServers(data.servers || []);
      } else {
        setServers([]);
      }
    } catch {
      setServers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  /* join a server */
  const handleJoin = async (serverId) => {
    setJoiningId(serverId);
    try {
      const res = await fetch(`${API_BASE_URL}/servers/join_server`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ server_id: serverId }),
      });
      const data = await res.json();
      if (data.status === 200) {
        setJoinedIds((prev) => new Set(prev).add(serverId));
        onJoinSuccess?.();

        // Navigate to the server after a brief delay for visual feedback
        setTimeout(() => {
          dispatch(server_role("member"));
          navigate(`/channels/${serverId}`);
        }, 800);
      }
    } catch {
      // silently fail
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ─── hero / header ─── */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Gradient blobs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-neon-violet/20 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 -top-10 h-60 w-60 rounded-full bg-neon-cyan/15 blur-[80px]" />

        <div className="relative px-6 pb-6 pt-8 sm:px-8 sm:pt-10">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10">
              <Compass className="h-6 w-6 text-neon-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Explore Servers
              </h1>
              <p className="text-sm font-medium text-white/50">
                Discover communities and join the conversation
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              id="explore-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search servers…"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/30 outline-none transition focus:border-neon-cyan/40 focus:bg-white/[0.07] focus:ring-1 focus:ring-neon-cyan/20"
            />
          </div>
        </div>
      </div>

      {/* ─── server grid ─── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : servers.length === 0 ? (
          /* ─── empty state ─── */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-3xl border border-white/[0.06] bg-white/[0.03]">
              <ServerCrash className="h-9 w-9 text-white/20" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-white/70">
              {debouncedQuery ? "No servers found" : "No servers to explore"}
            </h2>
            <p className="mt-1 max-w-xs text-sm text-white/40">
              {debouncedQuery
                ? `Nothing matched "${debouncedQuery}". Try a different search.`
                : "All servers have been joined, or none exist yet. Create one!"}
            </p>
          </div>
        ) : (
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {servers.map((server) => {
                const isJoined = joinedIds.has(String(server._id));
                const isJoining = joiningId === String(server._id);
                const initial = (server.server_name || "S")
                  .charAt(0)
                  .toUpperCase();

                return (
                  <motion.div
                    key={server._id}
                    variants={cardVariants}
                    layout
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05]"
                  >
                    {/* subtle hover glow */}
                    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-neon-cyan/0 blur-[50px] transition-all duration-500 group-hover:bg-neon-cyan/10" />

                    {/* server info */}
                    <div className="relative flex items-center gap-4">
                      {/* server icon */}
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
                        {server.server_pic ? (
                          <img
                            src={server.server_pic}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neon-violet/20 to-neon-cyan/20 text-xl font-black text-white/70">
                            {initial}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-extrabold text-white">
                          {server.server_name}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-white/40">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {server.member_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="h-3.5 w-3.5" />
                            {server.channel_count}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* join button */}
                    <div className="relative mt-4">
                      {isJoined ? (
                        <button
                          type="button"
                          disabled
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition"
                        >
                          <Check className="h-4 w-4" />
                          Joined
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isJoining}
                          onClick={() => handleJoin(String(server._id))}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-400/30 bg-brand-400/10 px-4 py-2.5 text-xs font-bold text-brand-300 transition hover:border-brand-400/50 hover:bg-brand-400/15 disabled:opacity-50"
                        >
                          {isJoining ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Joining…
                            </>
                          ) : (
                            <>
                              <ArrowRight className="h-4 w-4" />
                              Join Server
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ─── bottom accent bar ─── */}
      <div className="flex items-center gap-2 border-t border-white/[0.06] bg-black/20 px-6 py-3">
        <Sparkles className="h-3.5 w-3.5 text-brand-400/60" />
        <span className="text-xs font-semibold text-white/30">
          {loading ? "Loading…" : `${servers.length} server${servers.length !== 1 ? "s" : ""} available`}
        </span>
      </div>
    </div>
  );
}

export default ExploreServers;
