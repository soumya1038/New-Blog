const crypto = require('crypto');
const GuestAnalytics = require('../models/GuestAnalytics');
const { getDedicatedSecret } = require('../utils/secrets');
const { logError } = require('../utils/safeErrorLog');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_SESSION_ID_LENGTH = parsePositiveInt(process.env.GUEST_SESSION_ID_MAX_LENGTH, 128);
const MAX_PATH_LENGTH = parsePositiveInt(process.env.GUEST_PATH_MAX_LENGTH, 300);
const MAX_USER_AGENT_LENGTH = parsePositiveInt(process.env.GUEST_USER_AGENT_MAX_LENGTH, 300);
const MAX_PAGES_PER_SESSION = parsePositiveInt(process.env.GUEST_MAX_PAGES_PER_SESSION, 200);
const MAX_PAGE_DURATION_SECONDS = parsePositiveInt(process.env.GUEST_MAX_PAGE_DURATION_SECONDS, 60 * 60);
const GUEST_TRACKING_QUERY_MAX_TIME_MS = parsePositiveInt(process.env.GUEST_TRACKING_QUERY_MAX_TIME_MS, 5000);
const MAX_IP_LENGTH = 80;

const cleanText = (value, maxLength) =>
  String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);

const cleanSessionId = (value) => {
  const sessionId = cleanText(value, MAX_SESSION_ID_LENGTH);
  return /^[A-Za-z0-9._:-]{8,128}$/.test(sessionId) ? sessionId : '';
};

const cleanIp = (value) => cleanText(value, MAX_IP_LENGTH);

const hashGuestIp = (ipAddress) => {
  const ip = cleanIp(ipAddress);
  if (!ip) return '';

  const secret = String(process.env.CONTENT_VIEW_HASH_SECRET || '').trim()
    ? getDedicatedSecret({ key: 'CONTENT_VIEW_HASH_SECRET' })
    : getDedicatedSecret({ key: 'API_KEY_HASH_SECRET' });

  return `hmac-sha256:v1:${crypto
    .createHmac('sha256', secret)
    .update(ip)
    .digest('hex')}`;
};

const parsePageDuration = (pageStart) => {
  if (!pageStart) return 0;
  const startedAt = new Date(pageStart).getTime();
  if (!Number.isFinite(startedAt)) return 0;

  const duration = Math.floor((Date.now() - startedAt) / 1000);
  if (duration <= 0) return 0;
  return Math.min(duration, MAX_PAGE_DURATION_SECONDS);
};

const trackGuestActivity = async (req, res, next) => {
  try {
    // Skip tracking for authenticated users
    if (req.user) {
      return next();
    }

    const body = req.body || {};
    const { pageStart } = body;
    const sessionId = cleanSessionId(body.sessionId);
    const ipHash = hashGuestIp(req.ip || req.connection.remoteAddress);
    const userAgent = cleanText(req.get('User-Agent'), MAX_USER_AGENT_LENGTH);
    const currentPath = cleanText(body.path || req.path, MAX_PATH_LENGTH) || '/';

    if (sessionId) {
      const now = new Date();
      const duration = parsePageDuration(pageStart);
      const pageEntry = { path: currentPath, timestamp: now };
      if (duration > 0) pageEntry.duration = duration;

      // Use findOneAndUpdate with upsert to avoid version conflicts
      const updateData = {
        $push: {
          pages: {
            $each: [pageEntry],
            $slice: -MAX_PAGES_PER_SESSION
          }
        },
        $inc: { pageViews: 1 },
        $set: { sessionEnd: now },
        $setOnInsert: {
          sessionStart: now,
          ipHash,
          userAgent
        }
      };

      if (duration > 0) {
        updateData.$inc.totalDuration = duration;
      }

      await GuestAnalytics.findOneAndUpdate(
        ipHash ? { sessionId, ipHash } : { sessionId },
        updateData,
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true,
          runValidators: false
        }
      ).maxTimeMS(GUEST_TRACKING_QUERY_MAX_TIME_MS);
    }
  } catch (error) {
    // Silently fail to not block requests
    logError('Guest tracking error:', error);
  }
  
  next();
};

module.exports = { trackGuestActivity };
