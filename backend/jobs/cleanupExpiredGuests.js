const cron = require('node-cron');
const User = require('../models/User');
const { cleanupUserAccountData } = require('../utils/accountCleanup');
const { logError, logWarn } = require('../utils/safeErrorLog');

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const GUEST_CLEANUP_BATCH_LIMIT = toPositiveInt(process.env.GUEST_CLEANUP_BATCH_LIMIT, 100);
const GUEST_CLEANUP_CONCURRENCY = Math.min(
  GUEST_CLEANUP_BATCH_LIMIT,
  toPositiveInt(process.env.GUEST_CLEANUP_CONCURRENCY, 2)
);
const GUEST_CLEANUP_LOCK_MS = toPositiveInt(process.env.GUEST_CLEANUP_LOCK_MS, 2 * 60 * 60 * 1000);
const ACCOUNT_CLEANUP_QUERY_MAX_TIME_MS = toPositiveInt(process.env.ACCOUNT_CLEANUP_QUERY_MAX_TIME_MS, 10000);
let cleanupInProgress = false;
let indexMaintenanceDone = false;

const runWithConcurrency = async (items, concurrency, handler) => {
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < items.length; index += concurrency) {
      await handler(items[index], index);
    }
  });

  await Promise.all(workers);
};

const isLegacyGuestTtlIndex = (index = {}) => {
  const keys = Object.keys(index.key || {});
  return index.expireAfterSeconds !== undefined
    && keys.length === 1
    && index.key.guestExpiresAt === 1;
};

const ensureGuestCleanupIndexes = async () => {
  if (indexMaintenanceDone) return;

  try {
    const indexes = await User.collection.indexes();
    const legacyTtlIndexes = indexes.filter(isLegacyGuestTtlIndex);
    for (const index of legacyTtlIndexes) {
      await User.collection.dropIndex(index.name);
      logWarn(`[guest-cleanup] Dropped legacy guest TTL index ${index.name}; cleanup job now deletes guests after related data cleanup.`);
    }

    await User.collection.createIndex(
      { isGuest: 1, guestExpiresAt: 1, guestCleanupStartedAt: 1 },
      {
        name: 'guest_cleanup_due_idx',
        partialFilterExpression: { isGuest: true, guestExpiresAt: { $exists: true } }
      }
    );
    indexMaintenanceDone = true;
  } catch (error) {
    logError('[guest-cleanup] Failed to verify guest cleanup indexes:', error);
  }
};

const claimExpiredGuest = (guestId, now) => {
  const staleLockCutoff = new Date(now.getTime() - GUEST_CLEANUP_LOCK_MS);
  return User.findOneAndUpdate(
    {
      _id: guestId,
      isGuest: true,
      guestExpiresAt: { $lte: now },
      $or: [
        { guestCleanupStartedAt: null },
        { guestCleanupStartedAt: { $exists: false } },
        { guestCleanupStartedAt: { $lte: staleLockCutoff } }
      ]
    },
    { $set: { guestCleanupStartedAt: now } },
    { new: true }
  )
    .select('_id profileImage statuses')
    .maxTimeMS(ACCOUNT_CLEANUP_QUERY_MAX_TIME_MS);
};

const cleanupExpiredGuests = () => {
  const runCleanup = async () => {
    if (cleanupInProgress) {
      console.warn('[guest-cleanup] Previous expired guest cleanup still active; skipping this run.');
      return;
    }

    cleanupInProgress = true;
    try {
      console.log('[guest-cleanup] Running expired guest cleanup.');
      await ensureGuestCleanupIndexes();

      const now = new Date();
      const expiredGuests = await User.find({
        isGuest: true,
        guestExpiresAt: { $lte: now },
        $or: [
          { guestCleanupStartedAt: null },
          { guestCleanupStartedAt: { $exists: false } },
          { guestCleanupStartedAt: { $lte: new Date(now.getTime() - GUEST_CLEANUP_LOCK_MS) } }
        ]
      })
        .select('_id')
        .sort({ guestExpiresAt: 1, _id: 1 })
        .limit(GUEST_CLEANUP_BATCH_LIMIT)
        .maxTimeMS(ACCOUNT_CLEANUP_QUERY_MAX_TIME_MS)
        .lean();

      if (expiredGuests.length === 0) {
        console.log('[guest-cleanup] No expired guest users found.');
        return;
      }

      let cleanedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      await runWithConcurrency(
        expiredGuests,
        GUEST_CLEANUP_CONCURRENCY,
        async (guest) => {
          const claimedGuest = await claimExpiredGuest(guest._id, now);
          if (!claimedGuest) {
            skippedCount += 1;
            return;
          }

          try {
            await cleanupUserAccountData(claimedGuest, { deleteUser: true });
            cleanedCount += 1;
          } catch (error) {
            failedCount += 1;
            await User.updateOne(
              { _id: guest._id, guestCleanupStartedAt: now },
              { $set: { guestCleanupStartedAt: null } }
            ).maxTimeMS(ACCOUNT_CLEANUP_QUERY_MAX_TIME_MS).catch((resetError) => {
              logError(`[guest-cleanup] Failed to release cleanup claim for ${guest._id}:`, resetError);
            });
            logError(`[guest-cleanup] Failed to clean expired guest ${guest._id}:`, error);
          }
        }
      );

      console.log(`[guest-cleanup] Finished expired guest cleanup: cleaned=${cleanedCount} skipped=${skippedCount} failed=${failedCount}.`);
    } catch (error) {
      logError('[guest-cleanup] Cleanup error:', error);
    } finally {
      cleanupInProgress = false;
    }
  };

  runCleanup();
  cron.schedule('0 * * * *', runCleanup);

  console.log('[guest-cleanup] Cron job scheduled hourly.');
};

module.exports = cleanupExpiredGuests;
