const GUEST_CART_KEY = 'lekhon_guest_marketplace_cart_v1';

const toId = (value) => String(value?._id || value || '');

const snapshotProduct = (product = {}) => ({
  _id: toId(product),
  title: product.title || '',
  slug: product.slug || '',
  thumbnail: product.thumbnail || product.images?.[0]?.url || '',
  price: Number(product.price || 0),
  compareAtPrice: Number(product.compareAtPrice || 0),
  type: product.type || 'digital',
  isFree: Boolean(product.isFree),
  physical: product.physical || {},
  sellerId: product.sellerId || null,
});

export const getGuestCart = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '{"items":[]}');
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      couponCode: parsed.couponCode || '',
    };
  } catch {
    return { items: [], couponCode: '' };
  }
};

export const saveGuestCart = (cart) => {
  const next = {
    items: Array.isArray(cart.items) ? cart.items : [],
    couponCode: cart.couponCode || '',
  };
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('cartUpdated'));
  return next;
};

export const addGuestCartItem = (product, qty = 1) => {
  const productId = toId(product);
  if (!productId || product.type === 'external') return getGuestCart();

  const cart = getGuestCart();
  const existing = cart.items.find(item => toId(item.productId) === productId);
  const quantity = Math.max(parseInt(qty, 10) || 1, 1);

  if (existing) {
    existing.qty += quantity;
  } else {
    const productSnapshot = snapshotProduct(product);
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
  const quantity = Math.max(parseInt(qty, 10) || 1, 1);
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

export const clearGuestCart = () => saveGuestCart({ items: [] });

export const getGuestCartCount = () => getGuestCart().items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
