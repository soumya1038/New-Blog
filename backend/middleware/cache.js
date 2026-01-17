// Redis cache middleware (requires redis package)
// Install: npm install redis

const redis = require('redis');
let client;

const initRedis = async () => {
  if (process.env.REDIS_URL) {
    try {
      client = redis.createClient({ url: process.env.REDIS_URL });
      await client.connect();
      console.log('✅ Redis connected');
    } catch (error) {
      console.log('⚠️ Redis not available, using memory cache');
    }
  }
};

const cache = (duration = 300) => {
  return async (req, res, next) => {
    if (!client?.isOpen) return next();
    
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await client.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        client.setEx(key, duration, JSON.stringify(data));
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};

const clearCache = (pattern = '*') => {
  if (client?.isOpen) {
    client.keys(`cache:${pattern}`).then(keys => {
      if (keys.length) client.del(keys);
    });
  }
};

module.exports = { initRedis, cache, clearCache };
