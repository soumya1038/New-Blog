const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Message = require('../models/Message');
const cloudinary = require('../utils/cloudinary');

const args = process.argv.slice(2);
const EXECUTE_FLAG = '--execute';
const CONFIRM_FLAG = '--confirm-migrate-message-media';

const hasFlag = flag => args.includes(flag);

const getArgValue = (name, fallback = '') => {
  const inline = args.find(arg => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1]) return args[index + 1];
  return fallback;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const QUERY_MAX_TIME_MS = toPositiveInt(process.env.ORDER_QUERY_MAX_TIME_MS, 5000);
const DEFAULT_BATCH_LIMIT = toPositiveInt(process.env.MESSAGE_MEDIA_MIGRATION_BATCH_LIMIT, 100);
const VALID_RESOURCE_TYPES = new Set(['image', 'video', 'raw']);

const inferResourceType = message => {
  const stored = String(message.cloudinaryResourceType || '').toLowerCase();
  if (VALID_RESOURCE_TYPES.has(stored)) return stored;
  if (message.type === 'voice') return 'video';
  if (message.type === 'image') return 'image';
  return 'raw';
};

const inferFormat = message => {
  const stored = String(message.cloudinaryFormat || '').trim().toLowerCase();
  if (/^[a-z0-9]+$/.test(stored)) return stored;

  const extension = path.extname(message.fileName || '').replace(/^\./, '').toLowerCase();
  if (/^[a-z0-9]+$/.test(extension)) return extension;

  const mimeSubtype = String(message.mimeType || '')
    .split('/')[1]
    ?.split(/[;+]/)[0]
    ?.toLowerCase();
  if (mimeSubtype === 'jpeg') return 'jpg';
  return /^[a-z0-9]+$/.test(mimeSubtype || '') ? mimeSubtype : '';
};

const printUsage = () => {
  console.log([
    'Usage:',
    '  node backend/scripts/migrateMessageMediaToAuthenticated.js',
    `  node backend/scripts/migrateMessageMediaToAuthenticated.js ${EXECUTE_FLAG} ${CONFIRM_FLAG}`,
    '',
    'Default mode is dry-run and only counts legacy public chat-media assets.',
    `Execution requires both ${EXECUTE_FLAG} and ${CONFIRM_FLAG}.`,
    'Options:',
    '  --limit <n>  Maximum messages to inspect. Defaults to MESSAGE_MEDIA_MIGRATION_BATCH_LIMIT or 100.',
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
    throw new Error(`Refusing to migrate message media without ${CONFIRM_FLAG}.`);
  }

  const limit = Math.min(
    toPositiveInt(getArgValue('--limit', DEFAULT_BATCH_LIMIT), DEFAULT_BATCH_LIMIT),
    1000
  );

  await mongoose.connect(process.env.MONGODB_URI);
  const messages = await Message.find({
    cloudinaryPublicId: { $exists: true, $ne: '' },
    type: { $in: ['voice', 'image', 'document'] },
    $or: [
      { cloudinaryDeliveryType: { $exists: false } },
      { cloudinaryDeliveryType: { $in: ['', 'upload'] } },
    ],
  })
    .select('_id type fileName mimeType cloudinaryPublicId voiceUrl fileUrl +cloudinaryResourceType +cloudinaryDeliveryType +cloudinaryFormat')
    .sort({ _id: 1 })
    .limit(limit)
    .lean()
    .maxTimeMS(QUERY_MAX_TIME_MS);

  let migrated = 0;
  let failed = 0;

  console.log(`[message-media-migration] ${execute ? 'EXECUTE' : 'DRY-RUN'}`);
  console.log(`- Legacy public media records found: ${messages.length}`);

  for (const message of messages) {
    const resourceType = inferResourceType(message);
    const format = inferFormat(message);
    if (!execute) continue;

    try {
      const result = await cloudinary.uploader.rename(
        message.cloudinaryPublicId,
        message.cloudinaryPublicId,
        {
          resource_type: resourceType,
          type: 'upload',
          to_type: 'authenticated',
          overwrite: true,
          invalidate: true,
        }
      );

      const updateResult = await Message.updateOne(
        {
          _id: message._id,
          cloudinaryPublicId: message.cloudinaryPublicId,
          $or: [
            { cloudinaryDeliveryType: { $exists: false } },
            { cloudinaryDeliveryType: { $in: ['', 'upload'] } },
          ],
        },
        {
          $set: {
            cloudinaryResourceType: result.resource_type || resourceType,
            cloudinaryDeliveryType: 'authenticated',
            cloudinaryFormat: result.format || format,
            voiceUrl: '',
            fileUrl: '',
          },
        }
      ).maxTimeMS(QUERY_MAX_TIME_MS);

      if (updateResult.modifiedCount !== 1) {
        throw new Error('Asset migrated but message metadata was not updated. Re-run this migration.');
      }
      migrated += 1;
    } catch (error) {
      failed += 1;
      console.error(`- Message ${message._id} failed: ${error.message}`);
    }
  }

  console.log(`- Media records migrated: ${migrated}`);
  console.log(`- Media records failed: ${failed}`);
  if (!execute && messages.length > 0) {
    console.log(`- Re-run with ${EXECUTE_FLAG} ${CONFIRM_FLAG} to migrate this batch.`);
  }
  if (messages.length === limit) {
    console.log(`- Batch limit reached (${limit}); re-run until no legacy records remain.`);
  }
  if (failed > 0) process.exitCode = 1;
};

run()
  .catch(error => {
    console.error('[message-media-migration] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
