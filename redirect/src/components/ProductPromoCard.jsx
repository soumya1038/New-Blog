import React from 'react';
import { Link } from 'react-router-dom';
import { FaExternalLinkAlt, FaShoppingBag, FaShoppingCart, FaStar } from 'react-icons/fa';
import { MdStorefront } from 'react-icons/md';
import { getSafeHttpUrl, getSafeImageUrl } from '../utils/safeMediaUrls';

const ProductPromoCard = ({ product, externalLink }) => {
  const isExternalLink = !!externalLink;
  const item = isExternalLink
    ? {
      ...externalLink,
      url: getSafeHttpUrl(externalLink.url),
      thumbnail: getSafeImageUrl(externalLink.thumbnail),
    }
    : product;
  if (!item) return null;
  if (isExternalLink && !item.url) return null;

  const discount = !isExternalLink && item.compareAtPrice && item.compareAtPrice > item.price
    ? Math.round(((item.compareAtPrice - item.price) / item.compareAtPrice) * 100)
    : 0;
  const safeThumbnail = getSafeImageUrl(item.thumbnail);

  const content = (
    <>
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--bg-secondary)] shrink-0 border border-[var(--border-color)]">
        {safeThumbnail ? (
          <img src={safeThumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-violet-500">
            <FaShoppingBag size={20} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <MdStorefront size={11} className="text-violet-500 shrink-0" />
          <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
            {isExternalLink ? (item.platform || 'External Link') : 'Featured Product'}
          </span>
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {!isExternalLink && item.reviewCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
              <FaStar size={9} /> {item.averageRating?.toFixed(1)}
            </span>
          )}
          {isExternalLink ? (
            item.priceLabel && <span className="text-xs font-bold text-[var(--text-primary)]">{item.priceLabel}</span>
          ) : item.isFree ? (
            <span className="text-xs font-bold text-green-600 dark:text-green-400">Free</span>
          ) : (
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Rs. {item.price?.toLocaleString('en-IN')}
              {discount > 0 && (
                <span className="ml-1 text-[10px] font-semibold text-red-500 line-through">
                  Rs. {item.compareAtPrice?.toLocaleString('en-IN')}
                </span>
              )}
            </span>
          )}
          {discount > 0 && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-semibold">
              -{discount}%
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {isExternalLink || item.type === 'external' ? (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold">
            <FaExternalLinkAlt size={9} /> Open
          </span>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold group-hover:bg-violet-700 transition-colors">
            <FaShoppingCart size={9} />
            {item.isFree ? 'Get' : 'Buy'}
          </span>
        )}
      </div>
    </>
  );

  if (isExternalLink) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="flex items-center gap-3 mt-3 p-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 hover:border-violet-400 dark:hover:border-violet-600 transition-colors group"
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      to={`/marketplace/${item.slug}`}
      onClick={e => e.stopPropagation()}
      className="flex items-center gap-3 mt-3 p-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 hover:border-violet-400 dark:hover:border-violet-600 transition-colors group"
    >
      {content}
    </Link>
  );
};

export default ProductPromoCard;
