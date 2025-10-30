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
  updateStatus,
  deleteStatus
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../utils/fileUpload');
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
router.post('/statuses', protect, trackActivity, upload.single('statusImage'), createStatus);
router.get('/statuses', protect, getStatuses);
router.put('/statuses/:statusId', protect, trackActivity, upload.single('statusImage'), updateStatus);
router.delete('/statuses/:statusId', protect, trackActivity, deleteStatus);
router.post('/statuses/check', protect, async (req, res) => {
  try {
    const { userIds } = req.body;
    const users = await require('../models/User').find({ _id: { $in: userIds } }).select('_id statuses');
    const statusMap = {};
    users.forEach(user => {
      const activeStatuses = user.statuses.filter(s => new Date() < new Date(s.expiresAt));
      statusMap[user._id.toString()] = activeStatuses.length > 0;
    });
    res.json({ success: true, statusMap });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
