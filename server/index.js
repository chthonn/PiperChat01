import "./config/env.js";
import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";

import { connect } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import directMessageRoutes from "./routes/directMessages.js";
import friendsRoutes from "./routes/friends.js";
import invitesRoutes from "./routes/invites.js";
import notificationRoutes from "./routes/notifications.js";
import profileRoutes from "./routes/profile.js";
import serversRoutes from "./routes/servers.js";
import { attachSocketHandlers } from "./socket/index.js";
import { setIO } from "./socket/runtime.js";
import { verifyMailTransport } from "./services/email.js";

const port = process.env.PORT || 2000;
const app = express();

app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ success: true, message: "Server is up and running!", status: "ok" });
});

app.use("/", authRoutes);
app.use("/", friendsRoutes);
app.use("/", serversRoutes);
app.use("/", invitesRoutes);
app.use("/", chatRoutes);
app.use("/", directMessageRoutes);
app.use("/", notificationRoutes);
app.use("/", profileRoutes);

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
