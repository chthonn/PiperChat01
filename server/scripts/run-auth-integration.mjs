/**
 * Auth integration checks (MongoDB + HTTP).
 * Run from repo: node server/scripts/run-auth-integration.mjs
 * Uses MONGO_URI from the environment or PiperChat01/.env (via config/env.js).
 * If MONGO_URI is still unset, defaults to mongodb://127.0.0.1:27017/piperchat_auth_itest.
 */
import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function ensureTestEnv() {
  if (!process.env.MONGO_URI) {
    process.env.MONGO_URI =
      "mongodb://127.0.0.1:27017/piperchat_auth_itest";
  }
  if (!process.env.ACCESS_TOKEN) {
    process.env.ACCESS_TOKEN =
      "integration-test-jwt-secret-do-not-use-in-production-32chars-min";
  }
  if (!process.env.default_profile_pic) {
    process.env.default_profile_pic = "https://example.com/default.png";
  }
}

await import("../config/env.js");
ensureTestEnv();
// Avoid live SMTP during automated auth tests (signup still persists user).
process.env.MAIL_TRANSPORT = "console";

const { connect } = await import("../config/db.js");
const User = (await import("../models/User.js")).default;
const authRoutes = (await import("../routes/auth.js")).default;
const profileRoutes = (await import("../routes/profile.js")).default;

function decodeJwtPayload(token) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function request(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text };
  }
  return { res, json };
}

async function main() {
  await connect();

  const emailPlain = `auth-itest-plain-${Date.now()}@example.com`;
  const emailNew = `auth-itest-new-${Date.now()}@example.com`;
  const plainPassword = "LegacyPass99";
  const newUserPassword = "NewUserPass99ok";

  await User.deleteMany({
    email: { $in: [emailPlain, emailNew] },
  });

  // --- 1) Legacy plaintext user ---
  const legacy = await User.create({
    username: "legacy_user",
    tag: "0999",
    email: emailPlain,
    password: plainPassword,
    dob: "01/01/1990",
    profile_pic: "https://example.com/legacy.png",
    authorized: true,
    verification: [{ timestamp: Date.now(), code: "0000" }],
  });

  const app = express();
  app.use(express.json());
  app.use("/", authRoutes);
  app.use("/", profileRoutes);

  const server = http.createServer(app);
  const baseUrl = await new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve(`http://127.0.0.1:${port}`);
    });
    server.on("error", reject);
  });

  try {
    let r = await request(baseUrl, "/signin", {
      method: "POST",
      body: { email: emailPlain, password: plainPassword },
    });
    assert(r.res.status === 201, `legacy signin expected 201, got ${r.res.status}`);
    assert(r.json.token, "legacy signin missing token");

    const payload = decodeJwtPayload(r.json.token);
    const required = [
      "id",
      "email",
      "username",
      "tag",
      "profile_pic",
      "notification_preferences",
    ];
    const jwtAllowedExtra = new Set(["iat", "exp"]);
    for (const k of required) {
      assert(k in payload, `JWT missing field: ${k}`);
    }
    assert(
      String(payload.id) === String(legacy._id),
      "JWT id mismatch"
    );
    assert(payload.email === emailPlain, "JWT email mismatch");
    assert(payload.username === "legacy_user", "JWT username mismatch");
    assert(payload.tag === "0999", "JWT tag mismatch");
    assert(
      payload.profile_pic === "https://example.com/legacy.png",
      "JWT profile_pic mismatch"
    );
    const prefs = payload.notification_preferences;
    assert(prefs && typeof prefs === "object", "JWT notification_preferences missing");
    for (const key of [
      "direct_messages",
      "friend_requests",
      "server_messages",
      "server_invites",
    ]) {
      assert(prefs[key] === true, `JWT notification_preferences.${key} should default true`);
    }
    const extra = Object.keys(payload).filter((k) => !required.includes(k));
    assert(
      extra.every((k) => jwtAllowedExtra.has(k)),
      `Unexpected JWT keys: ${extra.join(",")}`
    );
    assert(!("password" in payload), "JWT must not contain password");

    const afterLogin = await User.findById(legacy._id).lean();
    assert(
      BCRYPT_RE.test(afterLogin.password),
      `expected migrated bcrypt hash, got: ${String(afterLogin.password).slice(0, 10)}…`
    );
    assert(
      await bcrypt.compare(plainPassword, afterLogin.password),
      "migrated hash should verify with bcrypt"
    );

    r = await request(baseUrl, "/signin", {
      method: "POST",
      body: { email: emailPlain, password: "wrong-password" },
    });
    assert(
      r.res.status === 442,
      `wrong password expected 442, got ${r.res.status}`
    );

    // --- 2) New signup + OTP verify + bcrypt signin ---
    r = await request(baseUrl, "/signup", {
      method: "POST",
      body: {
        email: emailNew,
        username: "new_signup_user",
        password: newUserPassword,
        dob: "01/01/2001",
      },
    });
    assert(
      r.res.status === 201,
      `signup expected 201, got ${r.res.status} ${JSON.stringify(r.json)}`
    );

    const row = await User.findOne({ email: emailNew }).lean();
    assert(row, "new user row missing");
    assert(BCRYPT_RE.test(row.password), "signup should store bcrypt hash");
    assert(row.authorized === false, "new user should be unauthorized until verify");

    const otp = row.verification?.[0]?.code;
    assert(otp && otp.length === 4, "otp missing");

    r = await request(baseUrl, "/verify", {
      method: "POST",
      body: { email: emailNew, otp_value: otp },
    });
    assert(r.res.status === 201, `verify expected 201, got ${r.res.status}`);

    r = await request(baseUrl, "/signin", {
      method: "POST",
      body: { email: emailNew, password: newUserPassword },
    });
    assert(r.res.status === 201, `new user signin expected 201, got ${r.res.status}`);
    const p2 = decodeJwtPayload(r.json.token);
    assert(p2.email === emailNew, "new user JWT email");
    assert(p2.username === "new_signup_user", "new user JWT username");

    // --- 3) Profile PATCH + JWT regeneration ---
    r = await request(baseUrl, "/profile", {
      method: "PATCH",
      headers: { "x-auth-token": r.json.token },
      body: { username: "renamed_user" },
    });
    assert(r.res.status === 200, `profile patch expected 200, got ${r.res.status}`);
    assert(r.json.token, "profile response missing new token");
    const p3 = decodeJwtPayload(r.json.token);
    assert(p3.username === "renamed_user", "profile JWT should carry new username");
    assert(r.json.user?.username === "renamed_user", "profile user payload");

    // --- 4) Unverified cannot sign in ---
    const emailUnver = `auth-itest-unver-${Date.now()}@example.com`;
    const hashUnver = await bcrypt.hash("SomePass99ok", 10);
    await User.create({
      username: "unver",
      tag: "0998",
      email: emailUnver,
      password: hashUnver,
      dob: "01/01/2002",
      profile_pic: "",
      authorized: false,
      verification: [{ timestamp: Date.now(), code: "1234" }],
    });
    r = await request(baseUrl, "/signin", {
      method: "POST",
      body: { email: emailUnver, password: "SomePass99ok" },
    });
    assert(r.res.status === 422, `unverified expected 422, got ${r.res.status}`);

    await User.deleteMany({
      email: { $in: [emailPlain, emailNew, emailUnver] },
    });

    console.log("auth integration: all checks passed");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});