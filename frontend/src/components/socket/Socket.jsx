import socketIO from "socket.io-client";
import { SOCKET_URL } from "../../config";

const socket = SOCKET_URL
  ? socketIO(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    })
  : socketIO();

export default socket;
