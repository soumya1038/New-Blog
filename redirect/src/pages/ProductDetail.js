import React, { useState, useEffect, useLayoutEffect, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import StarRating from '../components/StarRating';
import SellerBadge from '../components/SellerBadge';
import CartDrawer from '../components/CartDrawer';
import { addGuestCartItem } from '../utils/guestCart';
import { readSessionValue, writeSessionValue } from '../utils/sessionBackedStorage';
import { getSafeHttpUrl, getSafeImageUrl } from '../utils/safeMediaUrls';
import { MdVerified } from 'react-icons/md';
import {
  FaArrowRight,
  FaBolt,
  FaBox,
  FaBoxOpen,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaClipboardList,
  FaDownload,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaFlag,
  FaGlobeAsia,
  FaHeart,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaQuestionCircle,
  FaRegHeart,
  FaRegImages,
  FaShareAlt,
  FaShieldAlt,
  FaShoppingBag,
  FaShoppingCart,
  FaExpand,
  FaSpinner,
  FaStore,
  FaTag,
  FaTimes,
  FaTruck,
  FaUserCircle,
  FaWhatsapp,
  FaSearchMinus,
  FaSearchPlus,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const DELIVERY_PINCODE_KEY = 'lekhon-delivery-pincode';
const VIEWER_ZOOM_CENTER = { x: 50, y: 50 };

const formatPrice = (value = 0) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const getArray = (value) => (Array.isArray(value) ? value : []);
const getWishlistItems = (data = {}) => getArray(data.products || data.items || data.wishlist);
const getWishlistProduct = (item = {}) => item.product || item.productId || item;
const getWishlistProductId = (item = {}) => String(getWishlistProduct(item)?._id || getWishlistProduct(item)?.id || '');
const toSafeDescriptionText = (value = '') => String(value || '')
  .replace(/<\s*br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .trim();

const scrollProductPageToTop = () => {
  if (typeof window === 'undefined') return;

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  const scroller = document.scrollingElement || document.documentElement;
  if (scroller) scroller.scrollTop = 0;
  document.body.scrollTop = 0;
};

const ProductDetailLoading = () => (
  <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-6">
    <div className="marketplace-detail-skeleton mx-auto max-w-6xl" role="status" aria-live="polite" aria-label="Loading product details">
      <div className="marketplace-detail-skeleton__gallery">
        <span className="marketplace-skeleton-line marketplace-detail-skeleton__image" />
        <div className="marketplace-detail-skeleton__thumbs">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className="marketplace-skeleton-line" />
          ))}
        </div>
      </div>
      <div className="marketplace-detail-skeleton__info">
        <span className="marketplace-skeleton-line marketplace-detail-skeleton__pill" />
        <span className="marketplace-skeleton-line marketplace-detail-skeleton__title" />
        <span className="marketplace-skeleton-line marketplace-detail-skeleton__title marketplace-detail-skeleton__title--short" />
        <div className="marketplace-detail-skeleton__price-row">
          <span className="marketplace-skeleton-line" />
          <span className="marketplace-skeleton-line" />
        </div>
        <div className="marketplace-detail-skeleton__actions">
          <span className="marketplace-skeleton-line" />
          <span className="marketplace-skeleton-line" />
        </div>
        <div className="marketplace-detail-skeleton__seller">
          <span className="marketplace-skeleton-line" />
          <span className="marketplace-skeleton-line" />
        </div>
      </div>
      <div className="marketplace-detail-skeleton__tabs">
        {[0, 1, 2, 3, 4].map((item) => (
          <span key={item} className="marketplace-skeleton-line" />
        ))}
      </div>
    </div>
  </div>
);

const getStoredPincode = () => {
  return readSessionValue(DELIVERY_PINCODE_KEY);
};

const saveStoredPincode = (pincode) => {
  writeSessionValue(DELIVERY_PINCODE_KEY, pincode);
};

const normalizeDistribution = (ratingSummary, reviews) => {
  const fallback = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (ratingSummary?.distribution) {
    return { ...fallback, ...ratingSummary.distribution };
  }
  reviews.forEach((review) => {
    const rating = Math.round(Number(review.rating) || 0);
    if (rating >= 1 && rating <= 5) fallback[rating] += 1;
  });
  return fallback;
};

const reviewLocation = (review) => review.country || review.buyerId?.country || '';
const isInternationalReview = (review) => {
  const country = reviewLocation(review).trim().toLowerCase();
  return country && country !== 'india' && country !== 'in';
};
const reviewRatingValue = (review) => Math.round(Number(review.rating) || 0);
const sortReviewsByRating = (items, rating) => {
  if (!rating) return items;
  return [...items].sort((first, second) => {
    const firstMatches = reviewRatingValue(first) === rating;
    const secondMatches = reviewRatingValue(second) === rating;
    if (firstMatches !== secondMatches) return firstMatches ? -1 : 1;
    return new Date(second.createdAt || 0) - new Date(first.createdAt || 0);
  });
};

const ProductDetail = () => {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [imageZoom, setImageZoom] = useState({ active: false, x: 50, y: 50, lensX: 0, lensY: 0 });
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerZoomed, setImageViewerZoomed] = useState(false);
  const [imageViewerZoomFocus, setImageViewerZoomFocus] = useState(VIEWER_ZOOM_CENTER);
  const [cartAdding, setCartAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState('description');
  const [activeReviewRating, setActiveReviewRating] = useState(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryPincode, setDeliveryPincode] = useState(getStoredPincode);
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const mainImageRef = useRef(null);
  const infoTabRailRef = useRef(null);
  const infoTabDragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  useLayoutEffect(() => {
    scrollProductPageToTop();
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    setActiveFaq(null);
    setActiveInfoTab('description');
    setActiveReviewRating(null);
    setImageZoom({ active: false, x: 50, y: 50, lensX: 0, lensY: 0 });
    setImageViewerOpen(false);
    setImageViewerZoomed(false);
    setImageViewerZoomFocus(VIEWER_ZOOM_CENTER);
    setDeliveryOpen(false);
    setDeliveryEstimate(null);
    setDeliveryError('');

    api.get(`/marketplace/${slug}`)
      .then(({ data }) => {
        setProduct(data.product);
        setReviews(data.reviews || []);
        setRatingSummary(data.ratingSummary || null);
        setRelated(data.related || []);
      })
      .catch(() => navigate('/marketplace'))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  useEffect(() => {
    if (!user || !product?._id) return;
    api.post('/marketplace/personalization/view', { productId: product._id }).catch(() => {});
  }, [user, product?._id]);

  useEffect(() => {
    if (!user || !product?._id) {
      setWishlisted(false);
      return undefined;
    }

    let cancelled = false;
    api.get('/marketplace/wishlist')
      .then(({ data }) => {
        if (cancelled) return;
        const savedIds = getWishlistItems(data).map(getWishlistProductId);
        setWishlisted(savedIds.includes(String(product._id)));
      })
      .catch(() => {
        if (!cancelled) setWishlisted(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product?._id, user]);

  const computedRatingSummary = useMemo(() => {
    const distribution = normalizeDistribution(ratingSummary, reviews);
    const total = Number(ratingSummary?.total ?? product?.reviewCount ?? reviews.length) || 0;
    const average = Number(ratingSummary?.average ?? product?.averageRating ?? 0) || 0;
    return { average, total, distribution };
  }, [product?.averageRating, product?.reviewCount, ratingSummary, reviews]);

  const reviewImages = useMemo(
    () => reviews.flatMap((review) => review.images || []).map(getSafeImageUrl).filter(Boolean).slice(0, 10),
    [reviews]
  );

  const topReviews = useMemo(
    () => sortReviewsByRating(reviews.filter((review) => !isInternationalReview(review)), activeReviewRating),
    [activeReviewRating, reviews]
  );

  const internationalReviews = useMemo(
    () => sortReviewsByRating(reviews.filter(isInternationalReview), activeReviewRating),
    [activeReviewRating, reviews]
  );

  const productThemes = useMemo(
    () => [...new Set([...(product?.tags || []), ...(product?.category || [])].filter(Boolean))].slice(0, 8),
    [product?.category, product?.tags]
  );

  const productImages = useMemo(() => {
    const gallery = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
    const sources = gallery.length ? gallery : [product?.thumbnail];
    return [...new Set(sources.map(getSafeImageUrl).filter(Boolean))];
  }, [product?.images, product?.thumbnail]);

  const activeImage = productImages[activeImg] || productImages[0] || '';

  useEffect(() => {
    if (activeImg <= productImages.length - 1) return;
    setActiveImg(0);
  }, [activeImg, productImages.length]);

  useEffect(() => {
    if (!imageViewerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setImageViewerOpen(false);
        setImageViewerZoomFocus(VIEWER_ZOOM_CENTER);
      }
      if (event.key === '+' || event.key === '=') setImageViewerZoomed(true);
      if (event.key === '-') {
        setImageViewerZoomed(false);
        setImageViewerZoomFocus(VIEWER_ZOOM_CENTER);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageViewerOpen]);

  if (loading) return <ProductDetailLoading />;
  if (!product) return null;

  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const seller = product.sellerId;
  const sellerAverageRating = Number(seller?.storeRating?.averageRating || 0);
  const safeSellerProfileImage = getSafeImageUrl(seller?.profileImage);
  const isValidPincode = PINCODE_REGEX.test(deliveryPincode.trim());
  const baseDeliveryEstimate = {
    estimatedDeliveryDays: product.physical?.estimatedDeliveryDays || 7,
    shippingFee: product.physical?.shippingFee || 0,
    isFreeShipping: !product.physical?.shippingFee,
    deliverable: Number(product.physical?.stock || 0) > 0,
  };
  const shownDeliveryEstimate = deliveryEstimate || baseDeliveryEstimate;
  const shippingText = shownDeliveryEstimate.shippingFee > 0
    ? formatPrice(shownDeliveryEstimate.shippingFee)
    : 'Free';

  const updateImageZoom = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    const lensSize = 132;
    const lensX = Math.min(rect.width - lensSize, Math.max(0, event.clientX - rect.left - lensSize / 2));
    const lensY = Math.min(rect.height - lensSize, Math.max(0, event.clientY - rect.top - lensSize / 2));

    setImageZoom({ active: true, x, y, lensX, lensY });
  };

  const getViewerZoomFocus = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return VIEWER_ZOOM_CENTER;

    return {
      x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const updateViewerZoomFocus = (event) => {
    if (!imageViewerZoomed) return;
    setImageViewerZoomFocus(getViewerZoomFocus(event));
  };

  const toggleImageViewerZoom = (event) => {
    if (imageViewerZoomed) {
      setImageViewerZoomed(false);
      setImageViewerZoomFocus(VIEWER_ZOOM_CENTER);
      return;
    }

    setImageViewerZoomFocus(getViewerZoomFocus(event));
    setImageViewerZoomed(true);
  };

  const toggleImageViewerZoomFromControl = () => {
    if (imageViewerZoomed) setImageViewerZoomFocus(VIEWER_ZOOM_CENTER);
    setImageViewerZoomed(zoomed => !zoomed);
  };

  const openImageViewer = (index = activeImg) => {
    setActiveImg(index);
    setImageZoom({ active: false, x: 50, y: 50, lensX: 0, lensY: 0 });
    setImageViewerZoomed(false);
    setImageViewerZoomFocus(VIEWER_ZOOM_CENTER);
    setImageViewerOpen(true);
  };

  const selectViewerImage = (index) => {
    setActiveImg(index);
    setImageViewerZoomed(false);
    setImageViewerZoomFocus(VIEWER_ZOOM_CENTER);
  };

  const addToCart = async () => {
    setCartAdding(true);
    try {
      if (user) {
        await api.post('/marketplace/cart/add', { productId: product._id, qty: 1 });
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        addGuestCartItem(product, 1);
      }
      setCartOpen(true);
    } catch {}
    setCartAdding(false);
  };

  const toggleWishlist = async () => {
    if (!user) return navigate('/login');
    try {
      const { data } = await api.post(`/marketplace/wishlist/${product._id}`);
      setWishlisted(data.added);
      window.dispatchEvent(new CustomEvent('lekhon:saved-items-updated', {
        detail: { type: 'product', id: product._id, saved: data.added },
      }));
    } catch {}
  };

  const handleExternalClick = async () => {
    await api.post(`/marketplace/${product._id}/click`).catch(() => {});
    const safeExternalUrl = getSafeHttpUrl(product.external?.url);
    if (safeExternalUrl) window.open(safeExternalUrl, '_blank', 'noopener,noreferrer');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkDeliveryEstimate = async (event) => {
    event?.preventDefault();
    const pincode = deliveryPincode.trim();
    if (!PINCODE_REGEX.test(pincode)) {
      setDeliveryError('Enter a valid 6 digit Indian pincode.');
      return;
    }

    setDeliveryLoading(true);
    setDeliveryError('');
    try {
      const { data } = await api.get(`/marketplace/${product._id}/delivery-estimate`, {
        params: { pincode },
      });
      setDeliveryEstimate(data.estimate);
      saveStoredPincode(pincode);
    } catch (error) {
      setDeliveryError(error.response?.data?.message || 'Delivery estimate is unavailable right now.');
    }
    setDeliveryLoading(false);
  };

  const tabs = [
    { id: 'description', label: 'Description', icon: FaInfoCircle },
    { id: 'specifications', label: 'Specifications', icon: FaClipboardList },
    { id: 'warranty', label: 'Warranty', icon: FaShieldAlt },
    { id: 'origin', label: 'Country of Origin', icon: FaGlobeAsia },
    { id: 'reviews', label: 'Rating & Reviews', icon: FaRegImages },
    { id: 'qa', label: 'Questions & Answers', icon: FaQuestionCircle },
    { id: 'returns', label: 'Return Policy', icon: FaBoxOpen },
  ];

  const handleInfoTabWheel = (event) => {
    const rail = infoTabRailRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    rail.scrollLeft += event.deltaY;
  };

  const handleInfoTabMouseDown = (event) => {
    const rail = infoTabRailRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth) return;
    infoTabDragRef.current = {
      isDown: true,
      startX: event.clientX,
      scrollLeft: rail.scrollLeft,
      moved: false,
    };
  };

  const stopInfoTabDrag = () => {
    const wasMoved = infoTabDragRef.current.moved;
    infoTabDragRef.current.isDown = false;
    if (wasMoved) {
      window.setTimeout(() => {
        infoTabDragRef.current.moved = false;
      }, 0);
    }
  };

  const handleInfoTabMouseMove = (event) => {
    const rail = infoTabRailRef.current;
    const drag = infoTabDragRef.current;
    if (!rail || !drag.isDown) return;

    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4) drag.moved = true;
    rail.scrollLeft = drag.scrollLeft - distance;
    if (drag.moved) event.preventDefault();
  };

  const handleInfoTabClick = (event, tabId) => {
    if (infoTabDragRef.current.moved) {
      event.preventDefault();
      return;
    }
    setActiveInfoTab(tabId);
  };

  const renderDescription = () => (
    <div className="prose prose-sm max-w-none text-[var(--text-secondary)] dark:prose-invert">
      {toSafeDescriptionText(product.description) ? (
        <p className="whitespace-pre-line">{toSafeDescriptionText(product.description)}</p>
      ) : (
        <p>No product description has been added yet.</p>
      )}
    </div>
  );

  const renderSpecifications = () => {
    const specs = product.specifications || [];
    return (
      <div className="space-y-4">
        {specs.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-[var(--border-color)]">
            {specs.map((item, index) => (
              <div key={`${item.key}-${index}`} className="grid sm:grid-cols-[220px_1fr] border-b border-[var(--border-color)] last:border-b-0">
                <div className="bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
                  {item.key || 'Specification'}
                </div>
                <div className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {item.value || '-'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No specifications have been added yet.</p>
        )}

        {product.type === 'physical' && (
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
              <p className="text-xs text-[var(--text-muted)]">SKU</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{product.physical?.sku || '-'}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
              <p className="text-xs text-[var(--text-muted)]">Weight</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{product.physical?.weight ? `${product.physical.weight} g` : '-'}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
              <p className="text-xs text-[var(--text-muted)]">Minimum order</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{product.physical?.minimumOrderQuantity || 1}</p>
            </div>
          </div>
        )}

        {product.type === 'service' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {product.service?.includes?.length > 0 && (
              <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900">
                <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2 text-sm">Included</h3>
                <ul className="space-y-1">
                  {product.service.includes.map((item, index) => (
                    <li key={index} className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                      <FaCheckCircle size={11} className="text-green-500 shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {product.service?.excludes?.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900">
                <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2 text-sm">Not included</h3>
                <ul className="space-y-1">
                  {product.service.excludes.map((item, index) => (
                    <li key={index} className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                      <FaExclamationCircle size={11} className="text-red-400 shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderReviews = () => {
    const total = computedRatingSummary.total || reviews.length;
    const average = computedRatingSummary.average || 0;
    const activeRatingCount = activeReviewRating
      ? Number(computedRatingSummary.distribution[activeReviewRating] || 0)
      : 0;
    return (
      <div className="space-y-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Customer reviews</h3>
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={average} size={18} />
              <span className="font-semibold text-[var(--text-primary)]">{average.toFixed(1)} out of 5</span>
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{total.toLocaleString('en-IN')} customer ratings</p>
            <div className="mt-4 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = Number(computedRatingSummary.distribution[star] || 0);
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                const isSelected = activeReviewRating === star;
                return (
                  <button
                    key={star}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setActiveReviewRating(isSelected ? null : star)}
                    className={`grid w-full grid-cols-[42px_1fr_42px] items-center gap-2 rounded-lg px-1 py-1 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                    title={`Show ${star} star reviews first`}
                  >
                    <span className={isSelected ? 'font-semibold' : 'text-blue-600 dark:text-blue-300'}>{star} star</span>
                    <div className="h-5 overflow-hidden rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                      <div className="h-full bg-amber-500" style={{ width: `${percent}%` }} />
                    </div>
                    <span className={isSelected ? 'text-right font-semibold' : 'text-right text-blue-600 dark:text-blue-300'}>{percent}%</span>
                  </button>
                );
              })}
            </div>
            {activeReviewRating && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100">
                <span>
                  {activeRatingCount > 0
                    ? `Showing ${activeReviewRating}-star reviews first`
                    : `No ${activeReviewRating}-star reviews yet`}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveReviewRating(null)}
                  className="font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-200 dark:hover:text-white"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Customers say</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Review highlights and buyer themes will become more accurate as more customers review this product.
              </p>
              {productThemes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {productThemes.map((theme) => (
                    <span key={theme} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                      <FaTag size={10} className="text-green-600 dark:text-green-400" />
                      {theme}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {reviewImages.length > 0 && (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Reviews with images</h3>
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-300">See all photos</span>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {reviewImages.map((image, index) => (
                    <img
                      key={`${image}-${index}`}
                      src={image}
                      alt=""
                      className="h-24 w-24 shrink-0 rounded-xl border border-[var(--border-color)] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <ReviewList title="Top reviews" reviews={topReviews} emptyText="No reviews yet. Buyers can review this product after purchase." />
        {internationalReviews.length > 0 && (
          <ReviewList title="Top reviews from other countries" reviews={internationalReviews} />
        )}
      </div>
    );
  };

  const renderInfoContent = () => {
    if (activeInfoTab === 'description') return renderDescription();
    if (activeInfoTab === 'specifications') return renderSpecifications();
    if (activeInfoTab === 'warranty') {
      return product.warranty
        ? <p className="text-sm leading-6 text-[var(--text-secondary)]">{product.warranty}</p>
        : <p className="text-sm text-[var(--text-muted)]">Warranty information has not been added yet.</p>;
    }
    if (activeInfoTab === 'origin') {
      return (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Country of origin:</span> {product.countryOfOrigin || 'Not specified'}
        </div>
      );
    }
    if (activeInfoTab === 'reviews') return renderReviews();
    if (activeInfoTab === 'qa') {
      const faqs = product.decoration?.faqs || [];
      return faqs.length > 0 ? (
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-[var(--border-color)]">
              <button
                className="w-full flex justify-between items-center px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
              >
                {faq.question}
                {activeFaq === index ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
              </button>
              {activeFaq === index && (
                <div className="px-4 pb-3 text-sm text-[var(--text-secondary)]">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Buyer questions and seller answers will appear here.</p>
      );
    }
    return (
      <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
        <p>Return requests can be managed from the order details page when the order and product are eligible.</p>
        <p>The seller and platform support team can review return details, item condition, and delivery status before approval.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <nav className="text-xs text-[var(--text-muted)] mb-5 flex items-center gap-1.5">
          <Link to="/marketplace" className="hover:text-violet-500">Marketplace</Link>
          <span>/</span>
          {product.category?.[0] && <><span>{product.category[0]}</span><span>/</span></>}
          <span className="text-[var(--text-secondary)] truncate max-w-[200px]">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 mb-8 sm:mb-10">
          <div className="space-y-3">
            <div className="relative lg:overflow-visible">
              <button
                ref={mainImageRef}
                type="button"
                onMouseMove={activeImage ? updateImageZoom : undefined}
                onMouseEnter={activeImage ? updateImageZoom : undefined}
                onMouseLeave={() => setImageZoom(z => ({ ...z, active: false }))}
                onClick={() => activeImage && openImageViewer(activeImg)}
                className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-left sm:aspect-square"
                aria-label="Open product image fullscreen"
              >
                {activeImage ? (
                  <>
                    <img src={activeImage} alt={product.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    <span className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-black/45 text-white opacity-90 shadow-lg transition-transform group-hover:scale-105">
                      <FaExpand size={14} />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/60 to-transparent px-4 py-3 text-center text-xs font-semibold text-white sm:block">
                      Click to see full view
                    </span>
                    {imageZoom.active && (
                      <span
                        className="pointer-events-none absolute hidden h-[132px] w-[132px] rounded-xl border border-white/70 bg-violet-500/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.05)] lg:block"
                        style={{ left: imageZoom.lensX, top: imageZoom.lensY }}
                      />
                    )}
                  </>
                ) : (
                  <div className="grid h-full w-full place-items-center text-[var(--text-muted)]">
                    <FaShoppingBag size={56} />
                  </div>
                )}
              </button>

              {activeImage && imageZoom.active && (
                <div className="pointer-events-none absolute left-[calc(100%+1rem)] top-0 z-40 hidden h-full w-[min(48vw,640px)] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl lg:block">
                  <div
                    className="h-full w-full bg-no-repeat"
                    style={{
                      backgroundImage: `url("${activeImage}")`,
                      backgroundSize: '230%',
                      backgroundPosition: `${imageZoom.x}% ${imageZoom.y}%`,
                    }}
                  />
                </div>
              )}
            </div>
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {productImages.map((img, index) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => {
                      setActiveImg(index);
                      setImageZoom(z => ({ ...z, active: false }));
                    }}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${activeImg === index ? 'border-violet-500' : 'border-[var(--border-color)]'}`}
                    aria-label={`View product image ${index + 1}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {product.decoration?.badges?.map((badge) => (
                <span key={badge} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{badge}</span>
              ))}
              {product.type === 'digital' && <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><FaDownload size={10} />Digital Download</span>}
              {product.type === 'service' && <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"><FaStore size={10} />Service</span>}
            </div>

            {product.decoration?.promoBanner && (
              <div className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm font-medium">
                {product.decoration.promoBanner}
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-snug">{product.title}</h1>

            {product.reviewCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveInfoTab('reviews')}
                className="w-fit"
              >
                <StarRating value={product.averageRating} count={product.reviewCount} size={14} />
              </button>
            )}

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {product.isFree ? (
                <span className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">Free</span>
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{formatPrice(product.price)}</span>
                  {product.compareAtPrice > product.price && (
                    <>
                      <span className="text-lg text-[var(--text-muted)] line-through">{formatPrice(product.compareAtPrice)}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">{discount}% off</span>
                    </>
                  )}
                </>
              )}
            </div>

            {product.type === 'digital' && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Format', value: product.digital?.fileFormat?.toUpperCase() || '-' },
                  { label: 'Downloads', value: `Up to ${product.digital?.maxDownloads || 5}` },
                  { label: 'Delivery', value: 'Instant' },
                ].map((item) => (
                  <div key={item.label} className="py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <p className="text-[10px] text-[var(--text-muted)]">{item.label}</p>
                    <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {product.type === 'service' && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Delivery', value: `${product.service?.deliveryDays || 3} days` },
                  { label: 'Revisions', value: product.service?.revisions || 1 },
                  { label: 'Response', value: 'Within 24h' },
                ].map((item) => (
                  <div key={item.label} className="py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <p className="text-[10px] text-[var(--text-muted)]">{item.label}</p>
                    <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {product.type === 'physical' && (
              <div className="rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)] p-3.5 sm:p-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[var(--text-secondary)]">
                  <p className="inline-flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-500/10 text-amber-500">
                      <FaBox size={13} />
                    </span>
                    <span>Estimated delivery: <strong className="text-[var(--text-primary)]">{shownDeliveryEstimate.estimatedDeliveryDays} days</strong></span>
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                      <FaTruck size={13} />
                    </span>
                    <span>Shipping: <strong className="text-[var(--text-primary)]">{shippingText}</strong></span>
                  </p>
                  {deliveryEstimate?.pincode && (
                    <p className="inline-flex items-center gap-2 text-[var(--text-muted)]">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500/10 text-violet-500">
                        <FaMapMarkerAlt size={12} />
                      </span>
                      <span>Deliver to pincode {deliveryEstimate.pincode}</span>
                    </p>
                  )}
                  {product.physical?.stock < 10 && product.physical?.stock > 0 && (
                    <p className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <FaExclamationCircle className="shrink-0" />
                      <span>Only {product.physical.stock} left in stock.</span>
                    </p>
                  )}
                </div>

                <div className="mt-3 border-t border-[var(--border-color)]/70 pt-3">
                  {!deliveryOpen ? (
                    <button
                      type="button"
                      onClick={() => setDeliveryOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full px-0 py-1 text-sm font-semibold text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200"
                    >
                      <FaMapMarkerAlt size={12} />
                      <span>Check delivery time and fees</span>
                    </button>
                  ) : (
                    <form onSubmit={checkDeliveryEstimate} className="space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:w-36">
                          <FaMapMarkerAlt className="text-violet-500" />
                          Deliver to
                        </label>
                        <div className="relative flex-1">
                          <input
                            value={deliveryPincode}
                            onChange={(event) => {
                              setDeliveryPincode(event.target.value.replace(/\D/g, '').slice(0, 6));
                              setDeliveryError('');
                            }}
                            placeholder="Enter pin code"
                            inputMode="numeric"
                            className="w-full rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2.5 pr-11 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                          {isValidPincode && (
                            <button
                              type="submit"
                              disabled={deliveryLoading}
                              className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
                              aria-label="Check delivery"
                            >
                              {deliveryLoading ? <FaSpinner className="animate-spin" size={12} /> : <FaArrowRight size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                      {deliveryPincode && !isValidPincode && (
                        <p className="text-xs text-red-500 sm:pl-36">Enter a valid 6 digit Indian pincode.</p>
                      )}
                      {deliveryError && <p className="text-xs text-red-500 sm:pl-36">{deliveryError}</p>}
                    </form>
                  )}
                </div>
              </div>
            )}

            {product.type === 'external' ? (
              <button
                onClick={handleExternalClick}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
              >
                <FaExternalLinkAlt size={13} />
                Buy on {product.external?.platform || 'External Store'}
              </button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={addToCart}
                  disabled={cartAdding}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-violet-500 text-violet-600 dark:text-violet-400 font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-60"
                >
                  <FaShoppingCart size={14} />
                  {cartAdding ? 'Adding...' : 'Add to Cart'}
                </button>
                <button
                  onClick={async () => { await addToCart(); navigate('/checkout'); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
                >
                  <FaBolt size={12} />
                  Buy Now
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={toggleWishlist} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-red-500 hover:border-red-300 transition-colors">
                {wishlisted ? <FaHeart size={12} className="text-red-500" /> : <FaRegHeart size={12} />}
                {wishlisted ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-violet-500 hover:border-violet-300 transition-colors"
                title="Copy link"
              >
                <FaShareAlt size={11} />
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${product.title} - ${formatPrice(product.price)} | ${window.location.href}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[var(--border-color)] text-xs text-green-600 dark:text-green-400 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="Share on WhatsApp"
              >
                <FaWhatsapp size={12} />
                WA
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${product.title} - Check it out on Lekhon`)}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[var(--border-color)] text-xs text-sky-500 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
                title="Share on Twitter/X"
              >
                <FaXTwitter size={11} />
                X
              </a>
            </div>

            {seller && (
              <Link to={`/store/${seller.username}`} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] hover:border-violet-400 transition-colors mt-1">
                {safeSellerProfileImage ? (
                  <img src={safeSellerProfileImage} alt="" className="w-10 h-10 rounded-full object-cover bg-[var(--bg-secondary)]" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid w-10 h-10 place-items-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                    <FaUserCircle size={24} />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{seller.name || seller.username}</span>
                    {seller.isVerified && <MdVerified size={14} className="text-blue-500 shrink-0" />}
                    <SellerBadge size="xs" withLabel />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <span>View Store</span>
                    {sellerAverageRating > 0 && (
                      <StarRating
                        value={sellerAverageRating}
                        size={12}
                        className="shrink-0"
                      />
                    )}
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>

        <section className="mb-8 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div
            ref={infoTabRailRef}
            onWheel={handleInfoTabWheel}
            onMouseDown={handleInfoTabMouseDown}
            onMouseMove={handleInfoTabMouseMove}
            onMouseUp={stopInfoTabDrag}
            onMouseLeave={stopInfoTabDrag}
            className="flex cursor-grab select-none gap-1 overflow-x-auto overscroll-x-contain border-b border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 active:cursor-grabbing"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeInfoTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(event) => handleInfoTabClick(event, tab.id)}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="p-5 sm:p-6">
            {renderInfoContent()}
          </div>
        </section>

        {related.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">You may also like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {related.map((item) => {
                const safeThumbnail = getSafeImageUrl(item.thumbnail);
                return (
                  <Link key={item._id} to={`/marketplace/${item.slug}`} className="group text-center">
                    <div className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-secondary)] mb-1.5 border border-[var(--border-color)] group-hover:border-violet-400 transition-colors">
                      {safeThumbnail ? (
                        <img src={safeThumbnail} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-[var(--text-muted)]">
                          <FaShoppingBag size={24} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-1">{item.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{formatPrice(item.price)}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {imageViewerOpen && activeImage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 sm:p-5 lg:p-6">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-white text-slate-950 shadow-2xl dark:bg-[#0f1711] dark:text-white lg:h-[68vh] lg:w-[88vw] lg:max-w-[1600px] lg:flex-row">
            <button
              type="button"
              onClick={() => setImageViewerOpen(false)}
              className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white/90 text-slate-900 shadow-lg transition-colors hover:bg-white dark:border-white/15 dark:bg-black/70 dark:text-white dark:hover:bg-black"
              aria-label="Close image viewer"
            >
              <FaTimes size={16} />
            </button>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-white p-3 sm:p-6 dark:bg-[#0b110d]">
              <button
                type="button"
                onClick={toggleImageViewerZoom}
                onMouseMove={updateViewerZoomFocus}
                onMouseEnter={updateViewerZoomFocus}
                className={`flex h-full min-h-[320px] w-full items-center justify-center overflow-auto ${imageViewerZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                aria-label="Toggle image zoom"
              >
                <img
                  src={activeImage}
                  alt={product.title}
                  className={`max-h-full max-w-full object-contain transition-transform ${imageViewerZoomed ? 'scale-[1.85] duration-75 ease-out lg:scale-[3]' : 'scale-100 duration-200'}`}
                  referrerPolicy="no-referrer"
                  style={{ transformOrigin: `${imageViewerZoomFocus.x}% ${imageViewerZoomFocus.y}%` }}
                />
              </button>
            </div>

            <aside className="shrink-0 border-t border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#101a12] lg:w-80 lg:border-l lg:border-t-0">
              <div className="flex items-start gap-3 pr-12 lg:pr-0">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-snug text-slate-950 dark:text-white">{product.title}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-white/60">
                    Number of Images: {productImages.length}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleImageViewerZoomFromControl}
                  className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-600 dark:border-white/10 dark:text-white/75 dark:hover:border-violet-400 dark:hover:text-violet-300 lg:grid"
                  aria-label="Toggle image zoom"
                >
                  {imageViewerZoomed ? <FaSearchMinus size={13} /> : <FaSearchPlus size={13} />}
                </button>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:grid lg:max-h-[calc(100vh-16rem)] lg:grid-cols-3 lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
                {productImages.map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    type="button"
                    onClick={() => selectViewerImage(index)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-100 transition-colors dark:bg-white/5 lg:h-20 lg:w-full ${
                      activeImg === index ? 'border-violet-500' : 'border-slate-200 dark:border-white/15'
                    }`}
                    aria-label={`Open product image ${index + 1}`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

const ReviewList = ({ title, reviews, emptyText }) => (
  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
    <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
    {reviews.length === 0 ? (
      <p className="mt-3 text-sm text-[var(--text-muted)]">{emptyText || 'No reviews available.'}</p>
    ) : (
      <div className="mt-4 space-y-5">
        {reviews.map((review) => {
          const safeBuyerProfileImage = getSafeImageUrl(review.buyerId?.profileImage);
          const safeReviewImages = (review.images || []).map(getSafeImageUrl).filter(Boolean);
          return (
          <article key={review._id} className="border-b border-[var(--border-color)] pb-5 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-2">
              {safeBuyerProfileImage ? (
                <img src={safeBuyerProfileImage} alt="" className="w-9 h-9 rounded-full object-cover bg-[var(--bg-secondary)]" referrerPolicy="no-referrer" />
              ) : (
                <span className="grid w-9 h-9 place-items-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                  <FaUserCircle size={20} />
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{review.buyerId?.name || review.buyerId?.username || 'Customer'}</p>
                {reviewLocation(review) && (
                  <p className="text-[11px] text-[var(--text-muted)]">Reviewed in {reviewLocation(review)}</p>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StarRating value={review.rating} size={13} />
              {review.title && <span className="text-sm font-semibold text-[var(--text-primary)]">{review.title}</span>}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--text-muted)]">
              <span>Reviewed on {new Date(review.createdAt).toLocaleDateString()}</span>
              {review.isVerifiedPurchase && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-300">
                  <FaCheckCircle size={10} /> Verified purchase
                </span>
              )}
            </div>
            {review.body && <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{review.body}</p>}
            {safeReviewImages.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {safeReviewImages.map((image, index) => (
                  <img key={`${image}-${index}`} src={image} alt="" className="h-20 w-20 shrink-0 rounded-lg border border-[var(--border-color)] object-cover" referrerPolicy="no-referrer" />
                ))}
              </div>
            )}
            {review.sellerReply && (
              <div className="mt-3 rounded-xl border-l-2 border-violet-400 bg-[var(--bg-secondary)] px-3 py-2">
                <p className="text-xs font-semibold text-violet-600 dark:text-violet-300">Seller replied:</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{review.sellerReply}</p>
              </div>
            )}
            <div className="mt-3 flex items-center gap-3">
              <button type="button" className="rounded-full border border-[var(--border-color)] px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                Helpful
              </button>
              <button type="button" className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-red-500">
                <FaFlag size={10} /> Report
              </button>
            </div>
          </article>
          );
        })}
      </div>
    )}
  </div>
);

export default ProductDetail;
