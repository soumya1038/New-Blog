const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validateEmail } = require('../utils/emailValidator');
const { enqueueEmailJob } = require('../jobs/queueService');
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const GOOGLE_AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const normalizeAbsoluteUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const normalized = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    return normalized;
  } catch (error) {
    return '';
  }
};

const getGoogleClientId = () =>
  (process.env.GOOGLE_CLIENT_ID || process.env.google_client_id || '').trim();

const getGoogleClientSecret = () =>
  (process.env.GOOGLE_CLIENT_SECRET || process.env.google_client_Secret || '').trim();

const getAllowedGoogleRedirectUris = () => {
  const configured = (process.env.GOOGLE_ALLOWED_REDIRECT_URIS || '')
    .split(',')
    .map((entry) => normalizeAbsoluteUrl(entry))
    .filter(Boolean);

  const defaults = [
    'https://lekhon-development.netlify.app/auth/google/callback',
    'http://localhost:3000/auth/google/callback',
    'http://localhost:3001/auth/google/callback',
  ];

  const frontendProd = normalizeAbsoluteUrl(process.env.FRONTEND_URL_PROD || '');
  const frontendLocal = normalizeAbsoluteUrl(process.env.FRONTEND_URL || '');

  if (frontendProd) defaults.push(`${frontendProd}/auth/google/callback`.replace(/\/{2,}/g, '/').replace(':/', '://'));
  if (frontendLocal) defaults.push(`${frontendLocal}/auth/google/callback`.replace(/\/{2,}/g, '/').replace(':/', '://'));

  return [...new Set([...defaults, ...configured].map((entry) => normalizeAbsoluteUrl(entry)).filter(Boolean))];
};

const isGoogleRedirectUriAllowed = (redirectUri) => {
  const normalized = normalizeAbsoluteUrl(redirectUri);
  if (!normalized) return false;
  return getAllowedGoogleRedirectUris().includes(normalized);
};

const createGoogleState = (redirectUri) => {
  return jwt.sign(
    {
      redirectUri: normalizeAbsoluteUrl(redirectUri),
      nonce: crypto.randomBytes(8).toString('hex'),
    },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
};

const readGoogleState = (stateToken) => {
  if (!stateToken || !process.env.JWT_SECRET) return null;
  try {
    return jwt.verify(String(stateToken), process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const sanitizeUsernameFragment = (value) => {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
  if (normalized.length >= 3) return normalized;
  return `user_${crypto.randomBytes(2).toString('hex')}`;
};

const makeUniqueUsername = async (seed) => {
  const base = sanitizeUsernameFragment(seed);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? '' : `_${attempt}`;
    const candidate = `${base}${suffix}`.slice(0, 30);
    const existing = await User.findOne({ username: candidate }).select('_id').lean();
    if (!existing) return candidate;
  }
  return `user_${crypto.randomBytes(4).toString('hex')}`;
};

const ensureUserCanLogin = async (user) => {
  if (!user) {
    return { status: 404, body: { success: false, message: 'User not found' } };
  }

  if (user.isGuest && user.guestExpiresAt && new Date() >= user.guestExpiresAt) {
    await User.findByIdAndDelete(user._id);
    return { status: 401, body: { success: false, message: 'Guest account expired', guestExpired: true } };
  }

  if (user.suspendedUntil && new Date() >= user.suspendedUntil) {
    user.suspendedUntil = null;
    user.isActive = true;
    await user.save();
  }

  if (!user.isActive || (user.suspendedUntil && new Date() < user.suspendedUntil)) {
    const suspendedMessage = user.suspendedUntil
      ? `Account suspended until ${user.suspendedUntil.toLocaleDateString()}`
      : 'Account has been suspended';
    return { status: 403, body: { success: false, message: suspendedMessage } };
  }

  return null;
};

// Register user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password, rememberMe, mathAnswer, mathQuestion } = req.body;

    // Verify math CAPTCHA
    if (!mathAnswer || !mathQuestion) {
      return res.status(400).json({ success: false, message: 'Please complete the verification' });
    }

    const { num1, num2, operator } = mathQuestion;
    const expectedAnswer = operator === '+' ? num1 + num2 : num1 - num2;
    
    if (parseInt(mathAnswer) !== expectedAnswer) {
      return res.status(400).json({ success: false, message: 'Incorrect verification answer' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    if (email) {
      // Validate email domain
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(400).json({ success: false, message: emailValidation.message });
      }

      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }

    // Email should already be verified at this point
    // Check if verification code was used
    const verifiedEmail = global.verificationCodes?.[email];
    if (verifiedEmail) {
      delete global.verificationCodes[email]; // Clean up
    }
    
    const user = await User.create({ 
      username, 
      email, 
      password,
      isVerified: true // Email already verified in the form
    });

    // Send welcome email
    if (email) {
      try {
        await enqueueEmailJob('welcome-email', { email, username });
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      rememberMe
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if guest expired and delete
    if (user.isGuest && user.guestExpiresAt && new Date() >= user.guestExpiresAt) {
      await User.findByIdAndDelete(user._id);
      return res.status(401).json({ success: false, message: 'Guest account expired' });
    }

    // Check if user is suspended and auto-reactivate if suspension expired
    if (user.suspendedUntil && new Date() >= user.suspendedUntil) {
      user.suspendedUntil = null;
      user.isActive = true;
      await user.save();
    }

    // Check if user is still suspended
    if (!user.isActive || (user.suspendedUntil && new Date() < user.suspendedUntil)) {
      const suspendedMessage = user.suspendedUntil 
        ? `Account suspended until ${user.suspendedUntil.toLocaleDateString()}`
        : 'Account has been suspended';
      return res.status(403).json({ success: false, message: suspendedMessage });
    }

    // Update lastActive on login
    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role
      },
      rememberMe
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Start Google OAuth redirect flow
exports.startGoogleAuth = async (req, res) => {
  try {
    const clientId = getGoogleClientId();
    if (!clientId) {
      return res.status(500).json({ success: false, message: 'Google OAuth is not configured on server' });
    }

    const redirectUri = normalizeAbsoluteUrl(req.query.redirect_uri || '');
    if (!redirectUri) {
      return res.status(400).json({ success: false, message: 'A valid redirect_uri is required' });
    }

    if (!isGoogleRedirectUriAllowed(redirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirect_uri is not allowed',
        allowedRedirectUris: getAllowedGoogleRedirectUris(),
      });
    }

    const state = createGoogleState(redirectUri);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
    });

    return res.redirect(`${GOOGLE_AUTH_BASE_URL}?${params.toString()}`);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Exchange Google OAuth code for local session
exports.exchangeGoogleCode = async (req, res) => {
  try {
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();
    if (!clientId || !clientSecret) {
      return res.status(500).json({ success: false, message: 'Google OAuth is not configured on server' });
    }

    const { code, redirectUri, state } = req.body || {};
    const normalizedRedirectUri = normalizeAbsoluteUrl(redirectUri || '');

    if (!code || !normalizedRedirectUri) {
      return res.status(400).json({ success: false, message: 'code and redirectUri are required' });
    }

    if (!isGoogleRedirectUriAllowed(normalizedRedirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirectUri is not allowed',
        allowedRedirectUris: getAllowedGoogleRedirectUris(),
      });
    }

    const statePayload = readGoogleState(state);
    if (!statePayload || normalizeAbsoluteUrl(statePayload.redirectUri) !== normalizedRedirectUri) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OAuth state' });
    }

    const tokenParams = new URLSearchParams({
      code: String(code),
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: normalizedRedirectUri,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await axios.post(GOOGLE_TOKEN_URL, tokenParams.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = tokenResponse?.data?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Google access token not received' });
    }

    const profileResponse = await axios.get(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profile = profileResponse?.data || {};
    const email = String(profile.email || '').trim().toLowerCase();
    const emailVerified = Boolean(profile.email_verified);
    const displayName = String(profile.name || '').trim();
    const picture = String(profile.picture || '').trim();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account email is unavailable' });
    }

    if (!emailVerified) {
      return res.status(400).json({ success: false, message: 'Google account email is not verified' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      const usernameSeed = email.split('@')[0] || displayName || 'user';
      const username = await makeUniqueUsername(usernameSeed);
      const randomPassword = crypto.randomBytes(32).toString('hex');

      user = await User.create({
        username,
        email,
        password: randomPassword,
        fullName: displayName,
        name: displayName,
        profileImage: picture,
        isVerified: true,
      });
    } else {
      let shouldSave = false;
      if (!user.isVerified) {
        user.isVerified = true;
        shouldSave = true;
      }
      if (!user.fullName && displayName) {
        user.fullName = displayName;
        shouldSave = true;
      }
      if (!user.name && displayName) {
        user.name = displayName;
        shouldSave = true;
      }
      if (!user.profileImage && picture) {
        user.profileImage = picture;
        shouldSave = true;
      }
      if (shouldSave) {
        await user.save();
      }
    }

    const guardFailure = await ensureUserCanLogin(user);
    if (guardFailure) {
      return res.status(guardFailure.status).json(guardFailure.body);
    }

    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user._id);
    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role,
      },
      rememberMe: true,
    });
  } catch (error) {
    const details = error?.response?.data || error.message;
    return res.status(500).json({
      success: false,
      message: 'Google authentication failed',
      details,
    });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send verification code
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Validate email domain
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in temporary collection or cache (for now, we'll use a simple approach)
    // In production, use Redis or a temporary collection
    global.verificationCodes = global.verificationCodes || {};
    global.verificationCodes[email] = {
      code: verificationCode,
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
    };

    // Queue verification email send
    await enqueueEmailJob('verification-code', { email, username: 'User', code: verificationCode });

    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Verification email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification email' });
  }
};

// Send password reset code
exports.sendPasswordResetCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    global.passwordResetCodes = global.passwordResetCodes || {};
    global.passwordResetCodes[email] = {
      code: resetCode,
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
    };

    await enqueueEmailJob('password-reset-code', { email, username: user.username, code: resetCode });

    res.json({ success: true, message: 'Password reset code sent to your email' });
  } catch (error) {
    console.error('Password reset email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send password reset email' });
  }
};

// Reset password with code
exports.resetPasswordWithCode = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required' });
    }

    const storedData = global.passwordResetCodes?.[email];
    
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'No reset code found for this email' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.passwordResetCodes[email];
      return res.status(400).json({ success: false, message: 'Reset code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid reset code' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    delete global.passwordResetCodes[email];

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify code
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required' });
    }

    const storedData = global.verificationCodes?.[email];
    
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'No verification code found for this email' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.verificationCodes[email];
      return res.status(400).json({ success: false, message: 'Verification code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Code is valid
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify email (old token-based method - keep for backward compatibility)
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Forgot Password - Step 1: Request verification code
exports.requestForgotPassword = async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ success: false, message: 'Username and email are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Invalid username or email' });
    }

    if (user.email !== email) {
      return res.status(404).json({ success: false, message: 'Invalid username or email' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    global.forgotPasswordCodes = global.forgotPasswordCodes || {};
    global.forgotPasswordCodes[email] = {
      code: verificationCode,
      username,
      expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes
      verified: false
    };

    await enqueueEmailJob('password-reset-code', { email, username: user.username, code: verificationCode });

    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
};

// Forgot Password - Step 2: Verify code
exports.verifyForgotPasswordCode = async (req, res) => {
  try {
    const { username, email, code } = req.body;

    if (!username || !email || !code) {
      return res.status(400).json({ success: false, message: 'Username, email and code are required' });
    }

    const storedData = global.forgotPasswordCodes?.[email];
    
    if (!storedData || storedData.username !== username) {
      return res.status(400).json({ success: false, message: 'Invalid verification request' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.forgotPasswordCodes[email];
      return res.status(400).json({ success: false, message: 'Verification code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    storedData.verified = true;
    res.json({ success: true, message: 'Verification successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Forgot Password - Step 3: Request password change (send 2nd code)
exports.requestForgotPasswordChange = async (req, res) => {
  try {
    const { username, email, newPassword } = req.body;

    if (!username || !email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Username, email and new password are required' });
    }

    const storedData = global.forgotPasswordCodes?.[email];
    
    if (!storedData || !storedData.verified || storedData.username !== username) {
      return res.status(400).json({ success: false, message: 'Please verify your email first' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.forgotPasswordCodes[email];
      return res.status(400).json({ success: false, message: 'Session expired. Please start again' });
    }

    const confirmCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    global.forgotPasswordChangeCodes = global.forgotPasswordChangeCodes || {};
    global.forgotPasswordChangeCodes[email] = {
      code: confirmCode,
      username,
      newPassword,
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
    };

    const user = await User.findOne({ username, email });
    await enqueueEmailJob('password-change-confirmation', { email, username: user.username, code: confirmCode });

    res.json({ success: true, message: 'Confirmation code sent to your email' });
  } catch (error) {
    console.error('Password change request error:', error);
    res.status(500).json({ success: false, message: 'Failed to send confirmation code' });
  }
};

// Forgot Password - Step 4: Confirm and change password
exports.confirmForgotPasswordChange = async (req, res) => {
  try {
    const { username, email, code } = req.body;

    if (!username || !email || !code) {
      return res.status(400).json({ success: false, message: 'Username, email and code are required' });
    }

    const storedData = global.forgotPasswordChangeCodes?.[email];
    
    if (!storedData || storedData.username !== username) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation request' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.forgotPasswordChangeCodes[email];
      return res.status(400).json({ success: false, message: 'Confirmation code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code' });
    }

    const user = await User.findOne({ username, email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = storedData.newPassword;
    await user.save();

    delete global.forgotPasswordCodes[email];
    delete global.forgotPasswordChangeCodes[email];

    // Send success email
    try {
      await enqueueEmailJob('password-changed-success', { email, username });
    } catch (error) {
      console.error('Failed to send success email:', error);
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Authenticated Forgot Password - Step 1: Request password change (send code)
exports.requestAuthenticatedPasswordChange = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user._id;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const confirmCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    global.authenticatedPasswordChangeCodes = global.authenticatedPasswordChangeCodes || {};
    global.authenticatedPasswordChangeCodes[userId.toString()] = {
      code: confirmCode,
      newPassword,
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
    };

    await enqueueEmailJob('password-change-confirmation', { email: user.email, username: user.username, code: confirmCode });

    res.json({ success: true, message: 'Confirmation code sent to your email' });
  } catch (error) {
    console.error('Authenticated password change request error:', error);
    res.status(500).json({ success: false, message: 'Failed to send confirmation code' });
  }
};

// Authenticated Forgot Password - Step 2: Confirm and change password
exports.confirmAuthenticatedPasswordChange = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Confirmation code is required' });
    }

    const storedData = global.authenticatedPasswordChangeCodes?.[userId.toString()];
    
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'No password change request found' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.authenticatedPasswordChangeCodes[userId.toString()];
      return res.status(400).json({ success: false, message: 'Confirmation code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = storedData.newPassword;
    await user.save();

    delete global.authenticatedPasswordChangeCodes[userId.toString()];

    // Send success email
    try {
      await enqueueEmailJob('password-changed-success', { email: user.email, username: user.username });
    } catch (error) {
      console.error('Failed to send success email:', error);
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Check guest username availability
exports.checkGuestUsername = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    // Validate username format (letters, numbers, underscore only)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.json({ success: true, available: false, message: 'Only letters, numbers, and underscores allowed' });
    }

    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      return res.json({ success: true, available: false, message: 'Username already taken' });
    }

    res.json({ success: true, available: true, message: 'Username available' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Guest login
exports.guestLogin = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ success: false, message: 'Only letters, numbers, and underscores allowed' });
    }

    // Check if username exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    // Create guest user (12 hours expiry)
    const guestExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const guestUser = await User.create({
      username,
      password: crypto.randomBytes(32).toString('hex'), // Random password
      role: 'guest',
      isGuest: true,
      guestExpiresAt,
      isVerified: true
    });

    const token = generateToken(guestUser._id);

    res.status(201).json({
      success: true,
      message: 'Guest login successful',
      token,
      user: {
        id: guestUser._id,
        username: guestUser.username,
        role: guestUser.role,
        isGuest: true,
        guestExpiresAt
      },
      rememberMe: true // Auto remember for guests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
