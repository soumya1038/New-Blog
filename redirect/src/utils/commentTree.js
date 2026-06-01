const sameId = (left, right) => String(left || '') === String(right || '');

export const updateCommentsById = (comments, commentId, updater) => {
  let changed = false;

  const nextComments = comments.map((comment) => {
    if (!sameId(comment._id, commentId)) return comment;
    changed = true;
    return updater(comment);
  });

  return changed ? nextComments : comments;
};

export const updateReplyMapById = (replyMap, commentId, updater) => {
  let changed = false;
  const nextReplyMap = {};

  Object.keys(replyMap).forEach((parentId) => {
    const nextReplies = updateCommentsById(replyMap[parentId], commentId, updater);
    nextReplyMap[parentId] = nextReplies;
    if (nextReplies !== replyMap[parentId]) changed = true;
  });

  return changed ? nextReplyMap : replyMap;
};

export const removeCommentFromReplyMap = (replyMap, commentId) => {
  let changed = false;
  const nextReplyMap = {};

  Object.keys(replyMap).forEach((parentId) => {
    const nextReplies = replyMap[parentId].filter((reply) => !sameId(reply._id, commentId));
    nextReplyMap[parentId] = nextReplies;
    if (nextReplies.length !== replyMap[parentId].length) changed = true;
  });

  return changed ? nextReplyMap : replyMap;
};

export const bumpReplyCount = (comment, amount) => ({
  ...comment,
  replyCount: Math.max((comment.replyCount || 0) + amount, 0),
});
