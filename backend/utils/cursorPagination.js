const mongoose = require('mongoose');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const toBase64Url = (raw = '') =>
  Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (raw = '') => {
  const normalized = String(raw).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
};

const parseLimit = (rawLimit, fallback = DEFAULT_LIMIT) => {
  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
};

const shouldUseCursorPagination = (query = {}) => {
  const hasCursor = typeof query.cursor === 'string' && query.cursor.trim().length > 0;
  const hasLimit = query.limit !== undefined;
  const explicitFlag = query.useCursor === 'true' || query.pagination === 'cursor';
  return hasCursor || hasLimit || explicitFlag;
};

const encodeCursor = ({ createdAt, id }) => {
  if (!createdAt || !id) return null;
  const payload = {
    c: new Date(createdAt).toISOString(),
    i: String(id)
  };
  return toBase64Url(JSON.stringify(payload));
};

const decodeCursor = (token) => {
  if (!token) return null;
  try {
    const decoded = JSON.parse(fromBase64Url(token));
    const createdAt = new Date(decoded.c);
    const id = String(decoded.i || '');
    if (Number.isNaN(createdAt.getTime())) return null;
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return { createdAt, id };
  } catch (error) {
    return null;
  }
};

const buildDescendingCursorFilter = (decodedCursor, dateField = 'createdAt', idField = '_id') => {
  if (!decodedCursor) return null;
  return {
    $or: [
      { [dateField]: { $lt: decodedCursor.createdAt } },
      { [dateField]: decodedCursor.createdAt, [idField]: { $lt: new mongoose.Types.ObjectId(decodedCursor.id) } }
    ]
  };
};

const buildAscendingCursorFilter = (decodedCursor, dateField = 'createdAt', idField = '_id') => {
  if (!decodedCursor) return null;
  return {
    $or: [
      { [dateField]: { $gt: decodedCursor.createdAt } },
      { [dateField]: decodedCursor.createdAt, [idField]: { $gt: new mongoose.Types.ObjectId(decodedCursor.id) } }
    ]
  };
};

const extractNextCursor = (items = [], limit = DEFAULT_LIMIT) => {
  if (items.length <= limit) {
    return { pageItems: items, hasMore: false, nextCursor: null };
  }

  const pageItems = items.slice(0, limit);
  const tail = pageItems[pageItems.length - 1];
  return {
    pageItems,
    hasMore: true,
    nextCursor: encodeCursor({ createdAt: tail.createdAt, id: tail._id })
  };
};

module.exports = {
  DEFAULT_LIMIT,
  parseLimit,
  shouldUseCursorPagination,
  decodeCursor,
  buildDescendingCursorFilter,
  buildAscendingCursorFilter,
  extractNextCursor
};
