const User = require('../models/User');
const { parsePositiveInt } = require('../utils/cacheStore');
const { logError } = require('../utils/safeErrorLog');

const TRACK_ACTIVITY_UPDATE_INTERVAL_MS = Math.min(
  parsePositiveInt(process.env.TRACK_ACTIVITY_UPDATE_INTERVAL_SECONDS, 60),
  60 * 60
) * 1000;
const TRACK_ACTIVITY_CACHE_MAX_USERS = Math.min(
  parsePositiveInt(process.env.TRACK_ACTIVITY_CACHE_MAX_USERS, 50000),
  250000
);
const TRACK_ACTIVITY_QUERY_MAX_TIME_MS = Math.max(
  100,
  parsePositiveInt(process.env.TRACK_ACTIVITY_QUERY_MAX_TIME_MS, 5000)
);
const recentActivityUpdates = new Map();

const rememberActivityUpdate = (userId, timestamp) => {
  recentActivityUpdates.set(userId, timestamp);
  while (recentActivityUpdates.size > TRACK_ACTIVITY_CACHE_MAX_USERS) {
    const oldestUserId = recentActivityUpdates.keys().next().value;
    if (!oldestUserId) break;
    recentActivityUpdates.delete(oldestUserId);
  }
};

const trackActivity = async (req, res, next) => {
  if (req.user && req.user._id) {
    try {
      const userId = req.user._id.toString();
      const nowMs = Date.now();
      const lastUpdateMs = recentActivityUpdates.get(userId);
      if (lastUpdateMs && nowMs - lastUpdateMs < TRACK_ACTIVITY_UPDATE_INTERVAL_MS) {
        return next();
      }

      rememberActivityUpdate(userId, nowMs);
      const now = new Date(nowMs);
      const cutoff = new Date(nowMs - TRACK_ACTIVITY_UPDATE_INTERVAL_MS);
      await User.updateOne(
        {
          _id: req.user._id,
          $or: [
            { lastActive: { $lt: cutoff } },
            { lastActive: { $exists: false } }
          ]
        },
        { $set: { lastActive: now } }
      ).maxTimeMS(TRACK_ACTIVITY_QUERY_MAX_TIME_MS);
    } catch (error) {
      logError('Error tracking activity:', error);
    }
  }
  next();
};

module.exports = trackActivity;
