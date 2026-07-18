const PUBLIC_ID_MAX_LENGTH = 300;
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_./-]+$/;

const getUserScopedImageFolder = (userId) => `blog-images/${userId}`;
const getUserScopedProductFolder = (userId, type) => `lekhon/content-products/${userId}/${type}`;

const normalizeCloudinaryPublicId = (value) => {
  const publicId = String(value || '').trim().replace(/^\/+|\/+$/g, '');
  if (
    !publicId ||
    publicId.length > PUBLIC_ID_MAX_LENGTH ||
    publicId.includes('\\') ||
    publicId.split('/').includes('..') ||
    !PUBLIC_ID_PATTERN.test(publicId)
  ) {
    return '';
  }
  return publicId;
};

const isUserScopedContentPublicId = (userId, publicId) => {
  const normalized = normalizeCloudinaryPublicId(publicId);
  if (!normalized || !userId) return false;

  const id = userId.toString();
  return [
    `${getUserScopedImageFolder(id)}/`,
    `${getUserScopedProductFolder(id, 'originals')}/`,
    `${getUserScopedProductFolder(id, 'transparent')}/`
  ].some((prefix) => normalized.startsWith(prefix));
};

const normalizeAllowedPublicId = (value, userId, allowedExisting = []) => {
  const publicId = normalizeCloudinaryPublicId(value);
  if (!publicId) return { publicId: '' };

  const existing = new Set(
    allowedExisting
      .map(normalizeCloudinaryPublicId)
      .filter(Boolean)
  );

  if (existing.has(publicId) || isUserScopedContentPublicId(userId, publicId)) {
    return { publicId };
  }

  return { error: 'Invalid image ownership' };
};

const normalizeAllowedPublicIds = (values = [], userId, allowedExisting = []) => {
  const input = Array.isArray(values) ? values : [];
  const normalized = [];

  for (const value of input) {
    const result = normalizeAllowedPublicId(value, userId, allowedExisting);
    if (result.error) return { error: result.error };
    if (result.publicId && !normalized.includes(result.publicId)) {
      normalized.push(result.publicId);
    }
  }

  return { publicIds: normalized };
};

module.exports = {
  getUserScopedImageFolder,
  getUserScopedProductFolder,
  normalizeCloudinaryPublicId,
  isUserScopedContentPublicId,
  normalizeAllowedPublicId,
  normalizeAllowedPublicIds
};
