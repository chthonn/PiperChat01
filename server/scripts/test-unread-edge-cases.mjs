/**
 * test-unread-edge-cases.mjs
 *
 * Repeatable automated test checklist for unread count edge cases.
 *
 * Run:
 *   node server/scripts/test-unread-edge-cases.mjs
 *
 * No external dependencies required — uses the in-memory fallback by default.
 * To test against a real Redis instance, set REDIS_URL before running:
 *   REDIS_URL=redis://localhost:6379 node server/scripts/test-unread-edge-cases.mjs
 */

// ─── Bootstrap env so the service can load ───────────────────────────────────
// Unset REDIS_URL/REDIS_HOST so we use the in-memory fallback for most tests.
// Individual cases that need Redis can set process.env.REDIS_URL themselves.
delete process.env.REDIS_URL;
delete process.env.REDIS_HOST;

import {
  incrementDmUnread,
  clearDmUnread,
  incrementServerUnread,
  clearServerChannelUnread,
  getUnreadSummary,
  isUsingRedis,
  resetForTesting,
} from "../services/unreadService.js";

// ─── Tiny test runner ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}`);
    failed++;
  }
}

async function runTest(name, fn) {
  resetForTesting();
  console.log(`\n▶  ${name}`);
  try {
    await fn();
  } catch (err) {
    console.error(`  💥  Unexpected error: ${err.message}`);
    failed++;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

await runTest("Storage mode — in-memory fallback active", async () => {
  const redis = await isUsingRedis();
  assert(!redis, "isUsingRedis() returns false when no Redis URL is set");
});

// ── DM unread ────────────────────────────────────────────────────────────────

await runTest("DM: increment and read back", async () => {
  await incrementDmUnread("user1", "friendA");
  await incrementDmUnread("user1", "friendA");
  const summary = await getUnreadSummary("user1", []);
  assert(summary.dm["friendA"] === 2, "DM count is 2 after two increments");
});

await runTest("DM: clear removes the entry", async () => {
  await incrementDmUnread("user1", "friendA");
  await clearDmUnread("user1", "friendA");
  const summary = await getUnreadSummary("user1", []);
  assert(
    summary.dm["friendA"] === undefined || summary.dm["friendA"] === 0,
    "DM count is absent/0 after clear"
  );
});

await runTest("DM: double-clear is a safe no-op", async () => {
  await incrementDmUnread("user1", "friendA");
  await clearDmUnread("user1", "friendA");
  // Second clear should not throw or produce negative values.
  await clearDmUnread("user1", "friendA");
  const summary = await getUnreadSummary("user1", []);
  assert(
    (summary.dm["friendA"] || 0) >= 0,
    "DM count stays ≥ 0 after double-clear"
  );
});

await runTest("DM: clearing one friend does not affect another", async () => {
  await incrementDmUnread("user1", "friendA");
  await incrementDmUnread("user1", "friendB");
  await clearDmUnread("user1", "friendA");
  const summary = await getUnreadSummary("user1", []);
  assert(
    (summary.dm["friendA"] || 0) === 0,
    "friendA cleared"
  );
  assert(summary.dm["friendB"] === 1, "friendB unaffected");
});

// ── Server channel unread ────────────────────────────────────────────────────

await runTest("Server: increment updates channel count and total", async () => {
  await incrementServerUnread("user1", "server1", "ch1");
  await incrementServerUnread("user1", "server1", "ch1");
  await incrementServerUnread("user1", "server1", "ch2");
  const summary = await getUnreadSummary("user1", ["server1"]);
  const s = summary.servers["server1"];
  assert(s.total === 3, "Server total is 3");
  assert(s.channels["ch1"] === 2, "ch1 count is 2");
  assert(s.channels["ch2"] === 1, "ch2 count is 1");
});

await runTest("Server: clear channel subtracts exact count from total", async () => {
  await incrementServerUnread("user1", "server1", "ch1");
  await incrementServerUnread("user1", "server1", "ch1");
  await incrementServerUnread("user1", "server1", "ch2");
  // Total is 3, ch1=2, ch2=1
  await clearServerChannelUnread("user1", "server1", "ch1");
  const summary = await getUnreadSummary("user1", ["server1"]);
  const s = summary.servers["server1"];
  assert(s.total === 1, "Total is 1 after clearing ch1 (3 - 2 = 1)");
  assert(s.channels["ch1"] === undefined || s.channels["ch1"] === 0, "ch1 cleared");
  assert(s.channels["ch2"] === 1, "ch2 unaffected");
});

await runTest("Server: clearing all channels removes server entry", async () => {
  await incrementServerUnread("user1", "server1", "ch1");
  await clearServerChannelUnread("user1", "server1", "ch1");
  const summary = await getUnreadSummary("user1", ["server1"]);
  const s = summary.servers["server1"];
  // Either no entry or total is 0 — both are acceptable.
  assert(
    !s || s.total === 0,
    "Server entry removed or total is 0 after all channels cleared"
  );
});

await runTest("Server: total NEVER goes negative (double-clear same channel)", async () => {
  await incrementServerUnread("user1", "server1", "ch1");
  // First clear: subtracts 1, total becomes 0 → entry deleted.
  await clearServerChannelUnread("user1", "server1", "ch1");
  // Second clear: channel no longer exists, must be a no-op (total stays ≥ 0).
  await clearServerChannelUnread("user1", "server1", "ch1");
  const summary = await getUnreadSummary("user1", ["server1"]);
  const total = summary.servers["server1"]?.total ?? 0;
  assert(total >= 0, `Total is ${total} — not negative ✔`);
});

await runTest("Server: clearing one channel doesn't affect another server", async () => {
  await incrementServerUnread("user1", "server1", "ch1");
  await incrementServerUnread("user1", "server2", "ch1");
  await clearServerChannelUnread("user1", "server1", "ch1");
  const summary = await getUnreadSummary("user1", ["server1", "server2"]);
  assert(
    (summary.servers["server1"]?.total ?? 0) === 0,
    "server1 total cleared"
  );
  assert(summary.servers["server2"].total === 1, "server2 total unaffected");
});

await runTest("Server: increments for multiple users are isolated", async () => {
  await incrementServerUnread("user1", "server1", "ch1");
  await incrementServerUnread("user2", "server1", "ch1");
  const s1 = await getUnreadSummary("user1", ["server1"]);
  const s2 = await getUnreadSummary("user2", ["server1"]);
  assert(
    s1.servers["server1"].total === 1,
    "user1 total is 1"
  );
  assert(
    s2.servers["server1"].total === 1,
    "user2 total is 1"
  );
});

// ── Reconnect / cache-loss simulation ────────────────────────────────────────

await runTest("Reconnect: resetForTesting clears all memory state", async () => {
  await incrementServerUnread("user1", "server1", "ch1");
  await incrementDmUnread("user1", "friendA");
  resetForTesting();
  const summary = await getUnreadSummary("user1", ["server1"]);
  assert(Object.keys(summary.dm).length === 0, "DM state cleared");
  assert(
    (summary.servers["server1"]?.total ?? 0) === 0,
    "Server state cleared"
  );
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed! 🎉");
}
