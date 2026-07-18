#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const {
  formatEnvironmentReport,
  validateEnvironment,
} = require('./utils/envValidation');

const expectedCollections = ['users', 'blogs', 'messages', 'notifications', 'groups'];

const logSection = (title) => {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
};

const runStartupDiagnostics = async () => {
  console.log('\nRunning startup diagnostics...\n');

  let hasErrors = false;

  logSection('Environment');
  const envResult = validateEnvironment({ profile: 'server' });
  if (envResult.ok) {
    console.log('OK: required environment values are present and strong enough.');
  } else {
    hasErrors = true;
  }
  if (envResult.errors.length || envResult.warnings.length) {
    console.log(formatEnvironmentReport(envResult));
  }

  logSection('MongoDB Connection');
  if (!process.env.MONGODB_URI) {
    hasErrors = true;
    console.log('SKIP: MONGODB_URI is missing.');
  } else {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('OK: MongoDB connection successful.');

      logSection('Database Collections');
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map((collection) => collection.name);
      expectedCollections.forEach((name) => {
        if (collectionNames.includes(name)) {
          console.log(`OK: ${name} collection exists.`);
        } else {
          console.log(`WARN: ${name} collection not found; it will be created on first use.`);
        }
      });

      logSection('Critical Indexes');
      const [userIndexes, messageIndexes] = await Promise.all([
        mongoose.connection.db.collection('users').indexes(),
        mongoose.connection.db.collection('messages').indexes(),
      ]);
      console.log(`OK: users indexes found: ${userIndexes.length}`);
      console.log(`OK: messages indexes found: ${messageIndexes.length}`);
    } catch (error) {
      hasErrors = true;
      console.log(`ERROR: MongoDB diagnostic failed: ${error?.message || error}`);
    } finally {
      await mongoose.connection.close().catch(() => {});
    }
  }

  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('ERRORS FOUND - fix the issues above before starting.');
    console.log('='.repeat(50) + '\n');
    process.exit(1);
  }

  console.log('ALL CHECKS PASSED - ready to start.');
  console.log('='.repeat(50) + '\n');
  process.exit(0);
};

runStartupDiagnostics();
