import config from "../config/index.js";

import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
//new imports
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";

import Server from "../models/Server.js";
import User from "../models/User.js";
import { createChat } from "../services/chatService.js";
import {
  addServerToUser,
  addUserToServer,
  checkServerInUser,
  createServerFromTemplate,
} from "../services/serverService.js";
import { getIO } from "../socket/runtime.js";

const router = express.Router();

//rules for /create_server

const createServerRules = [
  body("server_details").notEmpty().withMessage("server_details is required"),
  body("server_details.server_name")
    .notEmpty()
    .withMessage("server_details.server_name is required")
    .trim()
    .isLength({ max: 100 })
    .withMessage("server_name must be 100 characters or fewer"),
];

//rules for /add_new_channel
const addChannelRules = [
  body("server_id")
    .notEmpty()
    .withMessage("server_id is required")
    .isMongoId()
    .withMessage("server_id must be a valid MongoDB ObjectId"),
  body("category_id")
    .notEmpty()
    .withMessage("category_id is required")
    .isMongoId()
    .withMessage("category_id must be a valid MongoDB ObjectId"),
  body("channel_name")
    .notEmpty()
    .withMessage("channel_name is required")
    .trim()
    .isLength({ max: 100 })
    .withMessage("channel_name must be 100 characters or fewer"),
  body("channel_type")
    .notEmpty()
    .withMessage("channel_type is required")
    .isIn(["text", "voice"])
    .withMessage("channel_type must be 'text' or 'voice'"),
];

//rules for /add_new_category

const addCategoryRules = [
  body("server_id")
    .notEmpty()
    .withMessage("server_id is required")
    .isMongoId()
    .withMessage("server_id must be a valid MongoDB ObjectId"),
  body("category_name")
    .notEmpty()
    .withMessage("category_name is required")
    .trim()
    .isLength({ max: 100 })
    .withMessage("category_name must be 100 characters or fewer"),
];

//rules for /delete_server and /leave_server

const serverIdRules = [
  body("server_id")
    .notEmpty()
    .withMessage("server_id is required")
    .isMongoId()
    .withMessage("server_id must be a valid MongoDB ObjectId"),
];

//rules for server_info
const serverInfoRules = [
  body("server_id")
    .notEmpty()
    .withMessage("server_id is required")
    .isMongoId()
    .withMessage("server_id must be a valid MongoDB ObjectId"),
];

router.post("/create_server", validate(createServerRules), async (req, res) => {
  let user_id;
  try {
    user_id = jwt.verify(
      req.headers["x-auth-token"],
      config.ACCESS_TOKEN
    );
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized", status: 401 });
  }

  //safe details are only sent
  const serverTemplate = await createServerFromTemplate(
    user_id,
    req.body.server_details,
    req.body.server_image,
  );
  const addNewChat = await createChat(serverTemplate.server_id);

  if (addNewChat.status !== 200) {
    return res.json({ status: 500, message: "Somethig Went Wrong" });
  }

  const addServer = await addServerToUser(
    user_id.id,
    serverTemplate,
    req.body.server_details.role,
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

router.post("/server_info", validate(serverInfoRules), async (req, res) => {
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
  if (
    !response ||
    !response[0] ||
    !response[0].servers ||
    response[0].servers.length === 0
  ) {
    return res.json({ status: 404, message: "you are not authorized" });
  }
  const serverInfo = await Server.find({
    _id: new mongoose.Types.ObjectId(server_id),
  });
  res.json(serverInfo);
});

router.post("/add_new_channel", validate(addChannelRules), async (req, res) => {
  const { category_id, channel_name, channel_type, server_id } = req.body;

  // safety ensured
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
      newChannel,
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
    //404 added
    return res
      .status(404)
      .json({ status: 404, message: "Server or category not found" });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error" });
  }
});

router.post(
  "/add_new_category",
  validate(addCategoryRules),
  async (req, res) => {
    const { category_name, server_id } = req.body;

    // safety ensured
    const newCategory = {
      $push: { categories: { category_name, channels: [] } },
    };
    try {
      const data = await Server.updateOne(
        { _id: new mongoose.Types.ObjectId(server_id) },
        newCategory,
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
      //changed to 404 to be more specific
      return res.status(404).json({ status: 404, message: "Server not found" });
    } catch (err) {
      return res.status(500).json({ status: 500, message: "Server error" });
    }
  },
);

// CHANGED: added validate(serverIdRules) before handler
router.post("/delete_server", validate(serverIdRules), async (req, res) => {
  const { server_id } = req.body;
  try {
    const data = await Server.updateOne(
      { _id: server_id },
      { $set: { active: false } },
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

// CHANGED: added validate(serverIdRules) before handler
router.post("/leave_server", validate(serverIdRules), async (req, res) => {
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

  const leaveServer = { $pull: { servers: { server_id } } };
  try {
    await User.updateOne({ _id: user_id.id }, leaveServer);
    const deleteUserFromServer = { $pull: { users: { user_id: user_id.id } } };
    const data2 = await Server.updateOne(
      { _id: server_id },
      deleteUserFromServer,
    );
    if (data2 && data2.modifiedCount > 0) {
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
