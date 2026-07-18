const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const User = require('../models/User');

const args = process.argv.slice(2);
const EXECUTE_FLAG = '--execute';
const CONFIRM_FLAG = '--confirm-backfill-facebook-social-links';
const isApplyMode = args.includes('--apply') || args.includes(EXECUTE_FLAG);

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

const QUERY_MAX_TIME_MS = toPositiveInt(process.env.SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS, 5000);
const DEFAULT_LIMIT = toPositiveInt(process.env.FACEBOOK_SOCIAL_BACKFILL_LIMIT, 500);

const hasFacebookLink = (socialMedia = []) => {
  const links = Array.isArray(socialMedia) ? socialMedia : [];
  return links.some((entry) => {
    const name = String(entry?.name || '').toLowerCase();
    const url = String(entry?.url || '').toLowerCase();
    return name.includes('facebook') || url.includes('facebook.com');
  });
};

const buildFacebookUrl = (facebookId) => {
  const id = String(facebookId || '').trim();
  if (!id) return '';
  return `https://www.facebook.com/${encodeURIComponent(id)}`;
};

const maskFacebookUrl = (facebookUrl = '') => {
  const value = String(facebookUrl || '');
  if (!value) return '';
  return value.replace(/facebook\.com\/(.+)$/i, (_, id) => {
    const decoded = decodeURIComponent(id);
    return `facebook.com/${decoded.slice(0, 4)}${decoded.length > 4 ? '...' : ''}`;
  });
};

const facebookSocialLinkMatch = {
  $or: [
    { name: /facebook/i },
    { url: /facebook\.com/i },
  ],
};

const printUsage = () => {
  console.log([
    'Usage:',
    '  node backend/scripts/backfillFacebookSocialLinks.js',
    `  node backend/scripts/backfillFacebookSocialLinks.js ${EXECUTE_FLAG} ${CONFIRM_FLAG}`,
    '',
    'Default mode is dry-run and only previews the number of users to update.',
    `Execution requires ${EXECUTE_FLAG} or --apply plus ${CONFIRM_FLAG}.`,
    'Options:',
    '  --limit <n>  Maximum users to inspect in this run. Defaults to FACEBOOK_SOCIAL_BACKFILL_LIMIT or 500.',
  ].join('\n'));
};

const run = async () => {
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in backend/.env');
  }

  if (isApplyMode && !args.includes(CONFIRM_FLAG)) {
    throw new Error(`Refusing to apply Facebook social-link backfill without ${CONFIRM_FLAG}.`);
  }

  const limit = Math.min(toPositiveInt(getArgValue('--limit', DEFAULT_LIMIT), DEFAULT_LIMIT), 5000);

  console.log(
    `[facebook-backfill] Starting in ${isApplyMode ? 'APPLY' : 'DRY-RUN'} mode`
  );

  await mongoose.connect(process.env.MONGODB_URI);

  let matchedUsers = 0;
  let alreadyLinkedUsers = 0;
  let missingLinkUsers = 0;
  let updatedUsers = 0;
  const preview = [];

  const cursor = User.find({
    'oauthProviders.facebook.id': { $exists: true, $ne: '' },
  })
    .select('_id username socialMedia oauthProviders.facebook.id')
    .sort({ _id: 1 })
    .limit(limit)
    .lean()
    .maxTimeMS(QUERY_MAX_TIME_MS)
    .cursor();

  for await (const user of cursor) {
    matchedUsers += 1;

    if (hasFacebookLink(user.socialMedia)) {
      alreadyLinkedUsers += 1;
      continue;
    }

    const facebookId = String(user?.oauthProviders?.facebook?.id || '').trim();
    const facebookUrl = buildFacebookUrl(facebookId);
    if (!facebookUrl) {
      continue;
    }

    missingLinkUsers += 1;
    preview.push({
      userId: String(user._id),
      username: user.username,
      facebookUrl: maskFacebookUrl(facebookUrl),
    });

    if (isApplyMode) {
      const result = await User.updateOne(
        {
          _id: user._id,
          $nor: [{ socialMedia: { $elemMatch: facebookSocialLinkMatch } }],
        },
        {
          $push: { socialMedia: { name: 'Facebook', url: facebookUrl } },
        }
      ).maxTimeMS(QUERY_MAX_TIME_MS);
      updatedUsers += result.modifiedCount || 0;
    }
  }

  console.log('[facebook-backfill] Summary');
  console.log(`- Users with linked Facebook OAuth ID: ${matchedUsers}`);
  console.log(`- Users already having Facebook social link: ${alreadyLinkedUsers}`);
  console.log(`- Users missing Facebook social link: ${missingLinkUsers}`);
  console.log(`- Users updated in this run: ${updatedUsers}`);
  if (matchedUsers === limit) {
    console.log(`- Batch limit reached (${limit}); re-run until no users are missing the link.`);
  }

  if (!isApplyMode && preview.length > 0) {
    const sample = preview.slice(0, 10);
    console.log('[facebook-backfill] Preview (first 10 users):');
    sample.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.username} -> ${item.facebookUrl}`);
    });
    console.log(
      `[facebook-backfill] Run with ${EXECUTE_FLAG} ${CONFIRM_FLAG} to persist these updates.`
    );
  }
};

run()
  .catch((error) => {
    console.error('[facebook-backfill] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (error) {
      // Ignore disconnect errors
    }
  });
