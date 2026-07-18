const rateLimit = require('express-rate-limit');
const { createRedisRateLimitStore } = require('./redisRateLimitStore');

const { ipKeyGenerator } = rateLimit;

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getIpRateLimitKey = (req) => `ip:${ipKeyGenerator(req.ip || '')}`;

const getUserOrIpRateLimitKey = (req) =>
  req.user?._id ? `user:${req.user._id}` : getIpRateLimitKey(req);

const getRetryAfterSeconds = (req, fallbackMs) => {
  const resetTime = req.rateLimit?.resetTime;
  const resetMs = resetTime instanceof Date ? resetTime.getTime() : Number(resetTime);
  const resetSeconds = Number.isFinite(resetMs) ? Math.ceil((resetMs - Date.now()) / 1000) : 0;
  return Math.max(1, resetSeconds || Math.ceil(fallbackMs / 1000));
};

const createRedisBackedRateLimiter = ({
  windowMs,
  max,
  prefix,
  message,
  keyGenerator = getIpRateLimitKey,
  responseBuilder,
}) => {
  const store = createRedisRateLimitStore({ prefix, windowMs });
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    passOnStoreError:
      Boolean(store) &&
      process.env.NODE_ENV !== 'production' &&
      process.env.RATE_LIMIT_FAIL_OPEN === 'true',
    handler: (req, res) => {
      const retryAfterSeconds = getRetryAfterSeconds(req, windowMs);
      res.set('Retry-After', String(retryAfterSeconds));
      const fallbackBody = {
        success: false,
        message,
        retryAfterSeconds,
      };
      return res.status(429).json(
        responseBuilder ? responseBuilder({ retryAfterSeconds, req }) : fallbackBody
      );
    },
    ...(store ? { store } : {}),
  });
};

module.exports = {
  createRedisBackedRateLimiter,
  getIpRateLimitKey,
  getUserOrIpRateLimitKey,
  toPositiveInt,
};
