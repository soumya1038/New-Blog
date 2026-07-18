const express = require('express');
const {
  generateBlog,
  generateBio,
  improveContent,
  generateTitles,
  generateTags,
  generateProductListing,
  generateDescription,
  generateQuickChat,
  enhanceMessage,
  summarizeBlog
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const {
  createRedisBackedRateLimiter,
  getUserOrIpRateLimitKey,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');

const router = express.Router();

const aiRequestLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.AI_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInt(process.env.AI_RATE_LIMIT_MAX, 30),
  prefix: 'ai',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many AI requests. Please wait a bit before using AI tools again.',
  responseBuilder: ({ retryAfterSeconds }) => ({
    success: false,
    message: 'Too many AI requests. Please wait a bit before using AI tools again.',
    retryAfterSeconds,
  }),
});

router.post('/generate-blog', protect, aiRequestLimiter, generateBlog);
router.post('/generate-bio', protect, aiRequestLimiter, generateBio);
router.post('/generate-description', protect, aiRequestLimiter, generateDescription);
router.post('/improve-content', protect, aiRequestLimiter, improveContent);
router.post('/generate-titles', protect, aiRequestLimiter, generateTitles);
router.post('/generate-tags', protect, aiRequestLimiter, generateTags);
router.post('/product-listing', protect, aiRequestLimiter, generateProductListing);
router.post('/quick-chat', protect, aiRequestLimiter, generateQuickChat);
router.post('/enhance-message', protect, aiRequestLimiter, enhanceMessage);
router.post('/summarize', protect, aiRequestLimiter, summarizeBlog);

module.exports = router;
