const mongoose = require('mongoose');

const FALLBACK_SLUG_PREFIX = 'story';
const MAX_SLUG_HISTORY = 25;

const slugify = (value = '') => {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .trim();
};

const buildFallbackSlug = () => {
  const token = new mongoose.Types.ObjectId().toString().slice(-6);
  return `${FALLBACK_SLUG_PREFIX}-${token}`;
};

const generateUniqueSlug = async ({ Model, title, preferredSlug, excludeId }) => {
  const baseSlug = slugify(preferredSlug || title) || buildFallbackSlug();
  let candidate = baseSlug;
  let suffix = 2;

  // Keep trying until we find an available slug.
  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };

    const existing = await Model.exists(query);
    if (!existing) break;

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const applySlugWithHistory = (doc, nextSlug) => {
  const normalizedNextSlug = slugify(nextSlug);
  if (!normalizedNextSlug) return;

  const previousSlug = doc.slug;
  const history = Array.isArray(doc.slugHistory) ? doc.slugHistory : [];

  if (previousSlug && previousSlug !== normalizedNextSlug) {
    history.unshift(previousSlug);
  }

  const uniqueHistory = [...new Set(history)]
    .filter(Boolean)
    .filter((value) => value !== normalizedNextSlug)
    .slice(0, MAX_SLUG_HISTORY);

  doc.slug = normalizedNextSlug;
  doc.slugHistory = uniqueHistory;
};

const applyPopulate = (query, populate) => {
  if (!populate) return query;
  if (Array.isArray(populate)) {
    populate.forEach((entry) => query.populate(entry));
    return query;
  }
  return query.populate(populate);
};

const resolveDocumentByIdOrSlug = async (Model, identifier, options = {}) => {
  const rawIdentifier = String(identifier || '').trim();
  const { populate } = options;

  if (!rawIdentifier) {
    return { doc: null, resolution: 'missing', requested: rawIdentifier };
  }

  if (mongoose.Types.ObjectId.isValid(rawIdentifier)) {
    const byIdQuery = Model.findById(rawIdentifier);
    const byId = await applyPopulate(byIdQuery, populate);
    if (byId) {
      return { doc: byId, resolution: 'id', requested: rawIdentifier };
    }
  }

  const bySlugQuery = Model.findOne({ slug: rawIdentifier });
  const bySlug = await applyPopulate(bySlugQuery, populate);
  if (bySlug) {
    return { doc: bySlug, resolution: 'slug', requested: rawIdentifier };
  }

  const byLegacySlugQuery = Model.findOne({ slugHistory: rawIdentifier });
  const byLegacySlug = await applyPopulate(byLegacySlugQuery, populate);
  if (byLegacySlug) {
    return {
      doc: byLegacySlug,
      resolution: 'legacy_slug',
      requested: rawIdentifier,
      redirectSlug: byLegacySlug.slug || null
    };
  }

  return { doc: null, resolution: 'not_found', requested: rawIdentifier };
};

module.exports = {
  slugify,
  generateUniqueSlug,
  applySlugWithHistory,
  resolveDocumentByIdOrSlug
};
