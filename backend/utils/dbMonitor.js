const mongoose = require('mongoose');
const cron = require('node-cron');

const checkDatabaseSize = async () => {
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    const usedMB = Math.round(stats.dataSize / 1024 / 1024);
    const limitMB = 512;
    const percentage = Math.round((usedMB / limitMB) * 100);
    
    console.log(`\n📊 Database Usage: ${usedMB}MB / ${limitMB}MB (${percentage}%)`);
    
    if (percentage >= 80) {
      console.log(`🔴 CRITICAL: Database at ${percentage}% capacity!`);
    } else if (percentage >= 60) {
      console.log(`🟡 WARNING: Database at ${percentage}% capacity`);
    }
    
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const colStats = await db.collection(col.name).stats();
      const sizeMB = Math.round(colStats.size / 1024 / 1024);
      if (sizeMB > 0) console.log(`  - ${col.name}: ${sizeMB}MB`);
    }
  } catch (error) {
    console.error('❌ DB size check failed:', error.message);
  }
};

const startDatabaseMonitor = () => {
  checkDatabaseSize(); // Run immediately
  cron.schedule('0 0 * * *', checkDatabaseSize); // Daily at midnight
  console.log('✅ Database size monitor scheduled (daily)');
};

module.exports = { startDatabaseMonitor, checkDatabaseSize };
