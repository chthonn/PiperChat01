function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

const API_ORIGIN = normalizeOrigin(
  import.meta.env.VITE_URL ||
    import.meta.env.VITE_APP_URL ||
    (import.meta.env.DEV ? "http://localhost:2000" : ""),
);

export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api/v1` : "";
export const SOCKET_URL = API_ORIGIN;

export const FRONT_END_URL = normalizeOrigin(
  import.meta.env.VITE_FRONT_END_URL ||
    import.meta.env.VITE_APP_front_end_url ||
    (import.meta.env.DEV ? "http://localhost:5173" : ""),
);
