const mongoose = require('mongoose');
const cron = require('node-cron');
const { logError, logWarn } = require('./safeErrorLog');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const DB_STORAGE_ALERT_LIMIT_MB = toPositiveInt(process.env.DB_STORAGE_ALERT_LIMIT_MB, 512);
const DB_MONITOR_MAX_COLLECTIONS = toPositiveInt(process.env.DB_MONITOR_MAX_COLLECTIONS, 100);
const DB_MONITOR_QUERY_MAX_TIME_MS = toPositiveInt(process.env.DB_MONITOR_QUERY_MAX_TIME_MS, 5000);

let monitorInProgress = false;
let monitorStarted = false;

const runDbCommand = (db, command) => db.command(command, {
  maxTimeMS: DB_MONITOR_QUERY_MAX_TIME_MS,
});

const listCollectionNames = async (db) => {
  const cursor = db.listCollections({}, {
    nameOnly: true,
    maxTimeMS: DB_MONITOR_QUERY_MAX_TIME_MS,
  });
  const names = [];

  try {
    for await (const collection of cursor) {
      names.push(collection.name);
      if (names.length > DB_MONITOR_MAX_COLLECTIONS) break;
    }
  } finally {
    await cursor.close().catch(() => {});
  }

  return names;
};

const checkDatabaseSize = async () => {
  if (monitorInProgress) {
    logWarn('[database-monitor] Previous database size check is still running; skipping overlap.');
    return { skipped: true };
  }

  monitorInProgress = true;
  try {
    const db = mongoose.connection.db;
    if (!db) return { skipped: true, reason: 'database_not_connected' };

    const stats = await runDbCommand(db, { dbStats: 1 });
    const usedBytes = Number(stats.storageSize || stats.dataSize || 0) + Number(stats.indexSize || 0);
    const usedMB = Math.round(usedBytes / 1024 / 1024);
    const percentage = Math.round((usedMB / DB_STORAGE_ALERT_LIMIT_MB) * 100);

    console.log(`[database-monitor] Usage: ${usedMB}MB / ${DB_STORAGE_ALERT_LIMIT_MB}MB (${percentage}%).`);
    if (percentage >= 80) {
      logWarn(`[database-monitor] Critical storage utilization: ${percentage}%.`);
    } else if (percentage >= 60) {
      logWarn(`[database-monitor] Elevated storage utilization: ${percentage}%.`);
    }

    const collectionNames = await listCollectionNames(db);
    const truncated = collectionNames.length > DB_MONITOR_MAX_COLLECTIONS;
    for (const collectionName of collectionNames.slice(0, DB_MONITOR_MAX_COLLECTIONS)) {
      try {
        const collectionStats = await runDbCommand(db, { collStats: collectionName });
        const sizeMB = Math.round(Number(collectionStats.storageSize || collectionStats.size || 0) / 1024 / 1024);
        if (sizeMB > 0) console.log(`[database-monitor] ${collectionName}: ${sizeMB}MB.`);
      } catch (collectionError) {
        logError(`[database-monitor] Collection size check skipped for ${collectionName}:`, collectionError);
      }
    }
    if (truncated) {
      logWarn(`[database-monitor] Collection scan capped at ${DB_MONITOR_MAX_COLLECTIONS}.`);
    }

    return { skipped: false, usedMB, percentage, collectionsChecked: Math.min(collectionNames.length, DB_MONITOR_MAX_COLLECTIONS) };
  } catch (error) {
    logError('[database-monitor] Database size check failed:', error);
    return { skipped: false, error: true };
  } finally {
    monitorInProgress = false;
  }
};

const startDatabaseMonitor = () => {
  if (monitorStarted) return;
  monitorStarted = true;
  checkDatabaseSize().catch((error) => logError('[database-monitor] Startup check failed:', error));
  cron.schedule('0 0 * * *', () => {
    checkDatabaseSize().catch((error) => logError('[database-monitor] Scheduled check failed:', error));
  });
  console.log('[database-monitor] Daily database size monitor scheduled.');
};

module.exports = { startDatabaseMonitor, checkDatabaseSize };
