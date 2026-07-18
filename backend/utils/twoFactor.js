const crypto = require('crypto');
const TwoFactorChallenge = require('../models/TwoFactorChallenge');
const User = require('../models/User');
const { decrypt } = require('./encryption');
const { logError } = require('./safeErrorLog');
const { getDedicatedSecret } = require('./secrets');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ISSUER = process.env.TWO_FACTOR_ISSUER || 'Lekhon';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS = 10 * 60 * 1000;
const ADMIN_DELETE_TOKEN_TTL_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PASSWORD_ATTEMPT_LIMIT = 5;
const PASSWORD_ATTEMPT_WINDOW_MS = 24 * 60 * 60 * 1000;

const ACTION_LABELS = {
  change_password: 'change your password',
  forgot_password: 'reset your password',
  change_email: 'change your email',
  change_username: 'change your username',
  disconnect_social: 'disconnect a social account',
  delete_account: 'delete your account',
  delete_blog: 'delete this blog',
  delete_article: 'delete this article',
  delete_short: 'delete this short',
  manage_2fa: 'manage two-factor authentication',
  disable_2fa: 'turn off two-factor authentication',
  generate_api_key: 'generate an API key',
  revoke_api_key: 'revoke an API key',
  admin_delete_user: 'delete this user account as an admin',
  admin_suspend_user: 'change this user suspension as an admin',
  admin_toggle_verification: 'change this user verification status as an admin',
  admin_change_role: 'change this user role as an admin',
  admin_warn_user: 'send this account warning as an admin',
  admin_pre_delete_user: 'send this pre-deletion warning as an admin',
  admin_delete_content: 'delete this content as an admin',
  admin_review_seller_application: 'review this seller application as an admin',
  admin_mark_payout_paid: 'mark this payout as paid as an admin',
  admin_review_price_change: 'review this price-change request as an admin',
  admin_revoke_seller: 'revoke this seller status as an admin',
  admin_update_support_request: 'update this support request as an admin',
};

const getSigningSecret = () => getDedicatedSecret({ key: 'TWO_FACTOR_SECRET' });

const normalizeCode = (code) => String(code || '').replace(/\D/g, '').slice(0, 8);

const generateSmsCode = () => crypto.randomInt(100000, 1000000).toString();

const createToken = () => crypto.randomBytes(32).toString('hex');

const hmac = (value) =>
  crypto
    .createHmac('sha256', getSigningSecret())
    .update(String(value))
    .digest('hex');

const hashChallengeCode = ({ userId, action, code }) =>
  hmac(`2fa-code:${userId}:${action}:${normalizeCode(code)}`);

const hashActionToken = (token) => hmac(`2fa-token:${token}`);

const base32Encode = (buffer) => {
  let bits = '';
  let value = '';

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0');
    value += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return value;
};

const base32Decode = (secret) => {
  const cleanSecret = String(secret || '').replace(/[\s=]/g, '').toUpperCase();
  let bits = '';

  for (const char of cleanSecret) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
};

const generateBase32Secret = () => base32Encode(crypto.randomBytes(20));

const hotp = (secret, counter, digits = 6) => {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;

  counterBuffer.writeUInt32BE(high, 0);
  counterBuffer.writeUInt32BE(low, 4);

  const hmacValue = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmacValue[hmacValue.length - 1] & 0xf;
  const binary =
    ((hmacValue[offset] & 0x7f) << 24) |
    ((hmacValue[offset + 1] & 0xff) << 16) |
    ((hmacValue[offset + 2] & 0xff) << 8) |
    (hmacValue[offset + 3] & 0xff);

  return String(binary % (10 ** digits)).padStart(digits, '0');
};

const verifyTotp = (code, secret, options = {}) => {
  const normalizedCode = normalizeCode(code);
  const window = Number.isInteger(options.window) ? options.window : 1;
  const period = Number.isInteger(options.period) ? options.period : 30;
  const digits = Number.isInteger(options.digits) ? options.digits : 6;
  const counter = Math.floor(Date.now() / 1000 / period);

  if (normalizedCode.length !== digits || !secret) return false;

  for (let offset = -window; offset <= window; offset += 1) {
    const expected = hotp(secret, counter + offset, digits);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(normalizedCode);
    if (
      expectedBuffer.length === actualBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      return true;
    }
  }

  return false;
};

const buildOtpAuthUrl = ({ username, email, secret }) => {
  const accountName = String(email || username || 'Lekhon user').trim();
  const label = `${ISSUER}:${accountName}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;
};

const normalizePhone = (phone) => {
  const trimmed = String(phone || '').trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  return hasPlus ? `+${digits}` : digits;
};

const isValidSmsPhone = (phone) => /^\+?\d{6,15}$/.test(phone);

const maskPhone = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return '';
  const prefix = normalized.startsWith('+') ? '+' : '';
  const digits = normalized.replace(/\D/g, '');
  if (digits.length <= 4) return `${prefix}${'*'.repeat(digits.length)}`;
  return `${prefix}${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

const getEnabledMethods = (user) => {
  const twoFactor = user?.twoFactor || {};
  const methods = [];
  if (twoFactor?.authenticator?.enabled) methods.push('authenticator');
  if (twoFactor?.sms?.enabled) methods.push('sms');
  return methods;
};

const getPreferredMethod = (user) => {
  const methods = getEnabledMethods(user);
  const preferred = user?.twoFactor?.preferredMethod;
  if (methods.includes(preferred)) return preferred;
  return methods[0] || '';
};

const buildTwoFactorStatus = (user) => {
  const methods = getEnabledMethods(user);
  return {
    enabled: Boolean(user?.twoFactor?.enabled && methods.length > 0),
    methods,
    preferredMethod: getPreferredMethod(user),
    sms: {
      enabled: methods.includes('sms'),
      phoneMasked: maskPhone(user?.twoFactor?.sms?.phone || ''),
    },
    authenticator: {
      enabled: methods.includes('authenticator'),
      connectedAt: user?.twoFactor?.authenticator?.confirmedAt || null,
    },
    lastChangedAt: user?.twoFactor?.lastChangedAt || null,
  };
};

const getChallengeMethodsPayload = (user) => {
  const status = buildTwoFactorStatus(user);
  return {
    methods: status.methods,
    preferredMethod: status.preferredMethod,
    smsPhoneMasked: status.sms.phoneMasked,
  };
};

const createTwoFactorChallenge = async ({ userId, action, method, code = '', metadata = {}, ttlMs = CHALLENGE_TTL_MS }) => {
  await TwoFactorChallenge.deleteMany({
    user: userId,
    action,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  });

  return TwoFactorChallenge.create({
    user: userId,
    action,
    method,
    codeHash: code ? hashChallengeCode({ userId, action, code }) : '',
    metadata,
    expiresAt: new Date(Date.now() + ttlMs),
  });
};

const verifyActionToken = async ({ userId, action, token, methods = [] }) => {
  if (!token) return false;

  const query = {
    user: userId,
    action,
    tokenHash: hashActionToken(token),
    verifiedAt: { $ne: null },
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  };

  if (methods.length > 0) {
    query.method = { $in: methods };
  }

  const challenge = await TwoFactorChallenge.findOneAndUpdate(
    query,
    { $set: { consumedAt: new Date() } },
    { new: true }
  );

  if (!challenge) return false;
  return true;
};

const verifyTwoFactorActionToken = async ({ userId, action, token }) =>
  verifyActionToken({
    userId,
    action,
    token,
    methods: ['sms', 'authenticator'],
  });

const verifySensitiveActionToken = async ({ userId, action, token }) =>
  verifyActionToken({
    userId,
    action,
    token,
    methods: ['password', 'biometric'],
  });

const getTwoFactorSecretForUser = async (userId, field = 'twoFactor.authenticator.secret') => {
  const user = await User.findById(userId).select(`+${field}`);
  const secret = field.split('.').reduce((value, key) => value?.[key], user);
  return decrypt(secret || '');
};

const completeChallengeWithToken = async (challenge) => {
  const token = createToken();
  const tokenTtlMs = challenge?.action === 'admin_delete_user'
    ? ADMIN_DELETE_TOKEN_TTL_MS
    : TOKEN_TTL_MS;
  challenge.tokenHash = hashActionToken(token);
  challenge.verifiedAt = new Date();
  challenge.expiresAt = new Date(Date.now() + tokenTtlMs);
  await challenge.save();
  return token;
};

const createVerifiedActionToken = async ({ userId, action, method = 'password', metadata = {}, ttlMs = TOKEN_TTL_MS }) => {
  await TwoFactorChallenge.deleteMany({
    user: userId,
    action,
    method,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  });

  const challenge = await TwoFactorChallenge.create({
    user: userId,
    action,
    method,
    metadata,
    verifiedAt: new Date(),
    expiresAt: new Date(Date.now() + ttlMs),
  });

  const token = await completeChallengeWithToken(challenge);
  return { token, challenge };
};

const getPasswordAttemptState = (user) => {
  const now = Date.now();
  const state = user?.security?.sensitiveActionPassword || {};
  const windowStartedAt = state.windowStartedAt ? new Date(state.windowStartedAt).getTime() : 0;
  const windowExpired = !windowStartedAt || now - windowStartedAt >= PASSWORD_ATTEMPT_WINDOW_MS;
  const lockedUntil = state.lockedUntil ? new Date(state.lockedUntil).getTime() : 0;

  if (lockedUntil && lockedUntil > now) {
    return {
      failedAttempts: state.failedAttempts || 0,
      attemptsRemaining: 0,
      lockedUntil: new Date(lockedUntil),
      isLocked: true,
      windowExpired: false,
    };
  }

  if (windowExpired) {
    return {
      failedAttempts: 0,
      attemptsRemaining: PASSWORD_ATTEMPT_LIMIT,
      lockedUntil: null,
      isLocked: false,
      windowExpired: true,
    };
  }

  const failedAttempts = Math.max(0, Number(state.failedAttempts || 0));
  return {
    failedAttempts,
    attemptsRemaining: Math.max(0, PASSWORD_ATTEMPT_LIMIT - failedAttempts),
    lockedUntil: null,
    isLocked: false,
    windowExpired: false,
  };
};

const resetPasswordAttemptState = (user) => {
  user.security = user.security || {};
  user.security.sensitiveActionPassword = {
    failedAttempts: 0,
    windowStartedAt: null,
    lockedUntil: null,
    lastFailedAt: null,
  };
};

const recordPasswordAttemptFailure = (user) => {
  const now = new Date();
  const state = getPasswordAttemptState(user);
  const failedAttempts = state.windowExpired ? 1 : state.failedAttempts + 1;
  const windowStartedAt = state.windowExpired
    ? now
    : user.security?.sensitiveActionPassword?.windowStartedAt || now;
  const lockedUntil = failedAttempts >= PASSWORD_ATTEMPT_LIMIT
    ? new Date(new Date(windowStartedAt).getTime() + PASSWORD_ATTEMPT_WINDOW_MS)
    : null;

  user.security = user.security || {};
  user.security.sensitiveActionPassword = {
    failedAttempts,
    windowStartedAt,
    lockedUntil,
    lastFailedAt: now,
  };

  return {
    failedAttempts,
    attemptsRemaining: Math.max(0, PASSWORD_ATTEMPT_LIMIT - failedAttempts),
    lockedUntil,
    isLocked: Boolean(lockedUntil && lockedUntil > now),
  };
};

const requireSensitiveActionToken = (action) => async (req, res, next) => {
  try {
    const token =
      req.headers['x-sensitive-action-token'] ||
      req.body?.sensitiveActionToken ||
      req.query?.sensitiveActionToken;

    const verified = await verifySensitiveActionToken({
      userId: req.user._id,
      action,
      token,
    });

    if (verified) return next();

    return res.status(403).json({
      success: false,
      requiresPassword: true,
      action,
      actionLabel: ACTION_LABELS[action] || 'continue',
      message: 'Account password verification required',
    });
  } catch (error) {
    logError('Sensitive action token check failed:', error);
    return res.status(500).json({ success: false, message: 'Account verification failed' });
  }
};

const requireTwoFactorForAction = (action) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const status = buildTwoFactorStatus(user);

    if (!status.enabled) return next();

    const token =
      req.headers['x-two-factor-token'] ||
      req.body?.twoFactorToken ||
      req.query?.twoFactorToken;

    const verified = await verifyTwoFactorActionToken({
      userId: user._id,
      action,
      token,
    });

    if (verified) return next();

    return res.status(403).json({
      success: false,
      requiresTwoFactor: true,
      action,
      actionLabel: ACTION_LABELS[action] || 'continue',
      message: 'Two-factor verification required',
      twoFactor: getChallengeMethodsPayload(user),
    });
  } catch (error) {
    logError('Two-factor action token check failed:', error);
    return res.status(500).json({ success: false, message: 'Two-factor verification failed' });
  }
};

module.exports = {
  ACTION_LABELS,
  CHALLENGE_TTL_MS,
  MAX_ATTEMPTS,
  PASSWORD_ATTEMPT_LIMIT,
  PASSWORD_ATTEMPT_WINDOW_MS,
  buildOtpAuthUrl,
  buildTwoFactorStatus,
  completeChallengeWithToken,
  createVerifiedActionToken,
  createTwoFactorChallenge,
  generateBase32Secret,
  generateSmsCode,
  getChallengeMethodsPayload,
  getPreferredMethod,
  getTwoFactorSecretForUser,
  hashChallengeCode,
  isValidSmsPhone,
  maskPhone,
  normalizeCode,
  normalizePhone,
  recordPasswordAttemptFailure,
  requireSensitiveActionToken,
  requireTwoFactorForAction,
  resetPasswordAttemptState,
  verifyTotp,
  verifySensitiveActionToken,
  verifyTwoFactorActionToken,
  getPasswordAttemptState,
};
