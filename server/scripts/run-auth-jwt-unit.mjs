/**
 * Fast checks for JWT payload helper and bcrypt hash shape (no MongoDB).
 * Run: node server/scripts/run-auth-jwt-unit.mjs
 */
import config from "../src/config/index.js";

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { buildAuthUserJwtPayload } from "../src/lib/authJwtPayload.js";

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function assert(c, m) {
  if (!c) throw new Error(m);
}

const secret =
  config.ACCESS_TOKEN ||
  "unit-test-jwt-secret-minimum-length-32-characters";

const mockUser = {
  _id: "507f1f77bcf86cd799439011",
  email: "u@example.com",
  username: "tester",
  tag: "0001",
  profile_pic: "https://example.com/a.png",
};

const payload = buildAuthUserJwtPayload(mockUser);
const token = jwt.sign(payload, secret);
const decoded = jwt.verify(token, secret);

const allowed = new Set(["id", "email", "username", "tag", "profile_pic", "invisible_mode", "notification_preferences", "iat"]);
for (const k of Object.keys(decoded)) {
  assert(allowed.has(k), `unexpected JWT claim: ${k}`);
}
assert(decoded.id === String(mockUser._id));
assert(decoded.email === mockUser.email);
assert(decoded.username === mockUser.username);
assert(decoded.tag === mockUser.tag);
assert(decoded.profile_pic === mockUser.profile_pic);

const hash = await bcrypt.hash("SomePassword9", 10);
assert(BCRYPT_RE.test(hash), "bcryptjs output should match hash detector regex");
assert(await bcrypt.compare("SomePassword9", hash));
assert(!(await bcrypt.compare("wrong", hash)));

console.log("auth JWT/unit checks: passed");
