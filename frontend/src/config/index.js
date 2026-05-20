const API_ORIGIN = import.meta.env.VITE_URL || "";

export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api/v1` : "";
