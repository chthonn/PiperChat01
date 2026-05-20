import "./config/env.js";

import { Server as SocketIOServer } from "socket.io";

import app from "./app.js";
import { connect } from "./config/db.js";
import { attachSocketHandlers } from "./socket/index.js";
import { setIO } from "./socket/runtime.js";
import { verifyMailTransport } from "./services/email.js";

const port = process.env.PORT || 2000;

async function start() {
  await connect();

  await verifyMailTransport();

  const server = app.listen(port, () => {
    console.log(`listening on port ${port}`);
    console.log("Connected to DB");
  });

  const allowedOrigins = (
    process.env.FRONTEND_ORIGINS ||
    "http://localhost:3000,http://localhost:5173"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const io = new SocketIOServer(server, {
    pingTimeout: 20000,
    cors: {
      origin: allowedOrigins,
    },
  });

  setIO(io);

  attachSocketHandlers(io);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});