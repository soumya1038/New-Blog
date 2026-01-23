#!/usr/bin/env node

/**
 * Startup Diagnostic Script
 * Checks all critical configurations before starting the application
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('\n🔍 Running Startup Diagnostics...\n');

let hasErrors = false;

// 1. Check Environment Variables
console.log('📋 Checking Environment Variables:');
const requiredEnvVars = [
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'LIVEKIT_WS_URL'
];

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`  ✅ ${varName}: Set`);
  } else {
    console.log(`  ❌ ${varName}: Missing`);
    hasErrors = true;
  }
});

// 2. Check MongoDB Connection
console.log('\n🗄️  Checking MongoDB Connection:');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('  ✅ MongoDB connection successful');
    
    // 3. Check Collections
    console.log('\n📦 Checking Database Collections:');
    return mongoose.connection.db.listCollections().toArray();
  })
  .then(collections => {
    const collectionNames = collections.map(c => c.name);
    const expectedCollections = ['users', 'blogs', 'messages', 'notifications', 'groups'];
    
    expectedCollections.forEach(name => {
      if (collectionNames.includes(name)) {
        console.log(`  ✅ ${name} collection exists`);
      } else {
        console.log(`  ⚠️  ${name} collection not found (will be created on first use)`);
      }
    });
    
    // 4. Check Indexes
    console.log('\n🔑 Checking Critical Indexes:');
    return Promise.all([
      mongoose.connection.db.collection('users').indexes(),
      mongoose.connection.db.collection('messages').indexes()
    ]);
  })
  .then(([userIndexes, messageIndexes]) => {
    console.log(`  ✅ User indexes: ${userIndexes.length} found`);
    console.log(`  ✅ Message indexes: ${messageIndexes.length} found`);
    
    // 5. Summary
    console.log('\n' + '='.repeat(50));
    if (hasErrors) {
      console.log('❌ ERRORS FOUND - Please fix the issues above');
      console.log('='.repeat(50) + '\n');
      process.exit(1);
    } else {
      console.log('✅ ALL CHECKS PASSED - Ready to start!');
      console.log('='.repeat(50) + '\n');
      process.exit(0);
    }
  })
  .catch(err => {
    console.log('  ❌ MongoDB connection failed:', err.message);
    console.log('\n' + '='.repeat(50));
    console.log('❌ CRITICAL ERROR - Cannot connect to database');
    console.log('='.repeat(50) + '\n');
    process.exit(1);
  });
