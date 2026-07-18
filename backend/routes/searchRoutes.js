const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { searchContent } = require('../controllers/searchController');
const {
  createRedisBackedRateLimiter,
  getUserOrIpRateLimitKey,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');

const router = express.Router();

const searchLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.SEARCH_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.SEARCH_RATE_LIMIT_MAX, 60),
  prefix: 'search',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many searches. Please wait a moment and try again.',
});

router.get('/', optionalAuth, searchLimiter, searchContent);

module.exports = router;
