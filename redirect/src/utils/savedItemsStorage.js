export const SAVED_CONTENT_TYPES = ['article', 'blog', 'short'];
const SAVED_CONTENT_STORAGE_VERSION = 2;
const SAVED_CONTENT_META_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SAVED_CONTENT_MAX_RECORDS_PER_TYPE = 100;
const FIELD_LIMITS = {
  id: 160,
  userKey: 160,
  title: 180,
  image: 2048,
  subtitle: 140,
  path: 1024,
};

const cleanText = (value, maxLength) =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const cleanStoragePart = (value, fallback = '') =>
  cleanText(value, FIELD_LIMITS.id)
    .replace(/[:\\]/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;

const normalizeUserKey = (userKey) =>
  cleanText(userKey || 'guest', FIELD_LIMITS.userKey)
    .replace(/[:\\]/g, '-')
    .replace(/^-+|-+$/g, '') || 'guest';

const normalizeType = (type) => {
  const normalized = String(type || '').trim().toLowerCase();
  return SAVED_CONTENT_TYPES.includes(normalized) ? normalized : '';
};

const isExpiredSavedAt = (savedAt) => {
  const savedAtMs = new Date(savedAt || 0).getTime();
  return Number.isFinite(savedAtMs) && savedAtMs > 0 && Date.now() - savedAtMs > SAVED_CONTENT_META_TTL_MS;
};

const getSavedAtIso = (savedAt) => {
  const parsedMs = new Date(savedAt || Date.now()).getTime();
  const timestamp = Number.isFinite(parsedMs) && parsedMs > 0 ? parsedMs : Date.now();
  if (Date.now() - timestamp > SAVED_CONTENT_META_TTL_MS) return '';
  return new Date(timestamp).toISOString();
};

const normalizeInternalPath = (value = '', fallback = '') => {
  const raw = cleanText(value, FIELD_LIMITS.path);
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || /[\\]/.test(raw)) return fallback;

  try {
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://lekhon.local';
    const parsed = new URL(raw, origin);
    if (parsed.origin !== origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, FIELD_LIMITS.path);
  } catch {
    return fallback;
  }
};

const normalizeStoredImage = (value = '') => {
  const raw = cleanText(value, FIELD_LIMITS.image);
  if (!raw || /[\\]/.test(raw)) return '';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;

  try {
    const parsed = new URL(raw);
    if (!['https:', 'http:'].includes(parsed.protocol)) return '';
    if (!parsed.hostname || /[\s\\]/.test(parsed.hostname)) return '';
    return parsed.href.slice(0, FIELD_LIMITS.image);
  } catch {
    return '';
  }
};

const getFallbackContentPath = (type, id) => {
  if (type === 'article') return `/article/${id}`;
  if (type === 'short') return `/shorts/${id}`;
  return `/blog/${id}`;
};

const normalizeSavedMeta = ({ type, id, meta = {} }) => {
  const normalizedType = normalizeType(type);
  const normalizedId = cleanStoragePart(id);
  if (!normalizedType || !normalizedId) return null;

  const savedAt = isExpiredSavedAt(meta.savedAt) ? '' : getSavedAtIso(meta.savedAt);
  if (!savedAt) return null;

  const fallbackPath = getFallbackContentPath(normalizedType, normalizedId);
  return {
    version: SAVED_CONTENT_STORAGE_VERSION,
    id: normalizedId,
    type: normalizedType,
    title: cleanText(meta.title || `Saved ${normalizedType}`, FIELD_LIMITS.title),
    image: normalizeStoredImage(meta.image),
    subtitle: cleanText(meta.subtitle, FIELD_LIMITS.subtitle),
    path: normalizeInternalPath(meta.path, fallbackPath),
    savedAt,
  };
};

export const getSavedUserKey = (user) => normalizeUserKey(user?._id || user?.id || 'guest');

export const getSavedContentKey = (type, userKey, id) =>
  normalizeType(type) && cleanStoragePart(id)
    ? `lekhon:saved-${normalizeType(type)}:${normalizeUserKey(userKey)}:${cleanStoragePart(id)}`
    : '';

export const getSavedContentMetaKey = (type, userKey, id) =>
  normalizeType(type) && cleanStoragePart(id)
    ? `lekhon:saved-${normalizeType(type)}-meta:${normalizeUserKey(userKey)}:${cleanStoragePart(id)}`
    : '';

export const notifySavedItemsChanged = (detail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('lekhon:saved-items-updated', { detail }));
};

const getBrowserStorage = (type) => {
  if (typeof window === 'undefined') return null;
  try {
    return window[type] || null;
  } catch {
    return null;
  }
};

const getSavedStorage = () => getBrowserStorage('sessionStorage');
const getLegacySavedStorage = () => getBrowserStorage('localStorage');

const readJson = (storage, key) => {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const removeLegacySavedContent = (key, metaKey) => {
  const legacyStorage = getLegacySavedStorage();
  legacyStorage?.removeItem(key);
  legacyStorage?.removeItem(metaKey);
};

const removeSavedContent = (storage, key, metaKey) => {
  storage?.removeItem(key);
  storage?.removeItem(metaKey);
};

const writeNormalizedSavedContent = ({ storage, type, userKey, id, meta = {} }) => {
  const key = getSavedContentKey(type, userKey, id);
  const metaKey = getSavedContentMetaKey(type, userKey, id);
  const normalizedMeta = normalizeSavedMeta({ type, id, meta });
  if (!storage || !key || !metaKey || !normalizedMeta) return null;

  storage.setItem(key, '1');
  storage.setItem(metaKey, JSON.stringify(normalizedMeta));
  return { key, metaKey, meta: normalizedMeta };
};

const getSavedRecordsForType = ({ storage, type, userKey }) => {
  const normalizedType = normalizeType(type);
  const normalizedUserKey = normalizeUserKey(userKey);
  const prefix = `lekhon:saved-${normalizedType}:${normalizedUserKey}:`;
  return getStorageKeys(storage)
    .filter((key) => key?.startsWith(prefix) && storage?.getItem(key) === '1')
    .map((key) => {
      const id = key.slice(prefix.length);
      const metaKey = getSavedContentMetaKey(normalizedType, normalizedUserKey, id);
      const meta = readJson(storage, metaKey) || {};
      return { key, metaKey, id, meta };
    });
};

const pruneSavedContentRecords = ({ storage, type, userKey }) => {
  if (!storage) return;
  const records = getSavedRecordsForType({ storage, type, userKey })
    .sort((a, b) => {
      const aTime = new Date(a.meta?.savedAt || 0).getTime();
      const bTime = new Date(b.meta?.savedAt || 0).getTime();
      return bTime - aTime;
    });

  records.slice(SAVED_CONTENT_MAX_RECORDS_PER_TYPE).forEach(({ key, metaKey }) => {
    removeSavedContent(storage, key, metaKey);
  });
};

const migrateLegacySavedContent = ({ type, userKey, id }) => {
  const legacyStorage = getLegacySavedStorage();
  const savedStorage = getSavedStorage();
  const key = getSavedContentKey(type, userKey, id);
  const metaKey = getSavedContentMetaKey(type, userKey, id);
  const legacySaved = legacyStorage?.getItem(key) === '1';
  const legacyMeta = legacyStorage?.getItem(metaKey);

  if (legacySaved) {
    const parsedLegacyMeta = legacyMeta ? readJson(legacyStorage, metaKey) : {};
    writeNormalizedSavedContent({ storage: savedStorage, type, userKey, id, meta: parsedLegacyMeta || {} });
    pruneSavedContentRecords({ storage: savedStorage, type, userKey });
  }

  removeLegacySavedContent(key, metaKey);
  return legacySaved;
};

export const saveSavedContentMeta = ({ type, userKey, id, ...meta }) => {
  const normalizedType = normalizeType(type);
  const normalizedUserKey = normalizeUserKey(userKey);
  const normalizedId = cleanStoragePart(id);
  if (typeof window === 'undefined' || !normalizedType || !normalizedId) return;
  const key = getSavedContentKey(normalizedType, normalizedUserKey, normalizedId);
  const metaKey = getSavedContentMetaKey(normalizedType, normalizedUserKey, normalizedId);
  const savedStorage = getSavedStorage();

  removeLegacySavedContent(key, metaKey);
  if (!savedStorage) return;

  const written = writeNormalizedSavedContent({
    storage: savedStorage,
    type: normalizedType,
    userKey: normalizedUserKey,
    id: normalizedId,
    meta,
  });
  pruneSavedContentRecords({ storage: savedStorage, type: normalizedType, userKey: normalizedUserKey });
  if (written) notifySavedItemsChanged({ type: normalizedType, id: normalizedId, saved: true });
};

export const removeSavedContentMeta = ({ type, userKey, id }) => {
  const normalizedType = normalizeType(type);
  const normalizedUserKey = normalizeUserKey(userKey);
  const normalizedId = cleanStoragePart(id);
  if (typeof window === 'undefined' || !normalizedType || !normalizedId) return;
  const savedStorage = getSavedStorage();

  const key = getSavedContentKey(normalizedType, normalizedUserKey, normalizedId);
  const metaKey = getSavedContentMetaKey(normalizedType, normalizedUserKey, normalizedId);
  removeSavedContent(savedStorage, key, metaKey);
  removeLegacySavedContent(key, metaKey);
  notifySavedItemsChanged({ type: normalizedType, id: normalizedId, saved: false });
};

export const isSavedContentMeta = ({ type, userKey, id }) => {
  const normalizedType = normalizeType(type);
  const normalizedUserKey = normalizeUserKey(userKey);
  const normalizedId = cleanStoragePart(id);
  if (typeof window === 'undefined' || !normalizedType || !normalizedId) return false;
  const key = getSavedContentKey(normalizedType, normalizedUserKey, normalizedId);
  const metaKey = getSavedContentMetaKey(normalizedType, normalizedUserKey, normalizedId);
  const savedStorage = getSavedStorage();

  if (savedStorage?.getItem(key) === '1') {
    const normalizedMeta = normalizeSavedMeta({
      type: normalizedType,
      id: normalizedId,
      meta: readJson(savedStorage, metaKey) || {},
    });
    if (!normalizedMeta) {
      removeSavedContent(savedStorage, key, metaKey);
      removeLegacySavedContent(key, metaKey);
      return false;
    }
    savedStorage.setItem(metaKey, JSON.stringify(normalizedMeta));
    removeLegacySavedContent(key, metaKey);
    return true;
  }

  return migrateLegacySavedContent({ type: normalizedType, userKey: normalizedUserKey, id: normalizedId });
};

const getStorageKeys = (storage) => {
  if (!storage) return [];
  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }
  return keys;
};

export const readSavedContentRecords = (userKey = 'guest') => {
  if (typeof window === 'undefined') return [];
  const records = new Map();
  const savedStorage = getSavedStorage();
  const legacyStorage = getLegacySavedStorage();
  const normalizedUserKey = normalizeUserKey(userKey);

  const addRecord = (type, key, storage) => {
    if (storage?.getItem(key) !== '1') return;

    const prefix = `lekhon:saved-${type}:${normalizedUserKey}:`;
    const id = cleanStoragePart(key.slice(prefix.length));
    if (!id) return;

    const metaKey = getSavedContentMetaKey(type, normalizedUserKey, id);
    const meta = normalizeSavedMeta({ type, id, meta: readJson(storage, metaKey) || {} });
    if (!meta) {
      removeSavedContent(storage, key, metaKey);
      return;
    }
    storage?.setItem(metaKey, JSON.stringify(meta));
    records.set(`${type}:${id}`, { id, type, meta });
  };

  SAVED_CONTENT_TYPES.forEach((type) => {
    const prefix = `lekhon:saved-${type}:${normalizedUserKey}:`;
    const metaPrefix = `lekhon:saved-${type}-meta:${normalizedUserKey}:`;

    getStorageKeys(savedStorage).forEach((key) => {
      if (!key || !key.startsWith(prefix)) return;
      addRecord(type, key, savedStorage);
    });

    getStorageKeys(legacyStorage).forEach((key) => {
      if (!key || !key.startsWith(prefix)) return;
      const id = cleanStoragePart(key.slice(prefix.length));
      if (!id) return;
      const metaKey = getSavedContentMetaKey(type, normalizedUserKey, id);
      if (legacyStorage?.getItem(key) === '1' && !records.has(`${type}:${id}`)) {
        addRecord(type, key, legacyStorage);
      }
      migrateLegacySavedContent({ type, userKey: normalizedUserKey, id });
    });

    getStorageKeys(legacyStorage).forEach((key) => {
      if (key?.startsWith(metaPrefix)) legacyStorage?.removeItem(key);
    });

    pruneSavedContentRecords({ storage: savedStorage, type, userKey: normalizedUserKey });
  });

  const countsByType = new Map();
  return Array.from(records.values()).sort((a, b) => {
    const aTime = new Date(a.meta?.savedAt || 0).getTime();
    const bTime = new Date(b.meta?.savedAt || 0).getTime();
    return bTime - aTime;
  }).filter((record) => {
    const count = countsByType.get(record.type) || 0;
    if (count >= SAVED_CONTENT_MAX_RECORDS_PER_TYPE) return false;
    countsByType.set(record.type, count + 1);
    return true;
  });
};
