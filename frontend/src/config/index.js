function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

const API_ORIGIN = normalizeOrigin(import.meta.env.VITE_URL);

export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api/v1` : "";
export const SOCKET_URL = API_ORIGIN;
