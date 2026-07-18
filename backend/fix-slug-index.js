// Maintenance helper for removing the legacy unique blog slug index.
// Dry-run by default; use --execute --confirm-drop-blog-slug-index to apply.

const mongoose = require('mongoose');
require('dotenv').config();

const INDEX_NAME = 'slug_1';
const EXECUTE_FLAG = '--execute';
const CONFIRM_FLAG = '--confirm-drop-blog-slug-index';
const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  node fix-slug-index.js',
      `  node fix-slug-index.js ${EXECUTE_FLAG} ${CONFIRM_FLAG}`,
      '',
      `Default mode is dry-run and only checks whether ${INDEX_NAME} exists.`,
      `Dropping the index requires both ${EXECUTE_FLAG} and ${CONFIRM_FLAG}.`,
    ].join('\n')
  );
};

const run = async () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to inspect or drop the blog slug index.');
  }

  const execute = hasFlag(EXECUTE_FLAG);
  if (execute && !hasFlag(CONFIRM_FLAG)) {
    throw new Error(`Dropping ${INDEX_NAME} requires ${CONFIRM_FLAG}.`);
  }

  await mongoose.connect(mongoUri);
  const indexes = await mongoose.connection.collection('blogs').indexes();
  const hasSlugIndex = indexes.some((index) => index.name === INDEX_NAME);

  if (!hasSlugIndex) {
    console.log(`[fix-slug-index] ${INDEX_NAME} does not exist.`);
    return;
  }

  if (!execute) {
    console.log(`[fix-slug-index] DRY-RUN ${INDEX_NAME} exists and would be dropped.`);
    console.log(`[fix-slug-index] Add ${EXECUTE_FLAG} ${CONFIRM_FLAG} to drop it.`);
    return;
  }

  await mongoose.connection.collection('blogs').dropIndex(INDEX_NAME);
  console.log(`[fix-slug-index] Dropped ${INDEX_NAME}.`);
};

run()
  .catch((error) => {
    console.error('[fix-slug-index] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (error) {
      // Ignore disconnect errors.
    }
  });
