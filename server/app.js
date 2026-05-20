import cors from "cors";
import express from "express";

import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import directMessageRoutes from "./routes/directMessages.js";
import friendsRoutes from "./routes/friends.js";
import invitesRoutes from "./routes/invites.js";
import notificationRoutes from "./routes/notifications.js";
import profileRoutes from "./routes/profile.js";
import serversRoutes from "./routes/servers.js";

const app = express();

app.use(cors());

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is up and running!",
    status: "ok",
  });
});

app.use("/", authRoutes);
app.use("/", friendsRoutes);
app.use("/", serversRoutes);
app.use("/", invitesRoutes);
app.use("/", chatRoutes);
app.use("/", directMessageRoutes);
app.use("/", notificationRoutes);
app.use("/", profileRoutes);

export default app;