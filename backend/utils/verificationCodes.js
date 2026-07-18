const crypto = require('crypto');
const VerificationCode = require('../models/VerificationCode');
const { getDedicatedSecret } = require('./secrets');

const DEFAULT_CODE_TTL_MS = Number(process.env.VERIFICATION_CODE_TTL_MS || 2 * 60 * 1000);
const MAX_CODE_ATTEMPTS = Math.max(1, Number(process.env.VERIFICATION_CODE_MAX_ATTEMPTS || 5));

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();
const normalizeCode = (code = '') => String(code || '').replace(/\s+/g, '').trim();

const getUserVerificationKey = (user = {}) => {
  const email = normalizeEmail(user.email);
  if (email) return email;
  const telegramUserId = String(user?.oauthProviders?.telegram?.id || '').trim();
  if (telegramUserId) return `telegram:${telegramUserId}`;
  const userId = String(user?._id || user?.id || '').trim();
  return userId ? `user:${userId}` : '';
};

const getCodeSecret = () => getDedicatedSecret({ key: 'VERIFICATION_CODE_PEPPER' });

const generateNumericCode = () => String(crypto.randomInt(100000, 1000000));

const hashVerificationCode = ({ email, type, code }) =>
  crypto
    .createHmac('sha256', getCodeSecret())
    .update(`${type}:${normalizeEmail(email)}:${normalizeCode(code)}`)
    .digest('hex');

const compareHash = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''), 'hex');
  const rightBuffer = Buffer.from(String(right || ''), 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const createVerificationCode = async ({
  email,
  type,
  username = '',
  metadata = {},
  ttlMs = DEFAULT_CODE_TTL_MS,
}) => {
  const normalizedEmail = normalizeEmail(email);
  const code = generateNumericCode();
  const expiresAt = new Date(Date.now() + Math.max(30 * 1000, Number(ttlMs) || DEFAULT_CODE_TTL_MS));

  await VerificationCode.deleteMany({
    email: normalizedEmail,
    type,
    ...(username ? { username } : {}),
  });
  await VerificationCode.create({
    email: normalizedEmail,
    type,
    username,
    codeHash: hashVerificationCode({ email: normalizedEmail, type, code }),
    metadata,
    expiresAt,
  });

  return { code, expiresAt: expiresAt.getTime() };
};

const getActiveVerificationCode = async ({
  email,
  type,
  username,
  requireVerified = false,
}) => {
  const query = {
    email: normalizeEmail(email),
    type,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  };
  if (username) query.username = username;
  if (requireVerified) query.verified = true;

  return VerificationCode.findOne(query).select('+codeHash +metadata').sort({ createdAt: -1 });
};

const getActiveRecordClaim = (record) => ({
  _id: record?._id,
  consumedAt: null,
  expiresAt: { $gt: new Date() },
});

const recordInvalidAttempt = async (record) =>
  VerificationCode.findOneAndUpdate(
    {
      ...getActiveRecordClaim(record),
      attempts: { $lt: MAX_CODE_ATTEMPTS },
    },
    [
      {
        $set: {
          attempts: { $add: ['$attempts', 1] },
        },
      },
      {
        $set: {
          consumedAt: {
            $cond: [
              { $gte: ['$attempts', MAX_CODE_ATTEMPTS] },
              new Date(),
              '$consumedAt',
            ],
          },
        },
      },
    ],
    { new: true }
  ).select('attempts consumedAt');

const updateSuccessfulVerification = async ({ record, markVerified, consume }) => {
  const $set = {};
  if (markVerified) {
    $set.verified = true;
    $set.verifiedAt = new Date();
  }
  if (consume) {
    $set.consumedAt = new Date();
  }

  if (!Object.keys($set).length) return record;

  return VerificationCode.findOneAndUpdate(
    {
      ...getActiveRecordClaim(record),
      attempts: { $lt: MAX_CODE_ATTEMPTS },
    },
    { $set },
    { new: true }
  ).select('+codeHash +metadata');
};

const verifyVerificationCode = async ({
  email,
  type,
  code,
  username,
  markVerified = false,
  consume = false,
  requireVerified = false,
}) => {
  const record = await getActiveVerificationCode({ email, type, username, requireVerified });
  if (!record) {
    return { ok: false, reason: 'not_found' };
  }

  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    await consumeVerificationCode(record);
    return { ok: false, reason: 'too_many_attempts' };
  }

  const expectedHash = hashVerificationCode({ email: record.email, type, code });
  if (!compareHash(record.codeHash, expectedHash)) {
    const updatedRecord = await recordInvalidAttempt(record);
    return {
      ok: false,
      reason: !updatedRecord || updatedRecord.attempts >= MAX_CODE_ATTEMPTS
        ? 'too_many_attempts'
        : 'invalid',
    };
  }

  const updatedRecord = await updateSuccessfulVerification({ record, markVerified, consume });
  if (!updatedRecord) {
    return { ok: false, reason: 'not_found' };
  }

  return { ok: true, record: updatedRecord };
};

const consumeVerificationCode = async (record) => {
  if (!record) return;
  return VerificationCode.findOneAndUpdate(
    getActiveRecordClaim(record),
    { $set: { consumedAt: new Date() } },
    { new: true }
  ).select('+codeHash +metadata');
};

const deleteVerificationCodes = async ({ email, types = [] }) => {
  const query = { email: normalizeEmail(email) };
  if (types.length) query.type = { $in: types };
  return VerificationCode.deleteMany(query);
};

module.exports = {
  createVerificationCode,
  consumeVerificationCode,
  deleteVerificationCodes,
  getActiveVerificationCode,
  getUserVerificationKey,
  hashVerificationCode,
  normalizeCode,
  normalizeEmail,
  verifyVerificationCode,
};
