const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const Order = require('../models/Order');
const SellerEarning = require('../models/SellerEarning');
const { enqueueEmailJob } = require('./queueService');

const AUTO_COMPLETE_DAYS = parseInt(process.env.ORDER_AUTO_COMPLETE_DAYS || '7', 10);
const QUEUE_NAME = 'auto-complete-orders';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

let initialized = false;
let connection = null;
let autoCompleteQueue = null;
let worker = null;
let localInterval = null;

const runAutoComplete = async () => {
  const now = new Date();
  const cutoff = new Date(now - AUTO_COMPLETE_DAYS * 24 * 60 * 60 * 1000);
  let completed = 0;
  let released = 0;

  const staleOrders = await Order.find({
    status: 'shipped',
    'shipping.shippedAt': { $lte: cutoff },
  }).select('_id orderNumber buyerId shipping');

  for (const order of staleOrders) {
    try {
      order.status = 'completed';
      order.shipping.deliveredAt = now;
      await order.save();

      await SellerEarning.updateMany(
        { orderId: order._id, status: 'pending' },
        { status: 'available', availableAt: now }
      );

      await enqueueEmailJob('buyer-order-auto-completed', {
        userId: order.buyerId.toString(),
        orderNumber: order.orderNumber,
      });

      completed++;
    } catch (err) {
      console.error(`[autoComplete] Failed for order ${order._id}:`, err.message);
    }
  }

  const pendingEarnings = await SellerEarning.find({
    status: 'pending',
    holdUntil: { $lte: now },
  });

  if (pendingEarnings.length) {
    await SellerEarning.updateMany(
      { _id: { $in: pendingEarnings.map(e => e._id) } },
      { status: 'available', availableAt: now }
    );
    released = pendingEarnings.length;
  }

  console.log(`[autoComplete] Completed ${completed} orders, released ${released} earnings.`);
  return { completed, released };
};

const scheduleLocalFallback = () => {
  if (localInterval) return;
  console.log('[autoCompleteOrders] REDIS_URL missing. Using local interval fallback.');
  localInterval = setInterval(() => {
    runAutoComplete().catch((err) => {
      console.error('[autoCompleteOrders] Local run failed:', err.message);
    });
  }, SIX_HOURS_MS);
};

const initializeBullQueue = () => {
  if (autoCompleteQueue) return;

  connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  autoCompleteQueue = new Queue(QUEUE_NAME, { connection });
  worker = new Worker(QUEUE_NAME, runAutoComplete, { connection });

  worker.on('failed', (job, err) => {
    console.error(`[autoCompleteOrders] Job ${job?.id} failed:`, err.message);
  });
};

const scheduleJob = async () => {
  if (initialized) return;
  initialized = true;

  if (!process.env.REDIS_URL) {
    scheduleLocalFallback();
    return;
  }

  initializeBullQueue();

  const repeatables = await autoCompleteQueue.getRepeatableJobs();
  for (const repeatable of repeatables) {
    await autoCompleteQueue.removeRepeatableByKey(repeatable.key);
  }

  await autoCompleteQueue.add(
    'run',
    {},
    {
      repeat: { every: SIX_HOURS_MS },
      jobId: 'auto-complete-orders-recurring',
    }
  );
  console.log('[autoCompleteOrders] Scheduled to run every 6 hours.');
};

const triggerNow = async () => {
  if (!process.env.REDIS_URL) {
    return runAutoComplete();
  }

  initializeBullQueue();
  return autoCompleteQueue.add('run-now', {}, { jobId: `manual-${Date.now()}` });
};

module.exports = { scheduleJob, triggerNow };
