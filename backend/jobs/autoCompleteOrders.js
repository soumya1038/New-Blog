const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const Order = require('../models/Order');
const SellerEarning = require('../models/SellerEarning');
const { enqueueEmailJob } = require('./queueService');
const { logError, logWarn } = require('../utils/safeErrorLog');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const AUTO_COMPLETE_DAYS = parsePositiveInt(process.env.ORDER_AUTO_COMPLETE_DAYS, 7);
const ORDER_AUTO_COMPLETE_BATCH_LIMIT = parsePositiveInt(process.env.ORDER_AUTO_COMPLETE_BATCH_LIMIT, 100);
const EARNING_RELEASE_BATCH_LIMIT = parsePositiveInt(process.env.EARNING_RELEASE_BATCH_LIMIT, 1000);
const ORDER_QUERY_MAX_TIME_MS = parsePositiveInt(process.env.ORDER_QUERY_MAX_TIME_MS, 5000);
const SCHEDULER_COMMAND_TIMEOUT_MS = parsePositiveInt(process.env.QUEUE_SCHEDULER_COMMAND_TIMEOUT_MS, 10000);
const QUEUE_NAME = 'auto-complete-orders';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

let initialized = false;
let connection = null;
let autoCompleteQueue = null;
let worker = null;
let localInterval = null;
let runInProgress = false;

const attachQueueErrorLogger = (emitter, label) => {
  if (!emitter || typeof emitter.on !== 'function') return emitter;
  emitter.on('error', (error) => {
    logWarn(`[autoCompleteOrders] ${label} error:`, error);
  });
  return emitter;
};

const withSchedulerTimeout = (promise, label) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} timed out after ${SCHEDULER_COMMAND_TIMEOUT_MS}ms`)),
      SCHEDULER_COMMAND_TIMEOUT_MS
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

const closeBullResources = async () => {
  try {
    await Promise.all([
      worker?.close(),
      autoCompleteQueue?.close(),
    ]);
    if (connection) {
      if (typeof connection.disconnect === 'function') connection.disconnect();
      else await connection.quit();
    }
  } catch (error) {
    logWarn('[autoCompleteOrders] BullMQ shutdown warning:', error);
  } finally {
    worker = null;
    autoCompleteQueue = null;
    connection = null;
  }
};

const runAutoComplete = async () => {
  if (runInProgress) {
    console.log('[autoComplete] Previous run still active; skipping overlapping execution.');
    return { completed: 0, released: 0, skipped: true };
  }

  runInProgress = true;
  const now = new Date();
  const cutoff = new Date(now - AUTO_COMPLETE_DAYS * 24 * 60 * 60 * 1000);
  let completed = 0;
  let released = 0;

  try {
    const staleOrders = await Order.find({
      status: 'shipped',
      'shipping.shippedAt': { $lte: cutoff },
    })
      .select('_id orderNumber buyerId shipping.shippedAt')
      .sort({ 'shipping.shippedAt': 1, _id: 1 })
      .limit(ORDER_AUTO_COMPLETE_BATCH_LIMIT)
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS)
      .lean();

    for (const order of staleOrders) {
      try {
        const result = await Order.updateOne(
          {
            _id: order._id,
            status: 'shipped',
            'shipping.shippedAt': { $lte: cutoff },
          },
          {
            $set: {
              status: 'completed',
              'shipping.deliveredAt': now,
            },
          }
        ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

        if (result.modifiedCount !== 1) continue;

        await SellerEarning.updateMany(
          { orderId: order._id, status: 'pending' },
          { status: 'available', availableAt: now }
        ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

        await enqueueEmailJob('buyer-order-auto-completed', {
          userId: order.buyerId.toString(),
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
        }, { jobId: `buyer-order-auto-completed:${order._id}` });

        completed++;
      } catch (err) {
        logError(`[autoComplete] Failed for order ${order._id}:`, err);
      }
    }

    const pendingEarnings = await SellerEarning.find({
      status: 'pending',
      holdUntil: { $lte: now },
    })
      .select('_id')
      .sort({ holdUntil: 1, _id: 1 })
      .limit(EARNING_RELEASE_BATCH_LIMIT)
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS)
      .lean();

    if (pendingEarnings.length) {
      const result = await SellerEarning.updateMany(
        { _id: { $in: pendingEarnings.map(e => e._id) }, status: 'pending' },
        { status: 'available', availableAt: now }
      ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      released = result.modifiedCount || 0;
    }

    console.log(`[autoComplete] Completed ${completed} orders, released ${released} earnings.`);
    return { completed, released, orderBatchLimit: ORDER_AUTO_COMPLETE_BATCH_LIMIT, earningBatchLimit: EARNING_RELEASE_BATCH_LIMIT };
  } finally {
    runInProgress = false;
  }
};

const scheduleLocalFallback = (reason = 'REDIS_URL missing') => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Auto-complete scheduler requires Redis in production: ${reason}`);
  }
  if (localInterval) return;
  console.log(`[autoCompleteOrders] ${reason}. Using local interval fallback.`);
  localInterval = setInterval(() => {
    runAutoComplete().catch((err) => {
      logError('[autoCompleteOrders] Local run failed:', err);
    });
  }, SIX_HOURS_MS);
};

const initializeBullQueue = () => {
  if (autoCompleteQueue) return;

  connection = attachQueueErrorLogger(new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: SCHEDULER_COMMAND_TIMEOUT_MS,
  }), 'Redis connection');

  autoCompleteQueue = attachQueueErrorLogger(new Queue(QUEUE_NAME, { connection }), 'queue');
  worker = attachQueueErrorLogger(new Worker(QUEUE_NAME, runAutoComplete, { connection }), 'worker');

  worker.on('failed', (job, err) => {
    logError(`[autoCompleteOrders] Job ${job?.id} failed:`, err);
  });
  worker.on('stalled', (jobId) => {
    console.warn(`[autoCompleteOrders] Job stalled: ${String(jobId || '').slice(0, 128)}`);
  });
};

const scheduleJob = async () => {
  if (initialized) return;
  initialized = true;

  if (!process.env.REDIS_URL) {
    scheduleLocalFallback();
    return;
  }

  try {
    initializeBullQueue();

    const repeatables = await withSchedulerTimeout(
      autoCompleteQueue.getRepeatableJobs(),
      'auto-complete repeatable-job lookup'
    );
    for (const repeatable of repeatables) {
      await withSchedulerTimeout(
        autoCompleteQueue.removeRepeatableByKey(repeatable.key),
        'auto-complete repeatable-job cleanup'
      );
    }

    await withSchedulerTimeout(
      autoCompleteQueue.add(
        'run',
        {},
        {
          repeat: { every: SIX_HOURS_MS },
          jobId: 'auto-complete-orders-recurring',
        }
      ),
      'auto-complete repeatable-job scheduling'
    );
    console.log('[autoCompleteOrders] Scheduled to run every 6 hours.');
  } catch (error) {
    await closeBullResources();
    initialized = false;
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    logWarn('[autoCompleteOrders] Failed to schedule BullMQ job. Using local interval fallback.', error);
    scheduleLocalFallback('BullMQ schedule unavailable');
  }
};

const triggerNow = async () => {
  if (!process.env.REDIS_URL) {
    return runAutoComplete();
  }

  initializeBullQueue();
  return autoCompleteQueue.add('run-now', {}, { jobId: `manual-${Date.now()}` });
};

module.exports = { scheduleJob, triggerNow };
