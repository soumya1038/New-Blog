const User = require('../models/User');
const cloudinary = require('./cloudinary');
const { parsePositiveInt } = require('./cacheStore');
const { logError, logWarn } = require('./safeErrorLog');

const STATUS_CLEANUP_USER_BATCH_LIMIT = parsePositiveInt(process.env.STATUS_CLEANUP_USER_BATCH_LIMIT, 100);
const STATUS_CLEANUP_LOCK_MS = parsePositiveInt(process.env.STATUS_CLEANUP_LOCK_MS, 30 * 60 * 1000);
const STATUS_CLEANUP_QUERY_MAX_TIME_MS = parsePositiveInt(process.env.STATUS_CLEANUP_QUERY_MAX_TIME_MS, 5000);

let cleanupInProgress = false;

const extractCloudinaryPublicId = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = pathParts.findIndex((part) => part === 'upload');
    if (uploadIndex < 0) return '';

    let publicIdParts = pathParts.slice(uploadIndex + 1);
    if (publicIdParts[0] && /^v\d+$/.test(publicIdParts[0])) {
      publicIdParts = publicIdParts.slice(1);
    }

    const fullPath = publicIdParts.join('/');
    return fullPath.replace(/\.[^/.]+$/, '');
  } catch (error) {
    return '';
  }
};

const resolveStatusPublicId = (status) => {
  if (status?.mediaPublicId) return status.mediaPublicId;
  return extractCloudinaryPublicId(status?.video || status?.image || '');
};

const destroyExpiredStatusMedia = async (status) => {
  const publicId = resolveStatusPublicId(status);
  if (!publicId) return;

  const options = {
    resource_type: status?.mediaResourceType || (
      status?.mediaType === 'video' || Boolean(status?.video) ? 'video' : 'image'
    ),
    ...(status?.mediaDeliveryType ? { type: status.mediaDeliveryType } : {}),
    invalidate: true,
  };

  await cloudinary.uploader.destroy(publicId, options);
};

const claimExpiredStatusUser = (userId, now, staleLockCutoff, claimTime) =>
  User.findOneAndUpdate(
    {
      _id: userId,
      'statuses.expiresAt': { $lt: now },
      $or: [
        { statusCleanupStartedAt: null },
        { statusCleanupStartedAt: { $exists: false } },
        { statusCleanupStartedAt: { $lte: staleLockCutoff } },
      ],
    },
    { $set: { statusCleanupStartedAt: claimTime } },
    { new: true }
  )
    .select('+statusCleanupStartedAt statuses')
    .maxTimeMS(STATUS_CLEANUP_QUERY_MAX_TIME_MS);

const cleanupExpiredStatuses = async () => {
  if (cleanupInProgress) {
    console.warn('Previous status cleanup still active; skipping this run.');
    return;
  }

  cleanupInProgress = true;

  try {
    const now = new Date();
    const staleLockCutoff = new Date(now.getTime() - STATUS_CLEANUP_LOCK_MS);
    const users = await User.find({
      'statuses.expiresAt': { $lt: now },
      $or: [
        { statusCleanupStartedAt: null },
        { statusCleanupStartedAt: { $exists: false } },
        { statusCleanupStartedAt: { $lte: staleLockCutoff } },
      ],
    })
      .select('_id')
      .sort({ _id: 1 })
      .limit(STATUS_CLEANUP_USER_BATCH_LIMIT)
      .maxTimeMS(STATUS_CLEANUP_QUERY_MAX_TIME_MS)
      .lean();

    let totalCleaned = 0;
    let totalFailed = 0;

    for (const candidate of users) {
      const claimTime = new Date();
      const user = await claimExpiredStatusUser(candidate._id, now, staleLockCutoff, claimTime);
      if (!user) continue;

      const expiredStatuses = user.statuses.filter((status) => now >= new Date(status.expiresAt));
      const cleanedStatusIds = [];

      for (const status of expiredStatuses) {
        try {
          await destroyExpiredStatusMedia(status);
          cleanedStatusIds.push(status._id);
          totalCleaned += 1;
        } catch (error) {
          totalFailed += 1;
          logWarn(`Expired status media cleanup failed for ${status._id}:`, error);
        }
      }

      await User.updateOne(
        { _id: user._id, statusCleanupStartedAt: claimTime },
        {
          ...(cleanedStatusIds.length
            ? { $pull: { statuses: { _id: { $in: cleanedStatusIds } } } }
            : {}),
          $set: { statusCleanupStartedAt: null },
        }
      ).maxTimeMS(STATUS_CLEANUP_QUERY_MAX_TIME_MS);
    }

    if (totalCleaned > 0) {
      console.log(`Cleaned up ${totalCleaned} expired statuses`);
    }
    if (totalFailed > 0) {
      logWarn(`Deferred ${totalFailed} expired statuses because media cleanup failed.`);
    }
  } catch (error) {
    logError('Status cleanup error:', error);
  } finally {
    cleanupInProgress = false;
  }
};

module.exports = cleanupExpiredStatuses;
