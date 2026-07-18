const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const QUERY_MAX_TIME_MS = toPositiveInt(process.env.AUTH_USER_QUERY_MAX_TIME_MS, 5000);
const MAX_DUPLICATE_GROUPS = toPositiveInt(process.env.USER_EMAIL_AUDIT_MAX_GROUPS, 100);

const maskEmail = (email = '') => {
  const [name = '', domain = ''] = String(email || '').split('@');
  if (!domain) return '';
  return `${name.slice(0, 2)}${name.length > 2 ? '***' : '*'}@${domain}`;
};

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to audit duplicate user emails.');
  }

  await mongoose.connect(mongoUri);

  const duplicates = await User.aggregate([
    {
      $project: {
        username: 1,
        email: 1,
        emailNormalized: {
          $toLower: {
            $trim: {
              input: { $ifNull: ['$email', ''] },
            },
          },
        },
      },
    },
    {
      $match: {
        emailNormalized: { $ne: '' },
      },
    },
    {
      $group: {
        _id: '$emailNormalized',
        count: { $sum: 1 },
        users: {
          $push: {
            id: '$_id',
            username: '$username',
            email: '$email',
          },
        },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
    {
      $sort: { count: -1, _id: 1 },
    },
    {
      $limit: MAX_DUPLICATE_GROUPS,
    },
  ]).option({ maxTimeMS: QUERY_MAX_TIME_MS });

  if (duplicates.length) {
    console.error('Duplicate non-empty user emails found. Resolve these before building the unique email index:');
    console.error(JSON.stringify(duplicates.map((group) => ({
      emailNormalized: maskEmail(group._id),
      count: group.count,
      users: (group.users || []).map((user) => ({
        id: user.id,
        username: user.username,
        email: maskEmail(user.email),
      })),
    })), null, 2));
    process.exitCode = 1;
    return;
  }

  console.log('No duplicate non-empty user emails found.');
};

main()
  .catch((error) => {
    console.error('[auditDuplicateUserEmails] failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
