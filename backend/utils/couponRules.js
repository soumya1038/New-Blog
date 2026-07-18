const COUPON_CODE_MIN_LENGTH = 3;
const COUPON_CODE_MAX_LENGTH = Math.min(
  Math.max(COUPON_CODE_MIN_LENGTH, Number(process.env.COUPON_CODE_MAX_LENGTH) || 40),
  80
);
const COUPON_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;

const normalizeCouponCode = (code) => {
  const normalized = String(code || '').trim().toUpperCase();
  if (
    normalized.length < COUPON_CODE_MIN_LENGTH ||
    normalized.length > COUPON_CODE_MAX_LENGTH ||
    !COUPON_CODE_PATTERN.test(normalized)
  ) {
    return '';
  }
  return normalized;
};

const toId = (value) => value?.toString?.() || String(value || '');

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const hasUsageLimit = (coupon) => coupon?.usageLimit !== null && coupon?.usageLimit !== undefined;

const getCouponEffectiveStatus = (coupon, now = new Date()) => {
  if (!coupon) {
    return {
      status: 'missing',
      label: 'Missing',
      isUsable: false,
      canActivate: false,
      message: 'Coupon not found.',
    };
  }

  if (now > new Date(coupon.validUntil)) {
    return {
      status: 'expired',
      label: 'Expired',
      isUsable: false,
      canActivate: false,
      message: 'This coupon has expired.',
    };
  }

  if (hasUsageLimit(coupon) && toNumber(coupon.usedCount) >= toNumber(coupon.usageLimit)) {
    return {
      status: 'used_up',
      label: 'Used up',
      isUsable: false,
      canActivate: false,
      message: 'This coupon has reached its usage limit.',
    };
  }

  if (!coupon.isActive) {
    return {
      status: 'off',
      label: 'Off',
      isUsable: false,
      canActivate: true,
      message: 'This coupon is turned off.',
    };
  }

  if (now < new Date(coupon.validFrom)) {
    return {
      status: 'scheduled',
      label: 'Scheduled',
      isUsable: false,
      canActivate: true,
      message: 'This coupon is not active yet.',
    };
  }

  return {
    status: 'active',
    label: 'Active',
    isUsable: true,
    canActivate: true,
    message: '',
  };
};

const countUserUses = (coupon, userId) => {
  const targetUserId = toId(userId);
  if (!targetUserId || !Array.isArray(coupon?.usedBy)) return 0;
  return coupon.usedBy.filter((usage) => toId(usage.userId) === targetUserId).length;
};

const buildEligibleCartLines = ({ coupon, cartItems = [], products = [] }) => {
  if (!cartItems.length || !products.length) return [];

  const productById = new Map(products.map((product) => [toId(product._id), product]));
  const applicableProductIds = new Set((coupon.applicableProducts || []).map(toId).filter(Boolean));
  const applicableTypes = new Set((coupon.applicableTypes || []).filter(Boolean));

  return cartItems
    .map((item) => {
      const productId = toId(item.productId || item._id);
      const product = productById.get(productId);
      if (!product) return null;

      let eligible = true;
      if (coupon.scope === 'seller') {
        eligible = toId(product.sellerId) === toId(coupon.createdBy);
      } else if (coupon.scope === 'product') {
        eligible = applicableProductIds.has(productId);
      }

      if (eligible && applicableProductIds.size > 0) {
        eligible = applicableProductIds.has(productId);
      }

      if (eligible && applicableTypes.size > 0) {
        eligible = applicableTypes.has(product.type);
      }

      if (!eligible) return null;

      const qty = product.type === 'physical'
        ? Math.max(parseInt(item.qty, 10) || 1, 1)
        : 1;
      const price = toNumber(product.price);

      return {
        product,
        qty,
        subtotal: Math.round(price * qty * 100) / 100,
      };
    })
    .filter(Boolean);
};

const calculateCouponApplication = ({
  coupon,
  userId,
  cartTotal = 0,
  cartItems = [],
  products = [],
  now = new Date(),
}) => {
  const effectiveStatus = getCouponEffectiveStatus(coupon, now);
  if (!effectiveStatus.isUsable) {
    return {
      valid: false,
      message: effectiveStatus.message,
      effectiveStatus,
      discount: 0,
      isFreeShipping: false,
    };
  }

  const userUses = countUserUses(coupon, userId);
  if (userUses >= toNumber(coupon.perUserLimit, 1)) {
    return {
      valid: false,
      message: 'You have already used this coupon the maximum number of times.',
      effectiveStatus,
      discount: 0,
      isFreeShipping: false,
    };
  }

  const eligibleLines = buildEligibleCartLines({ coupon, cartItems, products });
  const hasProductContext = cartItems.length > 0 && products.length > 0;
  const eligibleSubtotal = hasProductContext
    ? eligibleLines.reduce((sum, line) => sum + line.subtotal, 0)
    : toNumber(cartTotal);

  if (hasProductContext && eligibleLines.length === 0) {
    return {
      valid: false,
      message: 'This coupon is not applicable to the selected products.',
      effectiveStatus,
      discount: 0,
      isFreeShipping: false,
    };
  }

  if (eligibleSubtotal < toNumber(coupon.minOrderValue)) {
    return {
      valid: false,
      message: `Minimum order value of Rs. ${toNumber(coupon.minOrderValue).toLocaleString('en-IN')} required for this coupon.`,
      effectiveStatus,
      discount: 0,
      isFreeShipping: false,
    };
  }

  let discount = 0;
  let isFreeShipping = false;

  if (coupon.discountType === 'percentage') {
    discount = (eligibleSubtotal * toNumber(coupon.discountValue)) / 100;
    if (coupon.maxDiscountCap) discount = Math.min(discount, toNumber(coupon.maxDiscountCap));
  } else if (coupon.discountType === 'flat') {
    discount = Math.min(toNumber(coupon.discountValue), eligibleSubtotal);
  } else if (coupon.discountType === 'free_shipping') {
    isFreeShipping = !hasProductContext || eligibleLines.some((line) => line.product.type === 'physical');
  }

  return {
    valid: true,
    message: '',
    effectiveStatus,
    eligibleSubtotal,
    discount: Math.round(discount * 100) / 100,
    isFreeShipping,
  };
};

const serializeCouponWithStatus = (coupon, now = new Date()) => {
  const plain = typeof coupon.toObject === 'function' ? coupon.toObject() : { ...coupon };
  delete plain.usedBy;
  delete plain.__v;
  const effectiveStatus = getCouponEffectiveStatus(coupon, now);
  return {
    ...plain,
    effectiveStatus: effectiveStatus.status,
    statusLabel: effectiveStatus.label,
    canActivate: effectiveStatus.canActivate,
  };
};

module.exports = {
  COUPON_CODE_MAX_LENGTH,
  COUPON_CODE_MIN_LENGTH,
  normalizeCouponCode,
  getCouponEffectiveStatus,
  calculateCouponApplication,
  serializeCouponWithStatus,
};
