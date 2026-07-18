const express = require('express');
const crypto = require('crypto');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  verifyEmail,
  sendVerificationCode,
  verifyCode,
  sendPasswordResetCode,
  resetPasswordWithCode,
  requestForgotPassword,
  verifyForgotPasswordCode,
  requestForgotPasswordChange,
  confirmForgotPasswordChange,
  requestAuthenticatedPasswordChange,
  confirmAuthenticatedPasswordChange,
  checkGuestUsername,
  guestLogin,
  startGoogleAuth,
  exchangeGoogleCode,
  startFacebookAuth,
  exchangeFacebookCode,
  startLinkedInAuth,
  exchangeLinkedInCode,
  startTwitterAuth,
  exchangeTwitterCode,
  startGoogleConnectAuth,
  exchangeGoogleConnectCode,
  startFacebookConnectAuth,
  exchangeFacebookConnectCode,
  startLinkedInConnectAuth,
  exchangeLinkedInConnectCode,
  startTwitterConnectAuth,
  exchangeTwitterConnectCode,
  getTelegramLoginConfig,
  exchangeTelegramLogin,
  exchangeTelegramConnect,
  facebookDeauthorizeCallback,
  facebookDataDeletionRequest,
  facebookDataDeletionStatus
} = require('../controllers/authController');
const {
  createForgotPasswordTwoFactorChallenge,
  verifyForgotPasswordTwoFactorChallenge,
} = require('../controllers/twoFactorController');
const { protect } = require('../middleware/auth');
const { requireTwoFactorForAction } = require('../utils/twoFactor');
const { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } = require('../utils/passwordPolicy');
const {
  createRedisBackedRateLimiter,
  getUserOrIpRateLimitKey,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');
const trackActivity = require('../middleware/trackActivity');

const router = express.Router();

const hashRateLimitKeyPart = (value) =>
  crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32);

const normalizeRateLimitEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeRateLimitUsername = (value) => String(value || '').trim();

const getHashedBodyKey = (req, namespace, values) => {
  const parts = values.map((value) => String(value || '').trim()).filter(Boolean);
  if (!parts.length) return getUserOrIpRateLimitKey(req);
  return `${namespace}:${hashRateLimitKeyPart(parts.join('|'))}`;
};

const getEmailRateLimitKey = (req) =>
  getHashedBodyKey(req, 'email', [normalizeRateLimitEmail(req.body?.email)]);

const getAccountRateLimitKey = (req) =>
  getHashedBodyKey(req, 'account', [
    normalizeRateLimitUsername(req.body?.username),
    normalizeRateLimitEmail(req.body?.email),
  ]);

const createAuthRouteLimiter = ({
  envPrefix,
  fallbackWindowMs,
  fallbackMax,
  prefix,
  message,
  keyGenerator,
}) => createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env[`${envPrefix}_WINDOW_MS`], fallbackWindowMs),
  max: toPositiveInt(process.env[`${envPrefix}_MAX`], fallbackMax),
  prefix,
  message,
  keyGenerator,
});

const registrationCodeSendLimiter = createAuthRouteLimiter({
  envPrefix: 'AUTH_REGISTRATION_CODE_SEND_RATE_LIMIT',
  fallbackWindowMs: 15 * 60 * 1000,
  fallbackMax: 3,
  prefix: 'auth-registration-code-send',
  message: 'Too many verification code requests. Please wait before requesting another code.',
  keyGenerator: getEmailRateLimitKey,
});

const passwordResetSendLimiter = createAuthRouteLimiter({
  envPrefix: 'AUTH_PASSWORD_RESET_SEND_RATE_LIMIT',
  fallbackWindowMs: 15 * 60 * 1000,
  fallbackMax: 4,
  prefix: 'auth-password-reset-send',
  message: 'Too many password reset requests. Please wait before requesting another code.',
  keyGenerator: getAccountRateLimitKey,
});

const authCodeVerifyLimiter = createAuthRouteLimiter({
  envPrefix: 'AUTH_CODE_VERIFY_RATE_LIMIT',
  fallbackWindowMs: 15 * 60 * 1000,
  fallbackMax: 10,
  prefix: 'auth-code-verify',
  message: 'Too many verification attempts. Please wait before trying again.',
  keyGenerator: (req) =>
    req.body?.username ? getAccountRateLimitKey(req) : getEmailRateLimitKey(req),
});

const protectedPasswordChangeLimiter = createAuthRouteLimiter({
  envPrefix: 'AUTH_PROTECTED_PASSWORD_CHANGE_RATE_LIMIT',
  fallbackWindowMs: 15 * 60 * 1000,
  fallbackMax: 5,
  prefix: 'auth-protected-password-change',
  message: 'Too many password change attempts. Please wait before trying again.',
  keyGenerator: getUserOrIpRateLimitKey,
});

router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Only letters, numbers, and underscores allowed'),
  body('password')
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage(`Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters`)
], register);

router.post('/login', login);
router.get('/me', protect, trackActivity, getMe);
router.post('/send-verification-code', registrationCodeSendLimiter, sendVerificationCode);
router.post('/verify-code', authCodeVerifyLimiter, verifyCode);
router.post('/send-password-reset-code', sendPasswordResetCode);
router.post('/reset-password', resetPasswordWithCode);
router.post('/forgot-password/request', passwordResetSendLimiter, requestForgotPassword);
router.post('/forgot-password/verify', authCodeVerifyLimiter, verifyForgotPasswordCode);
router.post('/forgot-password/change', passwordResetSendLimiter, requestForgotPasswordChange);
router.post('/forgot-password/confirm', authCodeVerifyLimiter, confirmForgotPasswordChange);
router.post('/forgot-password/2fa/challenge', passwordResetSendLimiter, createForgotPasswordTwoFactorChallenge);
router.post('/forgot-password/2fa/verify', authCodeVerifyLimiter, verifyForgotPasswordTwoFactorChallenge);
router.post('/forgot-password/change-authenticated', protect, protectedPasswordChangeLimiter, requestAuthenticatedPasswordChange);
router.post('/forgot-password/confirm-authenticated', protect, protectedPasswordChangeLimiter, requireTwoFactorForAction('change_password'), confirmAuthenticatedPasswordChange);
router.get('/google/start', startGoogleAuth);
router.post('/google/exchange', exchangeGoogleCode);
router.get('/google/connect/start', protect, startGoogleConnectAuth);
router.post('/google/connect/exchange', protect, exchangeGoogleConnectCode);
router.get('/facebook/start', startFacebookAuth);
router.post('/facebook/exchange', exchangeFacebookCode);
router.get('/facebook/connect/start', protect, startFacebookConnectAuth);
router.post('/facebook/connect/exchange', protect, exchangeFacebookConnectCode);
router.get('/linkedin/start', startLinkedInAuth);
router.post('/linkedin/exchange', exchangeLinkedInCode);
router.get('/linkedin/connect/start', protect, startLinkedInConnectAuth);
router.post('/linkedin/connect/exchange', protect, exchangeLinkedInConnectCode);
router.get('/twitter/start', startTwitterAuth);
router.post('/twitter/exchange', exchangeTwitterCode);
router.get('/twitter/connect/start', protect, startTwitterConnectAuth);
router.post('/twitter/connect/exchange', protect, exchangeTwitterConnectCode);
router.get('/telegram/config', getTelegramLoginConfig);
router.post('/telegram/exchange', exchangeTelegramLogin);
router.post('/telegram/connect/exchange', protect, exchangeTelegramConnect);
router.post('/facebook/deauthorize', facebookDeauthorizeCallback);
router.post('/facebook/data-deletion', facebookDataDeletionRequest);
router.get('/facebook/data-deletion-status/:code', facebookDataDeletionStatus);
router.get('/verify-email/:token', verifyEmail);
router.get('/check-guest-username/:username', checkGuestUsername);
router.post('/guest-login', guestLogin);

module.exports = router;
