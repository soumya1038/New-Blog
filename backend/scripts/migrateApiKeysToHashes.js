require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const { normalizeApiKey, upgradeLegacyApiKeyRecord } = require('../utils/apiKeys');

const args = process.argv.slice(2);
const EXECUTE_FLAG = '--execute';
const CONFIRM_FLAG = '--confirm-migrate-api-keys';

const hasFlag = (flag) => args.includes(flag);

const getArgValue = (name, fallback = '') => {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1]) return args[index + 1];
  return fallback;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const QUERY_MAX_TIME_MS = toPositiveInt(process.env.API_KEY_AUTH_QUERY_MAX_TIME_MS, 5000);
const DEFAULT_BATCH_LIMIT = toPositiveInt(process.env.API_KEY_MIGRATION_BATCH_LIMIT, 500);

const printUsage = () => {
  console.log([
    'Usage:',
    '  node backend/scripts/migrateApiKeysToHashes.js',
    `  node backend/scripts/migrateApiKeysToHashes.js ${EXECUTE_FLAG} ${CONFIRM_FLAG}`,
    '',
    'Default mode is dry-run and only counts legacy plaintext API-key records.',
    `Execution requires both ${EXECUTE_FLAG} and ${CONFIRM_FLAG}.`,
    'Options:',
    '  --limit <n>  Maximum users to inspect in this run. Defaults to API_KEY_MIGRATION_BATCH_LIMIT or 500.',
  ].join('\n'));
};

const run = async () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  const execute = hasFlag(EXECUTE_FLAG);
  if (execute && !hasFlag(CONFIRM_FLAG)) {
    throw new Error(`Refusing to migrate API keys without ${CONFIRM_FLAG}.`);
  }

  const limit = Math.min(toPositiveInt(getArgValue('--limit', DEFAULT_BATCH_LIMIT), DEFAULT_BATCH_LIMIT), 5000);

  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({ 'apiKeys.key': { $exists: true, $ne: '' } })
    .select('_id apiKeys._id +apiKeys.key')
    .sort({ _id: 1 })
    .limit(limit)
    .lean()
    .maxTimeMS(QUERY_MAX_TIME_MS);

  let legacyRecords = 0;
  let migrated = 0;

  for (const user of users) {
    for (const apiKeyRecord of user.apiKeys || []) {
      const rawKey = normalizeApiKey(apiKeyRecord.key);
      if (!rawKey || !apiKeyRecord._id) continue;

      legacyRecords += 1;
      if (!execute) continue;

      const upgraded = {};
      upgradeLegacyApiKeyRecord(upgraded, rawKey);
      const result = await User.updateOne(
        { _id: user._id, 'apiKeys._id': apiKeyRecord._id, 'apiKeys.key': rawKey },
        {
          $set: {
            'apiKeys.$.keyHash': upgraded.keyHash,
            'apiKeys.$.keyPrefix': upgraded.keyPrefix,
            'apiKeys.$.keyLast4': upgraded.keyLast4,
            'apiKeys.$.keyVersion': upgraded.keyVersion,
          },
          $unset: { 'apiKeys.$.key': '' },
        }
      ).maxTimeMS(QUERY_MAX_TIME_MS);
      migrated += result.modifiedCount || 0;
    }
  }

  console.log(`[api-key-migration] ${execute ? 'EXECUTE' : 'DRY-RUN'}`);
  console.log(`- Users inspected: ${users.length}`);
  console.log(`- Legacy plaintext API-key records found: ${legacyRecords}`);
  console.log(`- Legacy API-key records migrated: ${migrated}`);
  if (!execute && legacyRecords > 0) {
    console.log(`- Re-run with ${EXECUTE_FLAG} ${CONFIRM_FLAG} to migrate this batch.`);
  }
  if (users.length === limit) {
    console.log(`- Batch limit reached (${limit}); re-run until no legacy records remain.`);
  }
};

run()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('API key migration failed:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
