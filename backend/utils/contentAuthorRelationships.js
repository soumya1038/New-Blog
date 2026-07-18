const mongoose = require('mongoose');
const User = require('../models/User');

const normalizeId = (value) => String(value?._id || value || '');

const resolveContentAuthorRelationships = async ({ viewer, authorIds, maxTimeMS = 5000 }) => {
  const viewerId = normalizeId(viewer);
  const normalizedAuthorIds = [...new Set((authorIds || []).map(normalizeId))]
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  const viewerBlockedIds = new Set((viewer?.blockedUsers || []).map(normalizeId));
  let followedAuthorIds = new Set();
  let authorsBlockingViewerIds = new Set();

  if (viewerId && normalizedAuthorIds.length > 0) {
    const [followedAuthors, authorsBlockingViewer] = await Promise.all([
      User.find({ _id: { $in: normalizedAuthorIds }, followers: viewer._id })
        .select('_id')
        .maxTimeMS(maxTimeMS)
        .lean(),
      User.find({ _id: { $in: normalizedAuthorIds }, blockedUsers: viewer._id })
        .select('_id')
        .maxTimeMS(maxTimeMS)
        .lean(),
    ]);
    followedAuthorIds = new Set(followedAuthors.map((user) => normalizeId(user)));
    authorsBlockingViewerIds = new Set(authorsBlockingViewer.map((user) => normalizeId(user)));
  }

  return new Map(normalizedAuthorIds.map((targetId) => {
    const isOwner = Boolean(viewerId && viewerId === targetId);
    const isBlocked = !isOwner && (
      viewerBlockedIds.has(targetId) || authorsBlockingViewerIds.has(targetId)
    );
    return [targetId, {
      viewerId,
      targetId,
      isOwner,
      isBlocked,
      isFollower: !isOwner && !isBlocked && followedAuthorIds.has(targetId),
    }];
  }));
};

const getFollowerCount = async (userId, maxTimeMS = 5000) => {
  const normalizedUserId = normalizeId(userId);
  if (!mongoose.Types.ObjectId.isValid(normalizedUserId)) return 0;

  const [result] = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(normalizedUserId) } },
    { $project: { _id: 0, count: { $size: { $ifNull: ['$followers', []] } } } },
  ]).option({ maxTimeMS });
  return Math.max(0, Number(result?.count) || 0);
};

module.exports = {
  getFollowerCount,
  resolveContentAuthorRelationships,
};
