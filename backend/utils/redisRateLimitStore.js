const { createClient } = require('redis');
const { logWarn } = require('./safeErrorLog');

let client = null;
let connectPromise = null;
let warned = false;

const getRedisUrl = () => process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL || '';

const getClient = async () => {
  const redisUrl = getRedisUrl();
  if (!redisUrl) return null;

  if (!client) {
    client = createClient({ url: redisUrl });
    client.on('error', (error) => {
      if (!warned) {
        logWarn('[rate-limit] Redis store unavailable.', error);
        warned = true;
      }
    });
  }

  if (!client.isOpen) {
    connectPromise = connectPromise || client.connect().finally(() => {
      connectPromise = null;
    });
    await connectPromise;
  }

  return client;
};

const buildKey = (prefix, key) => `${prefix}:${String(key || '')}`;

const createRedisRateLimitStore = ({ prefix, windowMs }) => {
  if (!getRedisUrl()) return undefined;

  const safePrefix = `${process.env.RATE_LIMIT_REDIS_PREFIX || 'lekhon:rl'}:${prefix}`;

  return {
    async increment(key) {
      const redis = await getClient();
      if (!redis) throw new Error('Redis rate limit store is not configured');

      const redisKey = buildKey(safePrefix, key);
      const totalHits = await redis.incr(redisKey);
      let ttlMs = await redis.pTTL(redisKey);

      if (totalHits === 1 || ttlMs < 0) {
        await redis.pExpire(redisKey, windowMs);
        ttlMs = windowMs;
      }

      return {
        totalHits,
        resetTime: new Date(Date.now() + Math.max(0, ttlMs)),
      };
    },

    async decrement(key) {
      const redis = await getClient();
      if (!redis) return;
      const redisKey = buildKey(safePrefix, key);
      const value = await redis.decr(redisKey);
      if (value <= 0) await redis.del(redisKey);
    },

    async resetKey(key) {
      const redis = await getClient();
      if (!redis) return;
      await redis.del(buildKey(safePrefix, key));
    },
  };
};

module.exports = {
  createRedisRateLimitStore,
};
