const {
  createRedisBackedRateLimiter,
  getUserOrIpRateLimitKey,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');

const contentViewLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.CONTENT_VIEW_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.CONTENT_VIEW_RATE_LIMIT_MAX, 120),
  prefix: 'content-view',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many view requests. Please wait a moment and try again.',
});

module.exports = contentViewLimiter;
