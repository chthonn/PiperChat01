import { motion } from "framer-motion";

export default function AuthShell({ children }) {

  return (
    <div
      className="relative overflow-x-hidden min-h-dvh"
      style={{ background: "#0a0a0f" }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          top: "-20%",
          left: "-10%",
          width: "55%",
          height: "70%",
          background:
            "radial-gradient(ellipse at center, rgba(124,58,237,0.18) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: "-15%",
          right: "-10%",
          width: "50%",
          height: "60%",
          background:
            "radial-gradient(ellipse at center, rgba(217,119,6,0.12) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          top: "40%",
          left: "35%",
          width: "30%",
          height: "40%",
          background:
            "radial-gradient(ellipse at center, rgba(16,185,129,0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          opacity: 0.4,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div
        className="relative mx-auto flex w-full max-w-6xl items-center px-5 min-h-dvh py-8"
      >
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-16">

          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.15em",
              }}
            >
              <span
                className="h-2 w-2 rounded-full animate-pulse"
                style={{ background: "#10b981", boxShadow: "0 0 0 3px rgba(16,185,129,0.2)" }}
              />
              PiperChat · Live
            </div>

            <div className="mt-10 space-y-4">
              <h1
                className="text-[3.8rem] font-black leading-[0.9] tracking-[-0.03em]"
                style={{ color: "#f0f0f5" }}
              >
                Your people,
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #a855f7 60%, #6366f1 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  all in one
                </span>
                <br />
                <span style={{ color: "rgba(240,240,245,0.9)" }}>place.</span>
              </h1>
              <p
                className="max-w-sm text-base leading-relaxed"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Blazing-fast DMs, organized servers, and live presence — built
                for the way you actually communicate.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
              {[
                { icon: "💬", label: "Direct Messages", sub: "Instant delivery" },
                { icon: "🏠", label: "Servers", sub: "Channels & roles" },
                { icon: "🟢", label: "Presence", sub: "Always in sync" },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={{
                    y: -5,
                    scale: 1.03,
                    boxShadow: "0 12px 30px rgba(124,58,237,0.18)"
                  }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl p-4 cursor-pointer hover:border-violet-400/30"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    transition: "all 0.3s ease",

                  }}
                >
                  <div className="text-xl mb-2">{item.icon}</div>
                  <div className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {item.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.65))" }}>
                    {item.sub}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                {["#a855f7", "#f59e0b", "#10b981", "#6366f1"].map((color, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: color,
                      border: "2px solid #0a0a0f",
                      color: "#fff",
                    }}
                  >
                    {["A", "B", "C", "D"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Join other users already chatting
              </p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="w-full"
          >
            <div className="mx-auto w-full max-w-md">

              <div className="mb-12 lg:hidden flex flex-col items-center text-center space-y-4">
                <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.15em",
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ background: "#10b981", boxShadow: "0 0 0 3px rgba(16,185,129,0.2)" }}
                  />
                  PiperChat · Live
                </div>

                <p
                  className="text-sm font-semibold"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Your people, all in one place ✦
                </p>

                <p
                  className="text-xs leading-relaxed max-w-xs"
                  style={{ color: "rgba(255,255,255,0.38)" }}
                >
                  Fast messaging, organized communities, and live presence —
                  built for modern communication.
                </p>

                <div className="flex flex-wrap justify-center gap-2 pt-1">

                  <div
                    className="px-3 py-1.5 rounded-full text-[11px] font-medium"
                    style={{
                      background: "rgba(168,85,247,0.12)",
                      border: "1px solid rgba(168,85,247,0.2)",
                      color: "#d8b4fe",
                    }}
                  >
                    ⚡ Instant DMs
                  </div>

                  <div
                    className="px-3 py-1.5 rounded-full text-[11px] font-medium"
                    style={{
                      background: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.2)",
                      color: "#fcd34d",
                    }}
                  >
                    🏠 Smart Servers
                  </div>

                  <div
                    className="px-3 py-1.5 rounded-full text-[11px] font-medium"
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      color: "#86efac",
                    }}
                  >
                    🟢 Live Presence
                  </div>

                </div>
              </div>
              <div
                className="rounded-3xl p-8"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  boxShadow:
                    "0 0 0 1px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                {children}
              </div>


            </div>
          </motion.section>
        </div>
      </div >
    </div >
  );
}