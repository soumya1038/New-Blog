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
router.post('/statuses', protect, upload.single('statusImage'), createStatus);
router.get('/statuses', protect, getStatuses);
router.put('/statuses/:statusId', protect, upload.single('statusImage'), updateStatus);
router.delete('/statuses/:statusId', protect, deleteStatus);

module.exports = router;
