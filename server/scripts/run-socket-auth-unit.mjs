process.env.ACCESS_TOKEN = "socket-auth-test-secret";

const assert = await import("node:assert/strict");
const jwt = await import("jsonwebtoken");
const {
  authenticateSocketHandshake,
  isAuthenticatedUserClaim,
} = await import("../src/socket/index.js");

function runMiddleware(socket) {
  return new Promise((resolve) => {
    authenticateSocketHandshake(socket, (error) => resolve(error || null));
  });
}

const token = jwt.default.sign(
  { id: "user-123", username: "tester" },
  process.env.ACCESS_TOKEN,
);

const socket = {
  handshake: {
    auth: { token },
    headers: {},
  },
  data: {},
};

assert.equal(await runMiddleware(socket), null);
assert.equal(socket.data.authenticated_user_id, "user-123");
assert.equal(isAuthenticatedUserClaim(socket, "user-123"), true);
assert.equal(isAuthenticatedUserClaim(socket, "user-456"), false);

const missingTokenSocket = {
  handshake: { auth: {}, headers: {} },
  data: {},
};
assert.match((await runMiddleware(missingTokenSocket)).message, /required/);

const invalidTokenSocket = {
  handshake: {
    auth: { token: "not-a-valid-token" },
    headers: {},
  },
  data: {},
};
assert.match((await runMiddleware(invalidTokenSocket)).message, /required/);

const bearerSocket = {
  handshake: {
    auth: {},
    headers: { authorization: `Bearer ${token}` },
  },
  data: {},
};
assert.equal(await runMiddleware(bearerSocket), null);
assert.equal(bearerSocket.data.authenticated_user_id, "user-123");

console.log("socket auth unit checks passed");
