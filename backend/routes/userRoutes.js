const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const {
  getProfile,
  updateProfile,
  uploadProfileImage,
  removeProfileImage,
  getSensitiveActionPasswordStatus,
  verifySensitiveActionPassword,
  requestPasswordChange,
  confirmPasswordChange,
  requestAccountDeletion,
  verifyAccountDeletionCode,
  cancelAccountDeletion,
  confirmAccountDeletion,
  confirmAccountDeletionWithAuthenticator,
  generateApiKey,
  getApiKeys,
  revokeApiKey,
  updateUsername,
  createStatus,
  getStatuses,
  getUserStatuses,
  getStatusMediaAccess,
  updateStatus,
  deleteStatus,
  getStoryPreferences,
  updateStoryPreference,
  guestLogout,
  disconnectSocialProvider,
} = require('../controllers/userController');
const {
  getTwoFactorStatus,
  startAuthenticatorSetup,
  verifyAuthenticatorSetup,
  startSmsSetup,
  verifySmsSetup,
  setPreferredTwoFactorMethod,
  disableTwoFactor,
  createTwoFactorChallenge,
  verifyTwoFactorChallenge,
} = require('../controllers/twoFactorController');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireSensitiveActionToken, requireTwoFactorForAction } = require('../utils/twoFactor');
const {
  createRedisBackedRateLimiter,
  getUserOrIpRateLimitKey,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');
const upload = require('../utils/fileUpload');
const statusUpload = require('../utils/statusUpload');
const { mediaUploadLimiter, statusMediaAccessLimiter } = require('../middleware/uploadLimiters');
const trackActivity = require('../middleware/trackActivity');
const { logError } = require('../utils/safeErrorLog');
const {
  canViewerSeeStatus,
  getViewerRelationshipToTarget,
} = require('../utils/userVisibility');

const router = express.Router();
const STATUS_CHECK_MAX_USERS = Math.max(1, Number(process.env.STATUS_CHECK_MAX_USERS) || 100);
const SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS = Math.max(
  100,
  Number(process.env.SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS) || 5000
);
const CONTACT_ISSUE_MAX_LENGTH = Math.max(1, Number(process.env.CONTACT_ISSUE_MAX_LENGTH) || 2000);
const CONTACT_ADVICE_MAX_LENGTH = Math.max(1, Number(process.env.CONTACT_ADVICE_MAX_LENGTH) || 1000);

const createTwoFactorRouteLimiter = ({
  envPrefix,
  fallbackWindowMs,
  fallbackMax,
  prefix,
  message,
}) => createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env[`${envPrefix}_WINDOW_MS`], fallbackWindowMs),
  max: toPositiveInt(process.env[`${envPrefix}_MAX`], fallbackMax),
  prefix,
  message,
  keyGenerator: getUserOrIpRateLimitKey,
});

const twoFactorSetupLimiter = createTwoFactorRouteLimiter({
  envPrefix: 'TWO_FACTOR_SETUP_RATE_LIMIT',
  fallbackWindowMs: 15 * 60 * 1000,
  fallbackMax: 5,
  prefix: 'two-factor-setup',
  message: 'Too many two-factor setup attempts. Please wait before trying again.',
});

const twoFactorChallengeLimiter = createTwoFactorRouteLimiter({
  envPrefix: 'TWO_FACTOR_CHALLENGE_RATE_LIMIT',
  fallbackWindowMs: 15 * 60 * 1000,
  fallbackMax: 6,
  prefix: 'two-factor-challenge',
  message: 'Too many two-factor challenge requests. Please wait before requesting another code.',
});

const twoFactorVerifyLimiter = createTwoFactorRouteLimiter({
  envPrefix: 'TWO_FACTOR_VERIFY_RATE_LIMIT',
  fallbackWindowMs: 15 * 60 * 1000,
  fallbackMax: 15,
  prefix: 'two-factor-verify',
  message: 'Too many two-factor verification attempts. Please wait before trying again.',
});

const normalizeContactText = (value, maxLength) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

router.get('/profile/:id?', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/profile/image', protect, mediaUploadLimiter, upload.single('profileImage'), uploadProfileImage);
router.delete('/profile/image', protect, removeProfileImage);
router.post('/password/request', protect, requestPasswordChange);
router.post('/password/confirm', protect, requireTwoFactorForAction('change_password'), confirmPasswordChange);
router.get('/security/password-challenge', protect, getSensitiveActionPasswordStatus);
router.post('/security/password-challenge', protect, verifySensitiveActionPassword);
router.post('/account/delete-request', protect, requestAccountDeletion);
router.post('/account/delete-verify', protect, verifyAccountDeletionCode);
router.post('/account/delete-cancel', protect, cancelAccountDeletion);
router.post('/account/delete-confirm', protect, confirmAccountDeletion);
router.post('/account/delete-confirm-authenticator', protect, requireTwoFactorForAction('delete_account'), confirmAccountDeletionWithAuthenticator);
router.get('/2fa/status', protect, getTwoFactorStatus);
router.post('/2fa/authenticator/setup', protect, twoFactorSetupLimiter, requireSensitiveActionToken('manage_2fa'), requireTwoFactorForAction('manage_2fa'), startAuthenticatorSetup);
router.post('/2fa/authenticator/verify', protect, twoFactorVerifyLimiter, verifyAuthenticatorSetup);
router.post('/2fa/sms/setup', protect, twoFactorSetupLimiter, requireSensitiveActionToken('manage_2fa'), requireTwoFactorForAction('manage_2fa'), startSmsSetup);
router.post('/2fa/sms/verify', protect, twoFactorVerifyLimiter, verifySmsSetup);
router.post('/2fa/preferred', protect, setPreferredTwoFactorMethod);
router.post('/2fa/disable', protect, twoFactorSetupLimiter, requireSensitiveActionToken('disable_2fa'), requireTwoFactorForAction('disable_2fa'), disableTwoFactor);
router.post('/2fa/challenge', protect, twoFactorChallengeLimiter, createTwoFactorChallenge);
router.post('/2fa/verify', protect, twoFactorVerifyLimiter, verifyTwoFactorChallenge);
router.post('/api-keys', protect, requireSensitiveActionToken('generate_api_key'), requireTwoFactorForAction('generate_api_key'), generateApiKey);
router.get('/api-keys', protect, getApiKeys);
router.delete('/api-keys/:keyId', protect, requireSensitiveActionToken('revoke_api_key'), requireTwoFactorForAction('revoke_api_key'), revokeApiKey);
router.put('/username', protect, requireSensitiveActionToken('change_username'), requireTwoFactorForAction('change_username'), updateUsername);
router.delete('/social/:provider', protect, requireSensitiveActionToken('disconnect_social'), requireTwoFactorForAction('disconnect_social'), disconnectSocialProvider);
router.post('/statuses', protect, trackActivity, mediaUploadLimiter, statusUpload.single('statusMedia'), createStatus);
router.get('/statuses', protect, getStatuses);
router.get('/statuses/user/:userId', protect, getUserStatuses);
router.get('/statuses/:statusId/media', protect, statusMediaAccessLimiter, getStatusMediaAccess);
router.get('/statuses/preferences', protect, getStoryPreferences);
router.put('/statuses/preferences', protect, updateStoryPreference);
router.put('/statuses/:statusId', protect, trackActivity, mediaUploadLimiter, statusUpload.single('statusMedia'), updateStatus);
router.delete('/statuses/:statusId', protect, trackActivity, deleteStatus);
router.post('/guest-logout', protect, guestLogout);
router.post('/contact', protect, async (req, res) => {
  try {
    const issue = normalizeContactText(req.body?.issue, CONTACT_ISSUE_MAX_LENGTH);
    const advice = normalizeContactText(req.body?.advice, CONTACT_ADVICE_MAX_LENGTH);
    const { sendContactEmail } = require('../utils/mailService');

    if (!issue) {
      return res.status(400).json({ success: false, message: 'Issue is required' });
    }

    await sendContactEmail({
      userEmail: String(req.user?.email || '').trim().slice(0, 254),
      username: String(req.user?.username || req.user?.name || 'Authenticated user').trim().slice(0, 80),
      issue,
      advice
    });

    res.json({ success: true, message: 'Contact message sent successfully' });
  } catch (error) {
    logError('Contact email failed:', error);
    res.status(500).json({ success: false, message: 'Failed to send contact message' });
  }
});

router.post('/statuses/check', protect, async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ success: false, message: 'userIds must be an array.' });
    }

    if (userIds.length > STATUS_CHECK_MAX_USERS) {
      return res.status(400).json({
        success: false,
        message: `You can check at most ${STATUS_CHECK_MAX_USERS} users at a time.`,
      });
    }

    const normalizedUserIds = [...new Set(userIds.map(id => String(id || '').trim()).filter(Boolean))];
    if (normalizedUserIds.some(id => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ success: false, message: 'Invalid user id in status check request.' });
    }

    const users = await User.find({ _id: { $in: normalizedUserIds } })
      .select('_id statuses followers blockedUsers')
      .limit(STATUS_CHECK_MAX_USERS)
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS)
      .lean();
    const statusMap = {};

    users.forEach(user => {
      const ownerId = String(user._id);
      const relationship = getViewerRelationshipToTarget(req.user, user);
      const visibleStatuses = (user.statuses || []).filter((status) =>
        canViewerSeeStatus(status, relationship)
      );
      statusMap[ownerId] = visibleStatuses.length > 0;
    });
    res.json({ success: true, statusMap });
  } catch (error) {
    logError('Status availability check failed:', error);
    res.status(500).json({ success: false, message: 'Failed to check status availability' });
  }
});

module.exports = router;
