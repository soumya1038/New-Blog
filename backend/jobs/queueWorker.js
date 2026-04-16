require('dotenv').config();
const mongoose = require('mongoose');
const { initializeBackgroundQueues, shutdownBackgroundQueues } = require('./queueService');
const { initSentry } = require('../utils/sentry');

initSentry();

let shuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[queue-worker] Received ${signal}. Shutting down...`);

  try {
    await shutdownBackgroundQueues();
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[queue-worker] Shutdown failed:', error?.message || error);
    process.exit(1);
  }
};

const startWorker = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required for queue worker.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[queue-worker] MongoDB connected.');

    await initializeBackgroundQueues({ startWorkers: true });
    console.log('[queue-worker] Queue worker is running.');
  } catch (error) {
    console.error('[queue-worker] Failed to start:', error?.message || error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startWorker();
