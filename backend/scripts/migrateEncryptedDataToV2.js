const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Message = require('../models/Message');
const SellerApplication = require('../models/SellerApplication');
const User = require('../models/User');
const { decrypt, encrypt, isCurrentEncryption } = require('../utils/encryption');

const args = process.argv.slice(2);
const EXECUTE_FLAG = '--execute';
const CONFIRM_FLAG = '--confirm-migrate-encrypted-data';
const VALID_SCOPES = new Set(['all', 'messages', 'seller', 'two-factor']);

const hasFlag = flag => args.includes(flag);

const getArgValue = (name, fallback = '') => {
  const inline = args.find(arg => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const QUERY_MAX_TIME_MS = toPositiveInt(process.env.ORDER_QUERY_MAX_TIME_MS, 5000);
const DEFAULT_LIMIT = toPositiveInt(process.env.ENCRYPTION_MIGRATION_BATCH_LIMIT, 200);

const printUsage = () => {
  console.log([
    'Usage:',
    '  node backend/scripts/migrateEncryptedDataToV2.js',
    `  node backend/scripts/migrateEncryptedDataToV2.js ${EXECUTE_FLAG} ${CONFIRM_FLAG}`,
    '',
    'Default mode is dry-run and reports counts only. Sensitive values are never printed.',
    `Execution requires both ${EXECUTE_FLAG} and ${CONFIRM_FLAG}.`,
    'Options:',
    '  --scope <value>  all, messages, seller, or two-factor. Defaults to all.',
    '  --limit <n>      Maximum records per scope. Defaults to ENCRYPTION_MIGRATION_BATCH_LIMIT or 200.',
  ].join('\n'));
};

const upgradeValue = (value, wasEncrypted = true) => {
  if (!value || isCurrentEncryption(value)) return value;
  const plaintext = wasEncrypted ? decrypt(value) : String(value);
  return encrypt(plaintext);
};

const migrateMessages = async ({ execute, limit }) => {
  const records = await Message.find({
    content: { $exists: true, $ne: '' },
    $or: [
      { encrypted: { $ne: true } },
      { content: { $not: /^enc:v2:/ } },
      { caption: { $exists: true, $ne: '', $not: /^enc:v2:/ } },
    ],
  })
    .select('_id content caption encrypted')
    .sort({ _id: 1 })
    .limit(limit)
    .lean()
    .maxTimeMS(QUERY_MAX_TIME_MS);

  let migrated = 0;
  let failed = 0;
  for (const message of records) {
    if (!execute) continue;
    try {
      const content = upgradeValue(message.content, message.encrypted === true);
      const caption = message.caption
        ? upgradeValue(message.caption, message.encrypted === true)
        : message.caption;
      const result = await Message.updateOne(
        { _id: message._id, content: message.content },
        { $set: { content, caption, encrypted: true } }
      ).maxTimeMS(QUERY_MAX_TIME_MS);
      migrated += result.modifiedCount || 0;
    } catch (error) {
      failed += 1;
      console.error(`- Message ${message._id} failed: ${error.message}`);
    }
  }
  return { found: records.length, migrated, failed };
};

const migrateSellerData = async ({ execute, limit }) => {
  const records = await SellerApplication.find({
    $or: [
      { panNumber: { $exists: true, $ne: '', $not: /^enc:v2:/ } },
      { 'payoutMethod.bankAccount': { $exists: true, $ne: '', $not: /^enc:v2:/ } },
    ],
  })
    .select('_id +panNumber +payoutMethod.bankAccount')
    .sort({ _id: 1 })
    .limit(limit)
    .lean()
    .maxTimeMS(QUERY_MAX_TIME_MS);

  let migrated = 0;
  let failed = 0;
  for (const application of records) {
    if (!execute) continue;
    try {
      const update = {};
      if (application.panNumber && !isCurrentEncryption(application.panNumber)) {
        update.panNumber = upgradeValue(application.panNumber, true);
      }
      const bankAccount = application.payoutMethod?.bankAccount;
      if (bankAccount && !isCurrentEncryption(bankAccount)) {
        update['payoutMethod.bankAccount'] = upgradeValue(bankAccount, true);
      }
      if (!Object.keys(update).length) continue;
      const result = await SellerApplication.updateOne(
        { _id: application._id },
        { $set: update }
      ).maxTimeMS(QUERY_MAX_TIME_MS);
      migrated += result.modifiedCount || 0;
    } catch (error) {
      failed += 1;
      console.error(`- Seller application ${application._id} failed: ${error.message}`);
    }
  }
  return { found: records.length, migrated, failed };
};

const migrateTwoFactorData = async ({ execute, limit }) => {
  const records = await User.find({
    $or: [
      { 'twoFactor.authenticator.secret': { $exists: true, $ne: '', $not: /^enc:v2:/ } },
      { 'twoFactor.authenticator.setupSecret': { $exists: true, $ne: '', $not: /^enc:v2:/ } },
    ],
  })
    .select('_id +twoFactor.authenticator.secret +twoFactor.authenticator.setupSecret')
    .sort({ _id: 1 })
    .limit(limit)
    .lean()
    .maxTimeMS(QUERY_MAX_TIME_MS);

  let migrated = 0;
  let failed = 0;
  for (const user of records) {
    if (!execute) continue;
    try {
      const update = {};
      const secret = user.twoFactor?.authenticator?.secret;
      const setupSecret = user.twoFactor?.authenticator?.setupSecret;
      if (secret && !isCurrentEncryption(secret)) {
        update['twoFactor.authenticator.secret'] = upgradeValue(secret, true);
      }
      if (setupSecret && !isCurrentEncryption(setupSecret)) {
        update['twoFactor.authenticator.setupSecret'] = upgradeValue(setupSecret, true);
      }
      if (!Object.keys(update).length) continue;
      const result = await User.updateOne({ _id: user._id }, { $set: update })
        .maxTimeMS(QUERY_MAX_TIME_MS);
      migrated += result.modifiedCount || 0;
    } catch (error) {
      failed += 1;
      console.error(`- User ${user._id} failed: ${error.message}`);
    }
  }
  return { found: records.length, migrated, failed };
};

const run = async () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');

  const execute = hasFlag(EXECUTE_FLAG);
  if (execute && !hasFlag(CONFIRM_FLAG)) {
    throw new Error(`Refusing to migrate encrypted data without ${CONFIRM_FLAG}.`);
  }

  const scope = String(getArgValue('--scope', 'all')).trim().toLowerCase();
  if (!VALID_SCOPES.has(scope)) throw new Error(`Invalid scope: ${scope}`);
  const limit = Math.min(toPositiveInt(getArgValue('--limit', DEFAULT_LIMIT), DEFAULT_LIMIT), 2000);

  await mongoose.connect(process.env.MONGODB_URI);
  const summaries = {};
  if (scope === 'all' || scope === 'messages') summaries.messages = await migrateMessages({ execute, limit });
  if (scope === 'all' || scope === 'seller') summaries.seller = await migrateSellerData({ execute, limit });
  if (scope === 'all' || scope === 'two-factor') summaries.twoFactor = await migrateTwoFactorData({ execute, limit });

  console.log(`[encryption-migration] ${execute ? 'EXECUTE' : 'DRY-RUN'}`);
  Object.entries(summaries).forEach(([name, summary]) => {
    console.log(`- ${name}: found=${summary.found}, migrated=${summary.migrated}, failed=${summary.failed}`);
  });
  const failed = Object.values(summaries).reduce((sum, summary) => sum + summary.failed, 0);
  if (!execute) console.log(`- Re-run with ${EXECUTE_FLAG} ${CONFIRM_FLAG} to migrate this batch.`);
  if (failed) process.exitCode = 1;
};

run()
  .catch(error => {
    console.error('[encryption-migration] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
