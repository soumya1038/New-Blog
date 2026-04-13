const rateLimit = require('express-rate-limit');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createCommentLimiter = rateLimit({
  windowMs: toNumber(process.env.COMMENT_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toNumber(process.env.COMMENT_RATE_LIMIT_MAX, 6),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many comments in a short time. Please slow down and try again.'
  }
});

const COMMENT_MAX_LENGTH = toNumber(process.env.COMMENT_MAX_LENGTH, 4000);
const COMMENT_MAX_LINKS = toNumber(process.env.COMMENT_MAX_LINKS, 4);
const DUPLICATE_WINDOW_MS = toNumber(process.env.COMMENT_DUPLICATE_WINDOW_MS, 2 * 60 * 1000);

const duplicateMap = new Map();

const cleanupDuplicateMap = () => {
  if (duplicateMap.size < 1000) return;
  const now = Date.now();
  for (const [key, timestamp] of duplicateMap.entries()) {
    if (now - timestamp > DUPLICATE_WINDOW_MS) {
      duplicateMap.delete(key);
    }
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
  return `${userId}:${contentId}:${compact}`;
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
