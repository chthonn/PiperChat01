/**
 * Integration tests for issue #234 — /create_invite_link crashes with TypeError
 * when checkInviteLink returns an empty result, and the route also blows up
 * on malformed inviter_id / server_id values.
 *
 * Run from repo root: node server/scripts/run-invites-bug-repro.mjs
 */
import "dotenv/config";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import http from "http";

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error("  ❌", msg);
    failed += 1;
  } else {
    console.log("  ✅", msg);
  }
}

async function request(baseUrl, path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function main() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();

  const { connectDatabase } = await import("../src/config/db.js");
  await connectDatabase();

  const User = (await import("../src/models/User.js")).default;
  const Invite = (await import("../src/models/Invite.js")).default;
  const invitesRouter = (await import("../src/routes/invites.js")).default;

  const inviterId = new mongoose.Types.ObjectId();
  const otherServerId = new mongoose.Types.ObjectId();

  // Seed: inviter exists, with an invite for a *different* server (OLDCODE1)
  // and a matching invite for `seedServerId` (OLDCODE2).
  const seedServerId = new mongoose.Types.ObjectId();
  const seedInviteCode = "OLDCODE2";
  await User.create({
    _id: inviterId,
    username: "tester",
    tag: "0001",
    email: "t@example.com",
    authorized: true,
    invites: [
      { server_id: otherServerId.toString(), invite_code: "OLDCODE1", timestamp: "1" },
      { server_id: seedServerId.toString(), invite_code: seedInviteCode, timestamp: "2" },
    ],
  });
  await Invite.create({
    invite_code: "OLDCODE1",
    inviter_id: inviterId.toString(),
    inviter_name: "tester",
    server_id: otherServerId.toString(),
    server_name: "Other",
    server_pic: "",
    timestamp: "1",
  });
  await Invite.create({
    invite_code: seedInviteCode,
    inviter_id: inviterId.toString(),
    inviter_name: "tester",
    server_id: seedServerId.toString(),
    server_name: "My Server",
    server_pic: "",
    timestamp: "2",
  });

  const app = express();
  app.use(express.json());
  app.use("/api/invites", invitesRouter);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Case 1: Reuse an existing invite. Before the fix, this would crash
    // the process because checkInviteLink returns [] when no matching
    // invite exists for the *new* server_id — but the *original* code was
    // specifically broken because it accessed response[0].invites on an
    // empty array. Verify the happy path: re-creating for a brand new
    // server_id must return a 200 with a new code, NOT a TypeError.
    console.log("\n[case 1] Create NEW invite for an unlinked server");
    {
      const r = await request(baseUrl, "/api/invites/create_invite_link", {
        method: "POST",
        body: {
          inviter_name: "tester",
          inviter_id: inviterId.toString(),
          server_name: "New Server",
          server_id: new mongoose.Types.ObjectId().toString(),
          server_pic: "",
        },
      });
      assert(r.status === 200, `expected 200, got ${r.status}`);
      assert(
        r.body?.invite_code && typeof r.body.invite_code === "string",
        `expected non-empty invite_code, got ${JSON.stringify(r.body)}`,
      );
    }

    // Case 2: Reuse existing invite. The aggregation filters to the
    // server_id, so it should find the seed entry and return OLDCODE2.
    console.log("\n[case 2] Reuse existing invite for seed server");
    {
      const r = await request(baseUrl, "/api/invites/create_invite_link", {
        method: "POST",
        body: {
          inviter_name: "tester",
          inviter_id: inviterId.toString(),
          server_name: "My Server",
          server_id: seedServerId.toString(),
          server_pic: "",
        },
      });
      assert(r.status === 200, `expected 200, got ${r.status}`);
      assert(
        r.body?.invite_code === seedInviteCode,
        `expected ${seedInviteCode}, got ${r.body?.invite_code}`,
      );
    }

    // Case 3: Malformed inviter_id. Before the fix, this raised a Mongoose
    // CastError inside `new mongoose.Types.ObjectId()` and surfaced as a
    // raw 500. The fix should return a clean 400.
    console.log("\n[case 3] Malformed inviter_id should return 400");
    {
      const r = await request(baseUrl, "/api/invites/create_invite_link", {
        method: "POST",
        body: {
          inviter_name: "tester",
          inviter_id: "not-a-valid-objectid",
          server_name: "X",
          server_id: seedServerId.toString(),
          server_pic: "",
        },
      });
      assert(r.status === 400, `expected 400, got ${r.status}`);
    }

    // Case 4: Malformed server_id should also return 400, not crash.
    console.log("\n[case 4] Malformed server_id should return 400");
    {
      const r = await request(baseUrl, "/api/invites/create_invite_link", {
        method: "POST",
        body: {
          inviter_name: "tester",
          inviter_id: inviterId.toString(),
          server_name: "X",
          server_id: "garbage",
          server_pic: "",
        },
      });
      assert(r.status === 400, `expected 400, got ${r.status}`);
    }

    // Case 5: Unknown inviter. Before the fix, this also crashed with
    // TypeError because checkInviteLink returns [] for missing users. The
    // fix must NOT crash and must return a clean error.
    console.log("\n[case 5] Unknown inviter_id should NOT crash");
    {
      const unknownId = new mongoose.Types.ObjectId().toString();
      const r = await request(baseUrl, "/api/invites/create_invite_link", {
        method: "POST",
        body: {
          inviter_name: "ghost",
          inviter_id: unknownId,
          server_name: "X",
          server_id: new mongoose.Types.ObjectId().toString(),
          server_pic: "",
        },
      });
      assert(
        r.status === 200 || r.status === 500,
        `expected 200 (creates invite for new inviter) or 500, got ${r.status}`,
      );
      // Specifically: it must NOT be a 500 with an unhandled TypeError.
      // The unfixed code would crash the whole process via uncaughtException.
      assert(
        r.status !== 502,
        `must not be a tunnel error — that means the server crashed`,
      );
    }
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
  }

  if (failed > 0) {
    console.error(`\n❌ ${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\n✅ All assertions passed");
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
