const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const { parsePositiveInt } = require('../utils/cacheStore');
const {
  formatErrorForLog,
  logError,
  logWarn,
} = require('../utils/safeErrorLog');
const User = require('../models/User');
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmation,
  sendAccountDeletionConfirmation,
  sendPasswordChangedSuccess,
  sendAccountDeletedSuccess,
  sendGenericNotificationEmail,
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
const INDEXING_REFRESH_JOB_ID = 'refresh-search-indexes';
const MARKETPLACE_QUEUE_NAME = 'marketplace-jobs';
const MARKETPLACE_DLQ_NAME = 'marketplace-jobs-dead-letter';

const EMAIL_JOB_ATTEMPTS = parsePositiveInt(process.env.QUEUE_JOB_ATTEMPTS, 3);
const EMAIL_JOB_BACKOFF_MS = parsePositiveInt(process.env.QUEUE_JOB_BACKOFF_MS, 5000);
const EMAIL_QUEUE_CONCURRENCY = parsePositiveInt(process.env.QUEUE_CONCURRENCY_EMAIL, 4);
const EMAIL_FAILED_JOB_RETENTION_SECONDS = parsePositiveInt(process.env.QUEUE_EMAIL_FAILED_JOB_RETENTION_SECONDS, 60 * 60);
const EMAIL_FAILED_JOB_RETENTION_COUNT = parsePositiveInt(process.env.QUEUE_EMAIL_FAILED_JOB_RETENTION_COUNT, 500);
const INDEXING_QUEUE_CONCURRENCY = parsePositiveInt(process.env.QUEUE_CONCURRENCY_INDEXING, 1);
const MARKETPLACE_JOB_ATTEMPTS = parsePositiveInt(process.env.QUEUE_MARKETPLACE_JOB_ATTEMPTS, 5);
const MARKETPLACE_JOB_BACKOFF_MS = parsePositiveInt(process.env.QUEUE_MARKETPLACE_JOB_BACKOFF_MS, 10000);
const MARKETPLACE_QUEUE_CONCURRENCY = parsePositiveInt(process.env.QUEUE_CONCURRENCY_MARKETPLACE, 2);
const FALLBACK_JOB_DEDUPE_TTL_MS = parsePositiveInt(process.env.QUEUE_FALLBACK_JOB_DEDUPE_TTL_MS, 10 * 60 * 1000);
const FALLBACK_JOB_DEDUPE_MAX_ENTRIES = parsePositiveInt(
  process.env.QUEUE_FALLBACK_JOB_DEDUPE_MAX_ENTRIES,
  10000
);
const REDIS_READY_TIMEOUT_MS = parsePositiveInt(process.env.QUEUE_REDIS_READY_TIMEOUT_MS, 10000);

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
const isQueueRequired = () => process.env.NODE_ENV === 'production';

const getBackgroundQueueStatus = () => {
  const required = isQueueRequired();
  const redisStatus = connection?.status || 'disconnected';
  const redisReady = queueEnabled && redisStatus === 'ready';
  return {
    required,
    initialized,
    enabled: queueEnabled,
    workersStarted,
    redisStatus,
    ready: required ? redisReady : (!isQueueFeatureEnabled() || !process.env.REDIS_URL || redisReady),
  };
};

const createEmailRemoveOnFailOptions = () => ({
  age: EMAIL_FAILED_JOB_RETENTION_SECONDS,
  count: EMAIL_FAILED_JOB_RETENTION_COUNT
});

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
  removeOnFail: createEmailRemoveOnFailOptions()
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
    enableReadyCheck: true,
    connectTimeout: REDIS_READY_TIMEOUT_MS
  });
};

const withTimeout = (promise, label, timeoutMs = REDIS_READY_TIMEOUT_MS) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

const closeRedisConnectionImmediately = async (redisConnection) => {
  if (!redisConnection) return;
  if (typeof redisConnection.disconnect === 'function') {
    redisConnection.disconnect();
    return;
  }
  if (typeof redisConnection.quit === 'function') {
    await redisConnection.quit();
  }
};

const verifyRedisConnection = async (redisConnection) => {
  if (typeof redisConnection?.ping !== 'function') return;
  await withTimeout(redisConnection.ping(), 'Redis readiness check');
};

const attachQueueErrorLogger = (emitter, label) => {
  if (!emitter || typeof emitter.on !== 'function') return emitter;
  emitter.on('error', (error) => {
    logWarn(`[queue] ${label} error:`, error);
  });
  return emitter;
};

const attachWorkerLifecycleLogger = (worker, label) => {
  attachQueueErrorLogger(worker, `${label} worker`);
  worker.on('stalled', (jobId) => {
    console.warn(`[queue] ${label} job stalled: ${String(jobId || '').slice(0, 128)}`);
  });
  return worker;
};

const pruneFallbackDedupeMap = () => {
  const now = Date.now();
  for (const [key, expiresAt] of fallbackJobDedupeMap.entries()) {
    if (expiresAt <= now) {
      fallbackJobDedupeMap.delete(key);
    }
  }
  while (fallbackJobDedupeMap.size > FALLBACK_JOB_DEDUPE_MAX_ENTRIES) {
    const oldestKey = fallbackJobDedupeMap.keys().next().value;
    if (!oldestKey) break;
    fallbackJobDedupeMap.delete(oldestKey);
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
  pruneFallbackDedupeMap();
  return false;
};

const maskEmail = (value = '') => {
  const email = String(value || '').trim();
  const [local, domain] = email.split('@');
  if (!local || !domain) return email ? '[redacted-email]' : '';
  return `${local.slice(0, 2)}***@${domain}`;
};

const redactQueueValue = (key, value) => {
  const fieldName = String(key || '').toLowerCase();
  if (/(password|code|token|secret|key|authorization|signature|otp|credential)/i.test(fieldName)) {
    return value ? '[redacted]' : '';
  }
  if (fieldName === 'email') {
    return maskEmail(value);
  }
  if (typeof value === 'string') {
    const text = value.replace(/\s+/g, ' ').trim();
    return text.length > 160 ? `${text.slice(0, 157)}...` : text;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item, index) => redactQueueValue(`${key}.${index}`, item));
  }
  if (value && typeof value === 'object') {
    return sanitizeQueuePayloadForDeadLetter(value);
  }
  return value;
};

const sanitizeQueuePayloadForDeadLetter = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return {};
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, redactQueueValue(key, value)])
  );
};

const formatMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `INR ${amount.toFixed(2)}` : String(value || '');
};

const resolveEmailRecipient = async (payload = {}) => {
  const directEmail = String(payload.email || '').trim();
  const directUsername = String(payload.username || payload.name || '').trim();
  if (directEmail) {
    return { email: directEmail, username: directUsername || 'User' };
  }

  const userId = String(payload.userId || '').trim();
  if (!userId) return null;
  if (!mongoose.isValidObjectId(userId)) return null;

  const user = await User.findById(userId).select('email username name').lean();
  const email = String(user?.email || '').trim();
  if (!email) return null;
  return {
    email,
    username: String(user?.username || user?.name || directUsername || 'User').trim() || 'User'
  };
};

const orderPath = (payload = {}) => payload.orderId ? `/order/${payload.orderId}` : '/my-orders';

const EMAIL_NOTICE_BUILDERS = {
  'seller-new-order': (payload) => ({
    subject: `New marketplace order ${payload.orderNumber || ''}`.trim(),
    headingText: 'New marketplace order',
    message: `A buyer placed order ${payload.orderNumber || 'for your store'}. Review it in your seller dashboard.`,
    details: [{ label: 'Order', value: payload.orderNumber || payload.orderId }],
    actionLabel: 'Open seller dashboard',
    actionPath: '/seller/dashboard'
  }),
  'buyer-order-confirmed': (payload) => ({
    subject: `Order ${payload.orderNumber || ''} confirmed`.trim(),
    headingText: 'Order confirmed',
    message: `Your order ${payload.orderNumber || ''} has been confirmed and is being prepared.`.trim(),
    details: [{ label: 'Order', value: payload.orderNumber || payload.orderId }],
    actionLabel: 'View order',
    actionPath: orderPath(payload)
  }),
  'buyer-order-shipped': (payload) => ({
    subject: `Order ${payload.orderNumber || ''} shipped`.trim(),
    headingText: 'Order shipped',
    message: `Your order ${payload.orderNumber || ''} has been shipped.`.trim(),
    details: [
      { label: 'Order', value: payload.orderNumber },
      { label: 'Courier', value: payload.courier },
      { label: 'Tracking number', value: payload.trackingNumber }
    ],
    actionLabel: 'View order',
    actionPath: orderPath(payload)
  }),
  'buyer-order-refunded': (payload) => ({
    subject: `Refund processed for order ${payload.orderNumber || ''}`.trim(),
    headingText: 'Refund processed',
    message: `The refund for order ${payload.orderNumber || ''} has been processed.`.trim(),
    details: [{ label: 'Order', value: payload.orderNumber || payload.orderId }],
    actionLabel: 'View orders',
    actionPath: '/my-orders'
  }),
  'buyer-order-auto-completed': (payload) => ({
    subject: `Order ${payload.orderNumber || ''} completed`.trim(),
    headingText: 'Order completed',
    message: `Order ${payload.orderNumber || ''} was automatically marked completed after the delivery confirmation window.`.trim(),
    details: [{ label: 'Order', value: payload.orderNumber || payload.orderId }],
    actionLabel: 'View order',
    actionPath: orderPath(payload)
  }),
  'seller-payout-initiated': (payload) => ({
    subject: 'Seller payout update',
    headingText: 'Payout update',
    message: payload.message || 'Your seller payout request has been updated.',
    details: [
      { label: 'Amount', value: formatMoney(payload.amount) },
      { label: 'Method', value: payload.method }
    ],
    actionLabel: 'View payouts',
    actionPath: '/seller/earnings'
  }),
  'seller-payout-completed': (payload) => ({
    subject: 'Seller payout completed',
    headingText: 'Payout completed',
    message: 'Your seller payout has been marked as paid.',
    details: [{ label: 'Amount', value: formatMoney(payload.amount) }],
    actionLabel: 'View payouts',
    actionPath: '/seller/earnings'
  }),
  'seller-approved': () => ({
    subject: 'Your seller application was approved',
    headingText: 'Seller application approved',
    message: 'Your seller application has been approved. You can now list products on Lekhon.',
    actionLabel: 'Open seller dashboard',
    actionPath: '/seller/dashboard'
  }),
  'seller-rejected': (payload) => ({
    subject: 'Seller application update',
    headingText: 'Seller application update',
    message: payload.reviewNote
      ? `Your seller application was not approved. Review note: ${payload.reviewNote}`
      : 'Your seller application was not approved. You can review the status and apply again later.',
    actionLabel: 'Review application',
    actionPath: '/become-seller'
  })
};

const sendQueuedGenericNotice = async (jobName, payload = {}) => {
  const buildNotice = EMAIL_NOTICE_BUILDERS[jobName];
  if (!buildNotice) {
    throw new Error(`Unsupported email job type: ${jobName}`);
  }

  const recipient = await resolveEmailRecipient(payload);
  if (!recipient?.email) {
    logWarn(`[queue] Skipping email job without deliverable recipient: ${jobName}`);
    return { skipped: true };
  }

  return sendGenericNotificationEmail(recipient.email, recipient.username, buildNotice(payload));
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
    case 'seller-new-order':
    case 'buyer-order-confirmed':
    case 'buyer-order-shipped':
    case 'buyer-order-refunded':
    case 'buyer-order-auto-completed':
    case 'seller-payout-initiated':
    case 'seller-payout-completed':
    case 'seller-approved':
    case 'seller-rejected':
      return sendQueuedGenericNotice(jobName, payload);
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
      logError(`[queue:fallback] Email job failed (${jobName}):`, error);
    }
  });
  return true;
};

const runFallbackIndexingJob = (options = {}) => {
  const jobId = options.jobId || INDEXING_REFRESH_JOB_ID;
  if (shouldSkipFallbackJob(jobId)) {
    return false;
  }

  setImmediate(async () => {
    try {
      await ensureSearchIndexes();
    } catch (error) {
      logError('[queue:fallback] Indexing job failed:', error);
    }
  });
  return true;
};

const runFallbackMarketplaceJob = (jobName, payload, options = {}) => {
  if (shouldSkipFallbackJob(options.jobId)) {
    return false;
  }

  setImmediate(async () => {
    try {
      await handleMarketplaceJob(jobName, payload);
    } catch (error) {
      logError(`[queue:fallback] Marketplace job failed (${jobName}):`, error);
    }
  });
  return true;
};

const startBackgroundWorkers = async () => {
  if (!queueEnabled || workersStarted) return;

  emailWorker = attachWorkerLifecycleLogger(
    new Worker(
      EMAIL_QUEUE_NAME,
      async (job) => {
        await handleEmailJob(job.name, job.data);
      },
      {
        connection,
        concurrency: EMAIL_QUEUE_CONCURRENCY
      }
    ),
    'Email'
  );

  indexingWorker = attachWorkerLifecycleLogger(
    new Worker(
      INDEXING_QUEUE_NAME,
      async (job) => {
        await handleIndexingJob(job.name, job.data);
      },
      {
        connection,
        concurrency: INDEXING_QUEUE_CONCURRENCY
      }
    ),
    'Indexing'
  );

  marketplaceWorker = attachWorkerLifecycleLogger(
    new Worker(
      MARKETPLACE_QUEUE_NAME,
      async (job) => {
        await handleMarketplaceJob(job.name, job.data);
      },
      {
        connection,
        concurrency: MARKETPLACE_QUEUE_CONCURRENCY
      }
    ),
    'Marketplace'
  );

  emailWorker.on('completed', (job) => {
    console.log(`[queue] Email job completed: ${job.name} (${job.id})`);
  });

  emailWorker.on('failed', async (job, error) => {
    logError(`[queue] Email job failed: ${job?.name} (${job?.id})`, error);
    const attempts = job?.opts?.attempts || EMAIL_JOB_ATTEMPTS;
    if (job && job.attemptsMade >= attempts && emailDeadLetterQueue) {
      try {
        await emailDeadLetterQueue.add(
          'email-failed',
          {
            sourceJobId: job.id,
            sourceJobName: job.name,
            data: sanitizeQueuePayloadForDeadLetter(job.data),
            failedReason: formatErrorForLog(error),
            failedAt: new Date().toISOString(),
            attemptsMade: job.attemptsMade
          },
          {
            removeOnComplete: true,
            removeOnFail: true
          }
        );
      } catch (dlqError) {
        logError('[queue] Failed to enqueue dead-letter email job:', dlqError);
      }
    }
  });

  indexingWorker.on('failed', (job, error) => {
    logError(`[queue] Indexing job failed: ${job?.name} (${job?.id})`, error);
  });

  marketplaceWorker.on('completed', (job) => {
    console.log(`[queue] Marketplace job completed: ${job.name} (${job.id})`);
  });

  marketplaceWorker.on('failed', async (job, error) => {
    logError(`[queue] Marketplace job failed: ${job?.name} (${job?.id})`, error);
    const attempts = job?.opts?.attempts || MARKETPLACE_JOB_ATTEMPTS;
    if (job && job.attemptsMade >= attempts && marketplaceDeadLetterQueue) {
      try {
        await marketplaceDeadLetterQueue.add(
          'marketplace-failed',
          {
            sourceJobId: job.id,
            sourceJobName: job.name,
            data: sanitizeQueuePayloadForDeadLetter(job.data),
            failedReason: formatErrorForLog(error),
            failedAt: new Date().toISOString(),
            attemptsMade: job.attemptsMade
          },
          {
            removeOnComplete: true,
            removeOnFail: true
          }
        );
      } catch (dlqError) {
        logError('[queue] Failed to enqueue dead-letter marketplace job:', dlqError);
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
    if (isQueueRequired()) {
      initialized = false;
      throw new Error('Background queues cannot be disabled in production.');
    }
    console.log('[queue] Queue feature disabled by QUEUE_ENABLED=false. Using local fallback mode.');
    return;
  }

  if (!process.env.REDIS_URL) {
    queueEnabled = false;
    if (isQueueRequired()) {
      initialized = false;
      throw new Error('REDIS_URL is required for production background queues.');
    }
    console.log('[queue] REDIS_URL missing. Using local fallback mode for background jobs.');
    return;
  }

  try {
    connection = attachQueueErrorLogger(createBullConnection(), 'Redis connection');
    await verifyRedisConnection(connection);
    emailQueue = attachQueueErrorLogger(new Queue(EMAIL_QUEUE_NAME, {
      connection,
      defaultJobOptions: createDefaultJobOptions()
    }), 'Email queue');
    emailDeadLetterQueue = attachQueueErrorLogger(new Queue(EMAIL_DLQ_NAME, {
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
      }
    }), 'Email dead-letter queue');
    indexingQueue = attachQueueErrorLogger(new Queue(INDEXING_QUEUE_NAME, {
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
    }), 'Indexing queue');
    marketplaceQueue = attachQueueErrorLogger(new Queue(MARKETPLACE_QUEUE_NAME, {
      connection,
      defaultJobOptions: createMarketplaceJobOptions()
    }), 'Marketplace queue');
    marketplaceDeadLetterQueue = attachQueueErrorLogger(new Queue(MARKETPLACE_DLQ_NAME, {
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
      }
    }), 'Marketplace dead-letter queue');
    queueEnabled = true;
    console.log('[queue] BullMQ queues initialized.');

    if (startWorkers) {
      await startBackgroundWorkers();
    }
  } catch (error) {
    queueEnabled = false;
    await closeRedisConnectionImmediately(connection);
    connection = null;
    if (isQueueRequired()) {
      initialized = false;
      throw error;
    }
    logWarn('[queue] Failed to initialize BullMQ. Falling back to local mode.', error);
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
    removeOnFail: options.removeOnFail || createEmailRemoveOnFailOptions()
  });

  return { mode: 'bullmq', queued: true, jobId: job.id };
};

const enqueueSearchIndexRefresh = async (reason = 'content-update') => {
  if (!initialized) {
    await initializeBackgroundQueues();
  }

  if (!queueEnabled || !indexingQueue) {
    const queued = runFallbackIndexingJob({ jobId: INDEXING_REFRESH_JOB_ID });
    return { mode: 'fallback', queued, deduped: !queued };
  }

  try {
    const job = await indexingQueue.add(
      'refresh-search-indexes',
      {
        reason,
        requestedAt: new Date().toISOString()
      },
      {
        jobId: INDEXING_REFRESH_JOB_ID
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
    logWarn('[queue] Shutdown warning:', error);
  }
};

module.exports = {
  getBackgroundQueueStatus,
  initializeBackgroundQueues,
  startBackgroundWorkers,
  enqueueEmailJob,
  enqueueSearchIndexRefresh,
  enqueueMarketplaceJob,
  shutdownBackgroundQueues
};
