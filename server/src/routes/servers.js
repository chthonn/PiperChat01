import config from "../config/index.js";

import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import Server from "../models/Server.js";
import User from "../models/User.js";
import {
  canLeaveServer,
  canRemoveServerMember,
  isServerOwner,
} from "../lib/serverAuthorization.js";
import { createChat } from "../services/chatService.js";
import {
  addServerToUser,
  addUserToServer,
  checkServerInUser,
  createServerFromTemplate,
} from "../services/serverService.js";
import { getIO } from "../socket/runtime.js";

import {
  addNewCategoryValidator,
  addNewChannelValidator,
  createServerValidator,
  deleteServerValidator,
  leaveServerValidator,
  serverInfoValidator,
} from "../validators/servers.js";
import { authToken } from "../middleware/auth.js";
import validate from "../middleware/validate.js";

const router = express.Router();

router.post("/create_server", createServerValidator, validate, async (req, res) => {
  let user_id;
  try {
    user_id = jwt.verify(
      req.headers["x-auth-token"],
      config.ACCESS_TOKEN
    );
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized", status: 401 });
  }

  const serverTemplate = await createServerFromTemplate(
    user_id,
    req.body.server_details,
    req.body.server_image
  );
  const addNewChat = await createChat(serverTemplate.server_id);

  if (addNewChat.status !== 200) {
    return res.json({ status: 500, message: "Somethig Went Wrong" });
  }

  const addServer = await addServerToUser(
    user_id.id,
    serverTemplate,
    req.body.server_details.role
  );

  if (addServer) {
    const io = getIO();
    if (io) {
      io.to(String(user_id.id)).emit("user_servers_updated", {
        user_id: String(user_id.id),
      });
    }
    res.json({ status: 200, message: "Server Created" });
  } else {
    res.json({ status: 500, message: "Somethig Went Wrong" });
  }
});

router.post("/server_info", serverInfoValidator, validate, async (req, res) => {
  const { server_id } = req.body;
  let user_id;
  try {
    user_id = jwt.verify(
      req.headers["x-auth-token"],
      config.ACCESS_TOKEN
    );
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized", status: 401 });
  }

  const response = await checkServerInUser(user_id.id, server_id);
  if (!response || !response[0] || !response[0].servers || response[0].servers.length === 0) {
    return res.json({ status: 404, message: "you are not authorized" });
  }

  const serverInfo = await Server.find({
    _id: new mongoose.Types.ObjectId(server_id),
  });
  res.json(serverInfo);
});

router.post("/add_new_channel", authToken, addNewChannelValidator, validate, async (req, res) => {
  const { category_id, channel_name, channel_type, server_id } = req.body;
  const newChannel = {
    $push: {
      "categories.$.channels": {
        channel_name,
        channel_type,
      },
    },
  };
  try {
    const data = await Server.updateOne(
      {
        _id: new mongoose.Types.ObjectId(server_id),
        "categories._id": new mongoose.Types.ObjectId(category_id),
      },
      newChannel
    );
    if (data && data.modifiedCount > 0) {
      const io = getIO();
      if (io) {
        io.to(`server:${String(server_id)}`).emit("server_updated", {
          server_id: String(server_id),
          reason: "channel_created",
        });
      }
      return res.json({ status: 200 });
    }
    return res.status(500).json({ status: 500, message: "Update failed" });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error" });
  }
});

router.post("/add_new_category", authToken, addNewCategoryValidator, validate, async (req, res) => {
  const { category_name, server_id } = req.body;
  const newCategory = {
    $push: { categories: { category_name, channels: [] } },
  };
  try {
    const data = await Server.updateOne(
      { _id: new mongoose.Types.ObjectId(server_id) },
      newCategory
    );
    if (data && data.modifiedCount > 0) {
      const io = getIO();
      if (io) {
        io.to(`server:${String(server_id)}`).emit("server_updated", {
          server_id: String(server_id),
          reason: "category_created",
        });
      }
      return res.json({ status: 200 });
    }
    return res.status(500).json({ status: 500, message: "Update failed" });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error" });
  }
});

router.post("/delete_server", deleteServerValidator, validate, async (req, res) => {
  const { server_id } = req.body;
  let user_id;
  try {
    user_id = jwt.verify(
      req.headers["x-auth-token"],
      config.ACCESS_TOKEN
    );
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized", status: 401 });
  }

  if (!server_id || !mongoose.isValidObjectId(server_id)) {
    return res.status(400).json({ status: 400, message: "Invalid input" });
  }

  try {
    const server = await Server.findById(server_id).lean();
    if (!server || server.active === false) {
      return res.status(404).json({ status: 404, message: "Not found" });
    }

    if (!isServerOwner(server, user_id.id)) {
      return res
        .status(403)
        .json({ status: 403, message: "Only the server owner can delete this server" });
    }

    const data = await Server.updateOne(
      { _id: server_id },
      { $set: { active: false } }
    );
    if (!data || data.modifiedCount <= 0) {
      return res.status(404).json({ status: 404, message: "Not found" });
    }

    const deleteFromUser = { $pull: { servers: { server_id } } };
    await User.updateMany({ "servers.server_id": server_id }, deleteFromUser);
    return res.json({ status: 200 });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error" });
  }
});

router.post("/remove_member", async (req, res) => {
  const { server_id, member_id } = req.body;
  let user_id;
  try {
    user_id = jwt.verify(
      req.headers["x-auth-token"],
      config.ACCESS_TOKEN
    );
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized", status: 401 });
  }

  if (
    !server_id ||
    !member_id ||
    !mongoose.isValidObjectId(server_id) ||
    !mongoose.isValidObjectId(member_id)
  ) {
    return res.status(400).json({ status: 400, message: "Invalid input" });
  }

  try {
    const server = await Server.findById(server_id).lean();
    if (!server || server.active === false) {
      return res.status(404).json({ status: 404, message: "Server not found" });
    }

    if (!canRemoveServerMember(server, user_id.id, member_id)) {
      return res
        .status(403)
        .json({ status: 403, message: "Only the server owner can remove members" });
    }

    const deleteUserFromServer = { $pull: { users: { user_id: String(member_id) } } };
    const data = await Server.updateOne({ _id: server_id }, deleteUserFromServer);
    if (!data || data.modifiedCount <= 0) {
      return res.status(404).json({ status: 404, message: "Member not found" });
    }

    const leaveServer = { $pull: { servers: { server_id } } };
    await User.updateOne({ _id: member_id }, leaveServer);

    const io = getIO();
    if (io) {
      io.to(String(member_id)).emit("user_servers_updated", {
        user_id: String(member_id),
      });
      io.to(`server:${String(server_id)}`).emit("server_updated", {
        server_id: String(server_id),
        reason: "member_removed",
        user_id: String(member_id),
      });
    }

    return res.json({ status: 200 });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error" });
  }
});

router.post("/leave_server", leaveServerValidator, validate, async (req, res) => {
  const { server_id } = req.body;
  let user_id;
  try {
    user_id = jwt.verify(
      req.headers["x-auth-token"],
      config.ACCESS_TOKEN
    );
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized", status: 401 });
  }

  if (!server_id || !mongoose.isValidObjectId(server_id)) {
    return res.status(400).json({ status: 400, message: "Invalid input" });
  }

  const leaveServer = { $pull: { servers: { server_id } } };
  try {
    const server = await Server.findById(server_id).lean();
    if (!server || server.active === false) {
      return res.status(404).json({ status: 404, message: "Server not found" });
    }

    if (!canLeaveServer(server, user_id.id)) {
      return res
        .status(403)
        .json({ status: 403, message: "Server owner must delete the server before leaving" });
    }

    const deleteUserFromServer = { $pull: { users: { user_id: user_id.id } } };
    const data2 = await Server.updateOne({ _id: server_id }, deleteUserFromServer);
    if (data2 && data2.modifiedCount > 0) {
      await User.updateOne({ _id: user_id.id }, leaveServer);
      const io = getIO();
      if (io) {
        io.to(String(user_id.id)).emit("user_servers_updated", {
          user_id: String(user_id.id),
        });
        io.to(`server:${String(server_id)}`).emit("server_updated", {
          server_id: String(server_id),
          reason: "member_left",
          user_id: String(user_id.id),
        });
      }
      return res.json({ status: 200 });
    }
    return res.status(500).json({ status: 500, message: "Update failed" });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error" });
  }
});

export default router;
