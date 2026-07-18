const crypto = require('crypto');
const {
  createRedisBackedRateLimiter,
  getUserOrIpRateLimitKey,
} = require('../utils/rateLimiterFactory');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createCommentLimiter = createRedisBackedRateLimiter({
  windowMs: toNumber(process.env.COMMENT_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toNumber(process.env.COMMENT_RATE_LIMIT_MAX, 6),
  prefix: 'comment-create',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many comments in a short time. Please slow down and try again.',
  responseBuilder: ({ retryAfterSeconds }) => ({
    success: false,
    message: 'Too many comments in a short time. Please slow down and try again.',
    retryAfterSeconds,
  }),
});

const COMMENT_MAX_LENGTH = toNumber(process.env.COMMENT_MAX_LENGTH, 4000);
const COMMENT_MAX_LINKS = toNumber(process.env.COMMENT_MAX_LINKS, 4);
const DUPLICATE_WINDOW_MS = toNumber(process.env.COMMENT_DUPLICATE_WINDOW_MS, 2 * 60 * 1000);
const DUPLICATE_CACHE_MAX_ENTRIES = toNumber(process.env.COMMENT_DUPLICATE_CACHE_MAX_ENTRIES, 5000);

const duplicateMap = new Map();

const cleanupDuplicateMap = () => {
  const now = Date.now();
  for (const [key, timestamp] of duplicateMap.entries()) {
    if (now - timestamp > DUPLICATE_WINDOW_MS) {
      duplicateMap.delete(key);
    }
  }
  while (duplicateMap.size > DUPLICATE_CACHE_MAX_ENTRIES) {
    const oldestKey = duplicateMap.keys().next().value;
    if (!oldestKey) break;
    duplicateMap.delete(oldestKey);
  }
};

const countLinks = (value) => {
  const matches = value.match(/(?:https?:\/\/|www\.)[^\s]+/gi);
  return matches ? matches.length : 0;
};

const normalizedDuplicateKey = (userId, contentId, content) => {
  const compact = content
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, 'url')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const contentHash = crypto.createHash('sha256').update(compact).digest('hex').slice(0, 32);
  return `${userId}:${contentId}:${contentHash}`;
};

const looksLikeSpam = (value) => {
  const repeatedChars = /([a-z0-9!?.])\1{11,}/i.test(value);
  const suspiciousKeywords = [
    'viagra',
    'porn',
    'casino',
    'crypto giveaway',
    'loan approval',
    'earn money fast'
  ];
  const normalized = value.toLowerCase();
  const hasSuspiciousKeyword = suspiciousKeywords.some((keyword) => normalized.includes(keyword));

  return repeatedChars || hasSuspiciousKeyword;
};

const commentSpamGuard = (req, res, next) => {
  const rawContent = typeof req.body.content === 'string' ? req.body.content : '';
  const content = rawContent.trim().replace(/\s{3,}/g, '  ');
  const contentId = `${req.params.blogId || ''}:${req.query.isArticle || 'false'}:${req.query.isShort || 'false'}`;
  const userId = req.user?._id?.toString() || 'anonymous';

  if (!content) {
    return res.status(400).json({ success: false, message: 'Comment content required' });
  }

  if (content.length > COMMENT_MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Comment is too long. Please keep it under ${COMMENT_MAX_LENGTH} characters.`
    });
  }

  const linkCount = countLinks(content);
  if (linkCount > COMMENT_MAX_LINKS) {
    return res.status(400).json({
      success: false,
      message: 'Too many links in one comment. Please remove extra links and try again.'
    });
  }

  if (looksLikeSpam(content)) {
    return res.status(400).json({
      success: false,
      message: 'Your comment looks like spam. Please edit it and try again.'
    });
  }

  const duplicateKey = normalizedDuplicateKey(userId, contentId, content);
  const now = Date.now();
  const lastTimestamp = duplicateMap.get(duplicateKey);

  if (lastTimestamp && now - lastTimestamp < DUPLICATE_WINDOW_MS) {
    return res.status(429).json({
      success: false,
      message: 'Duplicate comment detected. Please wait before posting the same comment again.'
    });
  }

  duplicateMap.set(duplicateKey, now);
  cleanupDuplicateMap();

  req.body.content = content;
  next();
};

module.exports = {
  createCommentLimiter,
  commentSpamGuard
};
