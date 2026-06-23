import express from "express";
import mongoose from "mongoose";
import shortid from "shortid";

import Invite from "../models/Invite.js";
import User from "../models/User.js";
import { checkInviteLink } from "../services/inviteService.js";
import {
  addServerToUser,
  addUserToServer,
  checkServerInUser,
} from "../services/serverService.js";
import { getIO } from "../socket/runtime.js";

import {
  acceptInviteValidator,
  createInviteLinkValidator,
  inviteLinkInfoValidator,
} from "../validators/invites.js";
import validate from "../middleware/validate.js";

const router = express.Router();

/**
 * Determine whether a raw string is a syntactically valid Mongo ObjectId.
 *
 * Mongoose's `new mongoose.Types.ObjectId(value)` will throw a CastError for
 * malformed input, but doing that check inside the route handler is messy —
 * this helper keeps the route clean and makes the validation testable.
 *
 * @param {unknown} value - Raw value supplied by the client.
 * @returns {boolean} True if the value can be coerced to an ObjectId.
 */
function isValidObjectId(value) {
  if (typeof value !== "string" && !(value instanceof mongoose.Types.ObjectId)) {
    return false;
  }
  return mongoose.Types.ObjectId.isValid(String(value));
}

router.post(
  "/create_invite_link",
  createInviteLinkValidator,
  validate,
  /**
   * Create or reuse a server invite link.
   *
   * The previous implementation crashed with a TypeError when
   * `checkInviteLink` returned an empty array (e.g. the inviter had been
   * deleted, or the server_id had never been linked to one of their invites).
   * It also propagated Mongoose CastErrors for malformed IDs straight to the
   * client, which is both ugly and leaks internal type names.
   *
   * The fix:
   *   1. Validate `inviter_id` / `server_id` are well-formed ObjectIds up front.
   *   2. Treat an empty aggregation result as "no matching invite" rather than
   *      a programmer error — that's the path that creates a new invite.
   *   3. Wrap each MongoDB call in its own try/catch so a single failure
   *      returns a clean 500 instead of an uncaught promise rejection.
   *   4. Wrap the whole handler in a final try/catch as a safety net.
   *
   * @param {express.Request} req
   * @param {express.Response} res
   */
  async (req, res) => {
    const {
      inviter_name,
      inviter_id,
      server_name,
      server_id,
      server_pic,
    } = req.body;

    // Defensive ID validation. The validator chain already checks
    // `notEmpty()`, but it does not enforce the ObjectId shape — a string like
    // "abc" would otherwise reach `new mongoose.Types.ObjectId(...)` and
    // surface as an ugly CastError to the client.
    if (!isValidObjectId(inviter_id) || !isValidObjectId(server_id)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "inviter_id and server_id must be valid Mongo ObjectIds",
      });
    }

    try {
      const response = await checkInviteLink(inviter_id, server_id);
      const existingInvite = Array.isArray(response) ? response[0] : null;
      const existingInvites = existingInvite?.invites || [];

      if (existingInvites.length > 0) {
        // Reuse the most recent invite for this server.
        return res.json({
          status: 200,
          invite_code: existingInvites[0].invite_code,
        });
      }

      // No matching invite — mint a fresh one.
      const timestamp = Date.now();
      const invite_code = shortid();

      const newInvite = new Invite({
        invite_code,
        inviter_name,
        inviter_id,
        server_name,
        server_id,
        server_pic,
        timestamp: String(timestamp),
      });

      try {
        await newInvite.save();
      } catch (err) {
        console.error("[/create_invite_link] failed to save Invite:", err);
        return res.status(500).json({ status: 500, message: "Server error" });
      }

      const userInvitesList = {
        $push: {
          invites: [
            {
              server_id,
              invite_code,
              timestamp: String(timestamp),
            },
          ],
        },
      };

      try {
        await User.updateOne(
          { _id: new mongoose.Types.ObjectId(inviter_id) },
          userInvitesList,
        );
      } catch (err) {
        console.error("[/create_invite_link] failed to push user invites:", err);
        return res.status(500).json({ status: 500, message: "Server error" });
      }

      return res.json({ status: 200, invite_code });
    } catch (err) {
      console.error("[/create_invite_link] unexpected error:", err);
      return res.status(500).json({ status: 500, message: "Server error" });
    }
  },
);

router.post("/invite_link_info", inviteLinkInfoValidator, validate, async (req, res) => {
  const { invite_link } = req.body;
  try {
    const invite = await Invite.findOne({ invite_code: invite_link }).lean();
    if (!invite) {
      return res.json({ status: 404 });
    }
    const { inviter_name, server_name, server_pic, server_id, inviter_id } =
      invite;
    return res.json({
      status: 200,
      inviter_name,
      server_name,
      server_pic,
      server_id,
      inviter_id,
    });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error" });
  }
});

router.post("/accept_invite", acceptInviteValidator, validate, async (req, res) => {
  const { user_details, server_details } = req.body;
  const { id } = user_details;
  const server_id = server_details.invite_details.server_id;

  const checkUser = await checkServerInUser(id, server_id);
  if (
    !checkUser[0] ||
    !checkUser[0].servers ||
    checkUser[0].servers.length > 0
  ) {
    return res.json({ status: 403 });
  }

  const addUser = await addUserToServer(user_details, server_id);
  if (!addUser) {
    return res.status(500).json({ message: "Failed to join server." });
  }

  await addServerToUser(id, server_details.invite_details, "member");

  const io = getIO();
  if (io) {
    io.to(String(id)).emit("user_servers_updated", { user_id: String(id) });
    io.to(`server:${String(server_id)}`).emit("server_updated", {
      server_id: String(server_id),
      reason: "member_joined",
      user_id: String(id),
    });
  }
  res.json({ status: 200 });
});

export default router;
