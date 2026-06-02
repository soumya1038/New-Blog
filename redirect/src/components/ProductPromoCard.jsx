import React from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaExternalLinkAlt, FaStar } from 'react-icons/fa';
import { MdStorefront } from 'react-icons/md';

// Renders inside BlogCard when blog.linkedProduct is populated
// Props: product (populated from blog.linkedProduct)
const ProductPromoCard = ({ product }) => {
  if (!product) return null;

  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <Link
      to={`/marketplace/${product.slug}`}
      onClick={e => e.stopPropagation()}
      className="flex items-center gap-3 mt-3 p-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 hover:border-violet-400 dark:hover:border-violet-600 transition-colors group"
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--bg-secondary)] shrink-0 border border-[var(--border-color)]">
        {product.thumbnail
          ? <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          : <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <MdStorefront size={11} className="text-violet-500 shrink-0" />
          <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Featured Product</span>
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">{product.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {product.reviewCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
              <FaStar size={9} /> {product.averageRating?.toFixed(1)}
            </span>
          )}
          {product.isFree ? (
            <span className="text-xs font-bold text-green-600 dark:text-green-400">Free</span>
          ) : (
            <span className="text-xs font-bold text-[var(--text-primary)]">
              ₹{product.price?.toLocaleString('en-IN')}
              {discount > 0 && (
                <span className="ml-1 text-[10px] font-semibold text-red-500 line-through font-normal">
                  ₹{product.compareAtPrice?.toLocaleString('en-IN')}
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

      {/* CTA */}
      <div className="shrink-0">
        {product.type === 'external' ? (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold">
            <FaExternalLinkAlt size={9} /> Buy
          </span>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold group-hover:bg-violet-700 transition-colors">
            <FaShoppingCart size={9} />
            {product.isFree ? 'Get' : 'Buy'}
          </span>
        )}
      </div>
    </Link>
  );
};

export default ProductPromoCard;
