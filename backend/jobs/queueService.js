const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { parsePositiveInt } = require('../utils/cacheStore');
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmation,
  sendAccountDeletionConfirmation,
  sendPasswordChangedSuccess,
  sendAccountDeletedSuccess,
  sendNewFollowerEmail,
  sendNewMessageEmail,
  sendMissedCallEmail,
  sendContentPublishedEmail,
  sendNewCommentEmail,
  sendNewReactionEmail,
  sendAccountWarningEmail,
  sendAccountSuspensionEmail,
  sendPreDeletionWarningEmail
} = require('../utils/mailService');
const { ensureSearchIndexes } = require('../utils/searchIndexBootstrap');

const EMAIL_QUEUE_NAME = 'email-jobs';
const EMAIL_DLQ_NAME = 'email-jobs-dead-letter';
const INDEXING_QUEUE_NAME = 'indexing-jobs';
const MARKETPLACE_QUEUE_NAME = 'marketplace-jobs';
const MARKETPLACE_DLQ_NAME = 'marketplace-jobs-dead-letter';

const EMAIL_JOB_ATTEMPTS = parsePositiveInt(process.env.QUEUE_JOB_ATTEMPTS, 3);
const EMAIL_JOB_BACKOFF_MS = parsePositiveInt(process.env.QUEUE_JOB_BACKOFF_MS, 5000);
const EMAIL_QUEUE_CONCURRENCY = parsePositiveInt(process.env.QUEUE_CONCURRENCY_EMAIL, 4);
const INDEXING_QUEUE_CONCURRENCY = parsePositiveInt(process.env.QUEUE_CONCURRENCY_INDEXING, 1);
const MARKETPLACE_JOB_ATTEMPTS = parsePositiveInt(process.env.QUEUE_MARKETPLACE_JOB_ATTEMPTS, 5);
const MARKETPLACE_JOB_BACKOFF_MS = parsePositiveInt(process.env.QUEUE_MARKETPLACE_JOB_BACKOFF_MS, 10000);
const MARKETPLACE_QUEUE_CONCURRENCY = parsePositiveInt(process.env.QUEUE_CONCURRENCY_MARKETPLACE, 2);
const FALLBACK_JOB_DEDUPE_TTL_MS = parsePositiveInt(process.env.QUEUE_FALLBACK_JOB_DEDUPE_TTL_MS, 10 * 60 * 1000);

let initialized = false;
let queueEnabled = false;
let workersStarted = false;

let connection = null;
let emailQueue = null;
let emailDeadLetterQueue = null;
let indexingQueue = null;
let marketplaceQueue = null;
let marketplaceDeadLetterQueue = null;
let emailWorker = null;
let indexingWorker = null;
let marketplaceWorker = null;
const fallbackJobDedupeMap = new Map();

const isQueueFeatureEnabled = () => process.env.QUEUE_ENABLED !== 'false';

const createDefaultJobOptions = () => ({
  attempts: EMAIL_JOB_ATTEMPTS,
  backoff: {
    type: 'exponential',
    delay: EMAIL_JOB_BACKOFF_MS
  },
  removeOnComplete: {
    age: 60 * 60, // 1 hour
    count: 2000
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 3, // 3 days
    count: 5000
  }
});

const createMarketplaceJobOptions = () => ({
  attempts: MARKETPLACE_JOB_ATTEMPTS,
  backoff: {
    type: 'exponential',
    delay: MARKETPLACE_JOB_BACKOFF_MS
  },
  removeOnComplete: {
    age: 60 * 60 * 24 * 7,
    count: 10000
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 14,
    count: 10000
  }
});

const createBullConnection = () => {
  return new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });
};

const pruneFallbackDedupeMap = () => {
  const now = Date.now();
  for (const [key, expiresAt] of fallbackJobDedupeMap.entries()) {
    if (expiresAt <= now) {
      fallbackJobDedupeMap.delete(key);
    }
  }
};

const shouldSkipFallbackJob = (jobId) => {
  if (!jobId) return false;
  pruneFallbackDedupeMap();
  const expiresAt = fallbackJobDedupeMap.get(jobId);
  if (expiresAt && expiresAt > Date.now()) {
    return true;
  }
  fallbackJobDedupeMap.set(jobId, Date.now() + FALLBACK_JOB_DEDUPE_TTL_MS);
  return false;
};

const handleEmailJob = async (jobName, payload = {}) => {
  const {
    email,
    username,
    code,
    expiresAt,
    changedAt,
    temporaryPassword,
    followerName,
    followerProfileUrl,
    senderName,
    messagePreview,
    chatUrl,
    callerName,
    callType,
    callTime,
    contentType,
    postTitle,
    postUrl,
    commenterName,
    commentText,
    reactorName,
    reactionCount,
    violationReason,
    warningDate,
    suspensionReason,
    suspensionDuration,
    reviewDate,
    daysRemaining,
    deletionDate
  } = payload;

  switch (jobName) {
    case 'verification-code':
      return sendVerificationEmail(email, username || 'User', code, expiresAt);
    case 'welcome-email':
      return sendWelcomeEmail(email, username || 'User', {
        temporaryPassword: temporaryPassword || ''
      });
    case 'password-reset-code':
      return sendPasswordResetEmail(email, username || 'User', code, expiresAt);
    case 'password-change-confirmation':
      return sendPasswordChangeConfirmation(email, username || 'User', code, expiresAt);
    case 'account-deletion-confirmation':
      return sendAccountDeletionConfirmation(email, username || 'User', code, expiresAt);
    case 'password-changed-success':
      return sendPasswordChangedSuccess(email, username || 'User', changedAt);
    case 'account-deleted-success':
      return sendAccountDeletedSuccess(email, username || 'User');
    case 'new-follower':
      return sendNewFollowerEmail(email, username || 'User', {
        followerName,
        followerProfileUrl
      });
    case 'new-message':
      return sendNewMessageEmail(email, username || 'User', {
        senderName,
        messagePreview,
        chatUrl
      });
    case 'missed-call':
      return sendMissedCallEmail(email, username || 'User', {
        callerName,
        callType,
        callTime
      });
    case 'content-published':
      return sendContentPublishedEmail(email, username || 'User', {
        contentType,
        postTitle,
        postUrl
      });
    case 'new-comment':
      return sendNewCommentEmail(email, username || 'User', {
        commenterName,
        postTitle,
        commentText,
        postUrl
      });
    case 'new-reaction':
      return sendNewReactionEmail(email, username || 'User', {
        reactorName,
        reactionCount,
        postTitle,
        postUrl
      });
    case 'account-warning':
      return sendAccountWarningEmail(email, username || 'User', {
        violationReason,
        warningDate
      });
    case 'account-suspension':
      return sendAccountSuspensionEmail(email, username || 'User', {
        suspensionReason,
        suspensionDuration,
        reviewDate
      });
    case 'pre-deletion-warning':
      return sendPreDeletionWarningEmail(email, username || 'User', {
        daysRemaining,
        deletionDate
      });
    default:
      throw new Error(`Unsupported email job type: ${jobName}`);
  }
};

const handleIndexingJob = async (jobName) => {
  if (jobName === 'refresh-search-indexes') {
    await ensureSearchIndexes();
    return;
  }
  throw new Error(`Unsupported indexing job type: ${jobName}`);
};

const handleMarketplaceJob = async (jobName, payload = {}) => {
  switch (jobName) {
    case 'fulfill-order': {
      const { fulfillOrderById } = require('../services/marketplaceFulfillmentService');
      return fulfillOrderById(payload.orderId);
    }
    case 'prepare-shipments': {
      const { prepareShipmentsForOrder } = require('../services/shipmentWorkflowService');
      return prepareShipmentsForOrder(payload.orderId);
    }
    default:
      throw new Error(`Unsupported marketplace job type: ${jobName}`);
  }
};

const runFallbackEmailJob = (jobName, payload, options = {}) => {
  if (shouldSkipFallbackJob(options.jobId)) {
    return false;
  }

  setImmediate(async () => {
    try {
      await handleEmailJob(jobName, payload);
    } catch (error) {
      console.error(`[queue:fallback] Email job failed (${jobName}):`, error?.message || error);
    }
  });
  return true;
};

const runFallbackIndexingJob = () => {
  setImmediate(async () => {
    try {
      await ensureSearchIndexes();
    } catch (error) {
      console.error('[queue:fallback] Indexing job failed:', error?.message || error);
    }
  });
};

const runFallbackMarketplaceJob = (jobName, payload, options = {}) => {
  if (shouldSkipFallbackJob(options.jobId)) {
    return false;
  }

  setImmediate(async () => {
    try {
      await handleMarketplaceJob(jobName, payload);
    } catch (error) {
      console.error(`[queue:fallback] Marketplace job failed (${jobName}):`, error?.message || error);
    }
  });
  return true;
};

const startBackgroundWorkers = async () => {
  if (!queueEnabled || workersStarted) return;

  emailWorker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job) => {
      await handleEmailJob(job.name, job.data);
    },
    {
      connection,
      concurrency: EMAIL_QUEUE_CONCURRENCY
    }
  );

  indexingWorker = new Worker(
    INDEXING_QUEUE_NAME,
    async (job) => {
      await handleIndexingJob(job.name, job.data);
    },
    {
      connection,
      concurrency: INDEXING_QUEUE_CONCURRENCY
    }
  );

  marketplaceWorker = new Worker(
    MARKETPLACE_QUEUE_NAME,
    async (job) => {
      await handleMarketplaceJob(job.name, job.data);
    },
    {
      connection,
      concurrency: MARKETPLACE_QUEUE_CONCURRENCY
    }
  );

  emailWorker.on('completed', (job) => {
    console.log(`[queue] Email job completed: ${job.name} (${job.id})`);
  });

  emailWorker.on('failed', async (job, error) => {
    console.error(`[queue] Email job failed: ${job?.name} (${job?.id})`, error?.message || error);
    const attempts = job?.opts?.attempts || EMAIL_JOB_ATTEMPTS;
    if (job && job.attemptsMade >= attempts && emailDeadLetterQueue) {
      try {
        await emailDeadLetterQueue.add(
          'email-failed',
          {
            sourceJobId: job.id,
            sourceJobName: job.name,
            data: job.data,
            failedReason: error?.message || String(error || 'Unknown error'),
            failedAt: new Date().toISOString(),
            attemptsMade: job.attemptsMade
          },
          {
            removeOnComplete: true,
            removeOnFail: true
          }
        );
      } catch (dlqError) {
        console.error('[queue] Failed to enqueue dead-letter email job:', dlqError?.message || dlqError);
      }
    }
  });

  indexingWorker.on('failed', (job, error) => {
    console.error(`[queue] Indexing job failed: ${job?.name} (${job?.id})`, error?.message || error);
  });

  marketplaceWorker.on('completed', (job) => {
    console.log(`[queue] Marketplace job completed: ${job.name} (${job.id})`);
  });

  marketplaceWorker.on('failed', async (job, error) => {
    console.error(`[queue] Marketplace job failed: ${job?.name} (${job?.id})`, error?.message || error);
    const attempts = job?.opts?.attempts || MARKETPLACE_JOB_ATTEMPTS;
    if (job && job.attemptsMade >= attempts && marketplaceDeadLetterQueue) {
      try {
        await marketplaceDeadLetterQueue.add(
          'marketplace-failed',
          {
            sourceJobId: job.id,
            sourceJobName: job.name,
            data: job.data,
            failedReason: error?.message || String(error || 'Unknown error'),
            failedAt: new Date().toISOString(),
            attemptsMade: job.attemptsMade
          },
          {
            removeOnComplete: true,
            removeOnFail: true
          }
        );
      } catch (dlqError) {
        console.error('[queue] Failed to enqueue dead-letter marketplace job:', dlqError?.message || dlqError);
      }
    }
  });

  workersStarted = true;
  console.log('[queue] Background workers started.');
};

const initializeBackgroundQueues = async ({ startWorkers = process.env.QUEUE_START_WORKERS_IN_API !== 'false' } = {}) => {
  if (initialized) {
    if (startWorkers && queueEnabled) {
      await startBackgroundWorkers();
    }
    return;
  }

  initialized = true;
  if (!isQueueFeatureEnabled()) {
    queueEnabled = false;
    console.log('[queue] Queue feature disabled by QUEUE_ENABLED=false. Using local fallback mode.');
    return;
  }

  if (!process.env.REDIS_URL) {
    queueEnabled = false;
    console.log('[queue] REDIS_URL missing. Using local fallback mode for background jobs.');
    return;
  }

  try {
    connection = createBullConnection();
    emailQueue = new Queue(EMAIL_QUEUE_NAME, {
      connection,
      defaultJobOptions: createDefaultJobOptions()
    });
    emailDeadLetterQueue = new Queue(EMAIL_DLQ_NAME, {
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
      }
    });
    indexingQueue = new Queue(INDEXING_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: EMAIL_JOB_BACKOFF_MS },
        removeOnComplete: true,
        removeOnFail: {
          age: 60 * 60 * 24 * 3,
          count: 1000
        }
      }
    });
    marketplaceQueue = new Queue(MARKETPLACE_QUEUE_NAME, {
      connection,
      defaultJobOptions: createMarketplaceJobOptions()
    });
    marketplaceDeadLetterQueue = new Queue(MARKETPLACE_DLQ_NAME, {
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
      }
    });
    queueEnabled = true;
    console.log('[queue] BullMQ queues initialized.');

    if (startWorkers) {
      await startBackgroundWorkers();
    }
  } catch (error) {
    queueEnabled = false;
    console.warn('[queue] Failed to initialize BullMQ. Falling back to local mode.', error?.message || error);
  }
};

const enqueueEmailJob = async (jobName, payload = {}, options = {}) => {
  if (!initialized) {
    await initializeBackgroundQueues();
  }

  if (!queueEnabled || !emailQueue) {
    const queued = runFallbackEmailJob(jobName, payload, options);
    return { mode: 'fallback', queued, deduped: !queued };
  }

  const job = await emailQueue.add(jobName, payload, {
    jobId: options.jobId,
    attempts: options.attempts || EMAIL_JOB_ATTEMPTS,
    backoff: options.backoff || { type: 'exponential', delay: EMAIL_JOB_BACKOFF_MS },
    removeOnComplete: options.removeOnComplete || { age: 60 * 60, count: 2000 },
    removeOnFail: options.removeOnFail || { age: 60 * 60 * 24 * 3, count: 5000 }
  });

  return { mode: 'bullmq', queued: true, jobId: job.id };
};

const enqueueSearchIndexRefresh = async (reason = 'content-update') => {
  if (!initialized) {
    await initializeBackgroundQueues();
  }

  if (!queueEnabled || !indexingQueue) {
    runFallbackIndexingJob();
    return { mode: 'fallback', queued: false };
  }

  try {
    const job = await indexingQueue.add(
      'refresh-search-indexes',
      {
        reason,
        requestedAt: new Date().toISOString()
      },
      {
        jobId: 'refresh-search-indexes'
      }
    );
    return { mode: 'bullmq', queued: true, jobId: job.id };
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('jobid')) {
      return { mode: 'bullmq', queued: true, deduped: true };
    }
    throw error;
  }
};

const enqueueMarketplaceJob = async (jobName, payload = {}, options = {}) => {
  if (!initialized) {
    await initializeBackgroundQueues();
  }

  if (!queueEnabled || !marketplaceQueue) {
    const queued = runFallbackMarketplaceJob(jobName, payload, options);
    return { mode: 'fallback', queued, deduped: !queued };
  }

  const job = await marketplaceQueue.add(jobName, payload, {
    jobId: options.jobId,
    attempts: options.attempts || MARKETPLACE_JOB_ATTEMPTS,
    backoff: options.backoff || { type: 'exponential', delay: MARKETPLACE_JOB_BACKOFF_MS },
    removeOnComplete: options.removeOnComplete || { age: 60 * 60 * 24 * 7, count: 10000 },
    removeOnFail: options.removeOnFail || { age: 60 * 60 * 24 * 14, count: 10000 }
  });

  return { mode: 'bullmq', queued: true, jobId: job.id };
};

const shutdownBackgroundQueues = async () => {
  try {
    await Promise.all([
      emailWorker?.close(),
      indexingWorker?.close(),
      marketplaceWorker?.close(),
      emailQueue?.close(),
      emailDeadLetterQueue?.close(),
      indexingQueue?.close(),
      marketplaceQueue?.close(),
      marketplaceDeadLetterQueue?.close()
    ]);
    workersStarted = false;
    queueEnabled = false;
    initialized = false;
    if (connection) {
      await connection.quit();
    }
  } catch (error) {
    console.warn('[queue] Shutdown warning:', error?.message || error);
  }
};

module.exports = {
  initializeBackgroundQueues,
  startBackgroundWorkers,
  enqueueEmailJob,
  enqueueSearchIndexRefresh,
  enqueueMarketplaceJob,
  shutdownBackgroundQueues
};
