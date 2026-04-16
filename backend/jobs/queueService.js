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
  sendAccountDeletedSuccess
} = require('../utils/mailService');
const { ensureSearchIndexes } = require('../utils/searchIndexBootstrap');

const EMAIL_QUEUE_NAME = 'email-jobs';
const EMAIL_DLQ_NAME = 'email-jobs-dead-letter';
const INDEXING_QUEUE_NAME = 'indexing-jobs';

const EMAIL_JOB_ATTEMPTS = parsePositiveInt(process.env.QUEUE_JOB_ATTEMPTS, 3);
const EMAIL_JOB_BACKOFF_MS = parsePositiveInt(process.env.QUEUE_JOB_BACKOFF_MS, 5000);
const EMAIL_QUEUE_CONCURRENCY = parsePositiveInt(process.env.QUEUE_CONCURRENCY_EMAIL, 4);
const INDEXING_QUEUE_CONCURRENCY = parsePositiveInt(process.env.QUEUE_CONCURRENCY_INDEXING, 1);

let initialized = false;
let queueEnabled = false;
let workersStarted = false;

let connection = null;
let emailQueue = null;
let emailDeadLetterQueue = null;
let indexingQueue = null;
let emailWorker = null;
let indexingWorker = null;

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

const createBullConnection = () => {
  return new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });
};

const handleEmailJob = async (jobName, payload = {}) => {
  const { email, username, code } = payload;

  switch (jobName) {
    case 'verification-code':
      return sendVerificationEmail(email, username || 'User', code);
    case 'welcome-email':
      return sendWelcomeEmail(email, username || 'User');
    case 'password-reset-code':
      return sendPasswordResetEmail(email, username || 'User', code);
    case 'password-change-confirmation':
      return sendPasswordChangeConfirmation(email, username || 'User', code);
    case 'account-deletion-confirmation':
      return sendAccountDeletionConfirmation(email, username || 'User', code);
    case 'password-changed-success':
      return sendPasswordChangedSuccess(email, username || 'User');
    case 'account-deleted-success':
      return sendAccountDeletedSuccess(email, username || 'User');
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

const runFallbackEmailJob = (jobName, payload) => {
  setImmediate(async () => {
    try {
      await handleEmailJob(jobName, payload);
    } catch (error) {
      console.error(`[queue:fallback] Email job failed (${jobName}):`, error?.message || error);
    }
  });
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
    runFallbackEmailJob(jobName, payload);
    return { mode: 'fallback', queued: false };
  }

  const job = await emailQueue.add(jobName, payload, {
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

const shutdownBackgroundQueues = async () => {
  try {
    await Promise.all([
      emailWorker?.close(),
      indexingWorker?.close(),
      emailQueue?.close(),
      emailDeadLetterQueue?.close(),
      indexingQueue?.close()
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
  shutdownBackgroundQueues
};
