import assert from "node:assert/strict";

process.env.ACCESS_TOKEN =
  process.env.ACCESS_TOKEN ||
  "socket-auth-unit-secret-minimum-length-32-characters";

const jwt = await import("jsonwebtoken");
const { isSocketUserClaimAllowed, verifySocketToken } = await import(
  "../src/socket/index.js"
);

const token = jwt.default.sign(
  {
    id: "user-123",
    email: "user@example.com",
  },
  process.env.ACCESS_TOKEN,
);

const verified = verifySocketToken(token);
assert.equal(verified.userId, "user-123");
assert.equal(verified.decoded.email, "user@example.com");

assert.throws(
  () => verifySocketToken(""),
  /Socket authentication token is required/,
);
assert.throws(
  () => verifySocketToken("not-a-valid-jwt"),
  /jwt malformed|invalid token/,
);

const tokenWithoutUserId = jwt.default.sign(
  { email: "missing-id@example.com" },
  process.env.ACCESS_TOKEN,
);
assert.throws(
  () => verifySocketToken(tokenWithoutUserId),
  /missing a user id/,
);

const socket = {
  data: {
    authenticated_user_id: "user-123",
  },
};

assert.equal(isSocketUserClaimAllowed(socket, "user-123"), true);
assert.equal(isSocketUserClaimAllowed(socket, "victim-user"), false);
assert.equal(isSocketUserClaimAllowed(socket, ""), false);
assert.equal(isSocketUserClaimAllowed({ data: {} }, "user-123"), false);

console.log("socket auth unit checks: passed");
