import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link }         from 'react-router-dom';
import { FaHeart, FaRegHeart, FaShoppingBag, FaShoppingCart, FaExternalLinkAlt } from 'react-icons/fa';
import { MdVerified }   from 'react-icons/md';
import { AuthContext }  from '../context/AuthContext';
import StarRating       from './StarRating';
import SellerBadge      from './SellerBadge';
import api              from '../services/api';
import { addGuestCartItem } from '../utils/guestCart';
import { getSafeImageUrl } from '../utils/safeMediaUrls';

const TYPE_LABELS = {
  digital:  { label: 'Digital',       color: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]' },
  physical: { label: 'Physical',      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  service:  { label: 'Service',       color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  external: { label: 'External Link', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

const LONG_PRESS_PREVIEW_MS = 1000;
const LONG_PRESS_CANCEL_DISTANCE = 28;
const isProductWishlisted = (product = {}) => Boolean(product.isWishlisted || product.wishlisted || product.saved);

const ProductCard = ({ product, onAddToCart, onProductView, onLongPreview, className = '' }) => {
  const { user }           = useContext(AuthContext);
  const [wishlisted, setWishlisted] = useState(() => isProductWishlisted(product));
  const [cartLoading, setCartLoading] = useState(false);
  const longPressTimerRef = useRef(null);
  const pressStartRef = useRef({ x: 0, y: 0 });
  const suppressClickUntilRef = useRef(0);

  const discountPct = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  useEffect(() => {
    setWishlisted(isProductWishlisted(product));
  }, [product._id, product.isWishlisted, product.wishlisted, product.saved]);

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const { data } = await api.post(`/marketplace/wishlist/${product._id}`);
      setWishlisted(data.added);
      window.dispatchEvent(new CustomEvent('lekhon:saved-items-updated', {
        detail: { type: 'product', id: product._id, saved: data.added },
      }));
    } catch {}
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (product.type === 'external') return;
    setCartLoading(true);
    try {
      if (user) {
        await api.post('/marketplace/cart/add', { productId: product._id, qty: 1 });
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        addGuestCartItem(product, 1);
      }
      onAddToCart && onAddToCart(product);
    } catch {}
    setCartLoading(false);
  };

  const handleExternalClick = async () => {
    await api.post(`/marketplace/${product._id}/click`).catch(() => {});
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => () => clearLongPressTimer(), []);

  const shouldSkipLongPress = (target) =>
    target instanceof Element && Boolean(target.closest('button, input, textarea, select'));

  const startLongPress = ({ clientX, clientY, target, pointerType = 'mouse', button = 0 }) => {
    if (!onLongPreview || shouldSkipLongPress(target)) return;
    if (pointerType === 'mouse' && button !== 0) return;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

    clearLongPressTimer();
    pressStartRef.current = { x: clientX, y: clientY };

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      suppressClickUntilRef.current = Date.now() + 850;
      onLongPreview(product);
    }, LONG_PRESS_PREVIEW_MS);
  };

  const cancelLongPressIfMoved = (clientX, clientY) => {
    if (!longPressTimerRef.current) return;
    const distance = Math.hypot(
      clientX - pressStartRef.current.x,
      clientY - pressStartRef.current.y
    );
    if (distance > LONG_PRESS_CANCEL_DISTANCE) clearLongPressTimer();
  };

  const handlePointerStart = (event) => {
    if (event.pointerType === 'touch') return;
    startLongPress(event);
  };

  const handlePointerMove = (event) => {
    if (event.pointerType === 'touch') return;
    cancelLongPressIfMoved(event.clientX, event.clientY);
  };

  const handlePointerEnd = (event) => {
    if (event.pointerType === 'touch') return;
    clearLongPressTimer();
  };

  const handleMouseStart = (event) => {
    startLongPress(event);
  };

  const handleMouseMove = (event) => {
    cancelLongPressIfMoved(event.clientX, event.clientY);
  };

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    startLongPress({
      clientX: touch.clientX,
      clientY: touch.clientY,
      target: event.target,
      pointerType: 'touch',
    });
  };

  const handleTouchMove = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    cancelLongPressIfMoved(touch.clientX, touch.clientY);
  };

  const handlePressEnd = () => {
    clearLongPressTimer();
  };

  const typeInfo = TYPE_LABELS[product.type] || TYPE_LABELS.digital;
  const safeThumbnail = getSafeImageUrl(product.thumbnail);
  const safeSellerImage = getSafeImageUrl(product.sellerId?.profileImage);

  return (
    <Link
      to={`/marketplace/${product.slug}`}
      onClick={(event) => {
        if (Date.now() < suppressClickUntilRef.current) {
          event.preventDefault();
          return;
        }
        if (!event.defaultPrevented) onProductView && onProductView(product);
      }}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={handlePointerStart}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onMouseDown={handleMouseStart}
      onMouseMove={handleMouseMove}
      onMouseUp={handlePressEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      onContextMenu={(event) => {
        if (onLongPreview) event.preventDefault();
      }}
      className={`marketplace-product-card group relative flex flex-col rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${className}`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '320px' }}
    >
      {/* ── Thumbnail ─────────────────────────────────────────────────────── */}
      <div className="marketplace-product-card__media relative aspect-[4/3] overflow-hidden bg-[var(--bg-secondary)]">
        {safeThumbnail ? (
          <img
            src={safeThumbnail}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
            <FaShoppingBag size={26} aria-hidden="true" />
          </div>
        )}

        {/* Type badge */}
        <span className={`absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeInfo.color}`}>
          {typeInfo.label}
        </span>

        {/* Discount badge */}
        {discountPct > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            -{discountPct}%
          </span>
        )}

        {/* Free badge */}
        {product.isFree && (
          <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            FREE
          </span>
        )}

        {/* Wishlist button */}
        {user && (
          <button
            onClick={handleWishlist}
            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-[var(--surface-card)]/95 shadow hover:scale-110 transition-transform"
            title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {wishlisted
              ? <FaHeart size={13} className="text-red-500" />
              : <FaRegHeart size={13} className="text-gray-500" />
            }
          </button>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="marketplace-product-card__content flex flex-col flex-1 p-3 gap-1.5">
        {/* Seller */}
        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          {safeSellerImage && (
            <img src={safeSellerImage} alt="" className="w-4 h-4 rounded-full object-cover" referrerPolicy="no-referrer" />
          )}
          <span className="truncate">{product.sellerId?.name || product.sellerId?.username}</span>
          {product.sellerId?.isVerified && <MdVerified size={11} className="text-blue-500 shrink-0" />}
          <SellerBadge size="xs" />
        </div>

        {/* Title */}
        <p className="font-semibold text-sm leading-tight text-[var(--text-primary)] line-clamp-2">
          {product.title}
        </p>

        {/* Rating */}
        {product.reviewCount > 0 && (
          <StarRating value={product.averageRating} count={product.reviewCount} size={11} />
        )}

        {/* Price row */}
        <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-[var(--border-color)]">
          <div className="flex items-baseline gap-1.5">
            {product.isFree ? (
              <span className="text-green-600 dark:text-green-400 font-bold text-sm">Free</span>
            ) : (
              <>
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  Rs. {product.price.toLocaleString('en-IN')}
                </span>
                {product.compareAtPrice > product.price && (
                  <span className="text-xs text-[var(--text-muted)] line-through">
                    Rs. {product.compareAtPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </>
            )}
          </div>

          {/* CTA button */}
          {product.type === 'external' ? (
            <button
              onClick={handleExternalClick}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
            >
              <FaExternalLinkAlt size={10} /> Buy
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--brand-primary)] text-[#17130a] hover:opacity-90 dark:text-white font-medium transition-colors disabled:opacity-60"
            >
              <FaShoppingCart size={10} />
              {cartLoading ? '...' : 'Cart'}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
