import assert from "node:assert/strict";

import {
  MESSAGE_MAX_LENGTH,
  SERVER_NAME_MAX_LENGTH,
  validateMessageContent,
  validateServerName,
} from "../src/lib/validation.js";

const emptyMessage = validateMessageContent("   ");
assert.equal(emptyMessage.valid, false);
assert.equal(emptyMessage.message, "Message cannot be empty");

const longMessage = validateMessageContent("x".repeat(MESSAGE_MAX_LENGTH + 1));
assert.equal(longMessage.valid, false);
assert.equal(longMessage.message, "Message must be 2000 characters or fewer");

const validMessage = validateMessageContent("  hello  ");
assert.deepEqual(validMessage, { valid: true, value: "hello" });

const emptyServerName = validateServerName("   ");
assert.equal(emptyServerName.valid, false);
assert.equal(emptyServerName.message, "Server name cannot be empty");

const longServerName = validateServerName(
  "x".repeat(SERVER_NAME_MAX_LENGTH + 1),
);
assert.equal(longServerName.valid, false);
assert.equal(longServerName.message, "Server name must be 100 characters or fewer");

const validServerName = validateServerName("  Piper Community  ");
assert.deepEqual(validServerName, {
  valid: true,
  value: "Piper Community",
});

console.log("Validation unit checks passed.");
