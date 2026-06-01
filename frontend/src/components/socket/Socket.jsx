import socketIO from "socket.io-client";
import { SOCKET_URL } from "../../config";

// Vite shims process.env via vite.config.js → falls back to VITE_API_URL.
// Use a safe fallback so the module never crashes on import even if the
// env var is missing or the backend is temporarily down.
const url =
  SOCKET_URL ||
  import.meta.env.VITE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:2000";

const socket = socketIO(url, {
  // Don't connect immediately on module load — the NotificationListener
  // triggers the connection only when a logged-in userId is available.
  // This prevents "connection refused" errors causing a blank screen when
  // the backend isn't running yet.
  autoConnect: false,
  transports: ["websocket", "polling"], // fallback to polling if WS fails
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

// Debug helpers (visible in the browser console during development)
if (import.meta.env.DEV) {
  socket.on("connect", () =>
    console.log("[Socket] Connected to backend:", url)
  );
  socket.on("connect_error", (err) =>
    console.warn("[Socket] Connection error:", err.message)
  );
  socket.on("disconnect", (reason) =>
    console.log("[Socket] Disconnected:", reason)
  );
}

export default socket;
