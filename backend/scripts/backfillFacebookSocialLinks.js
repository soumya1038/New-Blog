const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const User = require('../models/User');

const isApplyMode = process.argv.includes('--apply');

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

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in backend/.env');
  }

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
      facebookUrl,
    });

    if (isApplyMode) {
      const currentSocialMedia = Array.isArray(user.socialMedia) ? user.socialMedia : [];
      user.socialMedia = [...currentSocialMedia, { name: 'Facebook', url: facebookUrl }];
      await user.save();
      updatedUsers += 1;
    }
  }

  console.log('[facebook-backfill] Summary');
  console.log(`- Users with linked Facebook OAuth ID: ${matchedUsers}`);
  console.log(`- Users already having Facebook social link: ${alreadyLinkedUsers}`);
  console.log(`- Users missing Facebook social link: ${missingLinkUsers}`);
  console.log(`- Users updated in this run: ${updatedUsers}`);

  if (!isApplyMode && preview.length > 0) {
    const sample = preview.slice(0, 10);
    console.log('[facebook-backfill] Preview (first 10 users):');
    sample.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.username} -> ${item.facebookUrl}`);
    });
    console.log(
      '[facebook-backfill] Run with --apply to persist these updates.'
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
