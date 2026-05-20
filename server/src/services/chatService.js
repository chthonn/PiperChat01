import Chat from "../models/Chat.js";

export async function createChat(serverId) {
  const addChats = new Chat({ server_id: serverId });
  await addChats.save();
  return { status: 200 };
}

export async function getChats(serverId, channelId) {
  return Chat.aggregate([
    { $match: { server_id: serverId } },
    {
      $project: {
        channels: {
          $filter: {
            input: "$channels",
            as: "channel",
            cond: { $eq: ["$$channel.channel_id", channelId] },
          },
        },
      },
    },
  ]);
}
