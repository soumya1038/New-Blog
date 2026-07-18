const mongoose = require('mongoose');
require('dotenv').config();

const GroupCall = require('./models/GroupCall');

const CONFIRM_FLAG = '--confirm-end-active-group-calls';
const EXECUTE_FLAG = '--execute';
const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  node cleanup-calls.js',
      `  node cleanup-calls.js ${EXECUTE_FLAG} ${CONFIRM_FLAG}`,
      '',
      'Default mode is dry-run and only counts active calls.',
      `Executing requires both ${EXECUTE_FLAG} and ${CONFIRM_FLAG}.`,
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
    throw new Error('MONGODB_URI is required to inspect or end active calls.');
  }

  const execute = hasFlag(EXECUTE_FLAG);
  if (execute && !hasFlag(CONFIRM_FLAG)) {
    throw new Error(`Ending active calls requires ${CONFIRM_FLAG}.`);
  }

  await mongoose.connect(mongoUri);

  const activeCount = await GroupCall.countDocuments({ status: 'active' });
  if (!execute) {
    console.log(`[cleanup-calls] DRY-RUN active calls: ${activeCount}`);
    console.log(`[cleanup-calls] Add ${EXECUTE_FLAG} ${CONFIRM_FLAG} to end them.`);
    return;
  }

  const result = await GroupCall.updateMany(
    { status: 'active' },
    {
      status: 'ended',
      endedAt: new Date(),
      duration: 0,
    }
  );

  console.log(`[cleanup-calls] Ended ${result.modifiedCount || 0} active call(s).`);
};

run()
  .catch((error) => {
    console.error('[cleanup-calls] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (error) {
      // Ignore disconnect errors.
    }
  });
