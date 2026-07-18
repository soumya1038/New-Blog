const cloudinary = require('./cloudinary');
const { normalizeCloudinaryPublicId } = require('./cloudinaryPublicIds');
const { logError } = require('./safeErrorLog');

const CLOUDINARY_RESOURCE_TYPES = ['image', 'video', 'raw'];
const CLOUDINARY_DELIVERY_TYPES = ['upload', 'authenticated', 'private'];
const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getCloudinaryCleanupConcurrency = () =>
  toPositiveInt(process.env.CLOUDINARY_CLEANUP_CONCURRENCY, 4);

const runWithBoundedConcurrency = async (items = [], concurrency, handler) => {
  if (!items.length) return;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  const workers = Array.from({ length: workerCount }, async (_, workerIndex) => {
    for (let index = workerIndex; index < items.length; index += workerCount) {
      await handler(items[index], index);
    }
  });

  await Promise.all(workers);
};

const compactCloudinaryPublicIds = (values = []) => {
  const ids = [];
  const input = Array.isArray(values) ? values : [values];

  input.forEach((value) => {
    const publicId = normalizeCloudinaryPublicId(value);
    if (publicId && !ids.includes(publicId)) {
      ids.push(publicId);
    }
  });

  return ids;
};

const deleteCloudinaryPublicIdAcrossResourceTypes = async (value) => {
  const publicId = normalizeCloudinaryPublicId(value);
  if (!publicId) return false;

  const results = await Promise.allSettled(
    CLOUDINARY_RESOURCE_TYPES.flatMap((resourceType) =>
      CLOUDINARY_DELIVERY_TYPES.map((deliveryType) => cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: deliveryType,
        invalidate: true
      }))
    )
  );

  const hasCloudinaryResponse = results.some((result) => result.status === 'fulfilled');
  if (!hasCloudinaryResponse) {
    const firstError = results.find((result) => result.status === 'rejected')?.reason;
    throw firstError || new Error('Cloudinary cleanup failed');
  }

  return true;
};

const deleteCloudinaryPublicIdsAcrossResourceTypes = async (values = [], options = {}) => {
  const ids = compactCloudinaryPublicIds(values);
  if (!ids.length) return;

  await runWithBoundedConcurrency(ids, getCloudinaryCleanupConcurrency(), async (publicId) => {
    try {
      await deleteCloudinaryPublicIdAcrossResourceTypes(publicId);
    } catch (error) {
      if (options.throwOnError) throw error;
      logError('Cloudinary cleanup error:', error);
    }
  });
};

const deleteCloudinaryPublicIds = async (values = [], options = {}) => {
  const ids = compactCloudinaryPublicIds(values);
  if (!ids.length) return;
  const { throwOnError = false, ...destroyOptions } = options;

  await runWithBoundedConcurrency(ids, getCloudinaryCleanupConcurrency(), async (publicId) => {
    try {
      await cloudinary.uploader.destroy(publicId, { invalidate: true, ...destroyOptions });
    } catch (error) {
      if (throwOnError) throw error;
      logError('Cloudinary cleanup error:', error);
    }
  });
};

module.exports = {
  compactCloudinaryPublicIds,
  deleteCloudinaryPublicIdAcrossResourceTypes,
  deleteCloudinaryPublicIdsAcrossResourceTypes,
  deleteCloudinaryPublicIds,
  runWithBoundedConcurrency
};
