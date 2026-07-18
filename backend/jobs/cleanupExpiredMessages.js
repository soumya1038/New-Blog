const cron = require('node-cron');
const Message = require('../models/Message');
const { parsePositiveInt } = require('../utils/cacheStore');
const { deleteCloudinaryPublicIdAcrossResourceTypes } = require('../utils/cloudinaryCleanup');
const { logError, logWarn } = require('../utils/safeErrorLog');

const MESSAGE_RETENTION_DAYS = parsePositiveInt(process.env.MESSAGE_RETENTION_DAYS, 30);
const MESSAGE_CLEANUP_BATCH_LIMIT = parsePositiveInt(
  process.env.MESSAGE_MEDIA_CLEANUP_BATCH_LIMIT,
  100
);
const MESSAGE_CLEANUP_MAX_BATCHES = parsePositiveInt(
  process.env.MESSAGE_CLEANUP_MAX_BATCHES,
  10
);
const MESSAGE_CLEANUP_LOCK_MS = parsePositiveInt(
  process.env.MESSAGE_CLEANUP_LOCK_MS,
  2 * 60 * 60 * 1000
);
const MESSAGE_CLEANUP_QUERY_MAX_TIME_MS = parsePositiveInt(
  process.env.MESSAGE_CLEANUP_QUERY_MAX_TIME_MS,
  10000
);

let cleanupInProgress = false;
let indexMaintenanceDone = false;

const ensureMessageCleanupIndexes = async () => {
  if (indexMaintenanceDone) return;

  const indexes = await Message.collection.indexes();
  const legacyTtlIndexes = indexes.filter((index) => (
    index?.key?.createdAt === 1 && Number.isFinite(index.expireAfterSeconds)
  ));

  for (const index of legacyTtlIndexes) {
    await Message.collection.dropIndex(index.name);
    logWarn(`[message-cleanup] Dropped legacy TTL index ${index.name}; media-aware retention is now active.`);
  }

  await Message.collection.createIndex(
    { createdAt: 1, cleanupStartedAt: 1, _id: 1 },
    { name: 'message_retention_cleanup_idx' }
  );
  indexMaintenanceDone = true;
};

const cleanupClaimedMessage = async (candidate, cutoff, staleLockCutoff) => {
  const claimTime = new Date();
  const claimed = await Message.findOneAndUpdate(
    {
      _id: candidate._id,
      createdAt: { $lte: cutoff },
      $or: [
        { cleanupStartedAt: null },
        { cleanupStartedAt: { $exists: false } },
        { cleanupStartedAt: { $lte: staleLockCutoff } },
      ],
    },
    { $set: { cleanupStartedAt: claimTime } },
    { new: true }
  )
    .select('+cleanupStartedAt cloudinaryPublicId')
    .maxTimeMS(MESSAGE_CLEANUP_QUERY_MAX_TIME_MS);

  if (!claimed) return false;

  try {
    if (claimed.cloudinaryPublicId) {
      await deleteCloudinaryPublicIdAcrossResourceTypes(claimed.cloudinaryPublicId);
    }
    await Message.deleteOne({ _id: claimed._id, cleanupStartedAt: claimTime })
      .maxTimeMS(MESSAGE_CLEANUP_QUERY_MAX_TIME_MS);
    return true;
  } catch (error) {
    await Message.updateOne(
      { _id: claimed._id, cleanupStartedAt: claimTime },
      { $set: { cleanupStartedAt: null } }
    ).maxTimeMS(MESSAGE_CLEANUP_QUERY_MAX_TIME_MS).catch(() => {});
    throw error;
  }
};

const runCleanup = async () => {
  if (cleanupInProgress) {
    logWarn('[message-cleanup] Previous retention cleanup is still active; skipping overlap.');
    return { skipped: true, cleaned: 0, failed: 0 };
  }

  cleanupInProgress = true;
  let cleaned = 0;
  let failed = 0;

  try {
    await ensureMessageCleanupIndexes();
    const cutoff = new Date(Date.now() - MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    for (let batch = 0; batch < MESSAGE_CLEANUP_MAX_BATCHES; batch += 1) {
      const staleLockCutoff = new Date(Date.now() - MESSAGE_CLEANUP_LOCK_MS);
      const candidates = await Message.find({
        createdAt: { $lte: cutoff },
        $or: [
          { cleanupStartedAt: null },
          { cleanupStartedAt: { $exists: false } },
          { cleanupStartedAt: { $lte: staleLockCutoff } },
        ],
      })
        .select('_id')
        .sort({ createdAt: 1, _id: 1 })
        .limit(MESSAGE_CLEANUP_BATCH_LIMIT)
        .maxTimeMS(MESSAGE_CLEANUP_QUERY_MAX_TIME_MS)
        .lean();

      if (!candidates.length) break;

      for (const candidate of candidates) {
        try {
          if (await cleanupClaimedMessage(candidate, cutoff, staleLockCutoff)) cleaned += 1;
        } catch (error) {
          failed += 1;
          logError(`[message-cleanup] Failed for message ${candidate._id}:`, error);
        }
      }

      if (candidates.length < MESSAGE_CLEANUP_BATCH_LIMIT) break;
    }

    return { skipped: false, cleaned, failed };
  } catch (error) {
    logError('[message-cleanup] Retention cleanup failed:', error);
    return { skipped: false, cleaned, failed: failed + 1 };
  } finally {
    cleanupInProgress = false;
  }
};

const cleanupExpiredMessages = () => {
  runCleanup().catch((error) => logError('[message-cleanup] Startup cleanup failed:', error));
  cron.schedule('17 * * * *', () => {
    runCleanup().catch((error) => logError('[message-cleanup] Scheduled cleanup failed:', error));
  });
};

module.exports = cleanupExpiredMessages;
module.exports.runCleanup = runCleanup;
module.exports.ensureMessageCleanupIndexes = ensureMessageCleanupIndexes;
