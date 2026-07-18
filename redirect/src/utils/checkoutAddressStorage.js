const getBrowserStorage = (type) => {
  if (typeof window === 'undefined') return null;
  try {
    return window[type] || null;
  } catch {
    return null;
  }
};

const CHECKOUT_ADDRESS_STORAGE_VERSION = 2;
const CHECKOUT_ADDRESS_TTL_MS = 24 * 60 * 60 * 1000;
const CHECKOUT_ADDRESS_MAX_ITEMS = 5;
const FIELD_LIMITS = {
  id: 96,
  label: 120,
  name: 80,
  phone: 32,
  addressLine1: 180,
  addressLine2: 180,
  city: 80,
  state: 80,
  pin: 24,
  country: 80,
};

const cleanText = (value, maxLength) =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const normalizeSavedAddress = (address = {}) => {
  if (!address || typeof address !== 'object') return null;

  const normalized = {
    id: cleanText(address.id, FIELD_LIMITS.id) || `address-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: cleanText(address.name, FIELD_LIMITS.name),
    phone: cleanText(address.phone, FIELD_LIMITS.phone),
    addressLine1: cleanText(address.addressLine1, FIELD_LIMITS.addressLine1),
    addressLine2: cleanText(address.addressLine2, FIELD_LIMITS.addressLine2),
    city: cleanText(address.city, FIELD_LIMITS.city),
    state: cleanText(address.state, FIELD_LIMITS.state),
    pin: cleanText(address.pin, FIELD_LIMITS.pin),
    country: cleanText(address.country || 'India', FIELD_LIMITS.country) || 'India',
  };

  normalized.label = cleanText(
    address.label || `${normalized.name || 'Saved address'} - ${normalized.city || normalized.pin}`,
    FIELD_LIMITS.label
  );

  return normalized.addressLine1 || normalized.phone || normalized.city || normalized.pin
    ? normalized
    : null;
};

const normalizeAddressList = (addresses) => (
  Array.isArray(addresses) ? addresses : []
)
  .map(normalizeSavedAddress)
  .filter(Boolean)
  .slice(0, CHECKOUT_ADDRESS_MAX_ITEMS);

const createStoragePayload = (addresses) => ({
  version: CHECKOUT_ADDRESS_STORAGE_VERSION,
  savedAt: new Date().toISOString(),
  addresses: normalizeAddressList(addresses),
});

const parseStoragePayload = (raw) => {
  if (!raw) return { addresses: [], shouldRewrite: false };

  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return { addresses: normalizeAddressList(parsed), shouldRewrite: true };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { addresses: [], shouldRewrite: true };
  }

  const savedAtMs = new Date(parsed.savedAt || 0).getTime();
  if (Number.isFinite(savedAtMs) && savedAtMs > 0 && Date.now() - savedAtMs > CHECKOUT_ADDRESS_TTL_MS) {
    return { addresses: [], expired: true, shouldRewrite: true };
  }

  const originalAddresses = Array.isArray(parsed.addresses) ? parsed.addresses : [];
  const addresses = normalizeAddressList(originalAddresses);
  const shouldRewrite =
    parsed.version !== CHECKOUT_ADDRESS_STORAGE_VERSION ||
    !Number.isFinite(savedAtMs) ||
    savedAtMs <= 0 ||
    JSON.stringify(addresses) !== JSON.stringify(originalAddresses);
  return { addresses, shouldRewrite };
};

export const getCheckoutAddressStorageKey = (userId) =>
  userId ? `lekhon_checkout_addresses_${userId}` : '';

export const readCheckoutAddresses = (key) => {
  if (!key) return [];

  const sessionStorage = getBrowserStorage('sessionStorage');
  const localStorage = getBrowserStorage('localStorage');
  const sessionValue = sessionStorage?.getItem(key);
  const legacyValue = localStorage?.getItem(key);
  const raw = sessionValue || legacyValue || '[]';

  if (legacyValue) {
    localStorage.removeItem(key);
  }

  try {
    const { addresses, expired, shouldRewrite } = parseStoragePayload(raw);
    if (expired || !addresses.length) {
      sessionStorage?.removeItem(key);
      localStorage?.removeItem(key);
      return [];
    }
    if (shouldRewrite || legacyValue) {
      sessionStorage?.setItem(key, JSON.stringify(createStoragePayload(addresses)));
    }
    return addresses;
  } catch {
    sessionStorage?.removeItem(key);
    localStorage?.removeItem(key);
    return [];
  }
};

export const writeCheckoutAddresses = (key, addresses) => {
  const payload = createStoragePayload(addresses);
  if (!key) return payload.addresses;

  const sessionStorage = getBrowserStorage('sessionStorage');
  const localStorage = getBrowserStorage('localStorage');

  if (!payload.addresses.length) {
    sessionStorage?.removeItem(key);
    localStorage?.removeItem(key);
    return [];
  }

  sessionStorage?.setItem(key, JSON.stringify(payload));
  localStorage?.removeItem(key);
  return payload.addresses;
};
