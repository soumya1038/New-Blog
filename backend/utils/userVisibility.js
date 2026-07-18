const getUserId = (value) => String(value?._id || value || '');

const normalizeStatusAudience = (value) => {
  const audience = String(value || 'public').toLowerCase();
  if (['public', 'followers', 'private'].includes(audience)) return audience;
  return 'public';
};

const isStatusActive = (status) => {
  if (!status?.expiresAt) return false;
  return new Date(status.expiresAt) > new Date();
};

const hasUserId = (ids, userId) => {
  const normalizedUserId = getUserId(userId);
  if (!normalizedUserId || !Array.isArray(ids)) return false;
  return ids.some((id) => getUserId(id) === normalizedUserId);
};

const isFollowerOfTarget = (targetUser, viewer) => hasUserId(targetUser?.followers, viewer);

const isBlockedBetweenUsers = (viewer, targetUser) => {
  const viewerId = getUserId(viewer);
  const targetId = getUserId(targetUser);
  if (!viewerId || !targetId || viewerId === targetId) return false;

  return hasUserId(viewer?.blockedUsers, targetId) || hasUserId(targetUser?.blockedUsers, viewerId);
};

const getViewerRelationshipToTarget = (viewer, targetUser) => {
  const viewerId = getUserId(viewer);
  const targetId = getUserId(targetUser);
  const isOwner = Boolean(viewerId && targetId && viewerId === targetId);
  const isBlocked = isBlockedBetweenUsers(viewer, targetUser);

  return {
    viewerId,
    targetId,
    isOwner,
    isFollower: !isOwner && !isBlocked && isFollowerOfTarget(targetUser, viewerId),
    isBlocked,
  };
};

const canViewerSeeStatus = (status, { isOwner = false, isFollower = false, isBlocked = false } = {}) => {
  if (!isStatusActive(status)) return false;
  if (isOwner) return true;
  if (isBlocked) return false;

  const audience = normalizeStatusAudience(status?.audience);
  if (audience === 'public') return true;
  if (audience === 'followers' && isFollower) return true;
  return false;
};

const filterVisibleStatusesForViewer = (allStatuses = [], relationship = {}) =>
  (Array.isArray(allStatuses) ? allStatuses : []).filter((status) =>
    canViewerSeeStatus(status, relationship)
  );

const toPlainStatus = (status) => {
  if (!status) return {};
  if (typeof status.toObject === 'function') return status.toObject();
  return { ...status };
};

const sanitizeStatusForViewer = (status, relationship = {}) => {
  const safeStatus = toPlainStatus(status);
  const seenBy = Array.isArray(safeStatus.seenBy) ? safeStatus.seenBy : [];
  const seenByCount = Math.max(Number(safeStatus.seenByCount) || 0, seenBy.length);
  const hasMedia = Boolean(safeStatus.mediaPublicId || safeStatus.image || safeStatus.video);
  const mediaProtected = safeStatus.mediaDeliveryType === 'authenticated';

  delete safeStatus.seenBy;
  delete safeStatus.mediaPublicId;
  delete safeStatus.mediaFormat;
  delete safeStatus.mediaResourceType;
  delete safeStatus.mediaDeliveryType;
  if (mediaProtected) {
    safeStatus.image = '';
    safeStatus.video = '';
  }
  safeStatus.hasMedia = hasMedia;
  safeStatus.mediaProtected = mediaProtected;

  if (relationship.isOwner) {
    return {
      ...safeStatus,
      seenByCount,
    };
  }

  delete safeStatus.seenByCount;
  delete safeStatus.__v;

  return safeStatus;
};

const sanitizeStatusesForViewer = (statuses = [], relationship = {}) =>
  (Array.isArray(statuses) ? statuses : []).map((status) =>
    sanitizeStatusForViewer(status, relationship)
  );

module.exports = {
  canViewerSeeStatus,
  filterVisibleStatusesForViewer,
  getUserId,
  getViewerRelationshipToTarget,
  hasUserId,
  isBlockedBetweenUsers,
  isFollowerOfTarget,
  isStatusActive,
  normalizeStatusAudience,
  sanitizeStatusForViewer,
  sanitizeStatusesForViewer,
};
