require('dotenv').config();

const assert = require('assert');
const mongoose = require('mongoose');
const IORedis = require('ioredis');
const { Queue, QueueEvents } = require('bullmq');

process.env.QUEUE_ENABLED = 'true';
process.env.QUEUE_JOB_ATTEMPTS = process.env.QUEUE_JOB_ATTEMPTS || '1';
process.env.QUEUE_REDIS_READY_TIMEOUT_MS = process.env.QUEUE_REDIS_READY_TIMEOUT_MS || '10000';
process.env.QUEUE_SCHEDULER_COMMAND_TIMEOUT_MS = process.env.QUEUE_SCHEDULER_COMMAND_TIMEOUT_MS || '10000';

const {
  initializeBackgroundQueues,
  enqueueEmailJob,
  enqueueSearchIndexRefresh,
  shutdownBackgroundQueues,
} = require('../jobs/queueService');

const EMAIL_QUEUE_NAME = 'email-jobs';
const EMAIL_DLQ_NAME = 'email-jobs-dead-letter';
const INDEXING_QUEUE_NAME = 'indexing-jobs';
const DEFAULT_TIMEOUT_MS = 20000;

const requireEnv = (key) => {
  const value = String(process.env[key] || '').trim();
  if (!value) {
    throw new Error(`${key} is required for Redis queue smoke`);
  }
  return value;
};

const createRedisConnection = () =>
  new IORedis(requireEnv('REDIS_URL'), {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 10000,
  });

const waitForQueueEvent = (queueEvents, eventName, expectedJobId, timeoutMs = DEFAULT_TIMEOUT_MS) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName} on job ${expectedJobId}`));
    }, timeoutMs);

    const handler = (event) => {
      if (String(event?.jobId) !== String(expectedJobId)) return;
      cleanup();
      resolve(event);
    };

    const failedHandler = (event) => {
      if (String(event?.jobId) !== String(expectedJobId)) return;
      cleanup();
      reject(new Error(`Job ${expectedJobId} failed while waiting for ${eventName}: ${event?.failedReason || ''}`));
    };

    const cleanup = () => {
      clearTimeout(timer);
      queueEvents.off(eventName, handler);
      if (eventName !== 'failed') queueEvents.off('failed', failedHandler);
    };

    queueEvents.on(eventName, handler);
    if (eventName !== 'failed') queueEvents.on('failed', failedHandler);
  });

const waitForDeadLetter = async (deadLetterQueue, sourceJobId, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const jobs = await deadLetterQueue.getJobs(['waiting', 'delayed', 'active', 'completed', 'failed'], 0, 50);
    const match = jobs.find((job) => String(job.data?.sourceJobId) === String(sourceJobId));
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for dead-letter copy of ${sourceJobId}`);
};

const obliterateQueue = async (name) => {
  const connection = createRedisConnection();
  const queue = new Queue(name, { connection });
  try {
    await queue.obliterate({ force: true });
  } catch (error) {
    if (!String(error?.message || '').includes('does not exist')) throw error;
  } finally {
    await queue.close();
    connection.disconnect();
  }
};

const main = async () => {
  requireEnv('REDIS_URL');
  requireEnv('MONGODB_URI');

  await Promise.all([
    obliterateQueue(EMAIL_QUEUE_NAME),
    obliterateQueue(EMAIL_DLQ_NAME),
    obliterateQueue(INDEXING_QUEUE_NAME),
  ]);

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  const indexingEventsConnection = createRedisConnection();
  const emailEventsConnection = createRedisConnection();
  const dlqConnection = createRedisConnection();
  const indexingEvents = new QueueEvents(INDEXING_QUEUE_NAME, { connection: indexingEventsConnection });
  const emailEvents = new QueueEvents(EMAIL_QUEUE_NAME, { connection: emailEventsConnection });
  const deadLetterQueue = new Queue(EMAIL_DLQ_NAME, { connection: dlqConnection });

  try {
    await Promise.all([
      indexingEvents.waitUntilReady(),
      emailEvents.waitUntilReady(),
      deadLetterQueue.waitUntilReady(),
    ]);

    await initializeBackgroundQueues({ startWorkers: true });

    const indexingJobId = 'refresh-search-indexes';
    const indexingCompleted = waitForQueueEvent(indexingEvents, 'completed', indexingJobId);
    const indexingResult = await enqueueSearchIndexRefresh('redis-smoke');
    assert.strictEqual(indexingResult.mode, 'bullmq', 'search indexing job should use BullMQ');
    assert.strictEqual(String(indexingResult.jobId), indexingJobId);
    await indexingCompleted;

    const emailJobId = `queue-smoke-email-failure-${Date.now()}`;
    const emailFailed = waitForQueueEvent(emailEvents, 'failed', emailJobId);
    const emailResult = await enqueueEmailJob(
      'unsupported-smoke-job',
      {
        email: 'queue-smoke@example.com',
        code: '123456',
        token: 'sensitive-token',
      },
      {
        attempts: 1,
        jobId: emailJobId,
        removeOnFail: { age: 60, count: 10 },
      }
    );
    assert.strictEqual(emailResult.mode, 'bullmq', 'email job should use BullMQ');
    await emailFailed;

    const deadLetterJob = await waitForDeadLetter(deadLetterQueue, emailResult.jobId);
    assert.strictEqual(deadLetterJob.data.sourceJobName, 'unsupported-smoke-job');
    assert.strictEqual(deadLetterJob.data.data.email, 'qu***@example.com');
    assert.strictEqual(deadLetterJob.data.data.code, '[redacted]');
    assert.strictEqual(deadLetterJob.data.data.token, '[redacted]');

    console.log('redis queue smoke ok');
  } finally {
    await shutdownBackgroundQueues();
    await Promise.all([
      indexingEvents.close(),
      emailEvents.close(),
      deadLetterQueue.close(),
    ]);
    indexingEventsConnection.disconnect();
    emailEventsConnection.disconnect();
    dlqConnection.disconnect();
    await mongoose.connection.close();
  }
};

main().catch(async (error) => {
  console.error(error);
  try {
    await shutdownBackgroundQueues();
    await mongoose.connection.close();
  } catch (_) {
    // Best-effort cleanup only.
  }
  process.exit(1);
});
