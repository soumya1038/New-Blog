import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown, FaChevronUp, FaExternalLinkAlt } from 'react-icons/fa';

const compactPrice = (product) => {
  if (product?.isFree) return 'Free';
  if (product?.price === undefined || product?.price === null) return '';
  return `${product.currency || 'INR'} ${product.price}`;
};

const normalizeProductTags = ({ products, externalLinks, content }) => {
  const propProductRefs = Array.isArray(products) ? products : [];
  const linkedProductRefs = propProductRefs.length
    ? propProductRefs
    : Array.isArray(content?.linkedProducts)
      ? content.linkedProducts
      : [];
  const normalizedProducts = [];
  const unresolvedProductIds = [];
  const seenProducts = new Set();

  const addProductRef = (product) => {
    if (!product) return;
    if (typeof product === 'object') {
      const key = product._id || product.id || product.slug || product.title;
      if (!key || seenProducts.has(String(key))) return;
      seenProducts.add(String(key));
      normalizedProducts.push(product);
      return;
    }
    const id = String(product);
    if (id && !unresolvedProductIds.includes(id)) unresolvedProductIds.push(id);
  };

  linkedProductRefs.forEach(addProductRef);
  addProductRef(content?.linkedProduct);

  const resolvedIds = new Set(normalizedProducts.map(product => String(product._id || product.id || '')).filter(Boolean));
  const unresolvedCount = unresolvedProductIds.filter(id => !resolvedIds.has(id)).length;

  const propExternalLinks = Array.isArray(externalLinks) ? externalLinks : [];
  const normalizedLinks = (propExternalLinks.length ? propExternalLinks : content?.externalProductLinks || [])
    .filter(link => link && typeof link === 'object' && link.url);

  return {
    products: normalizedProducts,
    externalLinks: normalizedLinks,
    unresolvedCount,
  };
};

const ProductTagOverlay = ({ products = [], externalLinks = [], content = null, position = 'top-right' }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const { products: linkedProducts, externalLinks: links, unresolvedCount } = useMemo(
    () => normalizeProductTags({ products, externalLinks, content }),
    [products, externalLinks, content]
  );
  const total = linkedProducts.length + links.length + unresolvedCount;
  const firstProduct = linkedProducts[0];
  const firstImage = firstProduct?.transparentThumbnail || firstProduct?.thumbnail || links[0]?.thumbnail;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!total) return null;

  const anchorClass = position === 'top-left' ? 'left-3' : 'right-3';

  return (
    <div ref={wrapperRef} className={`absolute top-3 ${anchorClass} z-20`}>
      <div className="relative flex items-end justify-end">
        {firstImage && (
          <img
            src={firstImage}
            alt={firstProduct?.title || links[0]?.title || 'Tagged product'}
            className="w-[72px] sm:w-[96px] max-h-[104px] object-contain rotate-[-5deg] pointer-events-none"
            style={{
              filter: 'drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 12px 18px rgba(0,0,0,0.32))',
            }}
            loading="lazy"
          />
        )}

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(value => !value);
          }}
          className={`${firstImage ? 'absolute bottom-0 right-0' : ''} inline-flex items-center gap-1 rounded-md border-2 border-white bg-white px-2 py-1 text-[11px] font-bold leading-none text-gray-900 shadow-lg`}
          aria-expanded={open}
        >
          {total} product{total === 1 ? '' : 's'}
          {open ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
        </button>
      </div>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-32px)] overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="max-h-80 overflow-y-auto p-2">
            {linkedProducts.map(product => (
              <Link
                key={product._id || product.slug}
                to={`/marketplace/${product.slug || product._id}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <img
                  src={product.transparentThumbnail || product.thumbnail || '/image/lekhon_url.png'}
                  alt={product.title}
                  className="h-11 w-11 rounded-md object-cover bg-gray-100 dark:bg-gray-800"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{product.title}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{compactPrice(product)}</span>
                </span>
              </Link>
            ))}

            {links.map((link, index) => (
              <a
                key={`${link.url}-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {link.thumbnail ? (
                  <img src={link.thumbnail} alt={link.title} className="h-11 w-11 rounded-md object-cover bg-gray-100 dark:bg-gray-800" />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800">
                    <FaExternalLinkAlt />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{link.title}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{link.priceLabel || link.platform || 'External'}</span>
                </span>
                <FaExternalLinkAlt size={12} className="text-gray-400" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTagOverlay;
