import { createClient } from "redis";

const redisUrl =
  process.env.REDIS_URL ||
  process.env.UPSTASH_REDIS_URL ||
  process.env.UPSTASH_REDIS_TLS_URL ||
  "";

const defaultTtlSeconds = Number(process.env.REDIS_CACHE_TTL_SECONDS || 30);

let redisConnectPromise = null;

async function getRedis() {
  if (!redisUrl) return null;

  if (!redisConnectPromise) {
    const client = createClient({ url: redisUrl });
    client.on("error", (err) => {
      console.warn("[redis] client error:", err?.message || err);
    });

    redisConnectPromise = client
      .connect()
      .then(() => client)
      .catch((err) => {
        console.warn("[redis] connect failed:", err?.message || err);
        redisConnectPromise = null;
        return null;
      });
  }

  return redisConnectPromise;
}

async function getJson(key) {
  const client = await getRedis();
  if (!client) return null;

  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

async function setJson(key, value, ttlSeconds = defaultTtlSeconds) {
  const client = await getRedis();
  if (!client) return false;

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
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (err) {
    return false;
  }
}

export { getJson, setJson, del };
