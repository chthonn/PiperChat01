/**
 * unreadService.js
 *
 * Manages per-user unread message counts for DMs and server channels.
 *
 * Storage backends
 * ----------------
 * Redis   – preferred; used when REDIS_URL or REDIS_HOST env vars are set and
 *           the `redis` npm package is installed.  All counts are stored as
 *           Redis hashes so they survive server restarts.
 *
 * Memory  – automatic fallback when Redis is unavailable.  Counts live in a
 *           plain JS Map and are lost on process restart.  This is acceptable
 *           for development / environments without Redis; the frontend will
 *           re-fetch the summary after reconnecting anyway.
 *
 * Edge-case guarantees
 * --------------------
 * • Server totals are clamped to ≥ 0; they can never go negative.
 * • Clearing a channel subtracts only that channel's current count.
 * • Clearing an already-cleared channel is a safe no-op.
 * • If the Redis connection drops, the client promise is reset so the next
 *   call retries the connection rather than re-using a failed promise.
 */

import config from "../config/index.js";
import logger from "../lib/winston.js";

let createClient = null;

try {
  ({ createClient } = await import("redis"));
} catch {
  createClient = null;
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

const memoryStore = new Map();

function getMemoryHash(key) {
  if (!memoryStore.has(key)) {
    memoryStore.set(key, new Map());
  }
  return memoryStore.get(key);
}

// ─── Redis client management ──────────────────────────────────────────────────

let redisClientPromise = null;

function getRedisUrl() {
  if (config.REDIS_URL) {
    return config.REDIS_URL;
  }

  if (config.REDIS_HOST) {
    const port = config.REDIS_PORT || "6379";
    return `redis://${config.REDIS_HOST}:${port}`;
  }

  return null;
}

async function getRedisClient() {
  if (!createClient) {
    return null;
  }

  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const url = getRedisUrl();
      if (!url) {
        return null;
      }

      try {
        const client = createClient({ url });

        client.on("error", (err) => {
          logger.error(`Redis error: ${err.message}`);
          // Reset the cached promise so the next request retries the connection
          // rather than re-using a permanently-broken client.
          redisClientPromise = null;
        });

        await client.connect();
        logger.info(`Redis connected: ${url}`);
        return client;
      } catch (err) {
        logger.error(`Redis connection failed: ${err.message}`);
        // Allow the next call to retry.
        redisClientPromise = null;
        return null;
      }
    })();
  }

  return redisClientPromise;
}

// ─── Primitive hash operations (Redis or memory) ──────────────────────────────

async function hashIncrement(key, field, amount = 1) {
  const client = await getRedisClient();
  if (client) {
    return client.hIncrBy(key, field, amount);
  }

  const hash = getMemoryHash(key);
  const next = Number(hash.get(field) || 0) + amount;
  hash.set(field, next);
  return next;
}

async function hashGetAll(key) {
  const client = await getRedisClient();
  if (client) {
    return client.hGetAll(key);
  }

  const hash = getMemoryHash(key);
  return Object.fromEntries(hash.entries());
}

async function hashDelete(key, field) {
  const client = await getRedisClient();
  if (client) {
    return client.hDel(key, field);
  }

  const hash = getMemoryHash(key);
  hash.delete(field);
  return 1;
}

async function hashGet(key, field) {
  const client = await getRedisClient();
  if (client) {
    return client.hGet(key, field);
  }

  const hash = getMemoryHash(key);
  return hash.get(field) || null;
}

// ─── DM unread helpers ────────────────────────────────────────────────────────

async function incrementDmUnread(userId, friendId) {
  await hashIncrement(`unread:dm:${userId}`, friendId, 1);
}

/**
 * Clear DM unread count for a specific friend.
 * Safe to call even if there is no existing count.
 */
async function clearDmUnread(userId, friendId) {
  await hashDelete(`unread:dm:${userId}`, friendId);
}

async function getDmUnread(userId) {
  const unread = await hashGetAll(`unread:dm:${userId}`);
  return Object.fromEntries(
    Object.entries(unread).map(([key, value]) => [key, Number(value)])
  );
}

// ─── Server channel unread helpers ───────────────────────────────────────────

async function incrementServerUnread(userId, serverId, channelId) {
  await hashIncrement(`unread:server:${userId}:${serverId}`, channelId, 1);
  await hashIncrement(`unread:server-total:${userId}`, serverId, 1);
}

/**
 * Clear unread count for a specific server channel.
 *
 * Algorithm:
 *  1. Read the current per-channel count.
 *  2. Delete the channel entry.
 *  3. Subtract that exact count from the server total.
 *  4. Clamp the total to ≥ 0 (guards against any race-condition drift).
 *  5. If the total reaches 0, remove the server total entry entirely.
 *
 * Calling this when the channel already has no unread count is a safe no-op.
 */
async function clearServerChannelUnread(userId, serverId, channelId) {
  const channelKey = `unread:server:${userId}:${serverId}`;
  const totalKey = `unread:server-total:${userId}`;

  // Step 1 — read the channel's current count before deleting.
  const currentValue = Math.max(
    0,
    Number((await hashGet(channelKey, channelId)) || 0)
  );

  // Step 2 — delete the channel entry.
  await hashDelete(channelKey, channelId);

  // Step 3 & 4 — only touch the total when there is something to subtract.
  if (currentValue > 0) {
    await hashIncrement(totalKey, serverId, -currentValue);

    // Re-read the total and clamp it to ≥ 0.
    const updatedTotal = Number((await hashGet(totalKey, serverId)) || 0);

    if (updatedTotal <= 0) {
      // Step 5 — clean up the total key when the server has no more unreads.
      await hashDelete(totalKey, serverId);
    }
  }
}

async function getServerUnread(userId, serverIds = []) {
  const totals = await hashGetAll(`unread:server-total:${userId}`);
  const result = {};

  for (const serverId of serverIds) {
    const channels = await hashGetAll(`unread:server:${userId}:${serverId}`);
    result[serverId] = {
      // Clamp persisted totals to ≥ 0 on read as a final safety net.
      total: Math.max(0, Number(totals[serverId] || 0)),
      channels: Object.fromEntries(
        Object.entries(channels).map(([key, value]) => [
          key,
          Math.max(0, Number(value)),
        ])
      ),
    };
  }

  return result;
}

async function getUnreadSummary(userId, serverIds = []) {
  return {
    dm: await getDmUnread(userId),
    servers: await getServerUnread(userId, serverIds),
  };
}

// ─── Utility / diagnostic helpers ────────────────────────────────────────────

/**
 * Returns true if a Redis connection is currently active.
 * Useful for health-check routes and test assertions.
 */
async function isUsingRedis() {
  const client = await getRedisClient();
  return client !== null;
}

/**
 * Reset all in-memory state. Intended for use in tests only.
 * Also clears the Redis client promise so tests can start fresh.
 */
function resetForTesting() {
  memoryStore.clear();
  redisClientPromise = null;
}

export {
  incrementDmUnread,
  clearDmUnread,
  incrementServerUnread,
  clearServerChannelUnread,
  getUnreadSummary,
  isUsingRedis,
  resetForTesting,
};
