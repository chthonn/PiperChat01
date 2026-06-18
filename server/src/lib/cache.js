import config from "../config/index.js";
import { createClient } from "redis";
import logger from "./winston.js";

function getRedisUrl() {
  if (config.REDIS_URL) return config.REDIS_URL;
  if (config.UPSTASH_REDIS_URL) return config.UPSTASH_REDIS_URL;
  if (config.UPSTASH_REDIS_TLS_URL) return config.UPSTASH_REDIS_TLS_URL;
  if (config.REDIS_HOST) {
    const port = config.REDIS_PORT || "6379";
    return `redis://${config.REDIS_HOST}:${port}`;
  }
  return "";
}

const redisUrl = getRedisUrl();
const memoryStore = new Map();
let loggedMemoryFallback = false;

function getMemoryEntry(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function setMemoryEntry(key, value, ttlSeconds) {
  const ttl = Number(ttlSeconds);
  const expiresAt =
    Number.isFinite(ttl) && ttl > 0 ? Date.now() + ttl * 1000 : null;
  memoryStore.set(key, { value, expiresAt });
}

function logMemoryFallbackOnce() {
  if (!loggedMemoryFallback) {
    loggedMemoryFallback = true;
    logger.warn(
      "[cache] Redis not configured — using in-memory store (OTP/cache will not persist across restarts).",
    );
  }
}

let redisConnectPromise = null;

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
  if (client) {
    try {
      const raw = await client.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  logMemoryFallbackOnce();
  return getMemoryEntry(key);
}

async function setJson(key, value, ttlSeconds = config.REDIS_CACHE_TTL_SECONDS) {
  const client = await getRedis();
  if (client) {
    try {
      const ttl = Number(ttlSeconds);
      const payload = JSON.stringify(value);
      if (Number.isFinite(ttl) && ttl > 0) {
        await client.set(key, payload, { EX: ttl });
      } else {
        await client.set(key, payload);
      }
      return true;
    } catch {
      return false;
    }
  }

  logMemoryFallbackOnce();
  setMemoryEntry(key, value, ttlSeconds);
  return true;
}

async function del(key) {
  const client = await getRedis();
  if (client) {
    try {
      await client.del(key);
      return true;
    } catch {
      return false;
    }
  }

  memoryStore.delete(key);
  return true;
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
