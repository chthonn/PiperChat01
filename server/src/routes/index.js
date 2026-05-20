import express from "express";

import authRoutes from "./auth.js";
import chatRoutes from "./chat.js";
import directMessageRoutes from "./directMessages.js";
import friendsRoutes from "./friends.js";
import invitesRoutes from "./invites.js";
import notificationRoutes from "./notifications.js";
import profileRoutes from "./profile.js";
import serversRoutes from "./servers.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/direct-messages", directMessageRoutes);
router.use("/friends", friendsRoutes);
router.use("/invites", invitesRoutes);
router.use("/notifications", notificationRoutes);
router.use("/profile", profileRoutes);
router.use("/servers", serversRoutes);

export default router;
