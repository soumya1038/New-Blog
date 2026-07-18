const cache = new Map();
const pendingRequests = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STALE_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 200;
const MAX_PENDING_REQUESTS = 100;

const deleteOldestEntry = (targetMap) => {
  const oldestKey = targetMap.keys().next().value;
  if (oldestKey !== undefined) targetMap.delete(oldestKey);
};

const pruneExpiredEntries = (maxAge = STALE_DURATION) => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (!entry || now - entry.timestamp > maxAge) {
      cache.delete(key);
    }
  }
};

const enforceCacheLimit = () => {
  while (cache.size > MAX_CACHE_ENTRIES) {
    deleteOldestEntry(cache);
  }
};

export const apiCache = {
  getEntry: (key) => {
    const cached = cache.get(key) || null;
    if (cached) {
      cache.delete(key);
      cache.set(key, { ...cached, lastAccessed: Date.now() });
    }
    return cached;
  },

  isFresh: (key, { ttl = CACHE_DURATION } = {}) => {
    const cached = apiCache.getEntry(key);
    return Boolean(cached && Date.now() - cached.timestamp <= ttl);
  },

  get: (key, { ttl = CACHE_DURATION } = {}) => {
    const cached = apiCache.getEntry(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > ttl) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  },

  getStale: (key, { staleTtl = STALE_DURATION } = {}) => {
    const cached = apiCache.getEntry(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > staleTtl) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  },

  set: (key, data) => {
    pruneExpiredEntries();
    if (cache.has(key)) cache.delete(key);
    cache.set(key, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    });
    enforceCacheLimit();
  },

  fetch: async (key, requestFn, { ttl = CACHE_DURATION, force = false } = {}) => {
    if (!force) {
      const cached = apiCache.get(key, { ttl });
      if (cached) return cached;
    }

    if (pendingRequests.has(key)) {
      return pendingRequests.get(key);
    }

    const shouldTrackPending = pendingRequests.size < MAX_PENDING_REQUESTS;
    const request = Promise.resolve()
      .then(requestFn)
      .then((data) => {
        apiCache.set(key, data);
        return data;
      })
      .finally(() => {
        pendingRequests.delete(key);
      });

    if (shouldTrackPending) {
      pendingRequests.set(key, request);
    }
    return request;
  },

  clear: (key) => {
    if (key) {
      cache.delete(key);
      pendingRequests.delete(key);
    } else {
      cache.clear();
      pendingRequests.clear();
    }
  }
};
