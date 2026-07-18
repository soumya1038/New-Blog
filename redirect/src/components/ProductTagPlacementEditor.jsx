import React, { useEffect, useMemo, useState } from 'react';
import { FaExternalLinkAlt, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import { MdStorefront } from 'react-icons/md';
import { getSafeImageUrl } from '../utils/safeMediaUrls';

const clampPercent = (value, fallback = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
};

const productKeyForMarketplace = (product) =>
  `product:${product?._id || product?.id || product?.slug || product?.title || ''}`;

const productKeyForExternal = (link, index) =>
  `external:${link?.url || link?.title || index}`;

const getSafeEditorImageUrl = (value) => {
  const raw = String(value || '').trim();
  if (/^blob:(?:https?:\/\/|null\/)[^\s"'<>\\]+$/i.test(raw)) return raw;
  return getSafeImageUrl(raw);
};

const normalizeImageSources = ({ coverImage, galleryImages }) => [
  coverImage,
  ...(Array.isArray(galleryImages) ? galleryImages : []),
].map(getSafeEditorImageUrl).filter(Boolean);

const ProductTagPlacementEditor = ({
  coverImage,
  galleryImages = [],
  linkedProducts = [],
  externalProductLinks = [],
  placements = [],
  setPlacements,
}) => {
  const imageSources = useMemo(
    () => normalizeImageSources({ coverImage, galleryImages }),
    [coverImage, galleryImages]
  );

  const productOptions = useMemo(() => {
    const marketplaceProducts = (Array.isArray(linkedProducts) ? linkedProducts : [])
      .filter(product => product && typeof product === 'object')
      .map(product => ({
        key: productKeyForMarketplace(product),
        source: 'marketplace',
        title: product.title || 'Marketplace product',
        image: getSafeImageUrl(product.transparentThumbnail || product.thumbnail),
        meta: product.isFree ? 'Free' : product.price !== undefined && product.price !== null ? `INR ${Number(product.price).toLocaleString('en-IN')}` : 'Marketplace product',
      }))
      .filter(option => option.key !== 'product:');

    const externalLinks = (Array.isArray(externalProductLinks) ? externalProductLinks : [])
      .filter(link => link && typeof link === 'object' && link.url)
      .map((link, index) => ({
        key: productKeyForExternal(link, index),
        source: 'external',
        title: link.title || 'External product',
        image: getSafeImageUrl(link.thumbnail),
        meta: link.priceLabel || link.platform || 'External product',
      }));

    return [...marketplaceProducts, ...externalLinks];
  }, [linkedProducts, externalProductLinks]);

  const [activeProductKey, setActiveProductKey] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!productOptions.length) {
      setActiveProductKey('');
      return;
    }
    if (!productOptions.some(option => option.key === activeProductKey)) {
      setActiveProductKey(productOptions[0].key);
    }
  }, [activeProductKey, productOptions]);

  useEffect(() => {
    if (activeImageIndex >= imageSources.length) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, imageSources.length]);

  useEffect(() => {
    if (!setPlacements) return;
    const validProductKeys = new Set(productOptions.map(option => option.key));
    const maxImageIndex = Math.max(0, imageSources.length - 1);
    const nextPlacements = (Array.isArray(placements) ? placements : [])
      .filter(placement => validProductKeys.has(placement.productKey))
      .map(placement => ({
        productKey: placement.productKey,
        source: placement.source === 'external' ? 'external' : 'marketplace',
        imageIndex: Math.max(0, Math.min(maxImageIndex, Math.floor(Number(placement.imageIndex) || 0))),
        x: clampPercent(placement.x),
        y: clampPercent(placement.y),
      }));

    if (JSON.stringify(nextPlacements) !== JSON.stringify(placements || [])) {
      setPlacements(nextPlacements);
    }
  }, [imageSources.length, placements, productOptions, setPlacements]);

  if (!productOptions.length) return null;

  if (!imageSources.length) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-sm text-[var(--text-secondary)]">
        Add a cover image before placing tagged products.
      </div>
    );
  }

  const activeProduct = productOptions.find(option => option.key === activeProductKey) || productOptions[0];
  const activeImage = imageSources[activeImageIndex] || imageSources[0];
  const activeImagePlacements = (placements || []).filter(
    placement => Number(placement.imageIndex || 0) === activeImageIndex
  );
  const activePlacement = (placements || []).find(placement => placement.productKey === activeProduct?.key);

  const placeProduct = (event) => {
    if (!activeProduct || !setPlacements) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    setPlacements(current => [
      ...(current || []).filter(placement => placement.productKey !== activeProduct.key),
      {
        productKey: activeProduct.key,
        source: activeProduct.source,
        imageIndex: activeImageIndex,
        x,
        y,
      },
    ]);
  };

  const clearPlacement = () => {
    if (!activeProduct || !setPlacements) return;
    setPlacements(current => (current || []).filter(placement => placement.productKey !== activeProduct.key));
  };

  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <FaMapMarkerAlt className="text-[var(--brand-primary)]" />
            Product placement
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Select a product, choose the image, then click where the product should appear.
          </p>
        </div>
        {activePlacement && (
          <button
            type="button"
            onClick={clearPlacement}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-red-500"
          >
            <FaTimes size={11} /> Clear selected
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={placeProduct}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
              }
            }}
            className="relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] cursor-crosshair"
            aria-label="Click image to place selected product"
          >
            <img src={activeImage} alt="Selected article visual" className="h-72 w-full object-cover" referrerPolicy="no-referrer" />
            {activeImagePlacements.map((placement) => {
              const product = productOptions.find(option => option.key === placement.productKey);
              if (!product) return null;
              return (
                <span
                  key={placement.productKey}
                  className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-black shadow-lg ${
                    placement.productKey === activeProduct?.key
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'bg-[var(--surface-card)] text-[var(--brand-primary)]'
                  }`}
                  style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
                  title={product.title}
                >
                  {product.source === 'external' ? <FaExternalLinkAlt size={10} /> : <MdStorefront size={13} />}
                </span>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {imageSources.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border ${
                  activeImageIndex === index ? 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20' : 'border-[var(--border-default)]'
                }`}
                aria-label={`Select image ${index + 1}`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {productOptions.map((product) => {
            const placement = (placements || []).find(item => item.productKey === product.key);
            return (
              <button
                key={product.key}
                type="button"
                onClick={() => {
                  setActiveProductKey(product.key);
                  if (placement) setActiveImageIndex(placement.imageIndex || 0);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                  activeProductKey === product.key
                    ? 'border-[var(--brand-primary)] bg-[var(--tag-bg)]'
                    : 'border-[var(--border-default)] hover:bg-[var(--surface-elevated)]'
                }`}
              >
                {product.image ? (
                  <img src={product.image} alt="" className="h-10 w-10 rounded-lg object-cover bg-[var(--surface-elevated)]" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--text-muted)]">
                    {product.source === 'external' ? <FaExternalLinkAlt /> : <MdStorefront />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{product.title}</span>
                  <span className="block truncate text-xs text-[var(--text-muted)]">
                    {placement ? `Image ${Number(placement.imageIndex || 0) + 1} placed` : product.meta}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductTagPlacementEditor;
