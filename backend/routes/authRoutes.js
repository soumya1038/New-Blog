const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, verifyEmail, sendVerificationCode, verifyCode, sendPasswordResetCode, resetPasswordWithCode, requestForgotPassword, verifyForgotPasswordCode, requestForgotPasswordChange, confirmForgotPasswordChange, requestAuthenticatedPasswordChange, confirmAuthenticatedPasswordChange } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], register);

router.post('/login', login);
router.get('/me', protect, getMe);
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
router.get('/verify-email/:token', verifyEmail);

module.exports = router;
