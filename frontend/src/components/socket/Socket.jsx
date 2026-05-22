import socketIO from "socket.io-client";
const url = import.meta.env.VITE_URL;
let socket = socketIO.connect(url, {
  transports: ["websocket"],
});
export default socket;
