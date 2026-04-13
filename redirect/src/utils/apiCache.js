const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const apiCache = {
  get: (key) => {
    const cached = cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      cache.delete(key);
      return null;
    }
    
    return cached.data;
  },
  
  set: (key, data) => {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },
  
  clear: (key) => {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  }
};
