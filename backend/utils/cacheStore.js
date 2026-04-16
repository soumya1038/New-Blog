const { createClient } = require('redis');

let redisClient = null;
let redisConnected = false;
let cacheInitialized = false;
let warnedFallback = false;

const memoryCache = new Map();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_CACHE_TTL_SECONDS = parsePositiveInt(process.env.CACHE_TTL_SECONDS, 300);

const pruneExpiredMemoryEntries = () => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
};

const createQueryCacheKey = (query = {}) => {
  const entries = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${String(value)}`);

  return entries.length ? entries.join('|') : 'default';
};

const initializeCacheStore = async () => {
  if (cacheInitialized) return;
  cacheInitialized = true;

  if (!process.env.REDIS_URL) {
    if (!warnedFallback) {
      console.log('[cache] REDIS_URL missing; using in-memory cache fallback.');
      warnedFallback = true;
    }
    return;
  }

  try {
    redisClient = createClient({ url: process.env.REDIS_URL });

    redisClient.on('error', (error) => {
      redisConnected = false;
      console.warn('[cache] Redis error; continuing with fallback cache.', error?.message || error);
    });

    await redisClient.connect();
    redisConnected = true;
    console.log('[cache] Redis cache connected.');
  } catch (error) {
    redisConnected = false;
    if (!warnedFallback) {
      console.warn('[cache] Redis unavailable; using in-memory cache fallback.', error?.message || error);
      warnedFallback = true;
    }
  }
};

const getCache = async (key) => {
  if (!key) return null;

  try {
    if (redisConnected && redisClient?.isOpen) {
      const raw = await redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    }

    pruneExpiredMemoryEntries();
    const cached = memoryCache.get(key);
    return cached ? cached.value : null;
  } catch (error) {
    return null;
  }
};

const setCache = async (key, value, ttlSeconds = DEFAULT_CACHE_TTL_SECONDS) => {
  if (!key) return false;
  const ttl = parsePositiveInt(ttlSeconds, DEFAULT_CACHE_TTL_SECONDS);

  try {
    if (redisConnected && redisClient?.isOpen) {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    }

    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000
    });
    return true;
  } catch (error) {
    return false;
  }
};

const deleteCacheKey = async (key) => {
  if (!key) return 0;

  try {
    if (redisConnected && redisClient?.isOpen) {
      return await redisClient.del(key);
    }

    const existed = memoryCache.delete(key);
    return existed ? 1 : 0;
  } catch (error) {
    return 0;
  }
};

const invalidateCacheByPrefixes = async (prefixes = []) => {
  const safePrefixes = [...new Set(prefixes.filter(Boolean))];
  if (!safePrefixes.length) return 0;

  let invalidatedCount = 0;

  try {
    if (redisConnected && redisClient?.isOpen) {
      for (const prefix of safePrefixes) {
        const keys = [];
        for await (const key of redisClient.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
          keys.push(key);
          if (keys.length >= 500) {
            invalidatedCount += await redisClient.del(keys);
            keys.length = 0;
          }
        }
        if (keys.length) {
          invalidatedCount += await redisClient.del(keys);
        }
      }
      return invalidatedCount;
    }

    pruneExpiredMemoryEntries();
    for (const key of memoryCache.keys()) {
      if (safePrefixes.some((prefix) => key.startsWith(prefix))) {
        memoryCache.delete(key);
        invalidatedCount += 1;
      }
    }
    return invalidatedCount;
  } catch (error) {
    return invalidatedCount;
  }
};

module.exports = {
  parsePositiveInt,
  createQueryCacheKey,
  initializeCacheStore,
  getCache,
  setCache,
  deleteCacheKey,
  invalidateCacheByPrefixes
};
