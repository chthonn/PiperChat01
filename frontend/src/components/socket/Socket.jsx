import socketIO from "socket.io-client";
import { SOCKET_URL } from "../../config";

function getAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("token") || "";
}

const socketOptions = {
  transports: ["websocket", "polling"],
  withCredentials: true,
  autoConnect: Boolean(getAuthToken()),
  auth: (callback) => {
    callback({ token: getAuthToken() });
  },
};

const socket = SOCKET_URL
  ? socketIO(SOCKET_URL, socketOptions)
  : socketIO(socketOptions);

function refreshSocketAuth() {
  const token = getAuthToken();
  socket.auth = { token };

  if (!token) {
    socket.disconnect();
    return;
  }

  if (socket.connected) {
    socket.disconnect().connect();
    return;
  }

  socket.connect();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", refreshSocketAuth);
  window.addEventListener("piperchat:auth-token", refreshSocketAuth);
}

export default socket;
