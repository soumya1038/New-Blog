const {
  createRedisBackedRateLimiter,
  getUserOrIpRateLimitKey,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');

const chatFileUploadLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.CHAT_FILE_UPLOAD_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.CHAT_FILE_UPLOAD_RATE_LIMIT_MAX, 10),
  prefix: 'chat-file-upload',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many file uploads. Please wait a moment and try again.',
});

const digitalFileUploadLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.DIGITAL_FILE_UPLOAD_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
  max: toPositiveInt(process.env.DIGITAL_FILE_UPLOAD_RATE_LIMIT_MAX, 5),
  prefix: 'digital-file-upload',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many digital product file uploads. Please wait before trying again.',
});

const mediaUploadLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.MEDIA_UPLOAD_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.MEDIA_UPLOAD_RATE_LIMIT_MAX, 10),
  prefix: 'media-upload',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many media uploads. Please wait a moment and try again.',
});

const messageMediaAccessLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.MESSAGE_MEDIA_ACCESS_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.MESSAGE_MEDIA_ACCESS_RATE_LIMIT_MAX, 120),
  prefix: 'message-media-access',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many media access requests. Please wait a moment and try again.',
});

const statusMediaAccessLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.STATUS_MEDIA_ACCESS_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.STATUS_MEDIA_ACCESS_RATE_LIMIT_MAX, 120),
  prefix: 'status-media-access',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many status media requests. Please wait a moment and try again.',
});

module.exports = {
  chatFileUploadLimiter,
  digitalFileUploadLimiter,
  mediaUploadLimiter,
  messageMediaAccessLimiter,
  statusMediaAccessLimiter,
};
