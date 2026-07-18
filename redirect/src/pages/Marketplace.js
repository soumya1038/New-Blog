import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext }     from '../context/AuthContext';
import api                 from '../services/api';
import ProductCard         from '../components/ProductCard';
import CartDrawer          from '../components/CartDrawer';
import MarketplaceState    from '../components/MarketplaceState';
import { addGuestCartItem, getGuestCartCount } from '../utils/guestCart';
import { apiCache } from '../utils/apiCache';
import {
  getCheckoutAddressStorageKey,
  readCheckoutAddresses,
  writeCheckoutAddresses,
} from '../utils/checkoutAddressStorage';
import { readSessionJson, writeSessionJson } from '../utils/sessionBackedStorage';
import { getSafeHttpUrl, getSafeImageUrl } from '../utils/safeMediaUrls';
import { FaBell, FaBolt, FaBookmark, FaBoxOpen, FaCheck, FaChevronDown, FaChevronRight, FaClock, FaExternalLinkAlt, FaFilePdf, FaFilter, FaMapMarkerAlt, FaSearch, FaShoppingBag, FaShoppingCart, FaSpinner, FaStore, FaTag, FaTimes, FaTrash, FaUserCircle, FaWrench } from 'react-icons/fa';

const TYPES = [
  { value: '',         label: 'All',      icon: FaShoppingBag },
  { value: 'saved',    label: 'Saved',    icon: FaBookmark },
  { value: 'digital',  label: 'Digital',  icon: FaFilePdf },
  { value: 'physical', label: 'Physical', icon: FaBoxOpen },
  { value: 'service',  label: 'Services', icon: FaWrench },
  { value: 'external', label: 'External', icon: FaExternalLinkAlt },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest'       },
  { value: 'popular',   label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc',label: 'Price: High to Low' },
  { value: 'rating',    label: 'Top Rated'    },
];

const SEARCH_DEBOUNCE_MS = 1500;
const SEARCH_MIN_CHARS = 2;
const MARKETPLACE_REQUEST_TIMEOUT_MS = 15000;
const MARKETPLACE_CACHE_TTL = 60 * 1000;
const MARKETPLACE_STALE_TTL = 10 * 60 * 1000;
const SAVED_TYPE_FILTER = 'saved';
const PERSONALIZATION_KEY = 'lekhon-marketplace-personalization:v1';
const PERSONALIZATION_LIMITS = {
  searches: 12,
  products: 20,
};
const MARKETPLACE_NOTIFICATION_TYPES = new Set([
  'seller_approved',
  'seller_rejected',
  'seller_application_submitted',
  'seller_application_withdrawn',
  'new_order',
  'order_shipped',
  'order_delivered',
  'new_review',
  'refund_requested',
  'payout_processed',
]);
const MARKETPLACE_NOTIFICATION_KEYWORDS = ['seller', 'order', 'payout', 'refund', 'review', 'product'];

const emptyPersonalization = {
  version: 1,
  recentSearches: [],
  recentProducts: [],
  recommendedProducts: [],
  categoryCounts: {},
  typeCounts: {},
};

const loadPersonalization = () => {
  const parsed = readSessionJson(PERSONALIZATION_KEY, emptyPersonalization);
  return {
    ...emptyPersonalization,
    ...parsed,
    recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches.slice(0, PERSONALIZATION_LIMITS.searches) : [],
    recentProducts: Array.isArray(parsed.recentProducts) ? parsed.recentProducts.slice(0, PERSONALIZATION_LIMITS.products) : [],
    recommendedProducts: Array.isArray(parsed.recommendedProducts) ? parsed.recommendedProducts.slice(0, PERSONALIZATION_LIMITS.products) : [],
    categoryCounts: parsed.categoryCounts && typeof parsed.categoryCounts === 'object' ? parsed.categoryCounts : {},
    typeCounts: parsed.typeCounts && typeof parsed.typeCounts === 'object' ? parsed.typeCounts : {},
  };
};

const savePersonalization = (value) => {
  writeSessionJson(PERSONALIZATION_KEY, value);
};

const addRecentSearch = (state, query) => {
  const value = String(query || '').trim();
  if (!value) return state;
  return {
    ...state,
    recentSearches: [
      { value, ts: Date.now() },
      ...state.recentSearches.filter(item => item.value.toLowerCase() !== value.toLowerCase()),
    ].slice(0, PERSONALIZATION_LIMITS.searches),
  };
};

const addProductSignal = (state, product) => {
  if (!product?._id) return state;
  const nextCategoryCounts = { ...state.categoryCounts };
  const nextTypeCounts = { ...state.typeCounts };
  (product.category || []).forEach(category => {
    nextCategoryCounts[category] = (nextCategoryCounts[category] || 0) + 1;
  });
  if (product.type) nextTypeCounts[product.type] = (nextTypeCounts[product.type] || 0) + 1;

  return {
    ...state,
    categoryCounts: nextCategoryCounts,
    typeCounts: nextTypeCounts,
    recentProducts: [
      {
        id: product._id,
        title: product.title,
        slug: product.slug,
        thumbnail: getSafeImageUrl(product.thumbnail),
        price: product.price,
        type: product.type,
        viewedAt: Date.now(),
      },
      ...state.recentProducts.filter(item => item.id !== product._id),
    ].slice(0, PERSONALIZATION_LIMITS.products),
  };
};

const mergePersonalization = (localState, incoming = {}) => {
  const productMap = new Map();
  [...(incoming.recentProducts || []), ...(localState.recentProducts || [])].forEach(item => {
    if (!item?.id) return;
    const existing = productMap.get(item.id);
    if (!existing || new Date(item.viewedAt || 0) > new Date(existing.viewedAt || 0)) {
      productMap.set(item.id, item);
    }
  });

  const mergeCounts = (a = {}, b = {}) => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return Object.fromEntries([...keys].map(key => [key, Math.max(a[key] || 0, b[key] || 0)]));
  };

  return {
    ...localState,
    recentProducts: [...productMap.values()]
      .sort((a, b) => new Date(b.viewedAt || 0) - new Date(a.viewedAt || 0))
      .slice(0, PERSONALIZATION_LIMITS.products),
    recommendedProducts: Array.isArray(incoming.recommendedProducts)
      ? incoming.recommendedProducts.slice(0, PERSONALIZATION_LIMITS.products)
      : localState.recommendedProducts || [],
    categoryCounts: mergeCounts(localState.categoryCounts, incoming.categoryCounts),
    typeCounts: mergeCounts(localState.typeCounts, incoming.typeCounts),
  };
};

const getMarketplaceErrorType = (error) => {
  const status = error?.response?.status;
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || status === 408 || status === 504 || message.includes('timeout')) {
    return 'timeout';
  }

  if (!error?.response || code === 'ERR_NETWORK' || message.includes('network')) {
    return 'network-error';
  }

  if (status >= 500) {
    return 'server-error';
  }

  return 'server-error';
};

const isMarketplaceNotification = (notification = {}) => {
  if (MARKETPLACE_NOTIFICATION_TYPES.has(notification.type)) return true;
  const text = `${notification.type || ''} ${notification.message || ''}`.toLowerCase();
  return MARKETPLACE_NOTIFICATION_KEYWORDS.some(keyword => text.includes(keyword));
};

const QUICK_PREVIEW_CAROUSEL_MS = 2000;
const QUICK_PREVIEW_DETAIL_TAP_MS = 520;

const getProductPreviewImages = (product = {}) => {
  const gallery = Array.isArray(product.images) ? product.images : [];
  return [...new Set([product.thumbnail, ...gallery].map(getSafeImageUrl).filter(Boolean))].slice(0, 6);
};

const formatProductPrice = (value = 0) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const getArray = (value) => (Array.isArray(value) ? value : []);
const getWishlistItems = (data = {}) => getArray(data.products || data.items || data.wishlist);
const getWishlistProduct = (item = {}) => item.product || item.productId || item;
const getProductId = (product = {}) => {
  if (!product) return '';
  if (typeof product === 'string' || typeof product === 'number') return String(product);
  const id = product._id || product.id || product.productId;
  if (!id) return '';
  if (typeof id === 'object') return getProductId(id);
  return String(id);
};
const getWishlistProductIds = (data = {}) => new Set(
  getWishlistItems(data)
    .map(item => getProductId(getWishlistProduct(item)))
    .filter(Boolean)
);
const markProductsWithWishlist = (items = [], savedProductIds = new Set()) => getArray(items).map(product => ({
  ...product,
  isWishlisted: Boolean(product.isWishlisted || product.wishlisted || product.saved || savedProductIds.has(getProductId(product))),
}));
const getMarketplaceCacheKey = (params = {}) => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');

  return `marketplace-products:${query || 'default'}`;
};
const getWishlistCacheKey = (userId = '') => `marketplace-wishlist:${userId || 'guest'}`;
const normalizeSavedProduct = (item = {}) => {
  const product = getWishlistProduct(item);
  if (!product?._id && !product?.id) return null;
  return {
    ...product,
    _id: product._id || product.id,
    isWishlisted: true,
  };
};

const filterSavedProducts = (items = [], filters = {}) => {
  const search = String(filters.search || '').trim().toLowerCase();
  const minPrice = filters.minPrice === '' ? null : Number(filters.minPrice);
  const maxPrice = filters.maxPrice === '' ? null : Number(filters.maxPrice);

  const filtered = items.filter((product) => {
    const price = Number(product.price || 0);
    const haystack = [
      product.title,
      product.description,
      product.sellerId?.name,
      product.sellerId?.username,
      ...(product.category || []),
      ...(product.tags || []),
    ].filter(Boolean).join(' ').toLowerCase();

    if (search && !haystack.includes(search)) return false;
    if (Number.isFinite(minPrice) && price < minPrice) return false;
    if (Number.isFinite(maxPrice) && price > maxPrice) return false;
    if (filters.isFree && !product.isFree) return false;
    return true;
  });

  const sorted = [...filtered];
  if (filters.sort === 'price_asc') sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  else if (filters.sort === 'price_desc') sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  else if (filters.sort === 'rating') sorted.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
  else if (filters.sort === 'popular') sorted.sort((a, b) => Number(b.reviewCount || b.views || 0) - Number(a.reviewCount || a.views || 0));
  else sorted.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));

  return sorted;
};

const MarketplaceLoading = ({ compact = false }) => (
  <div
    className={`marketplace-skeleton-grid${compact ? ' marketplace-skeleton-grid--compact' : ''}`}
    role="status"
    aria-live="polite"
    aria-label="Loading marketplace products"
  >
    {(compact ? [0, 1, 2] : [0, 1, 2, 3, 4, 5]).map((item) => (
      <div key={item} className="marketplace-product-skeleton">
        <span className="marketplace-skeleton-line marketplace-product-skeleton__image" />
        <div className="marketplace-product-skeleton__body">
          <span className="marketplace-skeleton-line marketplace-product-skeleton__seller" />
          <span className="marketplace-skeleton-line marketplace-product-skeleton__title" />
          <span className="marketplace-skeleton-line marketplace-product-skeleton__title marketplace-product-skeleton__title--short" />
          <div className="marketplace-product-skeleton__footer">
            <span className="marketplace-skeleton-line" />
            <span className="marketplace-skeleton-line" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ProductQuickPreview = ({
  product,
  busy,
  onClose,
  onAddToCart,
  onBuyNow,
  onOpenDetail,
}) => {
  const [activeImage, setActiveImage] = useState(0);
  const lastTapRef = useRef(0);
  const images = useMemo(() => getProductPreviewImages(product), [product]);
  const compareAtPrice = Number(product?.compareAtPrice || 0);
  const price = Number(product?.price || 0);
  const discountPct = compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;
  const seller = product?.sellerId || {};
  const safeSellerProfileImage = getSafeImageUrl(seller.profileImage);
  const isExternal = product?.type === 'external';

  useEffect(() => {
    setActiveImage(0);
  }, [product?._id]);

  useEffect(() => {
    if (images.length < 2) return undefined;
    const interval = window.setInterval(() => {
      setActiveImage(index => (index + 1) % images.length);
    }, QUICK_PREVIEW_CAROUSEL_MS);
    return () => window.clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCardClick = (event) => {
    event.stopPropagation();
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    const now = Date.now();
    if (now - lastTapRef.current <= QUICK_PREVIEW_DETAIL_TAP_MS) {
      onOpenDetail(product);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  const handleBackdropClose = (event) => {
    const isBackdrop = event.target === event.currentTarget ||
      (event.target instanceof Element && event.target.classList.contains('marketplace-quick-preview__glass'));

    if (!isBackdrop) return;
    event.preventDefault();
    onClose();
  };

  const stopPreviewEvent = (event) => {
    event.stopPropagation();
  };

  if (!product) return null;

  return (
    <div
      className="marketplace-quick-preview"
      role="dialog"
      aria-modal="true"
      aria-label={`${product.title || 'Product'} quick preview`}
      onClick={handleBackdropClose}
    >
      <div className="marketplace-quick-preview__glass" aria-hidden="true" />
      <article
        className="marketplace-quick-preview__card"
        onClick={handleCardClick}
        onPointerDown={stopPreviewEvent}
        onMouseDown={stopPreviewEvent}
        onTouchStart={stopPreviewEvent}
      >
        <button
          type="button"
          className="marketplace-quick-preview__close"
          onClick={onClose}
          aria-label="Close product preview"
        >
          <FaTimes size={13} />
        </button>

        <div className="marketplace-quick-preview__media">
          {images[activeImage] ? (
            <img src={images[activeImage]} alt={product.title || ''} referrerPolicy="no-referrer" />
          ) : (
            <div className="marketplace-quick-preview__empty-media">
              <FaShoppingBag size={30} />
            </div>
          )}
          {discountPct > 0 && (
            <span className="marketplace-quick-preview__discount">-{discountPct}%</span>
          )}
        </div>

        {images.length > 1 && (
          <div className="marketplace-quick-preview__dots" aria-label="Product image carousel">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className={index === activeImage ? 'is-active' : ''}
                onClick={() => setActiveImage(index)}
                aria-label={`Show product image ${index + 1}`}
              />
            ))}
          </div>
        )}

        <div className="marketplace-quick-preview__body">
          <div className="marketplace-quick-preview__seller">
            {safeSellerProfileImage ? (
              <img src={safeSellerProfileImage} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span><FaStore size={10} /></span>
            )}
            <p>{seller.name || seller.username || 'Lekhon seller'}</p>
          </div>

          <h2>{product.title}</h2>

          <div className="marketplace-quick-preview__price-row">
            <div>
              <strong>{product.isFree ? 'Free' : formatProductPrice(price)}</strong>
              {compareAtPrice > price && !product.isFree && (
                <span>{formatProductPrice(compareAtPrice)}</span>
              )}
            </div>
            <p>Double tap preview for details</p>
          </div>

          <div className="marketplace-quick-preview__actions">
            <button
              type="button"
              className="marketplace-quick-preview__button marketplace-quick-preview__button--secondary"
              disabled={busy || isExternal}
              onClick={() => onAddToCart(product)}
            >
              <FaShoppingCart size={12} />
              {isExternal ? 'External' : busy ? 'Adding...' : 'Add to Cart'}
            </button>
            <button
              type="button"
              className="marketplace-quick-preview__button marketplace-quick-preview__button--primary"
              disabled={busy}
              onClick={() => onBuyNow(product)}
            >
              <FaBolt size={11} />
              {busy ? 'Opening...' : 'Buy Now'}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};

const Marketplace = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const suggestionsRequestRef = useRef(0);
  const searchBoxRef = useRef(null);
  const sortBoxRef = useRef(null);
  const marketProfileRef = useRef(null);
  const typeRailRef = useRef(null);
  const loadMoreRef = useRef(null);
  const productsRequestRef = useRef(0);
  const fetchingProductsRef = useRef(false);
  const typeRailDragRef = useRef({
    isDown: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
  });

  const [products,    setProducts]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState(null);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [cartCount,   setCartCount]   = useState(0);
  const [quickPreviewProduct, setQuickPreviewProduct] = useState(null);
  const [quickPreviewBusy, setQuickPreviewBusy] = useState(false);
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [sortOpen,    setSortOpen]    = useState(false);
  const [marketProfileOpen, setMarketProfileOpen] = useState(false);
  const [marketNotifications, setMarketNotifications] = useState([]);
  const [marketNotificationsLoading, setMarketNotificationsLoading] = useState(false);
  const [marketNotificationsError, setMarketNotificationsError] = useState('');
  const [addressManagerOpen, setAddressManagerOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [editingAddressId, setEditingAddressId] = useState('');
  const [addressDraft, setAddressDraft] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pin: '',
    country: 'India',
  });
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const [personalization, setPersonalization] = useState(loadPersonalization);

  const [filters, setFilters] = useState({
    search:   searchParams.get('q')    || '',
    type:     searchParams.get('type') || '',
    minPrice: '',
    maxPrice: '',
    sort:     'createdAt',
    isFree:   false,
  });

  const addressStorageKey = getCheckoutAddressStorageKey(user?._id);

  const visibleSuggestions = useMemo(() => {
    if (searchInput.trim()) return suggestions;
    return personalization.recentSearches.map(item => ({
      type: 'recent',
      label: item.value,
      value: item.value,
    }));
  }, [personalization.recentSearches, searchInput, suggestions]);

  const updatePersonalization = useCallback((updater) => {
    setPersonalization(prev => {
      const next = updater(prev);
      savePersonalization(next);
      return next;
    });
  }, []);

  const applySearchPreview = useCallback((query) => {
    setFilters(prev => {
      if (prev.search === query) return prev;
      return { ...prev, search: query };
    });
  }, []);

  const fetchProducts = useCallback(async (pg = 1, reset = false) => {
    const isFirstPage = reset || pg === 1;
    if (fetchingProductsRef.current && !isFirstPage) return;

    const requestId = productsRequestRef.current + 1;
    productsRequestRef.current = requestId;
    fetchingProductsRef.current = true;

    if (isFirstPage) {
      setLoading(true);
      setLoadingMore(false);
    } else {
      setLoadingMore(true);
    }

    try {
      if (filters.type === SAVED_TYPE_FILTER) {
        if (!user) {
          if (productsRequestRef.current !== requestId) return;
          setProducts([]);
          setTotal(0);
          setPage(1);
          setMarketplaceError(null);
          return;
        }

        const wishlistCacheKey = getWishlistCacheKey(user._id);
        const cachedWishlist = isFirstPage
          ? apiCache.getStale(wishlistCacheKey, { staleTtl: MARKETPLACE_STALE_TTL })
          : null;
        const hasFreshWishlist = apiCache.isFresh(wishlistCacheKey, { ttl: MARKETPLACE_CACHE_TTL });

        if (cachedWishlist && isFirstPage) {
          const cachedProducts = getWishlistItems(cachedWishlist)
            .map(normalizeSavedProduct)
            .filter(Boolean);
          const nextProducts = filterSavedProducts(cachedProducts, filters);

          setProducts(nextProducts);
          setTotal(nextProducts.length);
          setPage(1);
          setMarketplaceError(null);
          setLoading(false);
        }

        const data = await apiCache.fetch(wishlistCacheKey, async () => {
          const response = await api.get('/marketplace/wishlist', {
            timeout: MARKETPLACE_REQUEST_TIMEOUT_MS,
          });
          return response.data;
        }, {
          ttl: MARKETPLACE_CACHE_TTL,
          force: Boolean(cachedWishlist && !hasFreshWishlist),
        }).catch((error) => {
          if (cachedWishlist) return cachedWishlist;
          throw error;
        });

        if (productsRequestRef.current !== requestId) return;

        const savedProducts = getWishlistItems(data)
          .map(normalizeSavedProduct)
          .filter(Boolean);
        const nextProducts = filterSavedProducts(savedProducts, filters);

        setProducts(nextProducts);
        setTotal(nextProducts.length);
        setPage(1);
        setMarketplaceError(null);
        return;
      }

      const [sortField, sortOrder] = filters.sort === 'price_asc'
        ? ['price', 'asc']
        : filters.sort === 'price_desc'
        ? ['price', 'desc']
        : [filters.sort, 'desc'];

      const params = {
        page:  pg,
        limit: 20,
        sort:  sortField,
        order: sortOrder,
        ...(filters.type     && { type:     filters.type }),
        ...(filters.search   && { search:   filters.search }),
        ...(filters.minPrice && { minPrice: filters.minPrice }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
        ...(filters.isFree   && { isFree:   'true' }),
      };

      const productsCacheKey = getMarketplaceCacheKey(params);
      const wishlistCacheKey = user?._id ? getWishlistCacheKey(user._id) : '';
      const cachedMarketplace = isFirstPage
        ? apiCache.getStale(productsCacheKey, { staleTtl: MARKETPLACE_STALE_TTL })
        : null;
      const cachedWishlist = isFirstPage && wishlistCacheKey
        ? apiCache.getStale(wishlistCacheKey, { staleTtl: MARKETPLACE_STALE_TTL })
        : null;
      const productsCacheIsFresh = apiCache.isFresh(productsCacheKey, { ttl: MARKETPLACE_CACHE_TTL });
      const wishlistCacheIsFresh = wishlistCacheKey
        ? apiCache.isFresh(wishlistCacheKey, { ttl: MARKETPLACE_CACHE_TTL })
        : false;

      if (cachedMarketplace && isFirstPage) {
        const savedProductIds = cachedWishlist ? getWishlistProductIds(cachedWishlist) : new Set();
        const nextProducts = markProductsWithWishlist(cachedMarketplace.products, savedProductIds);

        setProducts(nextProducts);
        setTotal(cachedMarketplace.total);
        setPage(pg);
        setMarketplaceError(null);
        setLoading(false);
      }

      const [marketplaceResult, wishlistResult] = await Promise.allSettled([
        apiCache.fetch(productsCacheKey, async () => {
          const { data } = await api.get('/marketplace', {
            params,
            timeout: MARKETPLACE_REQUEST_TIMEOUT_MS,
          });

          return {
            products: Array.isArray(data.products) ? data.products : [],
            total: Number(data.total || 0),
          };
        }, {
          ttl: MARKETPLACE_CACHE_TTL,
          force: Boolean(cachedMarketplace && !productsCacheIsFresh),
        }),
        user
          ? apiCache.fetch(wishlistCacheKey, async () => {
              const { data } = await api.get('/marketplace/wishlist', { timeout: MARKETPLACE_REQUEST_TIMEOUT_MS });
              return data;
            }, {
              ttl: MARKETPLACE_CACHE_TTL,
              force: Boolean(cachedWishlist && !wishlistCacheIsFresh),
            })
          : Promise.resolve(null),
      ]);

      if (marketplaceResult.status === 'rejected') {
        if (cachedMarketplace) return;
        throw marketplaceResult.reason;
      }

      if (productsRequestRef.current !== requestId) return;

      const data = marketplaceResult.value;
      const savedProductIds = wishlistResult.status === 'fulfilled' && wishlistResult.value
        ? getWishlistProductIds(wishlistResult.value)
        : new Set();
      const nextProducts = markProductsWithWishlist(data.products, savedProductIds);

      setProducts(prev => isFirstPage ? nextProducts : [...prev, ...nextProducts]);
      setTotal(data.total);
      setPage(pg);
      setMarketplaceError(null);
    } catch (error) {
      if (productsRequestRef.current !== requestId) return;

      const type = getMarketplaceErrorType(error);
      setMarketplaceError({ type, message: error?.response?.data?.message || error?.message || '' });
      if (isFirstPage) {
        setProducts([]);
        setTotal(0);
        setPage(1);
      }
    } finally {
      if (productsRequestRef.current === requestId) {
        if (isFirstPage) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
        fetchingProductsRef.current = false;
      }
    }
  }, [filters, user]);

  useEffect(() => { fetchProducts(1, true); }, [fetchProducts]);

  useEffect(() => {
    const handleSavedItemsUpdated = (event) => {
      const { type, id, saved } = event.detail || {};
      if (type !== 'product' || !id) return;
      const productId = String(id);

      if (user?._id) {
        apiCache.clear(getWishlistCacheKey(user._id));
      }

      if (filters.type === SAVED_TYPE_FILTER && saved === false) {
        setTotal(current => Math.max(current - 1, 0));
      }

      setProducts(prev => {
        return prev
          .map(product => getProductId(product) === productId
            ? { ...product, isWishlisted: Boolean(saved), saved: Boolean(saved), wishlisted: Boolean(saved) }
            : product)
          .filter(product => filters.type !== SAVED_TYPE_FILTER || product.isWishlisted);
      });
    };

    window.addEventListener('lekhon:saved-items-updated', handleSavedItemsUpdated);
    return () => window.removeEventListener('lekhon:saved-items-updated', handleSavedItemsUpdated);
  }, [filters.type, user?._id]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filters.search) nextParams.set('q', filters.search);
    if (filters.type) nextParams.set('type', filters.type);
    setSearchParams(nextParams, { replace: true });
  }, [filters.search, filters.type, setSearchParams]);

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setSuggestionsOpen(false);
        setHighlightedSuggestion(-1);
      }
      if (sortBoxRef.current && !sortBoxRef.current.contains(event.target)) {
        setSortOpen(false);
      }
      if (marketProfileRef.current && !marketProfileRef.current.contains(event.target)) {
        setMarketProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, []);

  useEffect(() => {
    if (!addressStorageKey) {
      setSavedAddresses([]);
      return;
    }
    try {
      setSavedAddresses(readCheckoutAddresses(addressStorageKey));
    } catch {
      setSavedAddresses([]);
    }
  }, [addressStorageKey]);

  useEffect(() => {
    if (!user || !marketProfileOpen) return undefined;

    let active = true;
    setMarketNotificationsLoading(true);
    setMarketNotificationsError('');

    api.get('/social/notifications')
      .then(({ data }) => {
        if (!active) return;
        const next = (data.notifications || [])
          .filter(isMarketplaceNotification)
          .slice(0, 5);
        setMarketNotifications(next);
      })
      .catch(() => {
        if (active) setMarketNotificationsError('Unable to load marketplace notifications right now.');
      })
      .finally(() => {
        if (active) setMarketNotificationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, marketProfileOpen]);

  useEffect(() => {
    const query = searchInput.trim();
    setHighlightedSuggestion(-1);

    if (query.length < SEARCH_MIN_CHARS) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      if (!query) applySearchPreview('');
      return undefined;
    }

    const requestId = suggestionsRequestRef.current + 1;
    suggestionsRequestRef.current = requestId;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSuggestionsLoading(true);
      applySearchPreview(query);
      try {
        const { data } = await api.get('/marketplace/suggestions', {
          params: { q: query, limit: 8 },
          signal: controller.signal,
        });
        if (suggestionsRequestRef.current === requestId) {
          setSuggestions(data.suggestions || []);
          setSuggestionsOpen(true);
        }
      } catch (err) {
        if (!controller.signal.aborted && suggestionsRequestRef.current === requestId) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted && suggestionsRequestRef.current === requestId) {
          setSuggestionsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [applySearchPreview, searchInput]);

  // Cart count badge
  useEffect(() => {
    const refreshCartCount = () => {
      if (!user) {
        setCartCount(getGuestCartCount());
        return;
      }
      api.get('/marketplace/cart')
        .then(({ data }) => setCartCount(data.cart?.items?.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0) || 0))
        .catch(() => {});
    };
    refreshCartCount();
    window.addEventListener('cartUpdated', refreshCartCount);
    return () => window.removeEventListener('cartUpdated', refreshCartCount);
  }, [user, cartOpen]);

  useEffect(() => {
    if (!user) return;
    api.get('/marketplace/personalization')
      .then(({ data }) => {
        if (data.personalization) {
          updatePersonalization(prev => mergePersonalization(prev, data.personalization));
        }
      })
      .catch(() => {});
  }, [user, updatePersonalization]);

  useEffect(() => {
    if (!quickPreviewProduct) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [quickPreviewProduct]);

  const handleAddToCart = () => setCartCount(c => c + 1);

  const closeQuickPreview = useCallback(() => {
    setQuickPreviewProduct(null);
    setQuickPreviewBusy(false);
  }, []);

  const openQuickPreview = useCallback((product) => {
    if (!product) return;
    setQuickPreviewProduct(product);
  }, []);

  const addPreviewProductToCart = useCallback(async (product, { goToCheckout = false } = {}) => {
    if (!product || product.type === 'external') return false;
    setQuickPreviewBusy(true);
    try {
      if (user) {
        await api.post('/marketplace/cart/add', { productId: product._id, qty: 1 });
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        addGuestCartItem(product, 1);
      }
      handleAddToCart(product);
      if (goToCheckout) {
        closeQuickPreview();
        navigate('/checkout');
      }
      return true;
    } catch {
      return false;
    } finally {
      setQuickPreviewBusy(false);
    }
  }, [closeQuickPreview, navigate, user]);

  const handlePreviewBuyNow = useCallback(async (product) => {
    if (!product) return;
    if (product.type === 'external') {
      await api.post(`/marketplace/${product._id}/click`).catch(() => {});
      const safeExternalUrl = getSafeHttpUrl(product.external?.url);
      if (safeExternalUrl) {
        window.open(safeExternalUrl, '_blank', 'noopener,noreferrer');
      } else if (product.slug) {
        closeQuickPreview();
        navigate(`/marketplace/${product.slug}`);
      }
      return;
    }
    await addPreviewProductToCart(product, { goToCheckout: true });
  }, [addPreviewProductToCart, closeQuickPreview, navigate]);

  const openPreviewProductDetail = useCallback((product) => {
    if (!product?.slug) return;
    updatePersonalization(prev => addProductSignal(prev, product));
    closeQuickPreview();
    navigate(`/marketplace/${product.slug}`);
  }, [closeQuickPreview, navigate, updatePersonalization]);

  const blankAddress = () => ({
    name: user?.name || user?.fullName || '',
    phone: user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pin: '',
    country: 'India',
  });

  const persistAddresses = (addresses) => {
    const nextAddresses = writeCheckoutAddresses(addressStorageKey, addresses);
    setSavedAddresses(nextAddresses);
    return nextAddresses;
  };

  const startAddressAdd = () => {
    setEditingAddressId('');
    setAddressDraft(blankAddress());
    setAddressManagerOpen(true);
  };

  const startAddressEdit = (address) => {
    setEditingAddressId(address.id);
    setAddressDraft({
      name: address.name || '',
      phone: address.phone || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      pin: address.pin || '',
      country: address.country || 'India',
    });
    setAddressManagerOpen(true);
  };

  const saveAddressDraft = () => {
    const required = ['name', 'phone', 'addressLine1', 'city', 'state', 'pin', 'country'];
    const complete = required.every(key => String(addressDraft[key] || '').trim());
    if (!complete) return;

    const normalized = {
      id: editingAddressId || Date.now().toString(),
      label: `${addressDraft.name || 'Saved address'} - ${addressDraft.city || addressDraft.pin}`,
      ...addressDraft,
    };
    const next = editingAddressId
      ? savedAddresses.map(address => address.id === editingAddressId ? normalized : address)
      : [normalized, ...savedAddresses].slice(0, 5);

    persistAddresses(next);
    setEditingAddressId('');
    setAddressDraft(blankAddress());
  };

  const deleteAddress = (id) => {
    persistAddresses(savedAddresses.filter(address => address.id !== id));
    if (editingAddressId === id) {
      setEditingAddressId('');
      setAddressDraft(blankAddress());
    }
  };

  const commitSearch = useCallback((value) => {
    const query = String(value || '').trim();
    setSearchInput(query);
    setSuggestionsOpen(false);
    setSuggestions([]);
    setHighlightedSuggestion(-1);
    setFilters(prev => {
      return { ...prev, search: query };
    });
    if (query) updatePersonalization(prev => addRecentSearch(prev, query));
  }, [updatePersonalization]);

  const setFilter = (k, v) => {
    setFilters(prev => {
      return { ...prev, [k]: v };
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSuggestions([]);
    setSuggestionsOpen(false);
    setHighlightedSuggestion(-1);
    setFilters({
      search: '', type: '', minPrice: '', maxPrice: '', sort: 'createdAt', isFree: false,
    });
    setSearchParams({}, { replace: true });
  };

  const handleSuggestionSelect = (suggestion) => {
    if (!suggestion) return;
    commitSearch(suggestion.value || suggestion.label);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown' && visibleSuggestions.length > 0) {
      event.preventDefault();
      setHighlightedSuggestion(index => Math.min(index + 1, visibleSuggestions.length - 1));
      setSuggestionsOpen(true);
      return;
    }
    if (event.key === 'ArrowUp' && visibleSuggestions.length > 0) {
      event.preventDefault();
      setHighlightedSuggestion(index => Math.max(index - 1, 0));
      setSuggestionsOpen(true);
      return;
    }
    if (event.key === 'Escape') {
      setSuggestionsOpen(false);
      setHighlightedSuggestion(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = highlightedSuggestion >= 0 ? visibleSuggestions[highlightedSuggestion] : null;
      handleSuggestionSelect(selected || { value: searchInput });
    }
  };

  const handleProductView = useCallback((product) => {
    updatePersonalization(prev => addProductSignal(prev, product));
  }, [updatePersonalization]);

  const handleTypeRailWheel = (event) => {
    const rail = typeRailRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    rail.scrollLeft += event.deltaY;
  };

  const handleTypeRailMouseDown = (event) => {
    const rail = typeRailRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth) return;
    typeRailDragRef.current = {
      isDown: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: rail.scrollLeft,
    };
  };

  const stopTypeRailDrag = () => {
    const wasMoved = typeRailDragRef.current.moved;
    typeRailDragRef.current.isDown = false;
    if (wasMoved) {
      window.setTimeout(() => {
        typeRailDragRef.current.moved = false;
      }, 0);
    }
  };

  const handleTypeRailMouseMove = (event) => {
    const rail = typeRailRef.current;
    const drag = typeRailDragRef.current;
    if (!rail || !drag.isDown) return;

    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4) drag.moved = true;
    rail.scrollLeft = drag.scrollLeft - distance;
    if (drag.moved) event.preventDefault();
  };

  const handleTypeFilterClick = (event, value) => {
    if (typeRailDragRef.current.moved) {
      event.preventDefault();
      return;
    }
    setFilter('type', value);
  };

  const hasActiveFilters = filters.type || filters.minPrice || filters.maxPrice || filters.isFree;
  const selectedSortOption = SORT_OPTIONS.find(option => option.value === filters.sort) || SORT_OPTIONS[0];
  const selectedTypeOption = TYPES.find(type => type.value === filters.type);
  const emptyStateType = marketplaceError?.type || (filters.search && !filters.type ? 'search' : filters.type || 'overall');
  const hasMarketplaceState = !loading && (Boolean(marketplaceError) || products.length === 0);
  const hasMoreProducts = filters.type !== SAVED_TYPE_FILTER && products.length < total;
  const showPersonalizedSections = !hasMarketplaceState && !filters.search && filters.type !== SAVED_TYPE_FILTER;
  const addressDraftComplete = ['name', 'phone', 'addressLine1', 'city', 'state', 'pin', 'country']
    .every(key => String(addressDraft[key] || '').trim());

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || loadingMore || !hasMoreProducts || marketplaceError) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        fetchProducts(page + 1);
      }
    }, {
      root: null,
      rootMargin: '420px 0px 520px',
      threshold: 0.01,
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchProducts, hasMoreProducts, loading, loadingMore, marketplaceError, page]);

  return (
    <div className="lekhon-marketplace-page min-h-screen bg-[var(--bg-primary)]">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="lekhon-marketplace-header sticky top-0 z-20 border-b border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 md:flex-nowrap md:gap-3">
          <h1 className="order-1 mr-auto md:mr-0 text-lg font-bold text-[var(--text-primary)] shrink-0 flex items-center gap-2">
            <FaShoppingBag className="text-violet-500" /> Marketplace
          </h1>

          {/* Search */}
          <div ref={searchBoxRef} className="order-6 relative w-full md:order-3 md:min-w-[220px] md:flex-1">
            <FaSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchInput}
              onChange={e => {
                setSearchInput(e.target.value);
                setSuggestionsOpen(true);
              }}
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search products, sellers..."
              className="w-full pl-9 pr-10 py-2 rounded-xl text-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => commitSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-red-500"
                aria-label="Clear search"
              >
                <FaTimes size={12} />
              </button>
            )}

            {suggestionsOpen && (searchInput.trim().length >= SEARCH_MIN_CHARS || visibleSuggestions.length > 0) && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[90] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl shadow-black/15 ring-1 ring-black/5 dark:shadow-black/60 dark:ring-white/10">
                <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{searchInput.trim() ? 'Related searches' : 'Recent searches'}</span>
                  {suggestionsLoading && (
                    <span className="inline-flex items-center gap-1">
                      <FaSpinner className="animate-spin" size={10} /> Searching
                    </span>
                  )}
                </div>

                {visibleSuggestions.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto py-1">
                    {visibleSuggestions.map((suggestion, index) => {
                      const isProduct = suggestion.type === 'product';
                      const isHighlighted = index === highlightedSuggestion;
                      const safeSuggestionThumbnail = getSafeImageUrl(suggestion.thumbnail);
                      return (
                        <button
                          key={`${suggestion.type}-${suggestion.value || suggestion.label}-${index}`}
                          type="button"
                          onMouseDown={event => event.preventDefault()}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                            isHighlighted
                              ? 'bg-violet-50 dark:bg-violet-900/40'
                              : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]'
                          }`}
                        >
                          {isProduct ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] shrink-0">
                              {safeSuggestionThumbnail ? (
                                <img src={safeSuggestionThumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full grid place-items-center text-[var(--text-muted)]">
                                  <FaShoppingBag size={14} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] grid place-items-center text-violet-500 shrink-0">
                              {suggestion.type === 'recent' ? <FaClock size={14} /> : <FaTag size={14} />}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{suggestion.label}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {isProduct
                                ? suggestion.isFree ? 'Free product' : `Rs. ${Number(suggestion.price || 0).toLocaleString('en-IN')}`
                                : suggestion.type === 'category' ? `${suggestion.count || 0} product matches` : 'Search suggestion'}
                            </p>
                          </div>
                          <FaChevronRight size={11} className="text-[var(--text-muted)] shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-sm text-[var(--text-muted)]">
                    {suggestionsLoading ? 'Looking for close matches...' : 'Press Enter to search this term.'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sort */}
          <div ref={sortBoxRef} className="order-4 relative hidden w-40 md:block lg:w-44">
            <button
              type="button"
              onClick={() => setSortOpen(open => !open)}
              className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:hover:border-violet-700"
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
            >
              <span className="truncate">{selectedSortOption.label}</span>
              <FaChevronDown size={11} className={`text-[var(--text-muted)] transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>

            {sortOpen && (
              <div
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-[95] w-full overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-1 shadow-2xl shadow-black/15 ring-1 ring-black/5 dark:shadow-black/60 dark:ring-white/10"
                role="listbox"
              >
                {SORT_OPTIONS.map(option => {
                  const isSelected = filters.sort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setFilter('sort', option.value);
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-violet-600 text-white'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && <FaCheck size={11} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setFilterOpen(f => !f)}
            aria-label="Open marketplace filters"
            className={`order-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors md:order-5 ${hasActiveFilters ? 'bg-violet-600 border-violet-600 text-white' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}
          >
            <FaFilter size={13} className="shrink-0" />
          </button>

          {/* Cart */}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
            className="order-4 relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors md:order-6"
          >
            <FaShoppingCart size={15} className="shrink-0" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>

          {user && (
            <div ref={marketProfileRef} className="order-5 relative md:order-7">
              <button
                type="button"
                onClick={() => setMarketProfileOpen(open => !open)}
                aria-label="Open marketplace profile"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)]"
              >
                <FaUserCircle size={16} className="shrink-0" />
              </button>

              {marketProfileOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl shadow-black/15 ring-1 ring-black/5 dark:shadow-black/60 dark:ring-white/10">
                  <div className="border-b border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3">
                    <p className="text-sm font-bold text-[var(--text-primary)]">Marketplace Profile</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {user.isSeller ? 'Seller tools and buyer activity' : user.isVerified ? 'Buyer tools and seller application' : 'Buyer tools'}
                    </p>
                  </div>

                  <div className="max-h-[70vh] overflow-y-auto p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(true);
                        setMarketProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                    >
                      <FaShoppingCart className="text-violet-500" />
                      <span className="font-medium">Cart</span>
                      {cartCount > 0 && (
                        <span className="ml-auto rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {cartCount > 9 ? '9+' : cartCount}
                        </span>
                      )}
                    </button>

                    <Link
                      to="/my-orders"
                      onClick={() => setMarketProfileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                    >
                      <FaBoxOpen className="text-violet-500" />
                      <span className="font-medium">My Orders</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setAddressManagerOpen(open => !open)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                    >
                      <FaMapMarkerAlt className="text-violet-500" />
                      <span className="font-medium">Delivery Addresses</span>
                      <FaChevronDown size={11} className={`ml-auto text-[var(--text-muted)] transition-transform ${addressManagerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {addressManagerOpen && (
                      <div className="mx-2 my-2 rounded-2xl bg-[var(--bg-card)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[var(--text-primary)]">Saved addresses</p>
                          <button
                            type="button"
                            onClick={startAddressAdd}
                            className="rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white"
                          >
                            Add
                          </button>
                        </div>

                        {savedAddresses.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {savedAddresses.map(address => (
                              <div key={address.id} className="rounded-xl bg-[var(--bg-secondary)] p-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{address.label || address.name}</p>
                                    <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--text-muted)]">
                                      {address.addressLine1}, {address.city} - {address.pin}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button type="button" onClick={() => startAddressEdit(address)} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30">Edit</button>
                                    <button type="button" onClick={() => deleteAddress(address.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Delete address">
                                      <FaTrash size={10} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-[var(--text-muted)]">No saved delivery addresses yet.</p>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {[
                            ['name', 'Name'],
                            ['phone', 'Phone'],
                            ['addressLine1', 'Address line 1'],
                            ['addressLine2', 'Address line 2'],
                            ['city', 'City'],
                            ['state', 'State'],
                            ['pin', 'PIN'],
                            ['country', 'Country'],
                          ].map(([key, label]) => (
                            <input
                              key={key}
                              value={addressDraft[key]}
                              onChange={event => setAddressDraft(prev => ({ ...prev, [key]: event.target.value }))}
                              placeholder={label}
                              className={`min-w-0 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-violet-400 ${key.includes('addressLine') ? 'col-span-2' : ''}`}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={saveAddressDraft}
                          disabled={!addressDraftComplete}
                          className="mt-2 w-full rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {editingAddressId ? 'Save address changes' : 'Save address'}
                        </button>
                      </div>
                    )}

                    <div className="my-2 border-t border-[var(--border-color)]" />

                    {user.isSeller ? (
                      <>
                        <Link
                          to="/seller/dashboard"
                          onClick={() => setMarketProfileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                        >
                          <FaStore className="text-amber-500" />
                          <span className="font-medium">My Store</span>
                        </Link>
                        <Link
                          to="/seller/earnings"
                          onClick={() => setMarketProfileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                        >
                          <FaShoppingBag className="text-amber-500" />
                          <span className="font-medium">Seller earnings</span>
                        </Link>
                      </>
                    ) : user.isVerified ? (
                      <Link
                        to="/become-seller"
                        onClick={() => setMarketProfileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                      >
                        <FaStore className="text-amber-500" />
                        <span className="font-medium">Become a Seller</span>
                      </Link>
                    ) : (
                      <div className="mx-3 my-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                        Get verified by an admin to apply as a seller.
                      </div>
                    )}

                    <div className="mx-2 my-2 rounded-2xl bg-[var(--bg-card)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FaBell className="text-violet-500" />
                          <p className="text-xs font-bold text-[var(--text-primary)]">Marketplace notifications</p>
                        </div>
                        <Link
                          to="/notifications"
                          onClick={() => setMarketProfileOpen(false)}
                          className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200"
                        >
                          View all
                        </Link>
                      </div>

                      <div className="mt-2 space-y-2">
                        {marketNotificationsLoading ? (
                          <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-muted)]">
                            <FaSpinner className="animate-spin" />
                            Loading notifications
                          </div>
                        ) : marketNotificationsError ? (
                          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-300">
                            {marketNotificationsError}
                          </p>
                        ) : marketNotifications.length > 0 ? (
                          marketNotifications.map(notification => (
                            <Link
                              key={notification._id}
                              to="/notifications"
                              onClick={() => setMarketProfileOpen(false)}
                              className="flex gap-2 rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-left transition-colors hover:bg-violet-50 dark:hover:bg-violet-900/20"
                            >
                              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? 'bg-[var(--border-color)]' : 'bg-violet-500'}`} />
                              <span className="min-w-0">
                                <span className="line-clamp-2 text-xs font-medium text-[var(--text-primary)]">
                                  {notification.message}
                                </span>
                                <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </span>
                              </span>
                            </Link>
                          ))
                        ) : (
                          <p className="rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-muted)]">
                            No marketplace notifications yet.
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setMarketProfileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                    >
                      <FaUserCircle className="text-violet-500" />
                      <span className="font-medium">Account profile</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Type tabs ──────────────────────────────────────────────────────── */}
        <div
          ref={typeRailRef}
          onWheel={handleTypeRailWheel}
          onMouseDown={handleTypeRailMouseDown}
          onMouseMove={handleTypeRailMouseMove}
          onMouseUp={stopTypeRailDrag}
          onMouseLeave={stopTypeRailDrag}
          className="max-w-7xl mx-auto flex cursor-grab select-none gap-2 overflow-x-auto overscroll-x-contain px-3 pb-3 pr-8 scrollbar-hide touch-pan-x active:cursor-grabbing sm:px-4 sm:pr-4"
        >
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={(event) => handleTypeFilterClick(event, t.value)}
              className={`inline-flex shrink-0 items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-semibold leading-none transition-colors sm:px-4
                ${filters.type === t.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-violet-100 dark:hover:bg-violet-900/30'}`}
            >
              <span className="inline-flex items-center justify-center gap-1.5 leading-none">
                {t.icon && <t.icon size={11} className="shrink-0" />}
                {t.label}
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* ── Filter drawer ─────────────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="max-w-7xl mx-auto border-b border-[var(--border-color)] bg-[var(--bg-card)]/98 px-3 py-2 shadow-sm shadow-black/5 dark:shadow-black/20 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full md:hidden">
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Sort by</label>
              <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
                {SORT_OPTIONS.map(option => {
                  const isSelected = filters.sort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilter('sort', option.value)}
                      className={`min-h-8 rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                        isSelected
                          ? 'border-violet-600 bg-violet-600 text-white'
                          : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-violet-300 dark:hover:border-violet-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 transition-colors focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20">
              <span className="whitespace-nowrap text-[11px] font-medium text-[var(--text-muted)]">Min</span>
              <input
                type="number" min="0"
                value={filters.minPrice}
                onChange={e => setFilter('minPrice', e.target.value)}
                placeholder="0"
                aria-label="Min Price Rs."
                className="h-full w-14 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 transition-colors focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20">
              <span className="whitespace-nowrap text-[11px] font-medium text-[var(--text-muted)]">Max</span>
              <input
                type="number" min="0"
                value={filters.maxPrice}
                onChange={e => setFilter('maxPrice', e.target.value)}
                placeholder="Any"
                aria-label="Max Price Rs."
                className="h-full w-16 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-violet-300 dark:hover:border-violet-700">
              <input type="checkbox" checked={filters.isFree} onChange={e => setFilter('isFree', e.target.checked)} className="rounded accent-violet-600" />
              Free only
            </label>
            {hasActiveFilters && (
              <button onClick={handleClearFilters} className="inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
                <FaTimes size={10} /> Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Marketplace loading state */}
      {/* ── Product grid ──────────────────────────────────────────────────────── */}
      <div className="lekhon-marketplace-content max-w-7xl mx-auto px-4 py-6">
        {loading && <MarketplaceLoading compact={products.length > 0} />}

        {personalization.recommendedProducts.length > 0 && showPersonalizedSections && (
          <section className="mb-8">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">For you</h2>
            </div>
            <div className="lekhon-market-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {personalization.recommendedProducts.slice(0, 5).map(product => (
                <ProductCard
                  key={`recommended-${product._id || product.id}`}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onProductView={handleProductView}
                  onLongPreview={openQuickPreview}
                />
              ))}
            </div>
          </section>
        )}

        {personalization.recentProducts.length > 0 && showPersonalizedSections && (
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Recently viewed</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {personalization.recentProducts
                .filter(item => item.slug && item.title)
                .slice(0, 8)
                .map(item => {
                  const safeThumbnail = getSafeImageUrl(item.thumbnail);
                  return (
                    <Link
                      key={item.id}
                      to={`/marketplace/${item.slug}`}
                      className="shrink-0 w-56 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg transition-all overflow-hidden"
                    >
                      <div className="h-24 bg-[var(--bg-secondary)]">
                        {safeThumbnail ? (
                          <img src={safeThumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-[var(--text-muted)]">
                            <FaShoppingBag size={18} />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2 min-h-[2rem]">{item.title}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {item.isFree ? 'Free' : `Rs. ${Number(item.price || 0).toLocaleString('en-IN')}`}
                          </span>
                          {item.type && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] capitalize">
                              {item.type}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </section>
        )}

        {hasMarketplaceState ? (
          <MarketplaceState
            type={emptyStateType}
            query={filters.search}
            activeTypeLabel={selectedTypeOption?.label || ''}
            hasFilters={Boolean(hasActiveFilters)}
            onClearFilters={handleClearFilters}
            onRetry={() => fetchProducts(1, true)}
          />
        ) : (
          <>
            {total > 0 && (
              <p className="text-xs text-[var(--text-muted)] mb-4">
                {total.toLocaleString()} product{total !== 1 ? 's' : ''} found
              </p>
            )}
            <div className="lekhon-market-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map(p => (
                <ProductCard
                  key={p._id}
                  product={p}
                  onAddToCart={handleAddToCart}
                  onProductView={handleProductView}
                  onLongPreview={openQuickPreview}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMoreProducts && (
              <div ref={loadMoreRef} className="text-center mt-8 min-h-16">
                <button
                  onClick={() => fetchProducts(page + 1)}
                  disabled={loading || loadingMore}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl border border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
                >
                  {loadingMore && <FaSpinner className="animate-spin" size={12} />}
                  {loadingMore ? 'Loading more...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      {quickPreviewProduct && (
        <ProductQuickPreview
          product={quickPreviewProduct}
          busy={quickPreviewBusy}
          onClose={closeQuickPreview}
          onAddToCart={addPreviewProductToCart}
          onBuyNow={handlePreviewBuyNow}
          onOpenDetail={openPreviewProductDetail}
        />
      )}
    </div>
  );
};

export default Marketplace;
