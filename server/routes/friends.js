import express from "express";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import {
  addFriend,
  checkReq,
  removePendingRequest,
} from "../services/friendService.js";

const router = express.Router();

router.post("/add_friend", async (req, res) => {
  const friend = req.body.friend;
  const hashIndex = friend.indexOf("#");
  if (hashIndex === -1) {
    return res.status(400).json({ message: "Invalid Input", status: 400 });
  }

  const name = friend.slice(0, hashIndex).trim();
  const userTag = friend.slice(hashIndex + 1);

  let user_id;
  try {
    user_id = jwt.verify(
      req.headers["x-auth-token"],
      process.env.ACCESS_TOKEN
    );
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized", status: 401 });
  }

  const { id, username, tag, profile_pic } = user_id;

  const query =
    name.length > 0 ? { username: name, tag: userTag } : { tag: userTag };

  let friendDoc;
  try {
    friendDoc = await User.findOne(query).lean();
  } catch (err) {
    return res.status(500).json({ message: "Server error", status: 500 });
  }

  if (!friendDoc) {
    return res.status(404).json({ message: "User Not found", status: 404 });
  }

  const {
    incoming_reqs,
    outgoing_reqs,
    friends,
    friend_id,
    friend_username,
    friend_tag,
    friend_profile_pic,
  } = {
    incoming_reqs: friendDoc.incoming_reqs || [],
    outgoing_reqs: friendDoc.outgoing_reqs || [],
    friends: friendDoc.friends || [],
    friend_id: String(friendDoc._id),
    friend_username: friendDoc.username,
    friend_tag: friendDoc.tag,
    friend_profile_pic: friendDoc.profile_pic,
  };

  if (friend_id === id) {
    return res.status(400).json({
      message: "You can't send a friend request to yourself",
      status: 400,
    });
  }

  if (checkReq(friends, id)) {
    return res.status(201).json({
      message: "You are already friends with this user",
      status: 201,
    });
  }

  if (checkReq(outgoing_reqs, id)) {
    const addResult = await addFriend(user_id, {
      friend_id,
      friend_username,
      friend_tag,
      friend_profile_pic,
    });
    return res
      .status(addResult.status)
      .json({ message: "Request sent successfully", status: 201 });
  }

  if (checkReq(incoming_reqs, id)) {
    return res
      .status(202)
      .json({ message: "Request already sent", status: 202 });
  }

  const sendingReq = {
    $push: {
      incoming_reqs: [
        {
          id,
          username,
          profile_pic,
          tag,
          status: "incoming",
        },
      ],
    },
  };
  const sendingReq2 = {
    $push: {
      outgoing_reqs: [
        {
          id: friend_id,
          username: friend_username,
          profile_pic: friend_profile_pic,
          tag: friend_tag,
          status: "outgoing",
        },
      ],
    },
  };

  try {
    await Promise.all([
      User.updateOne({ _id: friend_id }, sendingReq),
      User.updateOne({ _id: id }, sendingReq2),
    ]);
  } catch (err) {
    return res.status(500).json({ message: "Server error", status: 500 });
  }

  res.status(203).json({
    message: "Request sent successfully",
    status: 203,
    receiver_id: friend_id,
  });
});

router.get("/user_relations", async (req, res) => {
  try {
    const user_id = jwt.verify(
      req.headers["x-auth-token"],
      process.env.ACCESS_TOKEN
    );
    const result = await User.findOne({ _id: user_id.id }).lean();
    if (!result) {
      return res.status(404).json({ message: "User not found", status: 404 });
    }
    res.status(200).json({
      incoming_reqs: result.incoming_reqs || [],
      outgoing_reqs: result.outgoing_reqs || [],
      friends: result.friends || [],
      servers: result.servers || [],
    });
  } catch (err) {
    console.error("Error fetching user relations:", err);
    res.status(500).json({ message: "Something went wrong", status: 500 });
  }
});

router.post("/process_req", async (req, res) => {
  try {
    const { message, friend_data } = req.body;
    const { id, profile_pic, tag, username } = friend_data || {};

    let user_id;
    try {
      user_id = jwt.verify(
        req.headers["x-auth-token"],
        process.env.ACCESS_TOKEN
      );
    } catch (e) {
      return res.status(401).json({ message: "Unauthorized", status: 401 });
    }

    if (!id) {
      return res.status(400).json({ message: "Invalid friend", status: 400 });
    }

    if (message === "Accept") {
      const result = await addFriend(user_id, {
        friend_id: id,
        friend_profile_pic: profile_pic,
        friend_tag: tag,
        friend_username: username,
      });
      return res.status(result.status).json({
        message: result.message,
        status: result.status,
      });
    }

    if (message === "Ignore" || message === "Cancel") {
      const result = await removePendingRequest(user_id.id, id, message);
      return res.status(result.status).json({
        message: result.message,
        status: result.status,
        receiver_id: id,
      });
    }
    if (message === "Unblock") {
      return res.status(200).json({ message: "OK", status: 200 });
    }
    return res.status(400).json({ message: "Unknown action", status: 400 });
  } catch (err) {
    return res.status(500).json({ message: "Server error", status: 500 });
  }
});

export default router;
