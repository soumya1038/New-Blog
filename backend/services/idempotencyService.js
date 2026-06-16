const IdempotencyKey = require('../models/IdempotencyKey');

const DEFAULT_LOCK_MS = 10 * 60 * 1000;

const isDuplicateKeyError = (error) => {
  return error?.code === 11000 || error?.code === 11001;
};

const errorToMessage = (error) => {
  if (!error) return 'Unknown error';
  return error.message || String(error);
};

const runOnce = async ({
  key,
  scope,
  resourceType = '',
  resourceId = '',
  lockMs = DEFAULT_LOCK_MS,
  handler
}) => {
  if (!key) throw new Error('Idempotency key is required.');
  if (!scope) throw new Error('Idempotency scope is required.');
  if (typeof handler !== 'function') throw new Error('Idempotency handler is required.');

  const now = new Date();
  const lockedUntil = new Date(now.getTime() + lockMs);
  let marker = null;

  try {
    marker = await IdempotencyKey.create({
      key,
      scope,
      resourceType,
      resourceId,
      status: 'processing',
      lockedUntil
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const existing = await IdempotencyKey.findOne({ key });
    if (existing?.status === 'completed') {
      return {
        skipped: true,
        alreadyCompleted: true,
        response: existing.response,
        record: existing
      };
    }

    const lockExpired = !existing?.lockedUntil || existing.lockedUntil <= now;
    if (existing?.status === 'processing' && !lockExpired) {
      return {
        skipped: true,
        inProgress: true,
        record: existing
      };
    }

    marker = await IdempotencyKey.findOneAndUpdate(
      {
        key,
        $or: [
          { status: 'failed' },
          { lockedUntil: null },
          { lockedUntil: { $lte: now } }
        ]
      },
      {
        $set: {
          scope,
          resourceType,
          resourceId,
          status: 'processing',
          lockedUntil,
          error: ''
        },
        $unset: { failedAt: '' }
      },
      { new: true }
    );

    if (!marker) {
      return {
        skipped: true,
        inProgress: true,
        record: await IdempotencyKey.findOne({ key })
      };
    }
  }

  try {
    const response = await handler(marker);
    const completedRecord = await IdempotencyKey.findByIdAndUpdate(
      marker._id,
      {
        $set: {
          status: 'completed',
          response: response || {},
          completedAt: new Date(),
          lockedUntil: null,
          error: ''
        }
      },
      { new: true }
    );

    return {
      skipped: false,
      completed: true,
      response,
      record: completedRecord
    };
  } catch (error) {
    await IdempotencyKey.findByIdAndUpdate(marker._id, {
      $set: {
        status: 'failed',
        error: errorToMessage(error),
        failedAt: new Date(),
        lockedUntil: null
      }
    });
    throw error;
  }
};

module.exports = {
  runOnce
};
