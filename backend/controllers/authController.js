const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validateEmail } = require('../utils/emailValidator');
const { enqueueEmailJob } = require('../jobs/queueService');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const {
  consumeVerificationCode,
  createVerificationCode,
  deleteVerificationCodes,
  getActiveVerificationCode,
  normalizeEmail,
  verifyVerificationCode,
} = require('../utils/verificationCodes');
const {
  consumeStateKeyOnce,
  createTemporaryState,
  getTemporaryState,
} = require('../utils/temporaryState');
const {
  buildTwoFactorStatus,
  getChallengeMethodsPayload,
  verifyTwoFactorActionToken,
} = require('../utils/twoFactor');
const {
  getPasswordValidationError,
  isPasswordComparable,
  normalizePasswordInput,
} = require('../utils/passwordPolicy');
const { sanitizeOwnerProfile } = require('../utils/userSanitizer');
const { logError } = require('../utils/safeErrorLog');
const { getOAuthProviderTimeoutMs } = require('../utils/providerTimeouts');

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
const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';
const TELEGRAM_AUTH_MAX_AGE_SECONDS = 10 * 60;

const withOAuthTimeout = (config = {}) => ({
  ...config,
  timeout: getOAuthProviderTimeoutMs(),
});

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

const isNativeAppOAuthRequest = (req) =>
  ['1', 'true', 'yes'].includes(String(req.query.native_app || '').trim().toLowerCase());

const wantsOAuthStartJson = (req) => {
  const requestedFormat = String(req.query?.format || '').trim().toLowerCase();
  const acceptHeader = String(req.get?.('accept') || '').toLowerCase();
  return requestedFormat === 'json' || acceptHeader.includes('application/json');
};

const sendOAuthStartResponse = (req, res, authUrl) => {
  if (wantsOAuthStartJson(req)) {
    return res.json({ success: true, authUrl });
  }
  return res.redirect(authUrl);
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

const getTelegramBotToken = () => String(process.env.TELEGRAM_BOT_TOKEN || '').trim();

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

const isProductionRuntime = () => process.env.NODE_ENV === 'production';

const buildFrontendCallbackUrl = (baseUrl, provider) => {
  const normalized = normalizeAbsoluteUrl(baseUrl);
  if (!normalized) return '';
  return `${normalized}/auth/${provider}/callback`.replace(/\/{2,}/g, '/').replace(':/', '://');
};

const buildAllowedRedirectUris = ({ provider, envKey }) => {
  const configured = (process.env[envKey] || '')
    .split(',')
    .map((entry) => normalizeAbsoluteUrl(entry))
    .filter(Boolean);

  const defaults = [];
  if (!isProductionRuntime()) {
    defaults.push(
      `https://lekhon-development.netlify.app/auth/${provider}/callback`,
      `https://localhost/auth/${provider}/callback`,
      `http://localhost:3000/auth/${provider}/callback`,
      `http://localhost:3001/auth/${provider}/callback`
    );
  }

  [
    process.env.FRONTEND_URL_PROD,
    process.env.FRONTEND_URL,
    process.env.PUBLIC_SITE_URL,
  ].forEach((baseUrl) => {
    const callbackUrl = buildFrontendCallbackUrl(baseUrl, provider);
    if (callbackUrl) defaults.push(callbackUrl);
  });

  return [...new Set([...defaults, ...configured].map((entry) => normalizeAbsoluteUrl(entry)).filter(Boolean))];
};

const resolveBackendPublicUrl = (req) => {
  const configured = normalizeAbsoluteUrl(process.env.BACKEND_PUBLIC_URL || '');
  if (configured) return configured.replace(/\/+$/, '');
  if (isProductionRuntime()) return '';
  return normalizeAbsoluteUrl(`${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
};

const getAllowedGoogleRedirectUris = () => {
  return buildAllowedRedirectUris({ provider: 'google', envKey: 'GOOGLE_ALLOWED_REDIRECT_URIS' });
};

const getAllowedFacebookRedirectUris = () => {
  return buildAllowedRedirectUris({ provider: 'facebook', envKey: 'FACEBOOK_ALLOWED_REDIRECT_URIS' });
};

const getAllowedTwitterRedirectUris = () => {
  return buildAllowedRedirectUris({ provider: 'twitter', envKey: 'TWITTER_ALLOWED_REDIRECT_URIS' });
};

const getAllowedLinkedInRedirectUris = () => {
  return buildAllowedRedirectUris({ provider: 'linkedin', envKey: 'LINKEDIN_ALLOWED_REDIRECT_URIS' });
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

const buildRedirectUriError = (message, getAllowedRedirectUris) => ({
  success: false,
  message,
  ...(!isProductionRuntime() && { allowedRedirectUris: getAllowedRedirectUris() }),
});

const shouldRedactDetailKey = (key = '') =>
  /(token|secret|authorization|password|verifier|credential|client_secret|access_token|refresh_token|id_token|code)/i.test(String(key));

const redactErrorDetails = (value, depth = 0) => {
  if (depth > 4) return '[redacted]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.slice(0, 500);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => redactErrorDetails(item, depth + 1));
  }

  return Object.entries(value).reduce((safe, [key, item]) => {
    safe[key] = shouldRedactDetailKey(key) ? '[redacted]' : redactErrorDetails(item, depth + 1);
    return safe;
  }, {});
};

const buildSafeOAuthErrorBody = (message, error) => {
  const body = { success: false, message };
  if (!isProductionRuntime()) {
    body.details = redactErrorDetails(error?.response?.data || error?.message || 'OAuth request failed');
  }
  return body;
};

const sendOAuthError = (res, status, message, error) =>
  res.status(status).json(buildSafeOAuthErrorBody(message, error));

const createGoogleState = (redirectUri, payload = {}) => {
  return jwt.sign(
    {
      ...payload,
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

const consumeGoogleStateToken = async (stateToken, ttlMs = 10 * 60 * 1000) => {
  const token = String(stateToken || '').trim();
  if (!token) return false;
  return consumeStateKeyOnce({ type: 'google_oauth_state', key: token, ttlMs });
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

const consumeOAuthStateToken = async (stateToken, ttlMs = 10 * 60 * 1000) => {
  const token = String(stateToken || '').trim();
  if (!token) return false;
  return consumeStateKeyOnce({ type: 'oauth_state', key: token, ttlMs });
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

const buildTelegramProfileUrl = (telegramHandle) => {
  const handle = String(telegramHandle || '').trim().replace(/^@+/, '');
  return handle ? `https://t.me/${encodeURIComponent(handle)}` : '';
};

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

const REGISTRATION_VERIFICATION_REQUEST_MESSAGE =
  'If this email can be registered, a verification code has been sent.';
const PASSWORD_RESET_REQUEST_MESSAGE =
  'If an account matches those details, a verification code has been sent.';
const INVALID_VERIFICATION_CODE_MESSAGE = 'Invalid or expired verification code';
const INVALID_CONFIRMATION_CODE_MESSAGE = 'Invalid or expired confirmation code';
const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isDuplicateKeyError = (error) => error?.code === 11000;

const normalizeUsername = (value = '') => String(value || '').trim();
const isRememberMeEnabled = (value) => value === true || String(value || '').toLowerCase() === 'true';

const getUsernameValidationMessage = (username) => {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username must be at most ${USERNAME_MAX_LENGTH} characters`;
  }
  if (!USERNAME_PATTERN.test(username)) return 'Only letters, numbers, and underscores allowed';
  return '';
};

const duplicateAccountMessage = (error) => {
  const keyPattern = error?.keyPattern || {};
  if (keyPattern.email || error?.message?.includes('email')) return 'Email already registered';
  if (keyPattern.username || error?.message?.includes('username')) return 'Username already exists';
  return 'Account already exists';
};

const findUserByNormalizedEmail = async (email, projection = '') => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const exactQuery = User.findOne({ email: normalizedEmail });
  if (projection) exactQuery.select(projection);
  const exactUser = await exactQuery;
  if (exactUser) return exactUser;

  const fallbackQuery = User.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i') },
  });
  if (projection) fallbackQuery.select(projection);
  return fallbackQuery;
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

    const username = normalizeUsername(req.body?.username);
    const { email } = req.body;
    const rememberMe = isRememberMeEnabled(req.body?.rememberMe);
    const password = normalizePasswordInput(req.body?.password);
    const normalizedEmail = normalizeEmail(email);
    const usernameError = getUsernameValidationMessage(username);
    if (usernameError) {
      return res.status(400).json({ success: false, message: usernameError });
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    let verifiedEmailCode = null;
    if (normalizedEmail) {
      // Validate email domain
      const emailValidation = validateEmail(normalizedEmail);
      if (!emailValidation.valid) {
        return res.status(400).json({ success: false, message: emailValidation.message });
      }

      verifiedEmailCode = await getActiveVerificationCode({
        email: normalizedEmail,
        type: 'registration',
        requireVerified: true,
      });
      if (!verifiedEmailCode) {
        return res.status(400).json({ success: false, message: 'Please verify your email before registering' });
      }

      const existingEmail = await findUserByNormalizedEmail(normalizedEmail, '_id');
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }
    
    const user = await User.create({
      username, 
      email: normalizedEmail,
      password,
      isVerified: Boolean(normalizedEmail)
    });

    if (verifiedEmailCode) {
      await consumeVerificationCode(verifiedEmailCode);
    }

    // Send welcome email
    if (normalizedEmail) {
      try {
        await enqueueEmailJob(
          'welcome-email',
          { email: normalizedEmail, username },
          { jobId: buildWelcomeEmailJobId(normalizedEmail) }
        );
      } catch (error) {
        logError('Failed to send welcome email:', error);
      }
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name || '',
        isVerified: user.isVerified || false,
        isSeller: user.isSeller || false,
      },
      rememberMe
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: duplicateAccountMessage(error) });
    }
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const rememberMe = isRememberMeEnabled(req.body?.rememberMe);
    const password = normalizePasswordInput(req.body?.password);

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }
    if (!isPasswordComparable(password)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = await User.findOne({ username }).select('+password');
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

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role,
        name: user.name || '',
        isVerified: user.isVerified || false,
        isSeller: user.isSeller || false,
      },
      rememberMe
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed' });
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
      return res.status(400).json(buildRedirectUriError('redirect_uri is not allowed', getAllowedGoogleRedirectUris));
    }

    const state = createGoogleState(redirectUri, {
      returnToNativeApp: isNativeAppOAuthRequest(req),
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

    return sendOAuthStartResponse(req, res, `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to start Google OAuth' });
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
      return res.status(400).json(buildRedirectUriError('redirectUri is not allowed', getAllowedGoogleRedirectUris));
    }

    const statePayload = readGoogleState(state);
    if (!statePayload || normalizeAbsoluteUrl(statePayload.redirectUri) !== normalizedRedirectUri) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OAuth state' });
    }
    if (!(await consumeGoogleStateToken(state))) {
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

    const tokenResponse = await axios.post(GOOGLE_TOKEN_URL, tokenParams.toString(), withOAuthTimeout({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }));

    const accessToken = tokenResponse?.data?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Google access token not received' });
    }

    const profileResponse = await axios.get(GOOGLE_USERINFO_URL, withOAuthTimeout({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }));

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
        logError('Failed to send Google onboarding welcome email:', mailError);
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

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role,
        name: user.name || '',
        isVerified: user.isVerified || false,
        isSeller: user.isSeller || false,
      },
      passwordSetupRequired: Boolean(user.mustChangePasswordAfterGoogle),
      rememberMe: false,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: duplicateAccountMessage(error) });
    }
    return sendOAuthError(res, 500, 'Google authentication failed', error);
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
  const tokenResponse = await axios.post(TWITTER_TOKEN_URL, tokenParams.toString(), withOAuthTimeout({
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
  }));

  return tokenResponse?.data || {};
};

const fetchTwitterProfile = async (accessToken, { includeEmail = false } = {}) => {
  const baseFields = ['id', 'name', 'username', 'profile_image_url'];
  const userFields = includeEmail ? [...baseFields, 'email'] : baseFields;

  const response = await axios.get(TWITTER_USERINFO_URL, withOAuthTimeout({
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      'user.fields': userFields.join(','),
    },
  }));
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

  const tokenResponse = await axios.post(LINKEDIN_TOKEN_URL, tokenParams.toString(), withOAuthTimeout({
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }));

  return tokenResponse?.data || {};
};

const fetchLinkedInProfile = async (accessToken) => {
  const response = await axios.get(LINKEDIN_USERINFO_URL, withOAuthTimeout({
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }));
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
      return res.status(400).json(buildRedirectUriError('redirect_uri is not allowed', getAllowedFacebookRedirectUris));
    }

    const state = createOAuthState({
      provider: 'facebook',
      mode: 'login',
      redirectUri,
      returnToNativeApp: isNativeAppOAuthRequest(req),
    });

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    });

    return sendOAuthStartResponse(req, res, `${FACEBOOK_AUTH_BASE_URL}?${params.toString()}`);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to start Facebook OAuth' });
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
      return res.status(400).json(buildRedirectUriError('redirectUri is not allowed', getAllowedFacebookRedirectUris));
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
    if (!(await consumeOAuthStateToken(state))) {
      return res.status(409).json({
        success: false,
        message: 'This Facebook sign-in request has already been used. Please try again.',
      });
    }

    const tokenResponse = await axios.get(FACEBOOK_TOKEN_URL, withOAuthTimeout({
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: normalizedRedirectUri,
        code: String(code),
      },
    }));

    const accessToken = tokenResponse?.data?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Facebook access token not received' });
    }

    const profileResponse = await axios.get(FACEBOOK_USERINFO_URL, withOAuthTimeout({
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token: accessToken,
      },
    }));

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
          logError('Failed to send Facebook onboarding welcome email:', mailError);
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

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role,
        name: user.name || '',
        isVerified: user.isVerified || false,
        isSeller: user.isSeller || false,
      },
      passwordSetupRequired: Boolean(user.mustChangePasswordAfterGoogle),
      rememberMe: false,
      missingEmailForWelcome,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: duplicateAccountMessage(error) });
    }
    return sendOAuthError(res, 500, 'Facebook authentication failed', error);
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
      return res.status(400).json(buildRedirectUriError('redirect_uri is not allowed', getAllowedLinkedInRedirectUris));
    }

    const state = createOAuthState({
      provider: 'linkedin',
      mode: 'login',
      redirectUri,
      returnToNativeApp: isNativeAppOAuthRequest(req),
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: getLinkedInOauthScopes().join(' '),
      state,
    });

    return sendOAuthStartResponse(req, res, `${LINKEDIN_AUTH_BASE_URL}?${params.toString()}`);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to start LinkedIn OAuth' });
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
      return res.status(400).json(buildRedirectUriError('redirectUri is not allowed', getAllowedLinkedInRedirectUris));
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
    if (!(await consumeOAuthStateToken(state))) {
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
          logError('Failed to send LinkedIn onboarding welcome email:', mailError);
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

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role,
        name: user.name || '',
        isVerified: user.isVerified || false,
        isSeller: user.isSeller || false,
      },
      passwordSetupRequired: Boolean(user.mustChangePasswordAfterGoogle),
      rememberMe: false,
      missingEmailForWelcome,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: duplicateAccountMessage(error) });
    }
    const upstreamStatus = error?.response?.status;
    if (upstreamStatus >= 400 && upstreamStatus < 500) {
      return sendOAuthError(res, 400, 'LinkedIn OAuth request was rejected. Please try again.', error);
    }
    return sendOAuthError(res, 500, 'LinkedIn authentication failed', error);
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
      return res.status(400).json(buildRedirectUriError('redirect_uri is not allowed', getAllowedTwitterRedirectUris));
    }

    const { codeVerifier, codeChallenge } = generateTwitterPkcePair();
    const state = createOAuthState({
      provider: 'twitter',
      mode: 'login',
      redirectUri,
      codeVerifier,
      returnToNativeApp: isNativeAppOAuthRequest(req),
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

    return sendOAuthStartResponse(req, res, `${TWITTER_AUTH_BASE_URL}?${params.toString()}`);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to start Twitter OAuth' });
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
      return res.status(400).json(buildRedirectUriError('redirectUri is not allowed', getAllowedTwitterRedirectUris));
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
    if (!(await consumeOAuthStateToken(state))) {
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
      if (upstreamStatus >= 400 && upstreamStatus < 500) {
        return sendOAuthError(res, 400, 'Twitter OAuth request was rejected. Please try again.', error);
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
          logError('Failed to send Twitter onboarding welcome email:', mailError);
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

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role,
        name: user.name || '',
        isVerified: user.isVerified || false,
        isSeller: user.isSeller || false,
      },
      passwordSetupRequired: Boolean(user.mustChangePasswordAfterGoogle),
      rememberMe: false,
      missingEmailForWelcome,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: duplicateAccountMessage(error) });
    }
    return sendOAuthError(res, 500, 'Twitter authentication failed', error);
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
      return res.status(400).json(buildRedirectUriError('redirect_uri is not allowed', getAllowedGoogleRedirectUris));
    }

    const state = createOAuthState({
      provider: 'google',
      mode: 'connect',
      userId: req.user?._id,
      redirectUri,
      returnToNativeApp: isNativeAppOAuthRequest(req),
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
    return res.status(500).json({ success: false, message: 'Failed to start Google account connection' });
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
      return res.status(400).json(buildRedirectUriError('redirectUri is not allowed', getAllowedGoogleRedirectUris));
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
    if (!(await consumeOAuthStateToken(state))) {
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

    const tokenResponse = await axios.post(GOOGLE_TOKEN_URL, tokenParams.toString(), withOAuthTimeout({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }));

    const accessToken = tokenResponse?.data?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Google access token not received' });
    }

    const profileResponse = await axios.get(GOOGLE_USERINFO_URL, withOAuthTimeout({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }));

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
    return sendOAuthError(res, 500, 'Google account connection failed', error);
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
      return res.status(400).json(buildRedirectUriError('redirect_uri is not allowed', getAllowedFacebookRedirectUris));
    }

    const state = createOAuthState({
      provider: 'facebook',
      mode: 'connect',
      userId: req.user?._id,
      redirectUri,
      returnToNativeApp: isNativeAppOAuthRequest(req),
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
    return res.status(500).json({ success: false, message: 'Failed to start Facebook account connection' });
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
      return res.status(400).json(buildRedirectUriError('redirectUri is not allowed', getAllowedFacebookRedirectUris));
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
    if (!(await consumeOAuthStateToken(state))) {
      return res.status(409).json({
        success: false,
        message: 'This Facebook connect request has already been used. Please try again.',
      });
    }

    const tokenResponse = await axios.get(FACEBOOK_TOKEN_URL, withOAuthTimeout({
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: normalizedRedirectUri,
        code: String(code),
      },
    }));

    const accessToken = tokenResponse?.data?.access_token;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Facebook access token not received' });
    }

    const profileResponse = await axios.get(FACEBOOK_USERINFO_URL, withOAuthTimeout({
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token: accessToken,
      },
    }));

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
    return sendOAuthError(res, 500, 'Facebook account connection failed', error);
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
      return res.status(400).json(buildRedirectUriError('redirect_uri is not allowed', getAllowedLinkedInRedirectUris));
    }

    const state = createOAuthState({
      provider: 'linkedin',
      mode: 'connect',
      userId: req.user?._id,
      redirectUri,
      returnToNativeApp: isNativeAppOAuthRequest(req),
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
    return res.status(500).json({ success: false, message: 'Failed to start LinkedIn account connection' });
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
      return res.status(400).json(buildRedirectUriError('redirectUri is not allowed', getAllowedLinkedInRedirectUris));
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
    if (!(await consumeOAuthStateToken(state))) {
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
    if (upstreamStatus >= 400 && upstreamStatus < 500) {
      return sendOAuthError(res, 400, 'LinkedIn OAuth request was rejected. Please try again.', error);
    }
    return sendOAuthError(res, 500, 'LinkedIn account connection failed', error);
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
      return res.status(400).json(buildRedirectUriError('redirect_uri is not allowed', getAllowedTwitterRedirectUris));
    }

    const { codeVerifier, codeChallenge } = generateTwitterPkcePair();
    const state = createOAuthState({
      provider: 'twitter',
      mode: 'connect',
      userId: req.user?._id,
      redirectUri,
      codeVerifier,
      returnToNativeApp: isNativeAppOAuthRequest(req),
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
    return res.status(500).json({ success: false, message: 'Failed to start Twitter account connection' });
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
      return res.status(400).json(buildRedirectUriError('redirectUri is not allowed', getAllowedTwitterRedirectUris));
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
    if (!(await consumeOAuthStateToken(state))) {
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
      if (upstreamStatus >= 400 && upstreamStatus < 500) {
        return sendOAuthError(res, 400, 'Twitter OAuth request was rejected. Please try again.', error);
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
    return sendOAuthError(res, 500, 'Twitter account connection failed', error);
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
    const backendPublicUrl = resolveBackendPublicUrl(req);
    if (!backendPublicUrl) {
      return res.status(503).json({ success: false, message: 'Backend public URL is not configured' });
    }
    const payload = parseFacebookSignedRequest(req.body?.signed_request, appSecret);
    if (!payload?.user_id) {
      return res.status(400).json({ success: false, message: 'Invalid signed request' });
    }

    const facebookUserId = String(payload.user_id);
    const matchedUser = await User.findOne({ 'oauthProviders.facebook.id': facebookUserId }).select('_id');
    const confirmationCode = crypto.randomBytes(12).toString('hex');
    const processedAt = Date.now();
    const deletionStatusTtlMs =
      Number(process.env.FACEBOOK_DELETION_STATUS_TTL_DAYS || 30) * 24 * 60 * 60 * 1000;

    await createTemporaryState({
      type: 'facebook_deletion_status',
      key: confirmationCode,
      ttlMs: deletionStatusTtlMs,
      data: {
        userId: matchedUser?._id ? String(matchedUser._id) : null,
        facebookUserId,
        processedAt,
        status: 'completed',
      },
    });

    await User.updateMany(
      { 'oauthProviders.facebook.id': facebookUserId },
      { $set: { 'oauthProviders.facebook.id': '' } }
    );

    return res.json({
      url: `${backendPublicUrl}/api/auth/facebook/data-deletion-status/${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to process data deletion request' });
  }
};

exports.facebookDataDeletionStatus = async (req, res) => {
  const code = String(req.params.code || '');
  const request = await getTemporaryState({ type: 'facebook_deletion_status', key: code });
  if (!request) {
    return res.status(404).json({ success: false, message: 'Deletion request not found' });
  }
  return res.json({
    success: true,
    confirmationCode: code,
    status: request.data?.status || 'completed',
    processedAt: request.data?.processedAt || request.createdAt?.getTime?.(),
  });
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFactor.sms.phone');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: sanitizeOwnerProfile(user.toObject()) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load account' });
  }
};

// Send verification code
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Validate email domain
    const emailValidation = validateEmail(normalizedEmail);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const existingUser = await findUserByNormalizedEmail(normalizedEmail, '_id');
    if (existingUser) {
      return res.json({ success: true, message: REGISTRATION_VERIFICATION_REQUEST_MESSAGE });
    }

    const { code: verificationCode, expiresAt: verificationExpiresAt } = await createVerificationCode({
      email: normalizedEmail,
      type: 'registration',
      username: 'User',
    });

    // Queue verification email send
    await enqueueEmailJob('verification-code', {
      email: normalizedEmail,
      username: 'User',
      code: verificationCode,
      expiresAt: verificationExpiresAt
    });

    res.json({ success: true, message: REGISTRATION_VERIFICATION_REQUEST_MESSAGE });
  } catch (error) {
    logError('Verification email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification email' });
  }
};

// Send password reset code
exports.sendPasswordResetCode = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'This password reset endpoint has been retired. Please use the forgot-password flow.',
  });
};

// Reset password with code
exports.resetPasswordWithCode = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'This password reset endpoint has been retired. Please use the forgot-password flow.',
  });
};

// Verify code
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required' });
    }

    const verification = await verifyVerificationCode({
      email,
      type: 'registration',
      code,
      markVerified: true,
    });

    if (!verification.ok) {
      return res.status(400).json({ success: false, message: INVALID_VERIFICATION_CODE_MESSAGE });
    }

    // Code is valid
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify code' });
  }
};

// Verify email (old token-based method - keep for backward compatibility)
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token }).select('+verificationToken');
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify email' });
  }
};

// Forgot Password - Step 1: Request verification code
exports.requestForgotPassword = async (req, res) => {
  try {
    const { username, email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!username || !normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Username and email are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.json({ success: true, message: PASSWORD_RESET_REQUEST_MESSAGE });
    }

    if (String(user.email || '').trim().toLowerCase() !== normalizedEmail) {
      return res.json({ success: true, message: PASSWORD_RESET_REQUEST_MESSAGE });
    }

    const { code: verificationCode, expiresAt: forgotVerificationExpiresAt } = await createVerificationCode({
      email: normalizedEmail,
      type: 'forgotPassword',
      username,
    });

    await enqueueEmailJob('password-reset-code', {
      email: normalizedEmail,
      username: user.username,
      code: verificationCode,
      expiresAt: forgotVerificationExpiresAt
    });

    res.json({ success: true, message: PASSWORD_RESET_REQUEST_MESSAGE });
  } catch (error) {
    logError('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
};

// Forgot Password - Step 2: Verify code
exports.verifyForgotPasswordCode = async (req, res) => {
  try {
    const { username, email, code } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!username || !normalizedEmail || !code) {
      return res.status(400).json({ success: false, message: 'Username, email and code are required' });
    }

    const verification = await verifyVerificationCode({
      email: normalizedEmail,
      type: 'forgotPassword',
      username,
      code,
      markVerified: true,
    });

    if (!verification.ok) {
      return res.status(400).json({ success: false, message: INVALID_VERIFICATION_CODE_MESSAGE });
    }

    res.json({ success: true, message: 'Verification successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify code' });
  }
};

// Forgot Password - Step 3: Request password change (send 2nd code)
exports.requestForgotPasswordChange = async (req, res) => {
  try {
    const { username, email } = req.body;
    const newPassword = normalizePasswordInput(req.body?.newPassword);
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!username || !normalizedEmail || !newPassword) {
      return res.status(400).json({ success: false, message: 'Username, email and new password are required' });
    }
    const passwordError = getPasswordValidationError(newPassword, 'New password');
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const verifiedResetSession = await getActiveVerificationCode({
      email: normalizedEmail,
      type: 'forgotPassword',
      username,
      requireVerified: true,
    });

    if (!verifiedResetSession) {
      return res.status(400).json({ success: false, message: 'Please verify your email first' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { code: confirmCode, expiresAt: forgotChangeExpiresAt } = await createVerificationCode({
      email: normalizedEmail,
      type: 'forgotPasswordChange',
      username,
      metadata: { passwordHash },
    });

    const user = await User.findOne({ username, email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid password reset session' });
    }
    await enqueueEmailJob('password-change-confirmation', {
      email: normalizedEmail,
      username: user.username,
      code: confirmCode,
      expiresAt: forgotChangeExpiresAt
    });

    res.json({ success: true, message: 'Confirmation code sent to your email' });
  } catch (error) {
    logError('Password change request error:', error);
    res.status(500).json({ success: false, message: 'Failed to send confirmation code' });
  }
};

// Forgot Password - Step 4: Confirm and change password
exports.confirmForgotPasswordChange = async (req, res) => {
  try {
    const { username, email, code } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!username || !normalizedEmail || !code) {
      return res.status(400).json({ success: false, message: 'Username, email and code are required' });
    }

    const verification = await verifyVerificationCode({
      email: normalizedEmail,
      type: 'forgotPasswordChange',
      username,
      code,
    });

    if (!verification.ok) {
      return res.status(400).json({ success: false, message: INVALID_CONFIRMATION_CODE_MESSAGE });
    }

    const user = await User.findOne({ username, email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation request' });
    }

    const twoFactorStatus = buildTwoFactorStatus(user);
    if (twoFactorStatus.enabled) {
      const verified = await verifyTwoFactorActionToken({
        userId: user._id,
        action: 'forgot_password',
        token: req.body.twoFactorToken,
      });

      if (!verified) {
        return res.status(403).json({
          success: false,
          requiresTwoFactor: true,
          action: 'forgot_password',
          actionLabel: 'reset your password',
          message: 'Two-factor verification required',
          twoFactor: getChallengeMethodsPayload(user),
        });
      }
    }

    const passwordHash = verification.record?.metadata?.passwordHash;
    if (!passwordHash) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation request' });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: passwordHash, mustChangePasswordAfterGoogle: false },
        $inc: { authVersion: 1 },
      }
    );
    await consumeVerificationCode(verification.record);
    await deleteVerificationCodes({ email: normalizedEmail, types: ['forgotPassword', 'forgotPasswordChange'] });

    // Send success email
    try {
      await enqueueEmailJob('password-changed-success', { email: normalizedEmail, username, changedAt: Date.now() });
    } catch (error) {
      logError('Failed to send success email:', error);
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

// Authenticated Forgot Password - Step 1: Request password change (send code)
exports.requestAuthenticatedPasswordChange = async (req, res) => {
  try {
    const newPassword = normalizePasswordInput(req.body?.newPassword);
    const userId = req.user._id;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { code: confirmCode, expiresAt: authenticatedChangeExpiresAt } = await createVerificationCode({
      email: user.email,
      type: 'authenticatedPasswordChange',
      username: user.username,
      metadata: {
        userId: user._id.toString(),
        passwordHash,
      },
    });

    await enqueueEmailJob('password-change-confirmation', {
      email: user.email,
      username: user.username,
      code: confirmCode,
      expiresAt: authenticatedChangeExpiresAt
    });

    res.json({ success: true, message: 'Confirmation code sent to your email' });
  } catch (error) {
    logError('Authenticated password change request error:', error);
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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const verification = await verifyVerificationCode({
      email: user.email,
      type: 'authenticatedPasswordChange',
      username: user.username,
      code,
      consume: true,
    });

    if (!verification.ok && verification.reason === 'not_found') {
      return res.status(400).json({ success: false, message: 'No password change request found' });
    }
    if (!verification.ok || verification.record?.metadata?.userId !== userId.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code' });
    }

    const passwordHash = verification.record?.metadata?.passwordHash;
    if (!passwordHash) {
      return res.status(400).json({ success: false, message: 'Invalid password change request' });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: passwordHash, mustChangePasswordAfterGoogle: false },
        $inc: { authVersion: 1 },
      }
    );

    // Send success email
    try {
      await enqueueEmailJob('password-changed-success', {
        email: user.email,
        username: user.username,
        changedAt: Date.now()
      });
    } catch (error) {
      logError('Failed to send success email:', error);
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};


// Check guest username availability
exports.checkGuestUsername = async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username);
    const usernameError = getUsernameValidationMessage(username);
    if (usernameError) {
      return res.json({ success: true, available: false, message: usernameError });
    }

    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      return res.json({ success: true, available: false, message: 'Username already taken' });
    }

    res.json({ success: true, available: true, message: 'Username available' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to check username availability' });
  }
};

// Guest login
exports.guestLogin = async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const usernameError = getUsernameValidationMessage(username);
    if (usernameError) {
      return res.status(400).json({ success: false, message: usernameError });
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

    const token = generateToken(guestUser);

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
      rememberMe: false
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Guest login failed' });
  }
};

let telegramBotUsernameCache = '';

exports.getTelegramLoginConfig = async (req, res) => {
  try {
    const botToken = getTelegramBotToken();
    if (!botToken) {
      return res.status(503).json({ success: false, message: 'Telegram login is not configured' });
    }
    if (!telegramBotUsernameCache) {
      const response = await axios.get(`${TELEGRAM_API_BASE_URL}/bot${botToken}/getMe`, withOAuthTimeout());
      telegramBotUsernameCache = String(response?.data?.result?.username || '').trim();
    }
    if (!telegramBotUsernameCache) {
      return res.status(503).json({ success: false, message: 'Telegram bot username is unavailable' });
    }
    const botId = botToken.split(':')[0];
    return res.json({ success: true, botId, botUsername: telegramBotUsernameCache });
  } catch (error) {
    return sendOAuthError(res, 503, 'Telegram login is temporarily unavailable', error);
  }
};

const verifyTelegramLoginPayload = (payload, botToken) => {
  const providedHash = String(payload?.hash || '').trim().toLowerCase();
  const authDate = Number(payload?.auth_date);
  if (!providedHash || !Number.isInteger(authDate)) return false;
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age < -30 || age > TELEGRAM_AUTH_MAX_AGE_SECONDS) return false;

  const dataCheckString = Object.entries(payload)
    .filter(([key, value]) => key !== 'hash' && value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n');
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const providedBuffer = Buffer.from(providedHash, 'hex');
  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

exports.exchangeTelegramLogin = async (req, res) => {
  try {
    const botToken = getTelegramBotToken();
    if (!botToken) {
      return res.status(503).json({ success: false, message: 'Telegram login is not configured' });
    }
    const telegram = req.body || {};
    if (!verifyTelegramLoginPayload(telegram, botToken)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Telegram login' });
    }

    const telegramUserId = String(telegram.id || '').trim();
    if (!/^\d{1,24}$/.test(telegramUserId)) {
      return res.status(400).json({ success: false, message: 'Telegram user id is unavailable' });
    }
    const firstName = String(telegram.first_name || '').trim().slice(0, 100);
    const lastName = String(telegram.last_name || '').trim().slice(0, 100);
    const displayName = `${firstName} ${lastName}`.trim();
    const telegramHandle = String(telegram.username || '').trim().replace(/^@+/, '').slice(0, 64);
    const picture = String(telegram.photo_url || '').trim();

    let user = await User.findOne({ 'oauthProviders.telegram.id': telegramUserId });
    if (!user) {
      const username = await makeUniqueUsername(telegramHandle || displayName || `telegram_${telegramUserId.slice(-8)}`);
      user = await User.create({
        username,
        password: generateTemporaryPassword(),
        fullName: displayName,
        name: displayName,
        profileImage: picture,
        isVerified: false,
        mustChangePasswordAfterGoogle: true,
        socialMedia: buildTelegramProfileUrl(telegramHandle)
          ? [{ name: 'Telegram', url: buildTelegramProfileUrl(telegramHandle) }]
          : [],
        oauthProviders: { telegram: { id: telegramUserId } },
      });
    } else {
      let changed = false;
      if (!user.fullName && displayName) { user.fullName = displayName; changed = true; }
      if (!user.name && displayName) { user.name = displayName; changed = true; }
      if (!user.profileImage && picture) { user.profileImage = picture; changed = true; }
      const telegramUrl = buildTelegramProfileUrl(telegramHandle);
      if (telegramUrl && ensureSocialLink(user, 'Telegram', (name, url) => name.includes('telegram') || url.includes('t.me/'), telegramUrl)) changed = true;
      if (changed) await user.save();
    }

    const guardFailure = await ensureUserCanLogin(user);
    if (guardFailure) return res.status(guardFailure.status).json(guardFailure.body);
    user.lastActive = new Date();
    await user.save();

    return res.json({
      success: true,
      token: generateToken(user),
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role,
        name: user.name || '',
        isVerified: user.isVerified || false,
        isSeller: user.isSeller || false,
      },
      passwordSetupRequired: Boolean(user.mustChangePasswordAfterGoogle),
      missingEmailForWelcome: !user.email,
      rememberMe: false,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: duplicateAccountMessage(error) });
    }
    return sendOAuthError(res, 500, 'Telegram authentication failed', error);
  }
};
