import mongoose from "mongoose";
import Server from "../models/Server.js";
import User from "../models/User.js";

export async function addServerToUser(id, serverDetails, serverRole) {
  const { server_name, server_pic, server_id } = serverDetails;
  const update = {
    $push: {
      servers: [
        {
          server_name,
          server_pic,
          server_role: serverRole,
          server_id,
        },
      ],
    },
  };

  await User.updateOne({ _id: id }, update);
  return true;
}

function getServerTemplate(key, name, image, userDetails, role) {
  const { id, username, tag, profile_pic } = userDetails;
  const base = {
    server_name: name,
    server_pic: image,
    users: [
      {
        user_name: username,
        user_profile_pic: profile_pic,
        user_tag: tag,
        user_role: role,
        user_id: id,
      },
    ],
  };

  if (key == 2) {
    return new Server({
      ...base,
      categories: [
        {
          category_name: "Text Channels",
          channels: [
            { channel_name: "general", channel_type: "text" },
            { channel_name: "Clips and Highlights", channel_type: "text" },
          ],
        },
        {
          category_name: "Voice Channels",
          channels: [
            { channel_name: "Lobby", channel_type: "voice" },
            { channel_name: "Gaming", channel_type: "voice" },
          ],
        },
      ],
    });
  }
  if (key == 3) {
    return new Server({
      ...base,
      categories: [
        {
          category_name: "INFORMATION",
          channels: [
            { channel_name: "welcome and rules", channel_type: "text" },
            { channel_name: "announcements", channel_type: "text" },
            { channel_name: "resources", channel_type: "text" },
            { channel_name: "qwerty", channel_type: "text" },
          ],
        },
        {
          category_name: "Voice Channels",
          channels: [
            { channel_name: "Lounge", channel_type: "voice" },
            { channel_name: "Meeting Room 1", channel_type: "voice" },
            { channel_name: "Meeting Room 2", channel_type: "voice" },
          ],
        },
        {
          category_name: "TEXT CHANNELS",
          channels: [
            { channel_name: "general", channel_type: "text" },
            { channel_name: "meeting-plan", channel_type: "text" },
            { channel_name: "off-topic", channel_type: "text" },
          ],
        },
      ],
    });
  }
  return new Server({
    ...base,
    categories: [
      {
        category_name: "Text Channels",
        channels: [{ channel_name: "general", channel_type: "text" }],
      },
      {
        category_name: "Voice Channels",
        channels: [{ channel_name: "general", channel_type: "voice" }],
      },
    ],
  });
}

export async function createServerFromTemplate(userDetails, serverDetails, image) {
  const { name, key, role } = serverDetails;
  const serverTemplate = getServerTemplate(key, name, image, userDetails, role);
  const data = await serverTemplate.save();
  return {
    server_name: name,
    server_pic: image,
    server_id: data._id,
  };
}

export async function addUserToServer(userDetails, serverId) {
  const { username, tag, id, profile_pic } = userDetails;
  const update = {
    $push: {
      users: [
        {
          user_name: username,
          user_profile_pic: profile_pic,
          user_tag: tag,
          user_role: "member",
          user_id: id,
        },
      ],
    },
  };

  const data = await Server.updateOne({ _id: serverId }, update);
  return data.modifiedCount > 0;
}

export async function checkServerInUser(id, serverId) {
  return User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $project: {
        servers: {
          $filter: {
            input: "$servers",
            as: "server",
            cond: { $eq: ["$$server.server_id", serverId] },
          },
        },
      },
    },
  ]);
}
