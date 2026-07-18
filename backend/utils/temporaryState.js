const crypto = require('crypto');
const TemporaryState = require('../models/TemporaryState');
const { getDedicatedSecret } = require('./secrets');

const getStateSecret = () => getDedicatedSecret({ key: 'TEMPORARY_STATE_SECRET' });

const hashStateKey = ({ type, key }) =>
  crypto
    .createHmac('sha256', getStateSecret())
    .update(`${String(type || '').trim()}:${String(key || '').trim()}`)
    .digest('hex');

const createTemporaryState = async ({ type, key, data = {}, ttlMs }) => {
  const expiresAt = new Date(Date.now() + Math.max(60 * 1000, Number(ttlMs) || 10 * 60 * 1000));
  const keyHash = hashStateKey({ type, key });

  await TemporaryState.findOneAndUpdate(
    { keyHash },
    {
      $set: {
        type,
        keyHash,
        data,
        consumedAt: null,
        expiresAt,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const getTemporaryState = async ({ type, key }) => {
  const keyHash = hashStateKey({ type, key });
  return TemporaryState.findOne({
    type,
    keyHash,
    expiresAt: { $gt: new Date() },
  }).select('+data');
};

const consumeStateKeyOnce = async ({ type, key, ttlMs }) => {
  const keyHash = hashStateKey({ type, key });
  const expiresAt = new Date(Date.now() + Math.max(60 * 1000, Number(ttlMs) || 10 * 60 * 1000));

  try {
    await TemporaryState.create({
      type,
      keyHash,
      data: {},
      consumedAt: new Date(),
      expiresAt,
    });
    return true;
  } catch (error) {
    if (error?.code === 11000) return false;
    throw error;
  }
};

module.exports = {
  consumeStateKeyOnce,
  createTemporaryState,
  getTemporaryState,
  hashStateKey,
};
