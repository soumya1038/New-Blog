const express = require('express');
const {
  getProfile,
  updateProfile,
  uploadProfileImage,
  removeProfileImage,
  requestPasswordChange,
  confirmPasswordChange,
  requestAccountDeletion,
  confirmAccountDeletion,
  generateApiKey,
  getApiKeys,
  revokeApiKey,
  updateUsername,
  createStatus,
  getStatuses,
  getUserStatuses,
  updateStatus,
  deleteStatus,
  getStoryPreferences,
  updateStoryPreference,
  guestLogout,
  disconnectSocialProvider,
} = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../utils/fileUpload');
const statusUpload = require('../utils/statusUpload');
const trackActivity = require('../middleware/trackActivity');

const router = express.Router();

router.get('/profile/:id?', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/profile/image', protect, upload.single('profileImage'), uploadProfileImage);
router.delete('/profile/image', protect, removeProfileImage);
router.post('/password/request', protect, requestPasswordChange);
router.post('/password/confirm', protect, confirmPasswordChange);
router.post('/account/delete-request', protect, requestAccountDeletion);
router.post('/account/delete-confirm', protect, confirmAccountDeletion);
router.post('/api-keys', protect, generateApiKey);
router.get('/api-keys', protect, getApiKeys);
router.delete('/api-keys/:keyId', protect, revokeApiKey);
router.put('/username', protect, updateUsername);
router.delete('/social/:provider', protect, disconnectSocialProvider);
router.post('/statuses', protect, trackActivity, statusUpload.single('statusMedia'), createStatus);
router.get('/statuses', protect, getStatuses);
router.get('/statuses/user/:userId', protect, getUserStatuses);
router.get('/statuses/preferences', protect, getStoryPreferences);
router.put('/statuses/preferences', protect, updateStoryPreference);
router.put('/statuses/:statusId', protect, trackActivity, statusUpload.single('statusMedia'), updateStatus);
router.delete('/statuses/:statusId', protect, trackActivity, deleteStatus);
router.post('/guest-logout', protect, guestLogout);
router.post('/contact', protect, async (req, res) => {
  try {
    const { issue, advice, userEmail, username } = req.body;
    const { sendContactEmail } = require('../utils/mailService');

    await sendContactEmail({
      userEmail,
      username,
      issue,
      advice
    });

    res.json({ success: true, message: 'Contact message sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/statuses/check', protect, async (req, res) => {
  try {
    const { userIds } = req.body;
    const users = await require('../models/User').find({ _id: { $in: userIds } }).select('_id statuses followers');
    const viewerId = String(req.user?._id || '');
    const statusMap = {};

    const canSeeStatus = (status, isFollower, isOwner) => {
      if (!status?.expiresAt || new Date(status.expiresAt) <= new Date()) return false;
      if (isOwner) return true;
      const audience = ['public', 'followers', 'private'].includes(status?.audience) ? status.audience : 'public';
      if (audience === 'public') return true;
      if (audience === 'followers' && isFollower) return true;
      return false;
    };

    users.forEach(user => {
      const ownerId = String(user._id);
      const isOwner = viewerId && viewerId === ownerId;
      const isFollower = Array.isArray(user.followers)
        ? user.followers.some((followerId) => String(followerId) === viewerId)
        : false;
      const visibleStatuses = (user.statuses || []).filter((status) => canSeeStatus(status, isFollower, isOwner));
      statusMap[ownerId] = visibleStatuses.length > 0;
    });
    res.json({ success: true, statusMap });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
