import config from "../config/index.js";
import { createClient } from "redis";
import logger from "./winston.js";

const redisUrl =
  config.REDIS_URL ||
  config.UPSTASH_REDIS_URL ||
  config.UPSTASH_REDIS_TLS_URL ||
  "";

let redisConnectPromise = null;

/* ─── In-memory fallback when Redis is not configured ─── */
const memoryCache = new Map();
const memoryTimers = new Map();

function memSet(key, value, ttlSeconds) {
  // Clear any existing timer for this key
  if (memoryTimers.has(key)) {
    clearTimeout(memoryTimers.get(key));
  }
  memoryCache.set(key, value);
  const ttl = Number(ttlSeconds);
  if (Number.isFinite(ttl) && ttl > 0) {
    memoryTimers.set(
      key,
      setTimeout(() => {
        memoryCache.delete(key);
        memoryTimers.delete(key);
      }, ttl * 1000),
    );
  }
  return true;
}

function memGet(key) {
  return memoryCache.get(key) ?? null;
}

function memDel(key) {
  if (memoryTimers.has(key)) {
    clearTimeout(memoryTimers.get(key));
    memoryTimers.delete(key);
  }
  memoryCache.delete(key);
  return true;
}

if (!redisUrl) {
  logger.info("[cache] No Redis URL configured – using in-memory cache (dev only)");
}
/* ─── end fallback ─── */

async function getRedis() {
  if (!redisUrl) return null;

  if (!redisConnectPromise) {
    const client = createClient({ url: redisUrl });
    client.on("error", (err) => {
      logger.warn(`[redis] client error: ${err?.message || err}`);
    });

    redisConnectPromise = client
      .connect()
      .then(() => client)
      .catch((err) => {
        logger.warn(`[redis] connect failed: ${err?.message || err}`);
        redisConnectPromise = null;
        return null;
      });
  }

  return redisConnectPromise;
}

async function getJson(key) {
  const client = await getRedis();
  if (!client) {
    // Fallback to memory
    const raw = memGet(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

async function setJson(key, value, ttlSeconds = config.REDIS_CACHE_TTL_SECONDS) {
  const client = await getRedis();
  if (!client) {
    // Fallback to memory
    return memSet(key, JSON.stringify(value), ttlSeconds);
  }

  try {
    const ttl = Number(ttlSeconds);
    const payload = JSON.stringify(value);
    if (Number.isFinite(ttl) && ttl > 0) {
      await client.set(key, payload, { EX: ttl });
    } else {
      await client.set(key, payload);
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function del(key) {
  const client = await getRedis();
  if (!client) {
    // Fallback to memory
    return memDel(key);
  }

  try {
    await client.del(key);
    return true;
  } catch (err) {
    return false;
  }
}

async function closeRedis() {
  if (!redisConnectPromise) return;

  const client = await redisConnectPromise;

  if (client?.isOpen) {
    await client.quit();
  }

  redisConnectPromise = null;
}

export { getJson, setJson, del, closeRedis };

