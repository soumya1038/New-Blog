const mongoose = require('mongoose');
const Group = require('../models/Group');

const toObjectId = (value) => {
  const raw = String(value?._id || value || '');
  if (!mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
};

const uniqueObjectIds = (values = []) => {
  const seen = new Set();
  const objectIds = [];

  for (const value of Array.isArray(values) ? values : []) {
    const objectId = toObjectId(value);
    if (!objectId) continue;

    const key = objectId.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    objectIds.push(objectId);
  }

  return objectIds;
};

const incrementGroupUnreadCounts = async ({ groupId, senderId, memberIds = [] } = {}) => {
  const groupObjectId = toObjectId(groupId);
  const senderObjectId = toObjectId(senderId);
  const memberObjectIds = uniqueObjectIds(memberIds);

  if (!groupObjectId || !senderObjectId || memberObjectIds.length === 0) {
    return { matchedCount: 0, modifiedCount: 0, recipientIds: [] };
  }

  const senderKey = senderObjectId.toString();
  const recipientObjectIds = memberObjectIds.filter((memberId) => memberId.toString() !== senderKey);
  if (recipientObjectIds.length === 0) {
    return { matchedCount: 0, modifiedCount: 0, recipientIds: [] };
  }

  const result = await Group.updateOne(
    { _id: groupObjectId },
    [
      {
        $set: {
          unreadCount: {
            $let: {
              vars: {
                currentUnread: {
                  $filter: {
                    input: { $ifNull: ['$unreadCount', []] },
                    as: 'entry',
                    cond: { $in: ['$$entry.user', memberObjectIds] },
                  },
                },
              },
              in: {
                $concatArrays: [
                  {
                    $map: {
                      input: '$$currentUnread',
                      as: 'entry',
                      in: {
                        user: '$$entry.user',
                        count: {
                          $cond: [
                            { $in: ['$$entry.user', recipientObjectIds] },
                            { $add: [{ $ifNull: ['$$entry.count', 0] }, 1] },
                            { $ifNull: ['$$entry.count', 0] },
                          ],
                        },
                      },
                    },
                  },
                  {
                    $map: {
                      input: {
                        $setDifference: [
                          recipientObjectIds,
                          {
                            $map: {
                              input: '$$currentUnread',
                              as: 'entry',
                              in: '$$entry.user',
                            },
                          },
                        ],
                      },
                      as: 'recipientId',
                      in: { user: '$$recipientId', count: 1 },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ]
  );

  return {
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
    recipientIds: recipientObjectIds.map((id) => id.toString()),
  };
};

module.exports = {
  incrementGroupUnreadCounts,
  uniqueObjectIds,
};
