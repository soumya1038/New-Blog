const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');
const multer = require('multer');
const { mediaUploadLimiter } = require('../middleware/uploadLimiters');
const cloudinary = require('../utils/cloudinary');
const crypto = require('crypto');
const mongoose = require('mongoose');
const path = require('path');
const { getImageSignatureValidationError } = require('../utils/imageSignatures');
const { logError } = require('../utils/safeErrorLog');

const GROUP_LIST_DEFAULT_LIMIT = Math.max(1, Number(process.env.GROUP_LIST_DEFAULT_LIMIT) || 50);
const GROUP_LIST_MAX_LIMIT = Math.max(1, Number(process.env.GROUP_LIST_MAX_LIMIT) || 100);
const GROUP_MAX_MEMBERS = Math.max(2, Number(process.env.GROUP_MAX_MEMBERS) || 100);
const GROUP_MEMBER_ADD_MAX = Math.max(1, Number(process.env.GROUP_MEMBER_ADD_MAX) || 50);

const sendServerError = (res, error) => {
  const status = Number(error?.statusCode || error?.status);
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return res.status(status).json({ message: error.message || 'Invalid group request' });
  }

  logError('[groupRoutes] request failed:', error);
  return res.status(500).json({ message: 'Server error' });
};

const buildClientError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const parseBoundedLimit = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(safeValue, max);
};

const normalizeMemberIds = (memberIds = []) => {
  const ids = Array.isArray(memberIds) ? memberIds : [memberIds];
  return [...new Set(ids.map(id => String(id || '').trim()).filter(Boolean))];
};

const idEquals = (left, right) => String(left?._id || left || '') === String(right?._id || right || '');
const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));
const hasId = (ids = [], id) => Array.isArray(ids) && ids.some(value => idEquals(value, id));
const isGroupMember = (group, userId) => hasId(group?.members, userId);
const isGroupAdmin = (group, userId) => hasId(group?.admins, userId);
const isGroupCoAdmin = (group, userId) => hasId(group?.coAdmins, userId);
const canManageGroup = (group, userId) => isGroupAdmin(group, userId) || isGroupCoAdmin(group, userId);
const normalizeInviteCode = (value) => {
  const inviteCode = String(value || '').trim();
  return /^[a-f0-9]{24}$/i.test(inviteCode) ? inviteCode.toLowerCase() : '';
};

const toPlainGroup = (group) => {
  if (!group) return {};
  if (typeof group.toObject === 'function') return group.toObject();
  return { ...group };
};

const getUnreadCountForUser = (group, userId) => {
  const unreadEntries = Array.isArray(group?.unreadCount) ? group.unreadCount : [];
  const entry = unreadEntries.find(item => idEquals(item?.user, userId));
  const count = Number(entry?.count);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const sanitizeGroupForUser = (group, userId, extra = {}) => {
  const groupObject = toPlainGroup(group);
  const unreadCount = Object.prototype.hasOwnProperty.call(extra, 'unreadCount')
    ? Math.max(0, Number(extra.unreadCount) || 0)
    : getUnreadCountForUser(groupObject, userId);

  delete groupObject.iconPublicId;
  delete groupObject.unreadCount;
  delete groupObject.__v;

  if (!canManageGroup(group, userId)) {
    delete groupObject.inviteCode;
  }

  return {
    ...groupObject,
    ...extra,
    unreadCount,
  };
};

const sanitizeInvitePreview = (group, userId) => ({
  _id: group._id,
  name: group.name,
  description: group.description || '',
  icon: group.icon || null,
  memberCount: Array.isArray(group.members) ? group.members.length : 0,
  alreadyMember: isGroupMember(group, userId),
});

const isJoinableUserAccount = (user) => {
  if (!user || user.isActive === false) return false;
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) return false;
  if (user.isGuest && user.guestExpiresAt && new Date(user.guestExpiresAt) <= new Date()) return false;
  return true;
};

const loadUsersForMembershipCheck = async (userIds = []) => {
  const uniqueIds = [...new Set(userIds.map(id => String(id || '')).filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const users = await User.find({ _id: { $in: uniqueIds.map(toObjectId) } })
    .select('_id blockedUsers isActive suspendedUntil isGuest guestExpiresAt')
    .lean();

  return new Map(users.map(user => [String(user._id), user]));
};

const validateAddableMemberIds = async (candidateIds = [], existingMemberIds = []) => {
  const candidateStrings = [...new Set(candidateIds.map(id => String(id || '')).filter(Boolean))];
  const existingStrings = [...new Set(existingMemberIds.map(id => String(id?._id || id || '')).filter(Boolean))];

  if (!candidateStrings.length) return [];

  const usersById = await loadUsersForMembershipCheck([...candidateStrings, ...existingStrings]);

  for (const candidateId of candidateStrings) {
    const candidate = usersById.get(candidateId);
    if (!isJoinableUserAccount(candidate)) {
      throw buildClientError(400, 'One or more selected users cannot be added to this group');
    }

    for (const existingId of existingStrings) {
      if (candidateId === existingId) continue;
      const existing = usersById.get(existingId);
      if (!existing) continue;
      if (hasId(candidate.blockedUsers, existingId) || hasId(existing.blockedUsers, candidateId)) {
        throw buildClientError(403, 'One or more selected users cannot be added because of a block relationship');
      }
    }
  }

  return candidateStrings.map(toObjectId);
};

const populateGroupMembers = async (group) => {
  await group.populate('members', 'name username fullName profileImage');
  await group.populate('admins', 'name username fullName profileImage');
  await group.populate('coAdmins', 'name username fullName profileImage');
  return group;
};

const getPopulatedGroupById = async (groupId) => {
  const group = await Group.findById(groupId);
  if (!group) return null;
  return populateGroupMembers(group);
};

const ensureGroupHasAdminById = async (groupId) => {
  const group = await Group.findById(groupId).select('members admins coAdmins').lean();
  if (!group || group.members.length === 0 || group.admins.length > 0) return group;
  const promotedAdminId = (group.coAdmins || []).find(coAdminId => hasId(group.members, coAdminId)) ||
    group.members[0];

  await Group.updateOne(
    {
      _id: groupId,
      admins: { $size: 0 },
      members: promotedAdminId
    },
    {
      $addToSet: { admins: promotedAdminId },
      $pull: { coAdmins: promotedAdminId }
    }
  );

  return Group.findById(groupId).select('members admins coAdmins').lean();
};

const getLastMessageByGroup = async (groupIds = []) => {
  if (!groupIds.length) return new Map();

  const messages = await Message.aggregate([
    { $match: { group: { $in: groupIds } } },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: '$group',
        lastMessage: { $first: '$$ROOT' }
      }
    },
    { $replaceRoot: { newRoot: '$lastMessage' } },
    {
      $lookup: {
        from: 'users',
        let: { senderId: '$sender' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$senderId'] } } },
          { $project: { fullName: 1, username: 1, profileImage: 1 } }
        ],
        as: 'sender'
      }
    },
    { $unwind: { path: '$sender', preserveNullAndEmptyArrays: true } }
  ]);

  return new Map(messages.map((message) => [String(message.group), message]));
};

const storage = multer.memoryStorage();
const allowedIconMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedIconExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    if (allowedIconExtensions.has(ext) && allowedIconMimeTypes.has(mime)) {
      return cb(null, true);
    }
    return cb(new Error('Only JPG, PNG, or WEBP images are allowed for group icons'));
  }
});

router.param('groupId', (req, res, next, groupId) => {
  if (!mongoose.isValidObjectId(groupId)) {
    return res.status(400).json({ message: 'Invalid group ID format' });
  }
  return next();
});

router.param('memberId', (req, res, next, memberId) => {
  if (!mongoose.isValidObjectId(memberId)) {
    return res.status(400).json({ message: 'Invalid member ID format' });
  }
  return next();
});

// Create group
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const normalizedMemberIds = normalizeMemberIds(memberIds);
    const creatorId = req.user._id.toString();
    const invitedMemberIds = normalizedMemberIds.filter(id => id !== creatorId);

    if (!name || invitedMemberIds.length === 0) {
      return res.status(400).json({ message: 'Name and members are required' });
    }

    if (invitedMemberIds.length > GROUP_MEMBER_ADD_MAX || invitedMemberIds.length + 1 > GROUP_MAX_MEMBERS) {
      return res.status(400).json({ message: `Groups can include up to ${GROUP_MAX_MEMBERS} members.` });
    }

    if (!invitedMemberIds.every(id => mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'Invalid member ID format' });
    }

    const invitedObjectIds = await validateAddableMemberIds(invitedMemberIds, [req.user._id]);
    const group = await Group.create({
      name,
      description,
      members: [req.user._id, ...invitedObjectIds],
      admins: [req.user._id],
      createdBy: req.user._id
    });

    await populateGroupMembers(group);

    res.status(201).json({ group: sanitizeGroupForUser(group, req.user._id) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Get user's groups
router.get('/', protect, async (req, res) => {
  try {
    const limit = parseBoundedLimit(req.query.limit, GROUP_LIST_DEFAULT_LIMIT, GROUP_LIST_MAX_LIMIT);
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name username fullName profileImage')
      .populate('admins', 'name username fullName profileImage')
      .populate('coAdmins', 'name username fullName profileImage')
      .populate('createdBy', 'name username fullName')
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit);

    const lastMessageByGroup = await getLastMessageByGroup(groups.map((group) => group._id));

    // Get last message and unread count for each group
    const groupsWithMessages = groups.map((group) => {
      const unreadEntry = group.unreadCount?.find(u => u.user.toString() === req.user._id.toString());

      return sanitizeGroupForUser(group, req.user._id, {
        lastMessage: lastMessageByGroup.get(String(group._id)) || null,
        unreadCount: unreadEntry?.count || 0
      });
    });

    res.json({
      groups: groupsWithMessages,
      pagination: {
        mode: 'limit',
        limit
      }
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Get invite preview without exposing the invite code or member list
router.get('/invite/:inviteCode', protect, async (req, res) => {
  try {
    const inviteCode = normalizeInviteCode(req.params.inviteCode);
    if (!inviteCode) {
      return res.status(404).json({ message: 'Invalid invite link' });
    }

    const group = await Group.findOne({ inviteCode })
      .select('name description icon members')
      .lean();

    if (!group) {
      return res.status(404).json({ message: 'Invalid invite link' });
    }

    res.json({ group: sanitizeInvitePreview(group, req.user._id) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Get group details
router.get('/:groupId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'name username fullName profileImage')
      .populate('admins', 'name username fullName profileImage')
      .populate('coAdmins', 'name username fullName profileImage')
      .populate('createdBy', 'name username fullName profileImage');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    res.json({ group: sanitizeGroupForUser(group, req.user._id) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Update group info
router.put('/:groupId', protect, async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!canManageGroup(group, req.user._id)) {
      return res.status(403).json({ message: 'Only admins and co-admins can edit group info' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;

    await group.save();
    await populateGroupMembers(group);

    res.json({ group: sanitizeGroupForUser(group, req.user._id) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Upload group icon
router.post('/:groupId/icon', protect, mediaUploadLimiter, upload.single('icon'), async (req, res) => {
  let uploadedIconPublicId = '';
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!canManageGroup(group, req.user._id)) {
      return res.status(403).json({ message: 'Only admins and co-admins can change group icon' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const signatureError = getImageSignatureValidationError(req.file, allowedIconMimeTypes);
    if (signatureError) {
      return res.status(400).json({ message: signatureError });
    }

    const previousIconPublicId = group.iconPublicId;
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'group-icons', resource_type: 'image' },
        (error, uploaded) => (error ? reject(error) : resolve(uploaded))
      );
      uploadStream.end(req.file.buffer);
    });

    uploadedIconPublicId = result.public_id;
    group.icon = result.secure_url;
    group.iconPublicId = result.public_id;
    await group.save();
    uploadedIconPublicId = '';

    if (previousIconPublicId) {
      await cloudinary.uploader.destroy(previousIconPublicId).catch(() => {});
    }

    res.json({ icon: result.secure_url });

  } catch (error) {
    if (uploadedIconPublicId) {
      await cloudinary.uploader.destroy(uploadedIconPublicId).catch(() => {});
    }
    return sendServerError(res, error);
  }
});

// Add members
router.post('/:groupId/members', protect, async (req, res) => {
  try {
    const { memberIds } = req.body;
    const normalizedMemberIds = normalizeMemberIds(memberIds);
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!canManageGroup(group, req.user._id)) {
      return res.status(403).json({ message: 'Only admins and co-admins can add members' });
    }

    if (normalizedMemberIds.length === 0) {
      return res.status(400).json({ message: 'Members are required' });
    }

    if (normalizedMemberIds.length > GROUP_MEMBER_ADD_MAX) {
      return res.status(400).json({ message: `You can add up to ${GROUP_MEMBER_ADD_MAX} members at a time.` });
    }

    if (!normalizedMemberIds.every(id => mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'Invalid member ID format' });
    }

    const idsToAdd = normalizedMemberIds.filter(id =>
      !isGroupMember(group, id)
    );

    if (idsToAdd.length === 0) {
      await populateGroupMembers(group);
      return res.json({ group: sanitizeGroupForUser(group, req.user._id) });
    }

    const idsToAddObjectIds = await validateAddableMemberIds(idsToAdd, group.members);

    const updatedGroup = await Group.findOneAndUpdate(
      {
        _id: group._id,
        $or: [{ admins: req.user._id }, { coAdmins: req.user._id }],
        $expr: {
          $lte: [
            { $size: { $setUnion: ['$members', idsToAddObjectIds] } },
            GROUP_MAX_MEMBERS
          ]
        }
      },
      [
        {
          $set: {
            members: { $setUnion: ['$members', idsToAddObjectIds] },
            updatedAt: '$$NOW'
          }
        }
      ],
      { new: true }
    );

    if (!updatedGroup) {
      const freshGroup = await Group.findById(req.params.groupId).select('members admins coAdmins').lean();
      if (!freshGroup) return res.status(404).json({ message: 'Group not found' });
      if (!canManageGroup(freshGroup, req.user._id)) {
        return res.status(403).json({ message: 'Only admins and co-admins can add members' });
      }
      return res.status(400).json({ message: `Groups can include up to ${GROUP_MAX_MEMBERS} members.` });
    }

    await populateGroupMembers(updatedGroup);

    res.json({ group: sanitizeGroupForUser(updatedGroup, req.user._id) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Remove member
router.delete('/:groupId/members/:memberId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const removingSelf = idEquals(req.params.memberId, req.user._id);
    if (!canManageGroup(group, req.user._id) && !removingSelf) {
      return res.status(403).json({ message: 'Only admins and co-admins can remove members' });
    }
    if (!isGroupMember(group, req.params.memberId)) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    const memberObjectId = toObjectId(req.params.memberId);
    const updateResult = await Group.updateOne(
      { _id: group._id, members: memberObjectId },
      {
        $pull: {
          members: memberObjectId,
          admins: memberObjectId,
          coAdmins: memberObjectId,
          unreadCount: { user: memberObjectId }
        }
      }
    );

    if (updateResult.modifiedCount !== 1) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    const postRemoval = await ensureGroupHasAdminById(group._id);
    if (!postRemoval || postRemoval.members.length === 0) {
      await Group.deleteOne({ _id: group._id, members: { $size: 0 } });
      return res.json({ message: 'Group deleted (no members left)' });
    }

    const responseGroup = await getPopulatedGroupById(group._id);
    res.json({ group: sanitizeGroupForUser(responseGroup, req.user._id) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Make co-admin
router.post('/:groupId/co-admins/:memberId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only admins can make co-admins' });
    }
    if (!isGroupMember(group, req.params.memberId)) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    const updatedGroup = await Group.findOneAndUpdate(
      {
        _id: group._id,
        admins: req.user._id,
        members: toObjectId(req.params.memberId)
      },
      { $addToSet: { coAdmins: toObjectId(req.params.memberId) } },
      { new: true }
    );

    if (!updatedGroup) {
      return res.status(403).json({ message: 'Only admins can make co-admins' });
    }

    await populateGroupMembers(updatedGroup);
    res.json({ group: sanitizeGroupForUser(updatedGroup, req.user._id) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Remove co-admin
router.delete('/:groupId/co-admins/:memberId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only admins can remove co-admins' });
    }

    const updatedGroup = await Group.findOneAndUpdate(
      { _id: group._id, admins: req.user._id },
      { $pull: { coAdmins: toObjectId(req.params.memberId) } },
      { new: true }
    );

    if (!updatedGroup) {
      return res.status(403).json({ message: 'Only admins can remove co-admins' });
    }

    await populateGroupMembers(updatedGroup);
    res.json({ group: sanitizeGroupForUser(updatedGroup, req.user._id) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Join group via invite code
router.post('/join/:inviteCode', protect, async (req, res) => {
  try {
    const inviteCode = normalizeInviteCode(req.params.inviteCode);
    if (!inviteCode) {
      return res.status(404).json({ message: 'Invalid invite link' });
    }

    const group = await Group.findOne({ inviteCode });

    if (!group) {
      return res.status(404).json({ message: 'Invalid invite link' });
    }

    if (isGroupMember(group, req.user._id)) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }
    if (group.members.length >= GROUP_MAX_MEMBERS) {
      return res.status(400).json({ message: `Groups can include up to ${GROUP_MAX_MEMBERS} members.` });
    }

    await validateAddableMemberIds([req.user._id], group.members);

    const updatedGroup = await Group.findOneAndUpdate(
      {
        _id: group._id,
        members: { $ne: req.user._id },
        $expr: { $lt: [{ $size: '$members' }, GROUP_MAX_MEMBERS] }
      },
      { $addToSet: { members: req.user._id } },
      { new: true }
    );

    if (!updatedGroup) {
      const freshGroup = await Group.findById(group._id).select('members').lean();
      if (!freshGroup) return res.status(404).json({ message: 'Invalid invite link' });
      if (isGroupMember(freshGroup, req.user._id)) {
        return res.status(400).json({ message: 'You are already a member of this group' });
      }
      return res.status(400).json({ message: `Groups can include up to ${GROUP_MAX_MEMBERS} members.` });
    }

    await populateGroupMembers(updatedGroup);

    res.json({
      group: sanitizeGroupForUser(updatedGroup, req.user._id),
      message: 'Successfully joined the group'
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Regenerate invite code
router.post('/:groupId/regenerate-invite', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only admins can regenerate invite link' });
    }

    group.inviteCode = crypto.randomBytes(12).toString('hex');
    await group.save();

    res.json({ inviteCode: group.inviteCode });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Leave group
router.post('/:groupId/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    if (group.members.length === 1) {
      const deleteResult = await Group.deleteOne({
        _id: group._id,
        members: req.user._id,
        $expr: { $eq: [{ $size: '$members' }, 1] }
      });
      if (deleteResult.deletedCount === 1) {
        return res.json({ message: 'Group deleted (no members left)' });
      }
    }

    const userObjectId = toObjectId(req.user._id);
    const updateResult = await Group.updateOne(
      { _id: group._id, members: userObjectId },
      {
        $pull: {
          members: userObjectId,
          admins: userObjectId,
          coAdmins: userObjectId,
          unreadCount: { user: userObjectId }
        }
      }
    );

    if (updateResult.modifiedCount !== 1) {
      const freshGroup = await Group.findById(group._id).select('members').lean();
      if (!freshGroup) {
        return res.json({ message: 'Group deleted (no members left)' });
      }
      if (!isGroupMember(freshGroup, req.user._id)) {
        return res.json({ message: 'Left group successfully' });
      }
      return res.status(409).json({ message: 'Could not leave group. Please try again.' });
    }

    const postLeave = await ensureGroupHasAdminById(group._id);
    if (!postLeave || postLeave.members.length === 0) {
      await Group.deleteOne({ _id: group._id, members: { $size: 0 } });
      return res.json({ message: 'Group deleted (no members left)' });
    }
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Mark group messages as read
router.put('/:groupId/mark-read', protect, async (req, res) => {
  try {
    const groupExists = await Group.exists({ _id: req.params.groupId, members: req.user._id });
    if (!groupExists) {
      const group = await Group.exists({ _id: req.params.groupId });
      if (!group) return res.status(404).json({ message: 'Group not found' });
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    await Group.updateOne(
      { _id: req.params.groupId, 'unreadCount.user': req.user._id },
      { $set: { 'unreadCount.$.count': 0 } }
    );

    res.json({ message: 'Marked as read' });
  } catch (error) {
    return sendServerError(res, error);
  }
});

module.exports = router;
