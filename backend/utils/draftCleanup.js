const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const cloudinary = require('./cloudinary');
const { logError } = require('./safeErrorLog');

const DEFAULT_DRAFT_CLEANUP_BATCH_LIMIT = Math.max(1, Number(process.env.DRAFT_CLEANUP_BATCH_LIMIT) || 25);
const DEFAULT_DRAFT_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.DRAFT_QUERY_MAX_TIME_MS) || 5000);

const deleteDraftImages = async (draft) => {
  const publicIds = [
    draft.cloudinaryPublicId,
    ...(Array.isArray(draft.galleryImagePublicIds) ? draft.galleryImagePublicIds : [])
  ].filter(Boolean);

  for (const publicId of publicIds) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      logError('Cloudinary draft cleanup error:', error);
    }
  }
};

const deleteDraftWithRelations = async ({ Model, commentField, notificationField, draft, maxTimeMS = DEFAULT_DRAFT_QUERY_MAX_TIME_MS }) => {
  await deleteDraftImages(draft);

  const relationDeletes = [
    Comment.deleteMany({ [commentField]: draft._id }).maxTimeMS(maxTimeMS)
  ];

  if (notificationField) {
    relationDeletes.push(Notification.deleteMany({ [notificationField]: draft._id }).maxTimeMS(maxTimeMS));
  }

  await Promise.all([
    ...relationDeletes,
    Model.findByIdAndDelete(draft._id).maxTimeMS(maxTimeMS)
  ]);
};

const cleanupOldDraftBatch = async ({ Model, commentField, notificationField, filter, limit, maxTimeMS = DEFAULT_DRAFT_QUERY_MAX_TIME_MS }) => {
  const batchLimit = Math.max(1, Number(limit) || DEFAULT_DRAFT_CLEANUP_BATCH_LIMIT);
  const oldDrafts = await Model.find(filter)
    .select('cloudinaryPublicId galleryImagePublicIds')
    .sort({ updatedAt: 1, _id: 1 })
    .limit(batchLimit)
    .maxTimeMS(maxTimeMS);

  for (const draft of oldDrafts) {
    await deleteDraftWithRelations({ Model, commentField, notificationField, draft, maxTimeMS });
  }

  return oldDrafts.length;
};

module.exports = {
  cleanupOldDraftBatch,
  deleteDraftWithRelations
};
