let createClient = null;

try {
  ({ createClient } = await import("redis"));
} catch (error) {
  createClient = null;
}

const memoryStore = new Map();
let redisClientPromise = null;

function getRedisUrl() {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  if (process.env.REDIS_HOST) {
    const port = process.env.REDIS_PORT || "6379";
    return `redis://${process.env.REDIS_HOST}:${port}`;
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
        client.on("error", (error) => {
          console.error("Redis error:", error.message);
        });
        await client.connect();
        return client;
      } catch (error) {
        console.error("Redis connection failed:", error.message);
        return null;
      }
    })();
  }

  return redisClientPromise;
}

function getMemoryHash(key) {
  if (!memoryStore.has(key)) {
    memoryStore.set(key, new Map());
  }
  return memoryStore.get(key);
}

async function hashIncrement(key, field, amount = 1) {
  const client = await getRedisClient();
  if (client) {
    return client.hIncrBy(key, field, amount);
  }

  const hash = getMemoryHash(key);
  const current = Number(hash.get(field) || 0) + amount;
  hash.set(field, current);
  return current;
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

async function incrementDmUnread(userId, friendId) {
  await hashIncrement(`unread:dm:${userId}`, friendId, 1);
}

async function clearDmUnread(userId, friendId) {
  await hashDelete(`unread:dm:${userId}`, friendId);
}

async function getDmUnread(userId) {
  const unread = await hashGetAll(`unread:dm:${userId}`);
  return Object.fromEntries(
    Object.entries(unread).map(([key, value]) => [key, Number(value)])
  );
}

async function incrementServerUnread(userId, serverId, channelId) {
  await hashIncrement(`unread:server:${userId}:${serverId}`, channelId, 1);
  await hashIncrement(`unread:server-total:${userId}`, serverId, 1);
}

async function clearServerChannelUnread(userId, serverId, channelId) {
  const key = `unread:server:${userId}:${serverId}`;
  const totalKey = `unread:server-total:${userId}`;
  const currentValue = Number((await hashGet(key, channelId)) || 0);

  await hashDelete(key, channelId);

  if (currentValue > 0) {
    await hashIncrement(totalKey, serverId, -currentValue);
    const updatedTotal = Number((await hashGet(totalKey, serverId)) || 0);
    if (updatedTotal <= 0) {
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
      total: Number(totals[serverId] || 0),
      channels: Object.fromEntries(
        Object.entries(channels).map(([key, value]) => [key, Number(value)])
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

export {
  incrementDmUnread,
  clearDmUnread,
  incrementServerUnread,
  clearServerChannelUnread,
  getUnreadSummary,
};
