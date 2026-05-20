import User from "../models/User.js";

export function checkReq(ids, userId) {
  if (!ids || ids.length === 0) return false;
  for (let i = 0; i < ids.length; i++) {
    if (userId === ids[i].id) return true;
  }
  return false;
}

export async function addFriend(userData, friendData) {
  const { friend_id, friend_username, friend_tag, friend_profile_pic } =
    friendData || {};
  const { id, username, tag, profile_pic } = userData || {};

  if (!id || !friend_id) {
    return { message: "invalid user ids", status: 400 };
  }

  const userFriendsList = {
    $push: {
      friends: [
        {
          id: String(friend_id),
          username: friend_username,
          profile_pic: friend_profile_pic,
          tag: friend_tag,
        },
      ],
    },
  };
  const friendFriendsList = {
    $push: {
      friends: [
        {
          id: String(id),
          username,
          profile_pic,
          tag,
        },
      ],
    },
  };

  const deleteIncoming = { $pull: { incoming_reqs: { id: String(friend_id) } } };
  const deleteOutgoing = { $pull: { outgoing_reqs: { id: String(id) } } };

  try {
    await Promise.all([
      User.updateOne({ _id: String(id) }, userFriendsList),
      User.updateOne({ _id: String(friend_id) }, friendFriendsList),
      User.updateOne({ _id: String(id) }, deleteIncoming),
      User.updateOne({ _id: String(friend_id) }, deleteOutgoing),
    ]);

    return { message: "friend added", status: 200 };
  } catch (err) {
    return { message: "something went wrong", status: 500 };
  }
}

export async function removePendingRequest(userId, friendId, action) {
  let currentUserUpdate;
  let friendUserUpdate;

  if (action === "Ignore") {
    currentUserUpdate = { $pull: { incoming_reqs: { id: friendId } } };
    friendUserUpdate = { $pull: { outgoing_reqs: { id: userId } } };
  } else if (action === "Cancel") {
    currentUserUpdate = { $pull: { outgoing_reqs: { id: friendId } } };
    friendUserUpdate = { $pull: { incoming_reqs: { id: userId } } };
  } else {
    return { message: "unsupported action", status: 400 };
  }

  await Promise.all([
    User.updateOne({ _id: userId }, currentUserUpdate),
    User.updateOne({ _id: friendId }, friendUserUpdate),
  ]);

  return { message: "request removed", status: 200 };
}
