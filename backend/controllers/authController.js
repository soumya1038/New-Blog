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
const FACEBOOK_AUTH_BASE_URL = 'https://www.facebook.com/v20.0/dialog/oauth';
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v20.0/oauth/access_token';
const FACEBOOK_USERINFO_URL = 'https://graph.facebook.com/me';
const LINKEDIN_AUTH_BASE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const TWITTER_AUTH_BASE_URL = 'https://x.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const TWITTER_USERINFO_URL = 'https://api.twitter.com/2/users/me';

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

const getFacebookAppId = () =>
  (process.env.FACEBOOK_APP_ID || process.env.facebook_app_id || '').trim();

const getFacebookAppSecret = () =>
  (process.env.FACEBOOK_APP_SECRET || process.env.facebook_app_secret || '').trim();

const getLinkedInClientId = () =>
  (process.env.LINKEDIN_CLIENT_ID || process.env.linkedin_client_id || '').trim();

const getLinkedInClientSecret = () =>
  (process.env.LINKEDIN_CLIENT_SECRET || process.env.linkedin_client_secret || '').trim();

const getTwitterClientId = () =>
  (process.env.TWITTER_CLIENT_ID || process.env.twitter_client_id || '').trim();

const getTwitterClientSecret = () =>
  (process.env.TWITTER_CLIENT_SECRET || process.env.twitter_client_secret || '').trim();

const getTwitterOauthScopes = () => {
  const raw = String(process.env.TWITTER_OAUTH_SCOPES || '').trim();
  const parsed = raw
    ? raw.split(/[,\s]+/).map((entry) => entry.trim()).filter(Boolean)
    : [];

  // Use the explicit env value when provided, otherwise use minimum login scopes.
  const requested = parsed.length > 0 ? parsed : ['tweet.read', 'users.read'];
  const normalized = [...new Set(requested)];
  if (!normalized.includes('users.read')) {
    normalized.push('users.read');
  }
  return normalized;
};

const parseTwitterScopeSet = (value = '') =>
  new Set(
    String(value || '')
      .split(/[,\s]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  );

const getLinkedInOauthScopes = () => {
  const raw = String(process.env.LINKEDIN_OAUTH_SCOPES || '').trim();
  const parsed = raw
    ? raw.split(/[,\s]+/).map((entry) => entry.trim()).filter(Boolean)
    : [];

  const requested = parsed.length > 0 ? parsed : ['openid', 'profile', 'email'];
  const normalized = [...new Set(requested)];
  if (!normalized.includes('openid')) {
    normalized.unshift('openid');
  }
  return normalized;
};

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

const getAllowedFacebookRedirectUris = () => {
  const configured = (process.env.FACEBOOK_ALLOWED_REDIRECT_URIS || '')
    .split(',')
    .map((entry) => normalizeAbsoluteUrl(entry))
    .filter(Boolean);

  const defaults = [
    'https://lekhon-development.netlify.app/auth/facebook/callback',
    'http://localhost:3000/auth/facebook/callback',
    'http://localhost:3001/auth/facebook/callback',
  ];

  const frontendProd = normalizeAbsoluteUrl(process.env.FRONTEND_URL_PROD || '');
  const frontendLocal = normalizeAbsoluteUrl(process.env.FRONTEND_URL || '');

  if (frontendProd) defaults.push(`${frontendProd}/auth/facebook/callback`.replace(/\/{2,}/g, '/').replace(':/', '://'));
  if (frontendLocal) defaults.push(`${frontendLocal}/auth/facebook/callback`.replace(/\/{2,}/g, '/').replace(':/', '://'));

  return [...new Set([...defaults, ...configured].map((entry) => normalizeAbsoluteUrl(entry)).filter(Boolean))];
};

const getAllowedTwitterRedirectUris = () => {
  const configured = (process.env.TWITTER_ALLOWED_REDIRECT_URIS || '')
    .split(',')
    .map((entry) => normalizeAbsoluteUrl(entry))
    .filter(Boolean);

  const defaults = [
    'https://lekhon-development.netlify.app/auth/twitter/callback',
    'http://localhost:3000/auth/twitter/callback',
    'http://localhost:3001/auth/twitter/callback',
  ];

  const frontendProd = normalizeAbsoluteUrl(process.env.FRONTEND_URL_PROD || '');
  const frontendLocal = normalizeAbsoluteUrl(process.env.FRONTEND_URL || '');

  if (frontendProd) defaults.push(`${frontendProd}/auth/twitter/callback`.replace(/\/{2,}/g, '/').replace(':/', '://'));
  if (frontendLocal) defaults.push(`${frontendLocal}/auth/twitter/callback`.replace(/\/{2,}/g, '/').replace(':/', '://'));

  return [...new Set([...defaults, ...configured].map((entry) => normalizeAbsoluteUrl(entry)).filter(Boolean))];
};

const getAllowedLinkedInRedirectUris = () => {
  const configured = (process.env.LINKEDIN_ALLOWED_REDIRECT_URIS || '')
    .split(',')
    .map((entry) => normalizeAbsoluteUrl(entry))
    .filter(Boolean);

  const defaults = [
    'https://lekhon-development.netlify.app/auth/linkedin/callback',
    'http://localhost:3000/auth/linkedin/callback',
    'http://localhost:3001/auth/linkedin/callback',
  ];

  const frontendProd = normalizeAbsoluteUrl(process.env.FRONTEND_URL_PROD || '');
  const frontendLocal = normalizeAbsoluteUrl(process.env.FRONTEND_URL || '');

  if (frontendProd) defaults.push(`${frontendProd}/auth/linkedin/callback`.replace(/\/{2,}/g, '/').replace(':/', '://'));
  if (frontendLocal) defaults.push(`${frontendLocal}/auth/linkedin/callback`.replace(/\/{2,}/g, '/').replace(':/', '://'));

  return [...new Set([...defaults, ...configured].map((entry) => normalizeAbsoluteUrl(entry)).filter(Boolean))];
};

const isGoogleRedirectUriAllowed = (redirectUri) => {
  const normalized = normalizeAbsoluteUrl(redirectUri);
  if (!normalized) return false;
  return getAllowedGoogleRedirectUris().includes(normalized);
};

const isFacebookRedirectUriAllowed = (redirectUri) => {
  const normalized = normalizeAbsoluteUrl(redirectUri);
  if (!normalized) return false;
  return getAllowedFacebookRedirectUris().includes(normalized);
};

const isTwitterRedirectUriAllowed = (redirectUri) => {
  const normalized = normalizeAbsoluteUrl(redirectUri);
  if (!normalized) return false;
  return getAllowedTwitterRedirectUris().includes(normalized);
};

const isLinkedInRedirectUriAllowed = (redirectUri) => {
  const normalized = normalizeAbsoluteUrl(redirectUri);
  if (!normalized) return false;
  return getAllowedLinkedInRedirectUris().includes(normalized);
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

const consumeGoogleStateToken = (stateToken, ttlMs = 10 * 60 * 1000) => {
  const token = String(stateToken || '').trim();
  if (!token) return false;

  global.consumedGoogleStateTokens = global.consumedGoogleStateTokens || new Map();
  const now = Date.now();

  for (const [savedToken, expiresAt] of global.consumedGoogleStateTokens.entries()) {
    if (expiresAt <= now) {
      global.consumedGoogleStateTokens.delete(savedToken);
    }
  }

  if (global.consumedGoogleStateTokens.has(token)) {
    return false;
  }

  global.consumedGoogleStateTokens.set(token, now + ttlMs);
  return true;
};

const createOAuthState = (payload = {}, expiresIn = '10m') => {
  return jwt.sign(
    {
      ...payload,
      nonce: crypto.randomBytes(8).toString('hex'),
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

const readOAuthState = (stateToken) => {
  if (!stateToken || !process.env.JWT_SECRET) return null;
  try {
    return jwt.verify(String(stateToken), process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const consumeOAuthStateToken = (stateToken, ttlMs = 10 * 60 * 1000) => {
  const token = String(stateToken || '').trim();
  if (!token) return false;

  global.consumedOAuthStateTokens = global.consumedOAuthStateTokens || new Map();
  const now = Date.now();

  for (const [savedToken, expiresAt] of global.consumedOAuthStateTokens.entries()) {
    if (expiresAt <= now) {
      global.consumedOAuthStateTokens.delete(savedToken);
    }
  }

  if (global.consumedOAuthStateTokens.has(token)) {
    return false;
  }

  global.consumedOAuthStateTokens.set(token, now + ttlMs);
  return true;
};

const toBase64Url = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const buildGoogleProfileUrl = () => 'https://accounts.google.com';

const buildFacebookProfileUrl = (facebookUserId) => {
  const id = String(facebookUserId || '').trim();
  if (!id) return '';
  return `https://www.facebook.com/${encodeURIComponent(id)}`;
};

const buildTwitterProfileUrl = (twitterHandle, twitterUserId) => {
  const handle = String(twitterHandle || '').trim().replace(/^@+/, '');
  if (handle) {
    return `https://x.com/${encodeURIComponent(handle)}`;
  }

  const id = String(twitterUserId || '').trim();
  if (!id) return '';
  return `https://x.com/i/user/${encodeURIComponent(id)}`;
};

const buildLinkedInProfileUrl = () => 'https://www.linkedin.com';

const ensureSocialLink = (user, name, matcher, url) => {
  if (!user || !url) return false;
  const currentSocial = Array.isArray(user.socialMedia) ? user.socialMedia : [];
  const exists = currentSocial.some((entry) => matcher(String(entry?.name || '').toLowerCase(), String(entry?.url || '').toLowerCase()));
  if (exists) return false;
  user.socialMedia = [...currentSocial, { name, url }];
  return true;
};

const ensureGoogleSocialLink = (user) =>
  ensureSocialLink(
    user,
    'Google',
    (name, url) => name.includes('google') || url.includes('google.com'),
    buildGoogleProfileUrl()
  );

const ensureFacebookSocialLink = (user, facebookUserId) =>
  ensureSocialLink(
    user,
    'Facebook',
    (name, url) => name.includes('facebook') || url.includes('facebook.com'),
    buildFacebookProfileUrl(facebookUserId)
  );

const ensureTwitterSocialLink = (user, twitterHandle, twitterUserId) =>
  ensureSocialLink(
    user,
    'Twitter',
    (name, url) => name.includes('twitter') || name === 'x' || url.includes('twitter.com') || url.includes('x.com'),
    buildTwitterProfileUrl(twitterHandle, twitterUserId)
  );

const ensureLinkedInSocialLink = (user) =>
  ensureSocialLink(
    user,
    'LinkedIn',
    (name, url) => name.includes('linkedin') || url.includes('linkedin.com'),
    buildLinkedInProfileUrl()
  );

const getLinkedProvidersSummary = (user) => ({
  google: Boolean(user?.oauthProviders?.google?.id),
  facebook: Boolean(user?.oauthProviders?.facebook?.id),
  twitter: Boolean(user?.oauthProviders?.twitter?.id),
  linkedin: Boolean(user?.oauthProviders?.linkedin?.id),
});

const findUserByProviderOrEmail = async ({ provider = '', providerId = '', email = '' }) => {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  const normalizedProviderId = String(providerId || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (normalizedProvider && normalizedProviderId) {
    const providerMatch = await User.findOne({ [`oauthProviders.${normalizedProvider}.id`]: normalizedProviderId });
    if (providerMatch) return providerMatch;
  }
  if (normalizedEmail) {
    const emailMatch = await User.findOne({ email: normalizedEmail });
    if (emailMatch) return emailMatch;
  }
  return null;
};

const linkProviderToExistingUser = async ({
  currentUser,
  provider,
  providerId,
  email = '',
  displayName = '',
  picture = '',
  facebookUserId = '',
  twitterHandle = '',
  twitterUserId = '',
  linkedInUserId = '',
}) => {
  const providerName = String(provider || '').trim().toLowerCase();
  const normalizedProviderId = String(providerId || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!currentUser) {
    return { ok: false, status: 404, message: 'Current user not found' };
  }

  if (!['google', 'facebook', 'twitter', 'linkedin'].includes(providerName)) {
    return { ok: false, status: 400, message: 'Unsupported provider' };
  }

  if (!normalizedProviderId) {
    return { ok: false, status: 400, message: `${providerName} account id is unavailable` };
  }

  const providerConflictUser = await User.findOne({ [`oauthProviders.${providerName}.id`]: normalizedProviderId })
    .select('_id username');
  if (providerConflictUser && String(providerConflictUser._id) !== String(currentUser._id)) {
    return {
      ok: false,
      status: 409,
      message: `This ${providerName} account is already linked to another Lekhon account.`,
    };
  }

  if (normalizedEmail) {
    const emailConflictUser = await User.findOne({ email: normalizedEmail }).select('_id username');
    if (emailConflictUser && String(emailConflictUser._id) !== String(currentUser._id)) {
      return {
        ok: false,
        status: 409,
        message: 'This email is already used by another Lekhon account. Please log in with that account to link this provider.',
      };
    }
  }

  let shouldSave = false;

  if (currentUser?.oauthProviders?.[providerName]?.id !== normalizedProviderId) {
    currentUser.oauthProviders = {
      ...(currentUser.oauthProviders || {}),
      google: { id: providerName === 'google' ? normalizedProviderId : currentUser?.oauthProviders?.google?.id || '' },
      facebook: { id: providerName === 'facebook' ? normalizedProviderId : currentUser?.oauthProviders?.facebook?.id || '' },
      twitter: { id: providerName === 'twitter' ? normalizedProviderId : currentUser?.oauthProviders?.twitter?.id || '' },
      linkedin: { id: providerName === 'linkedin' ? normalizedProviderId : currentUser?.oauthProviders?.linkedin?.id || '' },
    };
    shouldSave = true;
  }

  if (normalizedEmail && !currentUser.email) {
    currentUser.email = normalizedEmail;
    shouldSave = true;
  }
  if (!currentUser.fullName && displayName) {
    currentUser.fullName = displayName;
    shouldSave = true;
  }
  if (!currentUser.name && displayName) {
    currentUser.name = displayName;
    shouldSave = true;
  }
  if (!currentUser.profileImage && picture) {
    currentUser.profileImage = picture;
    shouldSave = true;
  }

  if (providerName === 'google' && ensureGoogleSocialLink(currentUser)) {
    shouldSave = true;
  }
  if (providerName === 'facebook' && ensureFacebookSocialLink(currentUser, facebookUserId || normalizedProviderId)) {
    shouldSave = true;
  }
  if (providerName === 'twitter' && ensureTwitterSocialLink(currentUser, twitterHandle, twitterUserId || normalizedProviderId)) {
    shouldSave = true;
  }
  if (providerName === 'linkedin' && ensureLinkedInSocialLink(currentUser, linkedInUserId || normalizedProviderId)) {
    shouldSave = true;
  }

  if (shouldSave) {
    await currentUser.save();
  }

  return {
    ok: true,
    user: currentUser,
    linkedProviders: getLinkedProvidersSummary(currentUser),
  };
};

const buildWelcomeEmailJobId = (email) =>
  `welcome-email:${String(email || '').trim().toLowerCase()}`;

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

const generateTemporaryPassword = (length = 12) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let index = 0; index < length; index += 1) {
    password += alphabet[bytes[index] % alphabet.length];
  }
  return password;
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
      isVerified: false
    });

    // Send welcome email
    if (email) {
      try {
        await enqueueEmailJob(
          'welcome-email',
          { email, username },
          { jobId: buildWelcomeEmailJobId(email) }
        );
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
    if (!consumeGoogleStateToken(state)) {
      return res.status(409).json({
        success: false,
        message: 'This Google sign-in request has already been used. Please try again.',
      });
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
    const googleUserId = String(profile.sub || '').trim();
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

    let user = await findUserByProviderOrEmail({
      provider: 'google',
      providerId: googleUserId,
      email,
    });
    let temporaryPassword = '';
    if (!user) {
      const usernameSeed = email.split('@')[0] || displayName || 'user';
      const username = await makeUniqueUsername(usernameSeed);
      temporaryPassword = generateTemporaryPassword();

      user = await User.create({
        username,
        email,
        password: temporaryPassword,
        fullName: displayName,
        name: displayName,
        profileImage: picture,
        isVerified: false,
        mustChangePasswordAfterGoogle: true,
        socialMedia: [{ name: 'Google', url: buildGoogleProfileUrl() }],
        oauthProviders: {
          google: { id: googleUserId },
        },
      });

      try {
        await enqueueEmailJob('welcome-email', {
          email,
          username,
          temporaryPassword,
        }, {
          jobId: buildWelcomeEmailJobId(email),
        });
      } catch (mailError) {
        console.error('Failed to send Google onboarding welcome email:', mailError);
      }
    } else {
      let shouldSave = false;
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
      if (googleUserId && user?.oauthProviders?.google?.id !== googleUserId) {
        user.oauthProviders = {
          ...(user.oauthProviders || {}),
          google: { id: googleUserId },
          facebook: { id: user?.oauthProviders?.facebook?.id || '' },
          twitter: { id: user?.oauthProviders?.twitter?.id || '' },
          linkedin: { id: user?.oauthProviders?.linkedin?.id || '' },
        };
        shouldSave = true;
      }
      if (ensureGoogleSocialLink(user)) {
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
      passwordSetupRequired: Boolean(user.mustChangePasswordAfterGoogle),
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

const generateTwitterPkcePair = () => {
  const codeVerifier = toBase64Url(crypto.randomBytes(64));
  const codeChallenge = toBase64Url(crypto.createHash('sha256').update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
};

const exchangeTwitterAuthorizationCode = async ({
  code,
  redirectUri,
  codeVerifier,
  clientId,
  clientSecret,
}) => {
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code: String(code),
    redirect_uri: String(redirectUri),
    client_id: String(clientId),
    code_verifier: String(codeVerifier),
  });

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenResponse = await axios.post(TWITTER_TOKEN_URL, tokenParams.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
  });

  return tokenResponse?.data || {};
};

const fetchTwitterProfile = async (accessToken, { includeEmail = false } = {}) => {
  const baseFields = ['id', 'name', 'username', 'profile_image_url'];
  const userFields = includeEmail ? [...baseFields, 'email'] : baseFields;

  const response = await axios.get(TWITTER_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      'user.fields': userFields.join(','),
    },
  });
  return response?.data || {};
};

const fetchTwitterProfileWithFallback = async (accessToken, tokenScope = '') => {
  const grantedScopes = parseTwitterScopeSet(tokenScope);
  const shouldRequestEmail = grantedScopes.has('users.email');

  if (!shouldRequestEmail) {
    return fetchTwitterProfile(accessToken, { includeEmail: false });
  }

  try {
    return await fetchTwitterProfile(accessToken, { includeEmail: true });
  } catch (error) {
    const upstreamStatus = error?.response?.status;
    const details = error?.response?.data;
    const detailText = typeof details === 'string'
      ? details.toLowerCase()
      : JSON.stringify(details || {}).toLowerCase();
    const missingEmailScope =
      upstreamStatus === 403 &&
      detailText.includes('missing') &&
      detailText.includes('scope') &&
      detailText.includes('users.email');

    if (missingEmailScope) {
      return fetchTwitterProfile(accessToken, { includeEmail: false });
    }
    throw error;
  }
};

const createSocialPlaceholderEmail = (provider, providerId) =>
  `${String(provider || 'social')}_${String(providerId || crypto.randomBytes(4).toString('hex'))}@${String(provider || 'social')}.local`;

const exchangeLinkedInAuthorizationCode = async ({
  code,
  redirectUri,
  clientId,
  clientSecret,
}) => {
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code: String(code),
    redirect_uri: String(redirectUri),
    client_id: String(clientId),
    client_secret: String(clientSecret),
  });

  const tokenResponse = await axios.post(LINKEDIN_TOKEN_URL, tokenParams.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return tokenResponse?.data || {};
};

const fetchLinkedInProfile = async (accessToken) => {
  const response = await axios.get(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response?.data || {};
};

// Start Facebook OAuth redirect flow
exports.startFacebookAuth = async (req, res) => {
  try {
    const appId = getFacebookAppId();
    if (!appId) {
      return res.status(500).json({ success: false, message: 'Facebook OAuth is not configured on server' });
    }

    const redirectUri = normalizeAbsoluteUrl(req.query.redirect_uri || '');
    if (!redirectUri) {
      return res.status(400).json({ success: false, message: 'A valid redirect_uri is required' });
    }
    if (!isFacebookRedirectUriAllowed(redirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirect_uri is not allowed',
        allowedRedirectUris: getAllowedFacebookRedirectUris(),
      });
    }

    const state = createOAuthState({
      provider: 'facebook',
      mode: 'login',
      redirectUri,
    });

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    });

    return res.redirect(`${FACEBOOK_AUTH_BASE_URL}?${params.toString()}`);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Exchange Facebook OAuth code for local session
exports.exchangeFacebookCode = async (req, res) => {
  try {
    const appId = getFacebookAppId();
    const appSecret = getFacebookAppSecret();
    if (!appId || !appSecret) {
      return res.status(500).json({ success: false, message: 'Facebook OAuth is not configured on server' });
    }

    const { code, redirectUri, state } = req.body || {};
    const normalizedRedirectUri = normalizeAbsoluteUrl(redirectUri || '');
    if (!code || !normalizedRedirectUri) {
      return res.status(400).json({ success: false, message: 'code and redirectUri are required' });
    }
    if (!isFacebookRedirectUriAllowed(normalizedRedirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirectUri is not allowed',
        allowedRedirectUris: getAllowedFacebookRedirectUris(),
      });
    }

    const statePayload = readOAuthState(state);
    if (
      !statePayload ||
      statePayload.provider !== 'facebook' ||
      statePayload.mode !== 'login' ||
      normalizeAbsoluteUrl(statePayload.redirectUri) !== normalizedRedirectUri
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OAuth state' });
    }
    if (!consumeOAuthStateToken(state)) {
      return res.status(409).json({
        success: false,
        message: 'This Facebook sign-in request has already been used. Please try again.',
      });
    }

    const tokenResponse = await axios.get(FACEBOOK_TOKEN_URL, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: normalizedRedirectUri,
        code: String(code),
      },
    });

    const accessToken = tokenResponse?.data?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Facebook access token not received' });
    }

    const profileResponse = await axios.get(FACEBOOK_USERINFO_URL, {
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token: accessToken,
      },
    });

    const profile = profileResponse?.data || {};
    const facebookUserId = String(profile.id || '').trim();
    const email = String(profile.email || '').trim().toLowerCase();
    const displayName = String(profile.name || '').trim();
    const picture = String(profile?.picture?.data?.url || '').trim();

    if (!facebookUserId) {
      return res.status(400).json({ success: false, message: 'Facebook account id is unavailable' });
    }

    let user = await findUserByProviderOrEmail({
      provider: 'facebook',
      providerId: facebookUserId,
      email,
    });

    let temporaryPassword = '';
    const missingEmailForWelcome = !email;
    if (!user) {
      const usernameSeed = email.split('@')[0] || displayName || `fb_${facebookUserId.slice(-6)}`;
      const username = await makeUniqueUsername(usernameSeed);
      temporaryPassword = generateTemporaryPassword();

      user = await User.create({
        username,
        email: email || createSocialPlaceholderEmail('facebook', facebookUserId),
        password: temporaryPassword,
        fullName: displayName,
        name: displayName,
        profileImage: picture,
        isVerified: false,
        mustChangePasswordAfterGoogle: true,
        socialMedia: buildFacebookProfileUrl(facebookUserId)
          ? [{ name: 'Facebook', url: buildFacebookProfileUrl(facebookUserId) }]
          : [],
        oauthProviders: {
          facebook: { id: facebookUserId },
        },
      });

      if (email) {
        try {
          await enqueueEmailJob('welcome-email', {
            email,
            username,
            temporaryPassword,
          }, {
            jobId: buildWelcomeEmailJobId(email),
          });
        } catch (mailError) {
          console.error('Failed to send Facebook onboarding welcome email:', mailError);
        }
      }
    } else {
      let shouldSave = false;
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
      if (facebookUserId && user?.oauthProviders?.facebook?.id !== facebookUserId) {
        user.oauthProviders = {
          ...(user.oauthProviders || {}),
          google: { id: user?.oauthProviders?.google?.id || '' },
          facebook: { id: facebookUserId },
          twitter: { id: user?.oauthProviders?.twitter?.id || '' },
          linkedin: { id: user?.oauthProviders?.linkedin?.id || '' },
        };
        shouldSave = true;
      }
      if (ensureFacebookSocialLink(user, facebookUserId)) {
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
      passwordSetupRequired: Boolean(user.mustChangePasswordAfterGoogle),
      rememberMe: true,
      missingEmailForWelcome,
    });
  } catch (error) {
    const details = error?.response?.data || error.message;
    return res.status(500).json({
      success: false,
      message: 'Facebook authentication failed',
      details,
    });
  }
};

// Start LinkedIn OAuth redirect flow
exports.startLinkedInAuth = async (req, res) => {
  try {
    const clientId = getLinkedInClientId();
    if (!clientId) {
      return res.status(500).json({ success: false, message: 'LinkedIn OAuth is not configured on server' });
    }

    const redirectUri = normalizeAbsoluteUrl(req.query.redirect_uri || '');
    if (!redirectUri) {
      return res.status(400).json({ success: false, message: 'A valid redirect_uri is required' });
    }
    if (!isLinkedInRedirectUriAllowed(redirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirect_uri is not allowed',
        allowedRedirectUris: getAllowedLinkedInRedirectUris(),
      });
    }

    const state = createOAuthState({
      provider: 'linkedin',
      mode: 'login',
      redirectUri,
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: getLinkedInOauthScopes().join(' '),
      state,
    });

    return res.redirect(`${LINKEDIN_AUTH_BASE_URL}?${params.toString()}`);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Exchange LinkedIn OAuth code for local session
exports.exchangeLinkedInCode = async (req, res) => {
  try {
    const clientId = getLinkedInClientId();
    const clientSecret = getLinkedInClientSecret();
    if (!clientId || !clientSecret) {
      return res.status(500).json({ success: false, message: 'LinkedIn OAuth is not configured on server' });
    }

    const { code, redirectUri, state } = req.body || {};
    const normalizedRedirectUri = normalizeAbsoluteUrl(redirectUri || '');
    if (!code || !normalizedRedirectUri) {
      return res.status(400).json({ success: false, message: 'code and redirectUri are required' });
    }
    if (!isLinkedInRedirectUriAllowed(normalizedRedirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirectUri is not allowed',
        allowedRedirectUris: getAllowedLinkedInRedirectUris(),
      });
    }

    const statePayload = readOAuthState(state);
    if (
      !statePayload ||
      statePayload.provider !== 'linkedin' ||
      statePayload.mode !== 'login' ||
      normalizeAbsoluteUrl(statePayload.redirectUri) !== normalizedRedirectUri
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OAuth state' });
    }
    if (!consumeOAuthStateToken(state)) {
      return res.status(409).json({
        success: false,
        message: 'This LinkedIn sign-in request has already been used. Please try again.',
      });
    }

    const tokenData = await exchangeLinkedInAuthorizationCode({
      code,
      redirectUri: normalizedRedirectUri,
      clientId,
      clientSecret,
    });

    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'LinkedIn access token not received' });
    }

    const profile = await fetchLinkedInProfile(accessToken);
    const linkedInUserId = String(profile.sub || profile.id || '').trim();
    const email = String(profile.email || '').trim().toLowerCase();
    const emailVerified = profile?.email_verified !== false;
    const displayName = String(profile.name || `${profile.given_name || ''} ${profile.family_name || ''}` || '').trim();
    const rawPicture = profile?.picture;
    const picture = typeof rawPicture === 'string'
      ? rawPicture.trim()
      : typeof rawPicture?.url === 'string'
        ? rawPicture.url.trim()
        : '';

    if (!linkedInUserId) {
      return res.status(400).json({ success: false, message: 'LinkedIn account id is unavailable' });
    }

    if (email && !emailVerified) {
      return res.status(400).json({ success: false, message: 'LinkedIn account email is not verified' });
    }

    let user = await findUserByProviderOrEmail({
      provider: 'linkedin',
      providerId: linkedInUserId,
      email,
    });

    let temporaryPassword = '';
    const missingEmailForWelcome = !email;
    if (!user) {
      const usernameSeed = (email ? email.split('@')[0] : '') || displayName || `li_${linkedInUserId.slice(-6)}`;
      const username = await makeUniqueUsername(usernameSeed);
      temporaryPassword = generateTemporaryPassword();

      user = await User.create({
        username,
        email: email || createSocialPlaceholderEmail('linkedin', linkedInUserId),
        password: temporaryPassword,
        fullName: displayName,
        name: displayName,
        profileImage: picture,
        isVerified: false,
        mustChangePasswordAfterGoogle: true,
        socialMedia: [{ name: 'LinkedIn', url: buildLinkedInProfileUrl() }],
        oauthProviders: {
          linkedin: { id: linkedInUserId },
        },
      });

      if (email) {
        try {
          await enqueueEmailJob('welcome-email', {
            email,
            username,
            temporaryPassword,
          }, {
            jobId: buildWelcomeEmailJobId(email),
          });
        } catch (mailError) {
          console.error('Failed to send LinkedIn onboarding welcome email:', mailError);
        }
      }
    } else {
      let shouldSave = false;
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
      if (linkedInUserId && user?.oauthProviders?.linkedin?.id !== linkedInUserId) {
        user.oauthProviders = {
          ...(user.oauthProviders || {}),
          google: { id: user?.oauthProviders?.google?.id || '' },
          facebook: { id: user?.oauthProviders?.facebook?.id || '' },
          twitter: { id: user?.oauthProviders?.twitter?.id || '' },
          linkedin: { id: linkedInUserId },
        };
        shouldSave = true;
      }
      if (ensureLinkedInSocialLink(user)) {
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
      passwordSetupRequired: Boolean(user.mustChangePasswordAfterGoogle),
      rememberMe: true,
      missingEmailForWelcome,
    });
  } catch (error) {
    const upstreamStatus = error?.response?.status;
    const details = error?.response?.data || error.message;
    if (upstreamStatus >= 400 && upstreamStatus < 500) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn OAuth request was rejected. Please try again.',
        details,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'LinkedIn authentication failed',
      details,
    });
  }
};

// Start Twitter OAuth redirect flow
exports.startTwitterAuth = async (req, res) => {
  try {
    const clientId = getTwitterClientId();
    if (!clientId) {
      return res.status(500).json({ success: false, message: 'Twitter OAuth is not configured on server' });
    }

    const redirectUri = normalizeAbsoluteUrl(req.query.redirect_uri || '');
    if (!redirectUri) {
      return res.status(400).json({ success: false, message: 'A valid redirect_uri is required' });
    }
    if (!isTwitterRedirectUriAllowed(redirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirect_uri is not allowed',
        allowedRedirectUris: getAllowedTwitterRedirectUris(),
      });
    }

    const { codeVerifier, codeChallenge } = generateTwitterPkcePair();
    const state = createOAuthState({
      provider: 'twitter',
      mode: 'login',
      redirectUri,
      codeVerifier,
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: getTwitterOauthScopes().join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return res.redirect(`${TWITTER_AUTH_BASE_URL}?${params.toString()}`);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Exchange Twitter OAuth code for local session
exports.exchangeTwitterCode = async (req, res) => {
  try {
    const clientId = getTwitterClientId();
    const clientSecret = getTwitterClientSecret();
    if (!clientId || !clientSecret) {
      return res.status(500).json({ success: false, message: 'Twitter OAuth is not configured on server' });
    }

    const { code, redirectUri, state } = req.body || {};
    const normalizedRedirectUri = normalizeAbsoluteUrl(redirectUri || '');
    if (!code || !normalizedRedirectUri) {
      return res.status(400).json({ success: false, message: 'code and redirectUri are required' });
    }
    if (!isTwitterRedirectUriAllowed(normalizedRedirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirectUri is not allowed',
        allowedRedirectUris: getAllowedTwitterRedirectUris(),
      });
    }

    const statePayload = readOAuthState(state);
    if (
      !statePayload ||
      statePayload.provider !== 'twitter' ||
      statePayload.mode !== 'login' ||
      normalizeAbsoluteUrl(statePayload.redirectUri) !== normalizedRedirectUri
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OAuth state' });
    }
    if (!consumeOAuthStateToken(state)) {
      return res.status(409).json({
        success: false,
        message: 'This Twitter sign-in request has already been used. Please try again.',
      });
    }

    const codeVerifier = String(statePayload.codeVerifier || '').trim();
    if (!codeVerifier) {
      return res.status(400).json({ success: false, message: 'Invalid OAuth verifier state' });
    }

    const tokenData = await exchangeTwitterAuthorizationCode({
      code,
      redirectUri: normalizedRedirectUri,
      codeVerifier,
      clientId,
      clientSecret,
    });

    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Twitter access token not received' });
    }

    let profileData;
    try {
      profileData = await fetchTwitterProfileWithFallback(accessToken, tokenData?.scope || '');
    } catch (error) {
      const upstreamStatus = error?.response?.status;
      const details = error?.response?.data || error.message;
      if (upstreamStatus >= 400 && upstreamStatus < 500) {
        return res.status(400).json({
          success: false,
          message: 'Twitter OAuth request was rejected. Please try again.',
          details,
        });
      }
      throw error;
    }

    const profile = profileData?.data || {};
    const twitterUserId = String(profile.id || '').trim();
    const twitterHandle = String(profile.username || '').trim();
    const displayName = String(profile.name || '').trim();
    const email = String(profile.email || profile.confirmed_email || '').trim().toLowerCase();
    const picture = String(profile.profile_image_url || '').trim();

    if (!twitterUserId) {
      return res.status(400).json({ success: false, message: 'Twitter account id is unavailable' });
    }

    let user = await findUserByProviderOrEmail({
      provider: 'twitter',
      providerId: twitterUserId,
      email,
    });

    let temporaryPassword = '';
    const missingEmailForWelcome = !email;
    if (!user) {
      const usernameSeed = twitterHandle || (email ? email.split('@')[0] : '') || `tw_${twitterUserId.slice(-6)}`;
      const username = await makeUniqueUsername(usernameSeed);
      temporaryPassword = generateTemporaryPassword();

      user = await User.create({
        username,
        email: email || createSocialPlaceholderEmail('twitter', twitterUserId),
        password: temporaryPassword,
        fullName: displayName,
        name: displayName,
        profileImage: picture,
        isVerified: false,
        mustChangePasswordAfterGoogle: true,
        socialMedia: buildTwitterProfileUrl(twitterHandle, twitterUserId)
          ? [{ name: 'Twitter', url: buildTwitterProfileUrl(twitterHandle, twitterUserId) }]
          : [],
        oauthProviders: {
          twitter: { id: twitterUserId },
        },
      });

      if (email) {
        try {
          await enqueueEmailJob('welcome-email', {
            email,
            username,
            temporaryPassword,
          }, {
            jobId: buildWelcomeEmailJobId(email),
          });
        } catch (mailError) {
          console.error('Failed to send Twitter onboarding welcome email:', mailError);
        }
      }
    } else {
      let shouldSave = false;
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
      if (twitterUserId && user?.oauthProviders?.twitter?.id !== twitterUserId) {
        user.oauthProviders = {
          ...(user.oauthProviders || {}),
          google: { id: user?.oauthProviders?.google?.id || '' },
          facebook: { id: user?.oauthProviders?.facebook?.id || '' },
          twitter: { id: twitterUserId },
          linkedin: { id: user?.oauthProviders?.linkedin?.id || '' },
        };
        shouldSave = true;
      }
      if (ensureTwitterSocialLink(user, twitterHandle, twitterUserId)) {
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
      passwordSetupRequired: Boolean(user.mustChangePasswordAfterGoogle),
      rememberMe: true,
      missingEmailForWelcome,
    });
  } catch (error) {
    const details = error?.response?.data || error.message;
    return res.status(500).json({
      success: false,
      message: 'Twitter authentication failed',
      details,
    });
  }
};

exports.startGoogleConnectAuth = async (req, res) => {
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

    const state = createOAuthState({
      provider: 'google',
      mode: 'connect',
      userId: req.user?._id,
      redirectUri,
    });

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

    return res.json({
      success: true,
      authUrl: `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.exchangeGoogleConnectCode = async (req, res) => {
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

    const statePayload = readOAuthState(state);
    if (
      !statePayload ||
      statePayload.provider !== 'google' ||
      statePayload.mode !== 'connect' ||
      String(statePayload.userId || '') !== String(req.user?._id || '') ||
      normalizeAbsoluteUrl(statePayload.redirectUri) !== normalizedRedirectUri
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OAuth state' });
    }
    if (!consumeOAuthStateToken(state)) {
      return res.status(409).json({
        success: false,
        message: 'This Google connect request has already been used. Please try again.',
      });
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
    const googleUserId = String(profile.sub || '').trim();
    const email = String(profile.email || '').trim().toLowerCase();
    const emailVerified = Boolean(profile.email_verified);
    const displayName = String(profile.name || '').trim();
    const picture = String(profile.picture || '').trim();

    if (!googleUserId) {
      return res.status(400).json({ success: false, message: 'Google account id is unavailable' });
    }
    if (email && !emailVerified) {
      return res.status(400).json({ success: false, message: 'Google account email is not verified' });
    }

    const currentUser = await User.findById(req.user._id);
    const linkResult = await linkProviderToExistingUser({
      currentUser,
      provider: 'google',
      providerId: googleUserId,
      email,
      displayName,
      picture,
    });

    if (!linkResult.ok) {
      return res.status(linkResult.status).json({
        success: false,
        message: linkResult.message,
      });
    }

    return res.json({
      success: true,
      message: 'Google account connected successfully',
      linkedProviders: linkResult.linkedProviders,
      user: {
        id: linkResult.user._id,
        username: linkResult.user.username,
        email: linkResult.user.email,
      },
    });
  } catch (error) {
    const details = error?.response?.data || error.message;
    return res.status(500).json({
      success: false,
      message: 'Google account connection failed',
      details,
    });
  }
};

exports.startFacebookConnectAuth = async (req, res) => {
  try {
    const appId = getFacebookAppId();
    if (!appId) {
      return res.status(500).json({ success: false, message: 'Facebook OAuth is not configured on server' });
    }

    const redirectUri = normalizeAbsoluteUrl(req.query.redirect_uri || '');
    if (!redirectUri) {
      return res.status(400).json({ success: false, message: 'A valid redirect_uri is required' });
    }
    if (!isFacebookRedirectUriAllowed(redirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirect_uri is not allowed',
        allowedRedirectUris: getAllowedFacebookRedirectUris(),
      });
    }

    const state = createOAuthState({
      provider: 'facebook',
      mode: 'connect',
      userId: req.user?._id,
      redirectUri,
    });

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    });

    return res.json({
      success: true,
      authUrl: `${FACEBOOK_AUTH_BASE_URL}?${params.toString()}`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.exchangeFacebookConnectCode = async (req, res) => {
  try {
    const appId = getFacebookAppId();
    const appSecret = getFacebookAppSecret();
    if (!appId || !appSecret) {
      return res.status(500).json({ success: false, message: 'Facebook OAuth is not configured on server' });
    }

    const { code, redirectUri, state } = req.body || {};
    const normalizedRedirectUri = normalizeAbsoluteUrl(redirectUri || '');
    if (!code || !normalizedRedirectUri) {
      return res.status(400).json({ success: false, message: 'code and redirectUri are required' });
    }
    if (!isFacebookRedirectUriAllowed(normalizedRedirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirectUri is not allowed',
        allowedRedirectUris: getAllowedFacebookRedirectUris(),
      });
    }

    const statePayload = readOAuthState(state);
    if (
      !statePayload ||
      statePayload.provider !== 'facebook' ||
      statePayload.mode !== 'connect' ||
      String(statePayload.userId || '') !== String(req.user?._id || '') ||
      normalizeAbsoluteUrl(statePayload.redirectUri) !== normalizedRedirectUri
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OAuth state' });
    }
    if (!consumeOAuthStateToken(state)) {
      return res.status(409).json({
        success: false,
        message: 'This Facebook connect request has already been used. Please try again.',
      });
    }

    const tokenResponse = await axios.get(FACEBOOK_TOKEN_URL, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: normalizedRedirectUri,
        code: String(code),
      },
    });

    const accessToken = tokenResponse?.data?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Facebook access token not received' });
    }

    const profileResponse = await axios.get(FACEBOOK_USERINFO_URL, {
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token: accessToken,
      },
    });

    const profile = profileResponse?.data || {};
    const facebookUserId = String(profile.id || '').trim();
    const email = String(profile.email || '').trim().toLowerCase();
    const displayName = String(profile.name || '').trim();
    const picture = String(profile?.picture?.data?.url || '').trim();

    if (!facebookUserId) {
      return res.status(400).json({ success: false, message: 'Facebook account id is unavailable' });
    }

    const currentUser = await User.findById(req.user._id);
    const linkResult = await linkProviderToExistingUser({
      currentUser,
      provider: 'facebook',
      providerId: facebookUserId,
      email,
      displayName,
      picture,
      facebookUserId,
    });

    if (!linkResult.ok) {
      return res.status(linkResult.status).json({
        success: false,
        message: linkResult.message,
      });
    }

    return res.json({
      success: true,
      message: 'Facebook account connected successfully',
      linkedProviders: linkResult.linkedProviders,
      user: {
        id: linkResult.user._id,
        username: linkResult.user.username,
        email: linkResult.user.email,
      },
    });
  } catch (error) {
    const details = error?.response?.data || error.message;
    return res.status(500).json({
      success: false,
      message: 'Facebook account connection failed',
      details,
    });
  }
};

exports.startLinkedInConnectAuth = async (req, res) => {
  try {
    const clientId = getLinkedInClientId();
    if (!clientId) {
      return res.status(500).json({ success: false, message: 'LinkedIn OAuth is not configured on server' });
    }

    const redirectUri = normalizeAbsoluteUrl(req.query.redirect_uri || '');
    if (!redirectUri) {
      return res.status(400).json({ success: false, message: 'A valid redirect_uri is required' });
    }
    if (!isLinkedInRedirectUriAllowed(redirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirect_uri is not allowed',
        allowedRedirectUris: getAllowedLinkedInRedirectUris(),
      });
    }

    const state = createOAuthState({
      provider: 'linkedin',
      mode: 'connect',
      userId: req.user?._id,
      redirectUri,
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: getLinkedInOauthScopes().join(' '),
      state,
    });

    return res.json({
      success: true,
      authUrl: `${LINKEDIN_AUTH_BASE_URL}?${params.toString()}`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.exchangeLinkedInConnectCode = async (req, res) => {
  try {
    const clientId = getLinkedInClientId();
    const clientSecret = getLinkedInClientSecret();
    if (!clientId || !clientSecret) {
      return res.status(500).json({ success: false, message: 'LinkedIn OAuth is not configured on server' });
    }

    const { code, redirectUri, state } = req.body || {};
    const normalizedRedirectUri = normalizeAbsoluteUrl(redirectUri || '');
    if (!code || !normalizedRedirectUri) {
      return res.status(400).json({ success: false, message: 'code and redirectUri are required' });
    }
    if (!isLinkedInRedirectUriAllowed(normalizedRedirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirectUri is not allowed',
        allowedRedirectUris: getAllowedLinkedInRedirectUris(),
      });
    }

    const statePayload = readOAuthState(state);
    if (
      !statePayload ||
      statePayload.provider !== 'linkedin' ||
      statePayload.mode !== 'connect' ||
      String(statePayload.userId || '') !== String(req.user?._id || '') ||
      normalizeAbsoluteUrl(statePayload.redirectUri) !== normalizedRedirectUri
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OAuth state' });
    }
    if (!consumeOAuthStateToken(state)) {
      return res.status(409).json({
        success: false,
        message: 'This LinkedIn connect request has already been used. Please try again.',
      });
    }

    const tokenData = await exchangeLinkedInAuthorizationCode({
      code,
      redirectUri: normalizedRedirectUri,
      clientId,
      clientSecret,
    });

    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'LinkedIn access token not received' });
    }

    const profile = await fetchLinkedInProfile(accessToken);
    const linkedInUserId = String(profile.sub || profile.id || '').trim();
    const email = String(profile.email || '').trim().toLowerCase();
    const emailVerified = profile?.email_verified !== false;
    const displayName = String(profile.name || `${profile.given_name || ''} ${profile.family_name || ''}` || '').trim();
    const rawPicture = profile?.picture;
    const picture = typeof rawPicture === 'string'
      ? rawPicture.trim()
      : typeof rawPicture?.url === 'string'
        ? rawPicture.url.trim()
        : '';

    if (!linkedInUserId) {
      return res.status(400).json({ success: false, message: 'LinkedIn account id is unavailable' });
    }
    if (email && !emailVerified) {
      return res.status(400).json({ success: false, message: 'LinkedIn account email is not verified' });
    }

    const currentUser = await User.findById(req.user._id);
    const linkResult = await linkProviderToExistingUser({
      currentUser,
      provider: 'linkedin',
      providerId: linkedInUserId,
      email,
      displayName,
      picture,
      linkedInUserId,
    });

    if (!linkResult.ok) {
      return res.status(linkResult.status).json({
        success: false,
        message: linkResult.message,
      });
    }

    return res.json({
      success: true,
      message: 'LinkedIn account connected successfully',
      linkedProviders: linkResult.linkedProviders,
      user: {
        id: linkResult.user._id,
        username: linkResult.user.username,
        email: linkResult.user.email,
      },
      missingEmailForWelcome: !email,
    });
  } catch (error) {
    const upstreamStatus = error?.response?.status;
    const details = error?.response?.data || error.message;
    if (upstreamStatus >= 400 && upstreamStatus < 500) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn OAuth request was rejected. Please try again.',
        details,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'LinkedIn account connection failed',
      details,
    });
  }
};

exports.startTwitterConnectAuth = async (req, res) => {
  try {
    const clientId = getTwitterClientId();
    if (!clientId) {
      return res.status(500).json({ success: false, message: 'Twitter OAuth is not configured on server' });
    }

    const redirectUri = normalizeAbsoluteUrl(req.query.redirect_uri || '');
    if (!redirectUri) {
      return res.status(400).json({ success: false, message: 'A valid redirect_uri is required' });
    }
    if (!isTwitterRedirectUriAllowed(redirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirect_uri is not allowed',
        allowedRedirectUris: getAllowedTwitterRedirectUris(),
      });
    }

    const { codeVerifier, codeChallenge } = generateTwitterPkcePair();
    const state = createOAuthState({
      provider: 'twitter',
      mode: 'connect',
      userId: req.user?._id,
      redirectUri,
      codeVerifier,
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: getTwitterOauthScopes().join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return res.json({
      success: true,
      authUrl: `${TWITTER_AUTH_BASE_URL}?${params.toString()}`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.exchangeTwitterConnectCode = async (req, res) => {
  try {
    const clientId = getTwitterClientId();
    const clientSecret = getTwitterClientSecret();
    if (!clientId || !clientSecret) {
      return res.status(500).json({ success: false, message: 'Twitter OAuth is not configured on server' });
    }

    const { code, redirectUri, state } = req.body || {};
    const normalizedRedirectUri = normalizeAbsoluteUrl(redirectUri || '');
    if (!code || !normalizedRedirectUri) {
      return res.status(400).json({ success: false, message: 'code and redirectUri are required' });
    }
    if (!isTwitterRedirectUriAllowed(normalizedRedirectUri)) {
      return res.status(400).json({
        success: false,
        message: 'redirectUri is not allowed',
        allowedRedirectUris: getAllowedTwitterRedirectUris(),
      });
    }

    const statePayload = readOAuthState(state);
    if (
      !statePayload ||
      statePayload.provider !== 'twitter' ||
      statePayload.mode !== 'connect' ||
      String(statePayload.userId || '') !== String(req.user?._id || '') ||
      normalizeAbsoluteUrl(statePayload.redirectUri) !== normalizedRedirectUri
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OAuth state' });
    }
    if (!consumeOAuthStateToken(state)) {
      return res.status(409).json({
        success: false,
        message: 'This Twitter connect request has already been used. Please try again.',
      });
    }

    const codeVerifier = String(statePayload.codeVerifier || '').trim();
    if (!codeVerifier) {
      return res.status(400).json({ success: false, message: 'Invalid OAuth verifier state' });
    }

    const tokenData = await exchangeTwitterAuthorizationCode({
      code,
      redirectUri: normalizedRedirectUri,
      codeVerifier,
      clientId,
      clientSecret,
    });

    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Twitter access token not received' });
    }

    let profileData;
    try {
      profileData = await fetchTwitterProfileWithFallback(accessToken, tokenData?.scope || '');
    } catch (error) {
      const upstreamStatus = error?.response?.status;
      const details = error?.response?.data || error.message;
      if (upstreamStatus >= 400 && upstreamStatus < 500) {
        return res.status(400).json({
          success: false,
          message: 'Twitter OAuth request was rejected. Please try again.',
          details,
        });
      }
      throw error;
    }

    const profile = profileData?.data || {};
    const twitterUserId = String(profile.id || '').trim();
    const twitterHandle = String(profile.username || '').trim();
    const displayName = String(profile.name || '').trim();
    const email = String(profile.email || profile.confirmed_email || '').trim().toLowerCase();
    const picture = String(profile.profile_image_url || '').trim();

    if (!twitterUserId) {
      return res.status(400).json({ success: false, message: 'Twitter account id is unavailable' });
    }

    const currentUser = await User.findById(req.user._id);
    const linkResult = await linkProviderToExistingUser({
      currentUser,
      provider: 'twitter',
      providerId: twitterUserId,
      email,
      displayName,
      picture,
      twitterHandle,
      twitterUserId,
    });

    if (!linkResult.ok) {
      return res.status(linkResult.status).json({
        success: false,
        message: linkResult.message,
      });
    }

    return res.json({
      success: true,
      message: 'Twitter account connected successfully',
      linkedProviders: linkResult.linkedProviders,
      user: {
        id: linkResult.user._id,
        username: linkResult.user.username,
        email: linkResult.user.email,
      },
      missingEmailForWelcome: !email,
    });
  } catch (error) {
    const details = error?.response?.data || error.message;
    return res.status(500).json({
      success: false,
      message: 'Twitter account connection failed',
      details,
    });
  }
};

const parseFacebookSignedRequest = (signedRequest, appSecret) => {
  const [encodedSignature, payload] = String(signedRequest || '').split('.');
  if (!encodedSignature || !payload || !appSecret) return null;

  const expectedSignature = toBase64Url(
    crypto.createHmac('sha256', appSecret).update(payload).digest()
  );

  if (expectedSignature !== encodedSignature) return null;
  try {
    const decodedPayload = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
      .toString('utf8');
    return JSON.parse(decodedPayload);
  } catch (error) {
    return null;
  }
};

exports.facebookDeauthorizeCallback = async (req, res) => {
  try {
    const appSecret = getFacebookAppSecret();
    const payload = parseFacebookSignedRequest(req.body?.signed_request, appSecret);
    if (!payload?.user_id) {
      return res.status(400).send('Invalid signed request');
    }

    const facebookUserId = String(payload.user_id);
    await User.updateMany(
      { 'oauthProviders.facebook.id': facebookUserId },
      { $set: { 'oauthProviders.facebook.id': '' } }
    );

    return res.status(200).send('OK');
  } catch (error) {
    return res.status(500).send('ERROR');
  }
};

exports.facebookDataDeletionRequest = async (req, res) => {
  try {
    const appSecret = getFacebookAppSecret();
    const backendPublicUrl = (process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
    const payload = parseFacebookSignedRequest(req.body?.signed_request, appSecret);
    if (!payload?.user_id) {
      return res.status(400).json({ success: false, message: 'Invalid signed request' });
    }

    const facebookUserId = String(payload.user_id);
    const matchedUser = await User.findOne({ 'oauthProviders.facebook.id': facebookUserId }).select('_id');
    const confirmationCode = crypto.randomBytes(12).toString('hex');

    global.facebookDeletionRequests = global.facebookDeletionRequests || {};
    global.facebookDeletionRequests[confirmationCode] = {
      userId: matchedUser?._id ? String(matchedUser._id) : null,
      facebookUserId,
      createdAt: Date.now(),
      status: 'completed',
    };

    await User.updateMany(
      { 'oauthProviders.facebook.id': facebookUserId },
      { $set: { 'oauthProviders.facebook.id': '' } }
    );

    return res.json({
      url: backendPublicUrl
        ? `${backendPublicUrl}/api/auth/facebook/data-deletion-status/${confirmationCode}`
        : `https://example.com/data-deletion-status/${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to process data deletion request' });
  }
};

exports.facebookDataDeletionStatus = async (req, res) => {
  const code = String(req.params.code || '');
  const requestMap = global.facebookDeletionRequests || {};
  const request = requestMap[code];
  if (!request) {
    return res.status(404).json({ success: false, message: 'Deletion request not found' });
  }
  return res.json({
    success: true,
    confirmationCode: code,
    status: request.status || 'completed',
    processedAt: request.createdAt,
  });
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
    const verificationExpiresAt = Date.now() + 2 * 60 * 1000;
    global.verificationCodes[email] = {
      code: verificationCode,
      expiresAt: verificationExpiresAt // 2 minutes
    };

    // Queue verification email send
    await enqueueEmailJob('verification-code', {
      email,
      username: 'User',
      code: verificationCode,
      expiresAt: verificationExpiresAt
    });

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
    const resetExpiresAt = Date.now() + 2 * 60 * 1000;
    global.passwordResetCodes[email] = {
      code: resetCode,
      expiresAt: resetExpiresAt // 2 minutes
    };

    await enqueueEmailJob('password-reset-code', {
      email,
      username: user.username,
      code: resetCode,
      expiresAt: resetExpiresAt
    });

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
    if (user.mustChangePasswordAfterGoogle) {
      user.mustChangePasswordAfterGoogle = false;
    }
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
    const forgotVerificationExpiresAt = Date.now() + 2 * 60 * 1000;
    global.forgotPasswordCodes[email] = {
      code: verificationCode,
      username,
      expiresAt: forgotVerificationExpiresAt, // 2 minutes
      verified: false
    };

    await enqueueEmailJob('password-reset-code', {
      email,
      username: user.username,
      code: verificationCode,
      expiresAt: forgotVerificationExpiresAt
    });

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
    const forgotChangeExpiresAt = Date.now() + 2 * 60 * 1000;
    global.forgotPasswordChangeCodes[email] = {
      code: confirmCode,
      username,
      newPassword,
      expiresAt: forgotChangeExpiresAt // 2 minutes
    };

    const user = await User.findOne({ username, email });
    await enqueueEmailJob('password-change-confirmation', {
      email,
      username: user.username,
      code: confirmCode,
      expiresAt: forgotChangeExpiresAt
    });

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
    if (user.mustChangePasswordAfterGoogle) {
      user.mustChangePasswordAfterGoogle = false;
    }
    await user.save();

    delete global.forgotPasswordCodes[email];
    delete global.forgotPasswordChangeCodes[email];

    // Send success email
    try {
      await enqueueEmailJob('password-changed-success', { email, username, changedAt: Date.now() });
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
    const authenticatedChangeExpiresAt = Date.now() + 2 * 60 * 1000;
    global.authenticatedPasswordChangeCodes[userId.toString()] = {
      code: confirmCode,
      newPassword,
      expiresAt: authenticatedChangeExpiresAt // 2 minutes
    };

    await enqueueEmailJob('password-change-confirmation', {
      email: user.email,
      username: user.username,
      code: confirmCode,
      expiresAt: authenticatedChangeExpiresAt
    });

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
    if (user.mustChangePasswordAfterGoogle) {
      user.mustChangePasswordAfterGoogle = false;
    }
    await user.save();

    delete global.authenticatedPasswordChangeCodes[userId.toString()];

    // Send success email
    try {
      await enqueueEmailJob('password-changed-success', {
        email: user.email,
        username: user.username,
        changedAt: Date.now()
      });
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
