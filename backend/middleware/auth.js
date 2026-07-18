const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hashApiKey, normalizeApiKey, upgradeLegacyApiKeyRecord } = require('../utils/apiKeys');
const { logWarn } = require('../utils/safeErrorLog');

const API_KEY_AUTH_QUERY_MAX_TIME_MS = Math.max(
  100,
  Number(process.env.API_KEY_AUTH_QUERY_MAX_TIME_MS) || 5000
);
const API_KEY_AUTH_MAX_LENGTH = Math.max(
  32,
  Math.min(512, Number(process.env.API_KEY_AUTH_MAX_LENGTH) || 256)
);
const AUTH_USER_QUERY_MAX_TIME_MS = Math.max(
  100,
  Number(process.env.AUTH_USER_QUERY_MAX_TIME_MS) || 5000
);
const AUTH_BEARER_TOKEN_MAX_LENGTH = Math.max(
  128,
  Math.min(8192, Number(process.env.AUTH_BEARER_TOKEN_MAX_LENGTH) || 4096)
);
const JWT_COMPACT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (
    decoded?.tokenType !== 'access' ||
    !decoded?.id ||
    !Number.isInteger(decoded?.authVersion) ||
    decoded.authVersion < 0
  ) {
    throw new Error('Invalid access token');
  }
  return decoded;
};

const isAccessTokenCurrent = (decoded, user) => (
  Boolean(user) && Number(user.authVersion || 0) === decoded.authVersion
);

const getBearerToken = (req) => {
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) return '';
  const token = authorization.slice('Bearer '.length).trim();
  if (token.length > AUTH_BEARER_TOKEN_MAX_LENGTH) return '';
  if (/[\s\0\r\n]/.test(token)) return '';
  if (!JWT_COMPACT_PATTERN.test(token)) return '';
  return token;
};

const buildSuspendedAccountMessage = (user) => (
  user?.suspendedUntil
    ? `Account suspended until ${new Date(user.suspendedUntil).toLocaleDateString()}`
    : 'Account has been suspended'
);

const refreshExpiredSuspension = async (user) => {
  if (!user?.suspendedUntil || new Date() < new Date(user.suspendedUntil)) return;

  const refreshedUser = await User.findOneAndUpdate(
    { _id: user._id, suspendedUntil: { $lte: new Date() } },
    { $set: { suspendedUntil: null, isActive: true } },
    { new: true }
  )
    .select('-password')
    .maxTimeMS(AUTH_USER_QUERY_MAX_TIME_MS);

  if (refreshedUser) {
    user.suspendedUntil = refreshedUser.suspendedUntil;
    user.isActive = refreshedUser.isActive;
  }
};

const getAccountAccessError = (user) => {
  if (!user) {
    return { status: 401, body: { success: false, message: 'User not found' } };
  }

  if (user.isGuest && user.guestExpiresAt && new Date() >= new Date(user.guestExpiresAt)) {
    return { status: 401, body: { success: false, message: 'Guest session expired', guestExpired: true } };
  }

  if (!user.isActive || (user.suspendedUntil && new Date() < new Date(user.suspendedUntil))) {
    return { status: 403, body: { success: false, message: buildSuspendedAccountMessage(user) } };
  }

  return null;
};

const enforceAccountAccess = async (user, res) => {
  await refreshExpiredSuspension(user);
  const error = getAccountAccessError(user);
  if (!error) return true;
  res.status(error.status).json(error.body);
  return false;
};

const findUserByApiKey = async (apiKey) => {
  const normalizedApiKey = normalizeApiKey(apiKey);
  if (normalizedApiKey.length > API_KEY_AUTH_MAX_LENGTH) return null;
  const keyHash = hashApiKey(normalizedApiKey);

  const hashedUser = await User.findOne({ 'apiKeys.keyHash': keyHash })
    .select('-password')
    .maxTimeMS(API_KEY_AUTH_QUERY_MAX_TIME_MS);
  if (hashedUser) return hashedUser;

  const legacyUser = await User.findOne({ 'apiKeys.key': normalizedApiKey })
    .select('+apiKeys.key +apiKeys.keyHash -password')
    .maxTimeMS(API_KEY_AUTH_QUERY_MAX_TIME_MS);

  if (!legacyUser) return null;

  const legacyKey = legacyUser.apiKeys.find((keyRecord) => keyRecord.key === normalizedApiKey);
  if (legacyKey) {
    upgradeLegacyApiKeyRecord(legacyKey, normalizedApiKey);
    try {
      await User.updateOne(
        { _id: legacyUser._id, 'apiKeys._id': legacyKey._id },
        {
          $set: {
            'apiKeys.$.keyHash': legacyKey.keyHash,
            'apiKeys.$.keyPrefix': legacyKey.keyPrefix,
            'apiKeys.$.keyLast4': legacyKey.keyLast4,
            'apiKeys.$.keyVersion': legacyKey.keyVersion,
          },
          $unset: {
            'apiKeys.$.key': '',
          },
        }
      ).maxTimeMS(API_KEY_AUTH_QUERY_MAX_TIME_MS);
    } catch (error) {
      logWarn('[auth] Failed to upgrade legacy API key:', error);
    }
  }

  return legacyUser;
};

const findAuthUserById = (userId) =>
  User.findById(userId)
    .select('-password')
    .maxTimeMS(AUTH_USER_QUERY_MAX_TIME_MS);

// JWT authentication middleware
exports.protect = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = verifyAccessToken(token);
    req.user = await findAuthUserById(decoded.id);

    if (!isAccessTokenCurrent(decoded, req.user)) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (!(await enforceAccountAccess(req.user, res))) {
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// Optional JWT authentication (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await findAuthUserById(decoded.id);
      if (isAccessTokenCurrent(decoded, user)) {
        await refreshExpiredSuspension(user);
      }
      if (isAccessTokenCurrent(decoded, user) && !getAccountAccessError(user)) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// API Key authentication middleware
exports.apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = normalizeApiKey(req.headers['x-api-key']);
    
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'API key required' });
    }

    const user = await findUserByApiKey(apiKey);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid API key' });
    }

    if (!(await enforceAccountAccess(user, res))) {
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'API key authentication failed' });
  }
};

// Admin authentication middleware
exports.adminAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = verifyAccessToken(token);
    req.user = await findAuthUserById(decoded.id);

    if (!isAccessTokenCurrent(decoded, req.user)) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (!(await enforceAccountAccess(req.user, res))) {
      return;
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// Admin or CoAdmin authentication middleware (read-only for coAdmin)
exports.adminOrCoAdminAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = verifyAccessToken(token);
    req.user = await findAuthUserById(decoded.id);

    if (!isAccessTokenCurrent(decoded, req.user)) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (!(await enforceAccountAccess(req.user, res))) {
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'coAdmin') {
      return res.status(403).json({ success: false, message: 'Admin or Co-Admin access required' });
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

exports.sellerAuth = (req, res, next) => {
  exports.protect(req, res, () => {
    if (req.user?.isSeller !== true) {
      return res.status(403).json({ success: false, message: 'Seller access required' });
    }

    next();
  });
};

exports.verifyAccessToken = verifyAccessToken;
exports.isAccessTokenCurrent = isAccessTokenCurrent;
