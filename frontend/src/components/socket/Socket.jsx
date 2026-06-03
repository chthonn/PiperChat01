import socketIO from "socket.io-client";
import { SOCKET_URL } from "../../config";

function getSocketToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function getSocketOptions() {
  const token = getSocketToken();
  return {
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: Boolean(token),
    auth: { token },
  };
}

const socket = SOCKET_URL
  ? socketIO(SOCKET_URL, getSocketOptions())
  : socketIO(getSocketOptions());

window.addEventListener("piperchat:auth-token", () => {
  const token = getSocketToken();
  socket.auth = { token };

  if (token) {
    socket.connect();
    return;
  }

  socket.disconnect();
});

export default socket;
