import React, { useMemo, useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import ProductPromoCard from './ProductPromoCard';
import { getSafeHttpUrl, getSafeImageUrl } from '../utils/safeMediaUrls';

const ProductPromoList = ({ content }) => {
  const [expanded, setExpanded] = useState(false);
  const items = useMemo(() => {
    const products = Array.isArray(content?.linkedProducts)
      ? content.linkedProducts.filter(product => product && typeof product === 'object')
      : [];
    if (!products.length && content?.linkedProduct && typeof content.linkedProduct === 'object') {
      products.push(content.linkedProduct);
    }
    const externalLinks = Array.isArray(content?.externalProductLinks)
      ? content.externalProductLinks
        .filter(Boolean)
        .map((externalLink) => ({
          ...externalLink,
          url: getSafeHttpUrl(externalLink.url),
          thumbnail: getSafeImageUrl(externalLink.thumbnail),
        }))
        .filter(externalLink => externalLink.url)
      : [];
    return [
      ...products.map(product => ({ type: 'product', product, key: `product-${product._id || product.slug}` })),
      ...externalLinks.map((externalLink, index) => ({ type: 'external', externalLink, key: `external-${externalLink.url || index}` })),
    ];
  }, [content]);

  if (!items.length) return null;

  const [first, ...rest] = items;

  return (
    <div className="mt-3">
      <ProductPromoCard product={first.product} externalLink={first.externalLink} />
      {rest.length > 0 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setExpanded(value => !value);
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
          >
            {expanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
            {expanded ? 'Hide related products' : `Show ${rest.length} more product${rest.length > 1 ? 's' : ''}`}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {rest.map(item => (
                <ProductPromoCard
                  key={item.key}
                  product={item.product}
                  externalLink={item.externalLink}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductPromoList;
