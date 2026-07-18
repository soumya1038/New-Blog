const GUEST_CART_KEY = 'lekhon_guest_marketplace_cart_v1';
const GUEST_CART_STORAGE_VERSION = 2;
const GUEST_CART_TTL_MS = 24 * 60 * 60 * 1000;
const GUEST_CART_MAX_ITEMS = 50;
const GUEST_CART_MAX_QTY = 99;
const CART_PRICE_MAX = 100000000;
const CART_ALLOWED_PRODUCT_TYPES = new Set(['digital', 'physical']);
const FIELD_LIMITS = {
  id: 160,
  itemId: 96,
  title: 180,
  slug: 180,
  type: 32,
  couponCode: 80,
  url: 2048,
};

const getBrowserStorage = (type) => {
  if (typeof window === 'undefined') return null;
  try {
    return window[type] || null;
  } catch {
    return null;
  }
};

const getCartStorage = () => getBrowserStorage('sessionStorage');
const getLegacyCartStorage = () => getBrowserStorage('localStorage');

const cleanText = (value, maxLength = FIELD_LIMITS.title) =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const toId = (value) => {
  if (value && typeof value === 'object') {
    return cleanText(value._id || value.id, FIELD_LIMITS.id);
  }
  return cleanText(value, FIELD_LIMITS.id);
};

const normalizeProductType = (value) => {
  const normalized = cleanText(value || 'digital', FIELD_LIMITS.type).toLowerCase();
  if (normalized === 'external') return '';
  return CART_ALLOWED_PRODUCT_TYPES.has(normalized) ? normalized : 'digital';
};

const cleanCartUrl = (value) => {
  const url = cleanText(value, FIELD_LIMITS.url);
  if (!url || /[\\]/.test(url)) return '';
  if (url.startsWith('/') && !url.startsWith('//')) return url;

  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) return '';
    if (!parsed.hostname || /[\s\\]/.test(parsed.hostname)) return '';
    return parsed.href.slice(0, FIELD_LIMITS.url);
  } catch {
    return '';
  }
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeQty = (qty) =>
  Math.min(Math.max(parseInt(qty, 10) || 1, 1), GUEST_CART_MAX_QTY);

const normalizePhysicalSnapshot = (physical = null) => {
  if (!physical || typeof physical !== 'object') return {};

  const minimumOrderQuantity = normalizeQty(physical.minimumOrderQuantity || 1);
  const stock = Number.isFinite(Number(physical.stock))
    ? Math.min(Math.max(Number(physical.stock), 0), GUEST_CART_MAX_QTY)
    : undefined;

  return {
    minimumOrderQuantity,
    ...(stock !== undefined ? { stock } : {}),
  };
};

const normalizePrice = (value) => Math.min(Math.max(toNumber(value), 0), CART_PRICE_MAX);

const snapshotProduct = (product = {}) => {
  const productId = toId(product);
  const type = normalizeProductType(product.type);
  if (!productId || !type) return null;

  const physical = normalizePhysicalSnapshot(product.physical);
  return {
    _id: productId,
    title: cleanText(product.title, FIELD_LIMITS.title),
    slug: cleanText(product.slug, FIELD_LIMITS.slug),
    thumbnail: cleanCartUrl(product.thumbnail || product.images?.[0]?.url),
    price: normalizePrice(product.price),
    compareAtPrice: normalizePrice(product.compareAtPrice),
    type,
    isFree: Boolean(product.isFree),
    ...(Object.keys(physical).length ? { physical } : {}),
  };
};

const normalizeCartItem = (item = {}) => {
  const productSource = item.productId && typeof item.productId === 'object'
    ? item.productId
    : {
        _id: item.productId,
        title: item.titleSnapshot,
        thumbnail: item.thumbnailSnapshot,
        price: item.priceSnapshot,
        type: item.typeSnapshot,
      };
  const productSnapshot = snapshotProduct(productSource);
  if (!productSnapshot?._id) return null;

  return {
    _id: cleanText(item._id || `guest-${productSnapshot._id}`, FIELD_LIMITS.itemId),
    productId: productSnapshot,
    qty: normalizeQty(item.qty),
    priceSnapshot: productSnapshot.price,
    titleSnapshot: productSnapshot.title,
    thumbnailSnapshot: productSnapshot.thumbnail,
  };
};

const normalizeCart = (cart = {}) => ({
  items: (Array.isArray(cart.items) ? cart.items : [])
    .map(normalizeCartItem)
    .filter(Boolean)
    .slice(-GUEST_CART_MAX_ITEMS),
  couponCode: cleanText(cart.couponCode, FIELD_LIMITS.couponCode),
});

const createStoragePayload = (cart) => ({
  version: GUEST_CART_STORAGE_VERSION,
  savedAt: new Date().toISOString(),
  cart: normalizeCart(cart),
});

const parseStoredGuestCart = (raw) => {
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.cart) {
    const savedAtMs = new Date(parsed.savedAt || 0).getTime();
    const expired =
      Number.isFinite(savedAtMs) &&
      savedAtMs > 0 &&
      Date.now() - savedAtMs > GUEST_CART_TTL_MS;
    if (expired) return { cart: { items: [], couponCode: '' }, expired: true, shouldRewrite: true };

    const cart = normalizeCart(parsed.cart);
    const shouldRewrite =
      parsed.version !== GUEST_CART_STORAGE_VERSION ||
      !Number.isFinite(savedAtMs) ||
      savedAtMs <= 0 ||
      JSON.stringify(cart) !== JSON.stringify(parsed.cart);
    return { cart, shouldRewrite };
  }

  return { cart: normalizeCart(parsed), shouldRewrite: true };
};

const notifyCartUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('cartUpdated'));
};

const clearStoredGuestCart = () => {
  getCartStorage()?.removeItem(GUEST_CART_KEY);
  getLegacyCartStorage()?.removeItem(GUEST_CART_KEY);
};

const writeStoredGuestCart = (cart) => {
  const normalized = normalizeCart(cart);
  const storage = getCartStorage();
  const legacyStorage = getLegacyCartStorage();
  legacyStorage?.removeItem(GUEST_CART_KEY);

  if (!normalized.items.length && !normalized.couponCode) {
    storage?.removeItem(GUEST_CART_KEY);
    return normalized;
  }

  storage?.setItem(GUEST_CART_KEY, JSON.stringify(createStoragePayload(normalized)));
  return normalized;
};

export const getGuestCart = () => {
  const storage = getCartStorage();
  const legacyStorage = getLegacyCartStorage();
  const sessionValue = storage?.getItem(GUEST_CART_KEY);
  const legacyValue = legacyStorage?.getItem(GUEST_CART_KEY);
  const raw = sessionValue || legacyValue;

  if (!raw) {
    legacyStorage?.removeItem(GUEST_CART_KEY);
    return { items: [], couponCode: '' };
  }

  try {
    const { cart, expired, shouldRewrite } = parseStoredGuestCart(raw);
    if (expired || (!cart.items.length && !cart.couponCode)) {
      clearStoredGuestCart();
      return { items: [], couponCode: '' };
    }
    if (shouldRewrite || legacyValue) {
      writeStoredGuestCart(cart);
    }
    return cart;
  } catch {
    clearStoredGuestCart();
    return { items: [], couponCode: '' };
  }
};

export const saveGuestCart = (cart) => {
  const next = writeStoredGuestCart(cart);
  notifyCartUpdated();
  return next;
};

export const addGuestCartItem = (product, qty = 1) => {
  const productSnapshot = snapshotProduct(product);
  if (!productSnapshot) return getGuestCart();

  const cart = getGuestCart();
  const productId = productSnapshot._id;
  const existing = cart.items.find(item => toId(item.productId) === productId);
  const quantity = normalizeQty(qty);

  if (existing) {
    existing.qty = normalizeQty(existing.qty + quantity);
  } else {
    cart.items.push({
      _id: `guest-${productId}`,
      productId: productSnapshot,
      qty: quantity,
      priceSnapshot: productSnapshot.price,
      titleSnapshot: productSnapshot.title,
      thumbnailSnapshot: productSnapshot.thumbnail,
    });
  }

  return saveGuestCart(cart);
};

export const updateGuestCartItem = (productId, qty) => {
  const id = String(productId);
  const quantity = normalizeQty(qty);
  const cart = getGuestCart();
  cart.items = cart.items.map(item => (
    toId(item.productId) === id ? { ...item, qty: quantity } : item
  ));
  return saveGuestCart(cart);
};

export const removeGuestCartItem = (productId) => {
  const id = String(productId);
  const cart = getGuestCart();
  cart.items = cart.items.filter(item => toId(item.productId) !== id);
  return saveGuestCart(cart);
};

export const clearGuestCart = () => {
  clearStoredGuestCart();
  notifyCartUpdated();
  return { items: [], couponCode: '' };
};

export const getGuestCartCount = () =>
  getGuestCart().items.reduce((sum, item) => sum + normalizeQty(item.qty), 0);
