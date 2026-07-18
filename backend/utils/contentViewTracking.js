const crypto = require('crypto');
const mongoose = require('mongoose');
const { getDedicatedSecret } = require('./secrets');

const DEFAULT_MAX_VIEWED_BY_ENTRIES = 5000;
const MAX_VIEWER_IP_LENGTH = 80;
const MIN_SECRET_LENGTH = 32;

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_VIEWED_BY_ENTRIES = toPositiveInt(
  process.env.CONTENT_VIEWED_BY_MAX_ENTRIES,
  DEFAULT_MAX_VIEWED_BY_ENTRIES
);

const CONTENT_VIEW_QUERY_MAX_TIME_MS = toPositiveInt(
  process.env.CONTENT_VIEW_QUERY_MAX_TIME_MS,
  5000
);

const cleanViewerIp = (value = '') =>
  String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, MAX_VIEWER_IP_LENGTH);

const getContentViewHashSecret = () => {
  const dedicated = String(process.env.CONTENT_VIEW_HASH_SECRET || '').trim();
  if (dedicated) {
    if (dedicated.length < MIN_SECRET_LENGTH) {
      throw new Error(`CONTENT_VIEW_HASH_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    return dedicated;
  }

  return getDedicatedSecret({ key: 'API_KEY_HASH_SECRET' });
};

const hashViewerIp = (ip) =>
  `hmac-sha256:v1:${crypto
    .createHmac('sha256', getContentViewHashSecret())
    .update(ip)
    .digest('hex')}`;

const buildPublishedIdentifierFilter = (identifier, { allowSlug = true } = {}) => {
  const rawIdentifier = String(identifier || '').trim();
  if (!rawIdentifier) return null;

  const identityFilters = [];
  if (mongoose.Types.ObjectId.isValid(rawIdentifier)) {
    identityFilters.push({ _id: rawIdentifier });
  }
  if (allowSlug) {
    identityFilters.push({ slug: rawIdentifier }, { slugHistory: rawIdentifier });
  }

  if (!identityFilters.length) return null;

  return {
    isDraft: false,
    isScheduled: false,
    $or: identityFilters,
  };
};

const buildViewerIdentity = ({ userId, ip }) => {
  if (userId) {
    return { userId };
  }

  const legacyIp = cleanViewerIp(ip);
  if (!legacyIp) return null;

  return {
    ipHash: hashViewerIp(legacyIp),
    legacyIp,
  };
};

const buildViewerFilter = (viewer) => {
  if (viewer.userId) {
    return { viewedBy: { $not: { $elemMatch: { user: viewer.userId } } } };
  }

  return {
    $nor: [
      { viewedBy: { $elemMatch: { ipHash: viewer.ipHash } } },
      { viewedBy: { $elemMatch: { ip: viewer.legacyIp } } },
    ],
  };
};

const buildViewerEntry = (viewer) => {
  const entry = { viewedAt: new Date() };
  if (viewer.userId) {
    entry.user = viewer.userId;
  } else {
    entry.ipHash = viewer.ipHash;
  }
  return entry;
};

const trackPublishedContentView = async ({
  Model,
  identifier,
  userId,
  ip,
  allowSlug = true,
}) => {
  const baseFilter = buildPublishedIdentifierFilter(identifier, { allowSlug });
  const viewer = buildViewerIdentity({ userId, ip });

  if (!baseFilter || !viewer) {
    return { found: false, counted: false, views: 0 };
  }

  const updated = await Model.findOneAndUpdate(
    {
      ...baseFilter,
      ...buildViewerFilter(viewer),
    },
    {
      $inc: { views: 1 },
      $push: {
        viewedBy: {
          $each: [buildViewerEntry(viewer)],
          $slice: -MAX_VIEWED_BY_ENTRIES,
        },
      },
    },
    {
      new: true,
      projection: { views: 1 },
    }
  ).maxTimeMS(CONTENT_VIEW_QUERY_MAX_TIME_MS).lean();

  if (updated) {
    return { found: true, counted: true, views: updated.views || 0 };
  }

  const existing = await Model.findOne(baseFilter)
    .select('views')
    .maxTimeMS(CONTENT_VIEW_QUERY_MAX_TIME_MS)
    .lean();
  if (!existing) {
    return { found: false, counted: false, views: 0 };
  }

  return { found: true, counted: false, views: existing.views || 0 };
};

module.exports = {
  buildViewerIdentity,
  hashViewerIp,
  MAX_VIEWED_BY_ENTRIES,
  trackPublishedContentView,
};
