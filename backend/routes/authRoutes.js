const express = require('express');
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
  startTwitterAuth,
  exchangeTwitterCode,
  startGoogleConnectAuth,
  exchangeGoogleConnectCode,
  startFacebookConnectAuth,
  exchangeFacebookConnectCode,
  startTwitterConnectAuth,
  exchangeTwitterConnectCode,
  facebookDeauthorizeCallback,
  facebookDataDeletionRequest,
  facebookDataDeletionStatus
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const trackActivity = require('../middleware/trackActivity');

const router = express.Router();

router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], register);

router.post('/login', login);
router.get('/me', protect, trackActivity, getMe);
router.post('/send-verification-code', sendVerificationCode);
router.post('/verify-code', verifyCode);
router.post('/send-password-reset-code', sendPasswordResetCode);
router.post('/reset-password', resetPasswordWithCode);
router.post('/forgot-password/request', requestForgotPassword);
router.post('/forgot-password/verify', verifyForgotPasswordCode);
router.post('/forgot-password/change', requestForgotPasswordChange);
router.post('/forgot-password/confirm', confirmForgotPasswordChange);
router.post('/forgot-password/change-authenticated', protect, requestAuthenticatedPasswordChange);
router.post('/forgot-password/confirm-authenticated', protect, confirmAuthenticatedPasswordChange);
router.get('/google/start', startGoogleAuth);
router.post('/google/exchange', exchangeGoogleCode);
router.get('/google/connect/start', protect, startGoogleConnectAuth);
router.post('/google/connect/exchange', protect, exchangeGoogleConnectCode);
router.get('/facebook/start', startFacebookAuth);
router.post('/facebook/exchange', exchangeFacebookCode);
router.get('/facebook/connect/start', protect, startFacebookConnectAuth);
router.post('/facebook/connect/exchange', protect, exchangeFacebookConnectCode);
router.get('/twitter/start', startTwitterAuth);
router.post('/twitter/exchange', exchangeTwitterCode);
router.get('/twitter/connect/start', protect, startTwitterConnectAuth);
router.post('/twitter/connect/exchange', protect, exchangeTwitterConnectCode);
router.post('/facebook/deauthorize', facebookDeauthorizeCallback);
router.post('/facebook/data-deletion', facebookDataDeletionRequest);
router.get('/facebook/data-deletion-status/:code', facebookDataDeletionStatus);
router.get('/verify-email/:token', verifyEmail);
router.get('/check-guest-username/:username', checkGuestUsername);
router.post('/guest-login', guestLogin);

module.exports = router;
