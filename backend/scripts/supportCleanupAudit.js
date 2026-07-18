const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const SupportRequest = require('../models/SupportRequest');

const args = process.argv.slice(2);
const VALID_TYPES = new Set(['support', 'report', 'appeal']);
const VALID_STATUSES = new Set(['open', 'reviewing', 'waiting_for_user', 'resolved', 'closed']);

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

const QUERY_MAX_TIME_MS = toPositiveInt(process.env.SUPPORT_QUERY_MAX_TIME_MS, 5000);

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const maskEmail = (email) => {
  const [name = '', domain = ''] = String(email || '').split('@');
  if (!domain) return '';
  const visible = name.slice(0, 2);
  return `${visible}${name.length > 2 ? '***' : '*'}@${domain}`;
};

const parseStatuses = () => {
  const raw = getArgValue('--status', '');
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildQuery = ({ prefix, type, statuses, olderThanHours }) => {
  const query = {
    subject: { $regex: new RegExp(`^${escapeRegExp(prefix)}`, 'i') },
  };

  if (['support', 'report', 'appeal'].includes(type)) {
    query.type = type;
  }

  if (statuses.length > 0) {
    query.status = { $in: statuses };
  }

  if (olderThanHours > 0) {
    query.createdAt = { $lte: new Date(Date.now() - olderThanHours * 60 * 60 * 1000) };
  }

  return query;
};

const formatRecord = (record) => ({
  id: String(record._id),
  referenceNumber: record.referenceNumber,
  type: record.type,
  status: record.status,
  priority: record.priority,
  subject: record.subject,
  email: maskEmail(record.email),
  createdAt: record.createdAt?.toISOString?.() || '',
  updatedAt: record.updatedAt?.toISOString?.() || '',
});

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  node backend/scripts/supportCleanupAudit.js --prefix QA-CLEANUP',
      '  node backend/scripts/supportCleanupAudit.js --prefix QA-CLEANUP --type report --status open,reviewing',
      '  node backend/scripts/supportCleanupAudit.js --prefix QA-CLEANUP --mode close --owner "Support QA" --execute',
      '  node backend/scripts/supportCleanupAudit.js --prefix QA-CLEANUP --mode delete --execute --confirm-delete-support-cleanup-records',
      '',
      'Options:',
      '  --prefix <value>   Required subject prefix. Defaults to QA-CLEANUP.',
      '  --type <value>     Optional support, report, or appeal filter.',
      '  --status <values>  Optional comma-separated status filter.',
      '  --older-than-hours <n> Optional age filter.',
      '  --limit <n>        Preview or execute limit. Defaults to 50.',
      '  --mode <value>     list, close, or delete. Defaults to list.',
      '  --owner <value>    Cleanup owner recorded when closing records.',
      '  --reason <value>   Cleanup reason recorded when closing records.',
      '  --execute          Apply close or delete mode. Without this, the command is dry-run only.',
      '  --json             Print machine-readable output.',
      '',
      'Safety:',
      '  Delete mode also requires --confirm-delete-support-cleanup-records.',
      '  Only subjects beginning with the chosen prefix are matched.',
    ].join('\n')
  );
};

const closeRecords = async ({ records, owner, reason }) => {
  const now = new Date();
  let updated = 0;

  for (const record of records) {
    const note = `[QA cleanup ${now.toISOString()}] ${owner || 'Unrecorded owner'}: ${
      reason || 'Closed after release verification cleanup.'
    }`;
    const existingNotes = String(record.adminNotes || '').trim();
    const result = await SupportRequest.updateOne(
      { _id: record._id },
      {
        $set: {
          status: 'closed',
          resolvedAt: now,
          adminNotes: [existingNotes, note].filter(Boolean).join('\n').slice(-5000),
        },
      }
    ).maxTimeMS(QUERY_MAX_TIME_MS);
    updated += result.modifiedCount || 0;
  }

  return updated;
};

const deleteRecords = async (records) => {
  const ids = records.map((record) => record._id);
  if (ids.length === 0) return 0;
  const result = await SupportRequest.deleteMany({ _id: { $in: ids } })
    .maxTimeMS(QUERY_MAX_TIME_MS);
  return result.deletedCount || 0;
};

const buildPayload = ({ mode, execute, query, records, changedCount }) => ({
  mode,
  execute,
  query,
  matchedCount: records.length,
  changedCount,
  records: records.map(formatRecord),
  completionRule:
    'Record this output in release evidence and do not mark cleanup complete until the owner confirms the records were closed, deleted, or intentionally retained.',
});

const run = async () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in backend/.env');
  }

  const prefix = String(getArgValue('--prefix', 'QA-CLEANUP')).trim();
  const type = String(getArgValue('--type', '')).trim().toLowerCase();
  const statuses = parseStatuses();
  const olderThanHours = toPositiveInt(getArgValue('--older-than-hours', '0'), 0);
  const limit = Math.min(toPositiveInt(getArgValue('--limit', '50'), 50), 200);
  const mode = String(getArgValue('--mode', 'list')).trim().toLowerCase();
  const owner = String(getArgValue('--owner', '')).trim();
  const reason = String(getArgValue('--reason', '')).trim();
  const execute = hasFlag('--execute');
  const json = hasFlag('--json');

  if (!prefix || prefix.length < 3) {
    throw new Error('A cleanup prefix of at least three characters is required.');
  }

  if (!['list', 'close', 'delete'].includes(mode)) {
    throw new Error('--mode must be list, close, or delete.');
  }

  if (type && !VALID_TYPES.has(type)) {
    throw new Error('--type must be support, report, or appeal.');
  }

  const invalidStatuses = statuses.filter((status) => !VALID_STATUSES.has(status));
  if (invalidStatuses.length > 0) {
    throw new Error(`Invalid --status value(s): ${invalidStatuses.join(', ')}.`);
  }

  if (mode === 'delete' && execute && !hasFlag('--confirm-delete-support-cleanup-records')) {
    throw new Error('Delete mode requires --confirm-delete-support-cleanup-records.');
  }

  if (execute && mode === 'close' && !owner) {
    throw new Error('Closing records requires --owner so release evidence names the cleanup owner.');
  }

  const query = buildQuery({ prefix, type, statuses, olderThanHours });
  await mongoose.connect(process.env.MONGODB_URI);

  const records = await SupportRequest.find(query)
    .select('_id referenceNumber type status priority subject email createdAt updatedAt adminNotes')
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean()
    .maxTimeMS(QUERY_MAX_TIME_MS);

  let changedCount = 0;
  if (execute && mode === 'close') {
    changedCount = await closeRecords({ records, owner, reason });
  } else if (execute && mode === 'delete') {
    changedCount = await deleteRecords(records);
  }

  const payload = buildPayload({ mode, execute, query, records, changedCount });

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`[support-cleanup] ${execute ? 'EXECUTE' : 'DRY-RUN'} ${mode}`);
  console.log(`- Matched records: ${payload.matchedCount}`);
  console.log(`- Changed records: ${payload.changedCount}`);
  console.log(`- Prefix: ${prefix}`);
  console.log(`- Limit: ${limit}`);
  console.log('- Records:');
  if (payload.records.length === 0) {
    console.log('  - None');
  } else {
    payload.records.forEach((record) => {
      console.log(
        `  - ${record.referenceNumber} | ${record.type} | ${record.status} | ${record.subject} | ${record.email}`
      );
    });
  }
  console.log(`- Completion rule: ${payload.completionRule}`);
};

run()
  .catch((error) => {
    console.error('[support-cleanup] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (error) {
      // Ignore disconnect errors.
    }
  });
