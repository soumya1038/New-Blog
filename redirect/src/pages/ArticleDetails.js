import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import socketService from '../services/socket';
import { AuthContext } from '../context/AuthContext';
import {
  FaArrowLeft,
  FaComment,
  FaEdit,
  FaEllipsisH,
  FaEnvelope,
  FaEye,
  FaFacebook,
  FaFeatherAlt,
  FaGift,
  FaHeart,
  FaExternalLinkAlt,
  FaLink,
  FaLinkedin,
  FaRegBookmark,
  FaRegCalendarAlt,
  FaRegClock,
  FaRegCommentDots,
  FaRegFolderOpen,
  FaRegShareSquare,
  FaRegUser,
  FaRetweet,
  FaShoppingBag,
  FaTimes,
  FaTrash,
  FaUserCheck,
  FaUserPlus,
  FaWhatsapp,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { BiMenuAltRight } from 'react-icons/bi';
import { GoVerified } from 'react-icons/go';
import { TbBrandAmongUs, TbBrandBlogger } from 'react-icons/tb';
import { MdOutlineSwitchAccessShortcutAdd } from 'react-icons/md';
import { RxVideo } from 'react-icons/rx';
import toast, { Toaster } from 'react-hot-toast';
import Avatar from '../components/Avatar';
import EnhancedComment from '../components/EnhancedComment';
import SEOHead from '../components/SEOHead';
import StatusViewer from '../components/StatusViewer';
import { bumpReplyCount, removeCommentFromReplyMap, updateCommentsById, updateReplyMapById } from '../utils/commentTree';
import TwoFactorVerificationModal from '../components/TwoFactorVerificationModal';
import SensitiveActionAuthModal from '../components/SensitiveActionAuthModal';
import {
  buildSensitiveActionHeaders,
  getTwoFactorRequirement,
  requestAuthenticatedTwoFactorChallenge,
  verifyAuthenticatedTwoFactorChallenge,
} from '../utils/twoFactorFlow';

const formatArticleDate = (value) => {
  if (!value) return 'Draft';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Draft';

  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const estimateReadTime = (content = '') => {
  const wordCount = String(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 220));
};

const compactCount = (value = 0) => {
  const count = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    notation: count >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(count);
};

const stripInlineMarkdown = (value = '') =>
  String(value)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const splitArticleContent = (content = '') => {
  const sections = String(content)
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(section => section.trim())
    .filter(Boolean);

  if (sections.length === 0) {
    return { lead: '', rest: '' };
  }

  const firstSectionLines = sections[0].split('\n').map(line => line.trim()).filter(Boolean);
  const firstLine = firstSectionLines[0] || '';
  const firstLineIsHeading = /^#{1,6}\s+/.test(firstLine) || /^introduction$/i.test(firstLine);
  let leadSource = sections[0];
  let restSections = sections.slice(1);

  if (firstLineIsHeading && firstSectionLines.length > 1) {
    leadSource = firstSectionLines.slice(1).join('\n');
  } else if (firstLineIsHeading && sections[1]) {
    leadSource = sections[1];
    restSections = sections.slice(2);
  }

  const lead = stripInlineMarkdown(leadSource || '');
  const rest = restSections.join('\n\n');

  return {
    lead,
    rest,
  };
};

const clampPercent = (value, fallback = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
};

const getMarketplaceProductKey = (product) =>
  `product:${product?._id || product?.id || product?.slug || product?.title || ''}`;

const getExternalProductKey = (link, index) =>
  `external:${link?.url || link?.title || index}`;

const formatProductPrice = (product) => {
  if (product?.isFree) return 'Free';
  if (product?.price === undefined || product?.price === null) return 'Marketplace product';
  const currency = product.currency || 'INR';
  return `${currency} ${Number(product.price).toLocaleString('en-IN')}`;
};

const normalizeArticleImages = (article, fallbackImage) => {
  const seen = new Set();
  return [article?.coverImage || article?.image || article?.featuredImage || fallbackImage, ...(Array.isArray(article?.galleryImages) ? article.galleryImages : [])]
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
};

const normalizeArticleVideoUrls = (article) => {
  const seen = new Set();
  return (Array.isArray(article?.videoUrls) ? article.videoUrls : [])
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
};

const getYouTubeId = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.split('/').filter(Boolean)[0] || '';
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || '';
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2] || '';
      return parsed.searchParams.get('v') || '';
    }
  } catch {
    return '';
  }
  return '';
};

const getVideoEmbedUrl = (url) => {
  const trimmedUrl = String(url || '').trim();
  if (!trimmedUrl) return '';

  const youtubeId = getYouTubeId(trimmedUrl);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}`;

  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.hostname.includes('vimeo.com')) {
      const videoId = parsed.pathname.split('/').filter(Boolean).find(part => /^\d+$/.test(part));
      if (videoId) return `https://player.vimeo.com/video/${videoId}`;
    }
  } catch {
    return trimmedUrl;
  }

  return trimmedUrl;
};

const isDirectVideoUrl = (url) => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(String(url || ''));

const normalizeArticleGalleryMedia = (article, fallbackImage) => [
  ...normalizeArticleImages(article, fallbackImage).map((src, index) => ({
    id: `image-${index}-${src}`,
    type: 'image',
    src,
  })),
  ...normalizeArticleVideoUrls(article).map((src, index) => ({
    id: `video-${index}-${src}`,
    type: 'video',
    src,
    embedSrc: getVideoEmbedUrl(src),
  })),
];

const normalizeArticleProductTags = (article) => {
  const productMap = new Map();
  const addProduct = (product) => {
    if (!product || typeof product !== 'object') return;
    const key = getMarketplaceProductKey(product);
    if (!key || key === 'product:' || productMap.has(key)) return;
    productMap.set(key, {
      key,
      source: 'marketplace',
      title: product.title || 'Marketplace product',
      image: product.thumbnail || product.transparentThumbnail || '/image/lekhon_url.png',
      meta: formatProductPrice(product),
      href: `/marketplace/${product.slug || product._id || product.id}`,
      external: false,
    });
  };

  (Array.isArray(article?.linkedProducts) ? article.linkedProducts : []).forEach(addProduct);
  addProduct(article?.linkedProduct);

  const externalTags = (Array.isArray(article?.externalProductLinks) ? article.externalProductLinks : [])
    .filter(link => link && typeof link === 'object' && link.url)
    .map((link, index) => ({
      key: getExternalProductKey(link, index),
      source: 'external',
      title: link.title || 'External product',
      image: link.thumbnail || '/image/lekhon_url.png',
      meta: link.priceLabel || link.platform || 'External',
      href: link.url,
      external: true,
    }));

  return [...productMap.values(), ...externalTags];
};

const FALLBACK_PRODUCT_DOT_POSITIONS = [
  { x: 86, y: 34 },
  { x: 86, y: 54 },
  { x: 76, y: 44 },
  { x: 90, y: 68 },
  { x: 70, y: 28 },
  { x: 78, y: 72 },
];

const getRelatedPath = (item) => {
  const idOrSlug = item?.slug || item?._id || '';
  if (item?.contentType === 'blog') return `/blog/${idOrSlug}`;
  if (item?.contentType === 'short') return `/shorts/${idOrSlug}`;
  return `/article/${idOrSlug}`;
};

const getRelatedImage = (item) =>
  item?.coverImage || item?.image || item?.featuredImage || item?.galleryImages?.[0] || '/image/article_logo_dark.png';

const getRelatedExcerpt = (item) =>
  stripInlineMarkdown(item?.metaDescription || item?.excerpt || item?.summary || item?.content || '').slice(0, 128);

const getRelatedAuthorName = (item) =>
  item?.author?.fullName || item?.author?.username || item?.authorName || 'Lekhon author';

const getAuthorFirstName = (name = '') => String(name || 'Author').trim().split(/\s+/)[0] || 'Author';

const getRelatedReadMinutes = (item) =>
  item?.readingTime || item?.readTime || estimateReadTime(item?.content || item?.metaDescription || '');

const hashString = (value = '') => {
  const text = String(value || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getRelatedTypeLabel = (type) => {
  if (type === 'blog') return 'Blog';
  if (type === 'short') return 'Short';
  return 'Article';
};

const getRelatedTypeIcon = (type) => {
  if (type === 'blog') return TbBrandBlogger;
  if (type === 'short') return MdOutlineSwitchAccessShortcutAdd;
  return FaFeatherAlt;
};

const getRelatedTypeClass = (type) => {
  if (type === 'blog' || type === 'short') return type;
  return 'article';
};

const RelatedContentCard = ({ item, compact = false, variant, mobileVariant = '' }) => {
  if (!item) return null;
  const image = getRelatedImage(item);
  const path = getRelatedPath(item);
  const label = getRelatedTypeLabel(item.contentType);
  const TypeIcon = getRelatedTypeIcon(item.contentType);
  const typeClass = getRelatedTypeClass(item.contentType);
  const useTypeLogoMedia = item.contentType === 'blog' || item.contentType === 'short';
  const cardVariant = variant || (compact ? 'compact' : 'editorial');
  const author = item?.author && typeof item.author === 'object'
    ? item.author
    : { username: getRelatedAuthorName(item) };
  const authorName = getRelatedAuthorName(item);
  const readMinutes = getRelatedReadMinutes(item);
  const tags = (Array.isArray(item.tags) ? item.tags : []).filter(Boolean).slice(0, 3);

  return (
    <Link to={path} className={`article-related-card is-${cardVariant} ${mobileVariant ? `mobile-${mobileVariant}` : ''}`}>
      <span className={`article-related-media ${useTypeLogoMedia ? `is-type-logo is-${typeClass}` : 'is-article-image'}`}>
        {useTypeLogoMedia ? (
          <TypeIcon className="article-related-media-logo" aria-hidden="true" focusable="false" />
        ) : (
          <img src={image} alt="" loading="lazy" />
        )}
      </span>
      <span className="article-related-copy">
        <span className={`article-related-eyebrow article-related-type-icon is-${typeClass}`} aria-label={label} title={label}>
          {item.contentType === 'article' ? (
            <img src="/image/article_logo_light.png" alt="" aria-hidden="true" />
          ) : (
            <TypeIcon aria-hidden="true" focusable="false" />
          )}
        </span>
        {!compact && tags.length > 0 && (
          <span className="article-related-tags">
            {tags.map((tag) => <span key={tag}>{tag}</span>)}
          </span>
        )}
        <strong>{item.title || 'Untitled content'}</strong>
        {!compact && <small>{getRelatedExcerpt(item)}</small>}
        <span className="article-related-stats">
          <span><FaEye /> {compactCount(item.views || 0)}</span>
          <span><FaHeart /> {compactCount(item.likeCount || item.likes?.length || 0)}</span>
          <span><FaRegCommentDots /> {compactCount(item.commentCount || 0)}</span>
        </span>
        {!compact && (
          <span className="article-related-footer">
            <span className="article-related-author-mini">
              <Avatar user={author} size="xs" />
              <span>
                <span className="article-related-author-name">{authorName}</span>
                <small>{readMinutes} min read</small>
              </span>
            </span>
            <span className="article-related-heart">
              <FaHeart /> {compactCount(item.likeCount || item.likes?.length || 0)}
            </span>
          </span>
        )}
      </span>
    </Link>
  );
};

const ArticleGalleryDock = ({
  title,
  category,
  mediaItems,
  activeIndex,
  setActiveIndex,
  productTags,
  placements,
}) => {
  const [productListOpen, setProductListOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = useRef(null);
  const activeMedia = mediaItems[activeIndex] || mediaItems[0];
  const lightboxMedia = mediaItems[lightboxIndex] || activeMedia;
  const hasGallery = mediaItems.length > 1;
  const activeIsVideo = activeMedia?.type === 'video';
  const lightboxIsVideo = lightboxMedia?.type === 'video';

  useEffect(() => {
    setProductListOpen(false);
  }, [activeIndex]);

  useEffect(() => {
    if (lightboxIndex >= mediaItems.length) {
      setLightboxIndex(0);
    }
  }, [lightboxIndex, mediaItems.length]);

  useEffect(() => {
    if (!hasGallery || isPaused || lightboxOpen) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % mediaItems.length);
    }, 5200);
    return () => window.clearInterval(interval);
  }, [hasGallery, mediaItems.length, isPaused, lightboxOpen, setActiveIndex]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveIndex(lightboxIndex);
        setIsPaused(false);
        setLightboxOpen(false);
      }
      if (hasGallery && event.key === 'ArrowRight') {
        setLightboxIndex((current) => {
          const nextIndex = (current + 1) % mediaItems.length;
          setActiveIndex(nextIndex);
          return nextIndex;
        });
      }
      if (hasGallery && event.key === 'ArrowLeft') {
        setLightboxIndex((current) => {
          const nextIndex = (current - 1 + mediaItems.length) % mediaItems.length;
          setActiveIndex(nextIndex);
          return nextIndex;
        });
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasGallery, lightboxIndex, mediaItems.length, lightboxOpen, setActiveIndex]);

  const goToMedia = (index) => {
    setIsPaused(false);
    setActiveIndex(index);
    if (lightboxOpen) {
      setLightboxIndex(index);
    }
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches?.[0]?.clientX ?? null;
    setIsPaused(true);
  };

  const handleTouchEnd = (event) => {
    if (!hasGallery || touchStartX.current === null) return;
    const endX = event.changedTouches?.[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 42) {
      setIsPaused(false);
      return;
    }
    setActiveIndex((current) => (
      deltaX < 0
        ? (current + 1) % mediaItems.length
        : (current - 1 + mediaItems.length) % mediaItems.length
    ));
    setIsPaused(false);
  };

  const normalizedPlacements = Array.isArray(placements) ? placements : [];
  const activeProductDots = productTags
    .map((tag, index) => {
      const explicitPlacement = normalizedPlacements.find(
        placement => placement.productKey === tag.key
      );
      const useExplicitPlacement = explicitPlacement
        && Number(explicitPlacement.imageIndex || 0) === activeIndex;

      if (explicitPlacement && !useExplicitPlacement && !activeIsVideo) {
        return null;
      }

      const fallback = FALLBACK_PRODUCT_DOT_POSITIONS[index % FALLBACK_PRODUCT_DOT_POSITIONS.length];
      return {
        ...tag,
        x: clampPercent(useExplicitPlacement ? explicitPlacement.x : undefined, fallback.x),
        y: clampPercent(useExplicitPlacement ? explicitPlacement.y : undefined, fallback.y),
        isFallback: !useExplicitPlacement,
      };
    })
    .filter(Boolean);
  const productGroupAnchor = activeProductDots.length > 0
    ? {
        x: clampPercent(
          activeProductDots.reduce((total, tag) => total + Number(tag.x || 0), 0) / activeProductDots.length,
          86
        ),
        y: clampPercent(
          activeProductDots.reduce((total, tag) => total + Number(tag.y || 0), 0) / activeProductDots.length,
          44
        ),
      }
    : null;
  const productListLeft = productGroupAnchor ? Math.max(26, Math.min(82, productGroupAnchor.x)) : 86;
  const productListTop = productGroupAnchor ? Math.max(20, Math.min(78, productGroupAnchor.y)) : 44;
  const productListPlacement = productListTop < 28 ? 'is-below' : 'is-above';

  if (!activeMedia) return null;

  const openLightbox = () => {
    setLightboxIndex(activeIndex);
    setIsPaused(true);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setActiveIndex(lightboxIndex);
    setIsPaused(false);
    setLightboxOpen(false);
  };

  return (
    <>
      <figure className="article-editorial-gallery">
        <div
          className="article-gallery-stage"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {activeIsVideo ? (
            <div
              className="article-gallery-video-button"
            >
              <span className="article-gallery-video-frame">
                {isDirectVideoUrl(activeMedia.src) ? (
                  <video
                    src={activeMedia.src}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <iframe
                    src={activeMedia.embedSrc || activeMedia.src}
                    title={`${title} video ${activeIndex + 1}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </span>
              <button
                type="button"
                className="article-gallery-video-open"
                onClick={openLightbox}
                aria-label="Open article video"
              />
            </div>
          ) : (
            <button
              type="button"
              className="article-gallery-image-button"
              onClick={openLightbox}
              aria-label="Open article image"
            >
              <img src={activeMedia.src} alt={title} />
            </button>
          )}

          {activeProductDots.length > 0 && productGroupAnchor && (
            <div className="article-product-tag-layer" aria-label="Tagged products">
              <button
                type="button"
                className={`article-product-dot article-product-dot-group ${productListOpen ? 'is-active' : ''}`}
                style={{ left: `${productGroupAnchor.x}%`, top: `${productGroupAnchor.y}%` }}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsPaused(true);
                  setProductListOpen((current) => !current);
                }}
                aria-label={`View ${activeProductDots.length} tagged product${activeProductDots.length === 1 ? '' : 's'}`}
                aria-expanded={productListOpen}
              >
                <FaShoppingBag />
                {activeProductDots.length > 1 && (
                  <span className="article-product-dot-count">{activeProductDots.length}</span>
                )}
              </button>
              {productListOpen && (
                <div
                  className={`article-product-list-popover ${productListPlacement}`}
                  style={{ left: `${productListLeft}%`, top: `${productListTop}%` }}
                >
                  <div className="article-product-list-head">
                    <strong>Tagged products</strong>
                    <small>{activeProductDots.length} item{activeProductDots.length === 1 ? '' : 's'}</small>
                  </div>
                  <div className="article-product-list">
                    {activeProductDots.map((tag) => (
                      <div className="article-product-list-item" key={tag.key}>
                        <img src={tag.image || '/image/lekhon_url.png'} alt="" />
                        <span className="article-product-tag-copy">
                          <strong>{tag.title}</strong>
                          <small>{tag.meta}</small>
                        </span>
                        {tag.external ? (
                          <a href={tag.href} target="_blank" rel="noopener noreferrer">
                            View <FaExternalLinkAlt />
                          </a>
                        ) : (
                          <Link to={tag.href}>View</Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="article-gallery-controls">
          <div className="article-gallery-dots" aria-label="Article media carousel">
            {mediaItems.map((media, index) => (
              <button
                key={`${media.id}-${index}`}
                type="button"
                className={`${media.type === 'video' ? 'is-video' : ''} ${activeIndex === index ? 'is-active' : ''}`.trim()}
                onClick={() => goToMedia(index)}
                aria-label={`Show ${media.type} ${index + 1} of ${mediaItems.length}`}
                aria-current={activeIndex === index ? 'true' : undefined}
              >
                {media.type === 'video' && <RxVideo aria-hidden="true" focusable="false" />}
              </button>
            ))}
          </div>
          <span className="article-gallery-counter" aria-label={`Media ${activeIndex + 1} of ${mediaItems.length}`}>
            {activeIndex + 1} / {mediaItems.length}
          </span>
        </div>

        <figcaption className="article-gallery-caption">
          <span>{category} visual gallery</span>
          <small>{hasGallery ? 'Swipe or use the dots to browse.' : activeIsVideo ? 'Video' : 'Cover image'}</small>
        </figcaption>
      </figure>

      {lightboxOpen && (
        <div
          className="article-gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightboxIsVideo ? 'Article video viewer' : 'Article image viewer'}
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="article-gallery-lightbox-close"
            onClick={closeLightbox}
            aria-label="Close image viewer"
          >
            <FaTimes />
          </button>
          <div className="article-gallery-lightbox-inner" onClick={(event) => event.stopPropagation()}>
            {lightboxIsVideo ? (
              <div className="article-gallery-lightbox-video">
                {isDirectVideoUrl(lightboxMedia.src) ? (
                  <video src={lightboxMedia.src} controls playsInline autoPlay />
                ) : (
                  <iframe
                    src={lightboxMedia.embedSrc || lightboxMedia.src}
                    title={`${title} video ${lightboxIndex + 1}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            ) : (
              <img src={lightboxMedia.src} alt={title} />
            )}
            {hasGallery && (
              <div className="article-gallery-lightbox-dots">
                {mediaItems.map((media, index) => (
                  <button
                    key={`${media.id}-lightbox-${index}`}
                    type="button"
                    className={`${media.type === 'video' ? 'is-video' : ''} ${lightboxIndex === index ? 'is-active' : ''}`.trim()}
                    onClick={() => goToMedia(index)}
                    aria-label={`Show ${media.type} ${index + 1}`}
                  >
                    {media.type === 'video' && <RxVideo aria-hidden="true" focusable="false" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const SkeletonBlock = ({ className = '' }) => (
  <span className={`article-skeleton-block ${className}`} aria-hidden="true" />
);

const ArticleDetailSkeleton = () => (
  <div className="article-detail-page-custom article-detail-loading-page" style={{ minHeight: '100vh' }}>
    <div className="reading-progress article-skeleton-progress" />
    <div className="article-skeleton-screen-reader" role="status" aria-live="polite">
      Loading article
    </div>

    <div className="article-detail-backbar-custom">
      <div className="article-detail-backinner-custom">
        <SkeletonBlock className="article-skeleton-back" />
      </div>
    </div>

    <article className="article-detail-shell-custom article-skeleton-shell" aria-hidden="true">
      <section className="article-editorial-layout article-detail-skeleton">
        <div className="article-editorial-top article-skeleton-top">
          <header className="article-editorial-head article-skeleton-head">
            <SkeletonBlock className="article-skeleton-logo" />
            <SkeletonBlock className="article-skeleton-kicker" />
            <SkeletonBlock className="article-skeleton-title is-wide" />
            <SkeletonBlock className="article-skeleton-title is-medium" />
            <SkeletonBlock className="article-skeleton-rule" />
            <SkeletonBlock className="article-skeleton-deck is-wide" />
            <SkeletonBlock className="article-skeleton-deck is-short" />
            <div className="article-skeleton-meta-strip">
              <SkeletonBlock />
              <SkeletonBlock />
              <SkeletonBlock />
              <SkeletonBlock />
            </div>
          </header>

          <aside className="article-editorial-meta-panel article-skeleton-meta-panel">
            <div className="article-skeleton-meta-list">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="article-skeleton-meta-row" key={`article-meta-skeleton-${index}`}>
                  <SkeletonBlock className="article-skeleton-meta-label" />
                  <SkeletonBlock className="article-skeleton-meta-value" />
                </div>
              ))}
            </div>
            <div className="article-skeleton-actions">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={`article-action-skeleton-${index}`} />
              ))}
            </div>
          </aside>

          <figure className="article-editorial-gallery article-skeleton-gallery">
            <SkeletonBlock className="article-skeleton-gallery-stage" />
            <div className="article-skeleton-gallery-controls">
              <span>
                <SkeletonBlock />
                <SkeletonBlock />
                <SkeletonBlock />
              </span>
              <SkeletonBlock />
            </div>
            <div className="article-skeleton-gallery-caption">
              <SkeletonBlock />
              <SkeletonBlock />
            </div>
          </figure>
        </div>

        <div className="article-editorial-reader-grid article-skeleton-reader">
          <aside className="article-editorial-engagement-rail article-skeleton-rail">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={`article-rail-skeleton-${index}`} />
            ))}
          </aside>

          <section className="article-editorial-body article-skeleton-body">
            <div className="article-skeleton-lead">
              <SkeletonBlock className="article-skeleton-dropcap" />
              <div>
                <SkeletonBlock className="is-wide" />
                <SkeletonBlock />
                <SkeletonBlock className="is-medium" />
              </div>
            </div>
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonBlock
                key={`article-body-skeleton-${index}`}
                className={index % 3 === 2 ? 'is-short' : index % 2 === 0 ? 'is-wide' : ''}
              />
            ))}
            <SkeletonBlock className="article-skeleton-subhead" />
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock
                key={`article-body-late-skeleton-${index}`}
                className={index === 3 ? 'is-medium' : ''}
              />
            ))}
          </section>

          <aside className="article-editorial-author-panel article-skeleton-author">
            <div className="article-skeleton-author-row">
              <SkeletonBlock className="article-skeleton-avatar" />
              <span>
                <SkeletonBlock />
                <SkeletonBlock className="is-short" />
              </span>
            </div>
            <div className="article-skeleton-author-stats">
              <SkeletonBlock />
              <SkeletonBlock />
              <SkeletonBlock />
            </div>
            <SkeletonBlock className="is-wide" />
            <SkeletonBlock className="is-medium" />
            <SkeletonBlock className="article-skeleton-link" />
            <div className="article-skeleton-related-cards">
              {Array.from({ length: 2 }).map((_, index) => (
                <div className="article-skeleton-related-card" key={`article-side-related-skeleton-${index}`}>
                  <SkeletonBlock />
                  <span>
                    <SkeletonBlock />
                    <SkeletonBlock className="is-short" />
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <div className="article-detail-afterword-custom article-skeleton-afterword">
        <div className="article-skeleton-related-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="article-skeleton-related-card" key={`article-bottom-related-skeleton-${index}`}>
              <SkeletonBlock />
              <span>
                <SkeletonBlock />
                <SkeletonBlock className="is-short" />
              </span>
            </div>
          ))}
        </div>
        <div className="article-skeleton-comments">
          <div>
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
          <SkeletonBlock />
        </div>
      </div>
    </article>

    <div className="article-skeleton-mobile-actions" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonBlock key={`article-mobile-action-skeleton-${index}`} />
      ))}
    </div>
  </div>
);

const ArticleDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [replies, setReplies] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [deletingComment, setDeletingComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [relatedContent, setRelatedContent] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [authorContent, setAuthorContent] = useState([]);
  const [authorContentLoading, setAuthorContentLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAuthorStatusViewer, setShowAuthorStatusViewer] = useState(false);
  const [twoFactorPrompt, setTwoFactorPrompt] = useState(null);
  const [sensitiveAuthPrompt, setSensitiveAuthPrompt] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [mobileCardSeed, setMobileCardSeed] = useState(() => `${Date.now()}-${Math.random()}`);
  const [savedArticle, setSavedArticle] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const contentId = article?._id || id;

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    if (!article?._id) {
      setRelatedContent([]);
      setAuthorContent([]);
      return;
    }

    let cancelled = false;
    setRelatedLoading(true);
    api.get(`/articles/${article._id}/related?limit=12`)
      .then(({ data }) => {
        if (!cancelled) setRelatedContent(Array.isArray(data.related) ? data.related : []);
      })
      .catch(() => {
        if (!cancelled) setRelatedContent([]);
      })
      .finally(() => {
        if (!cancelled) setRelatedLoading(false);
      });

    setAuthorContentLoading(true);
    api.get(`/articles/${article._id}/author-content?limit=12`)
      .then(({ data }) => {
        if (!cancelled) setAuthorContent(Array.isArray(data.authorContent) ? data.authorContent : []);
      })
      .catch(() => {
        if (!cancelled) setAuthorContent([]);
      })
      .finally(() => {
        if (!cancelled) setAuthorContentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [article?._id]);

  useEffect(() => {
    setActiveGalleryIndex(0);
    setMobileCardSeed(`${Date.now()}-${Math.random()}`);
  }, [article?._id]);

  useEffect(() => {
    if (!contentId) return;
    const key = `lekhon:saved-article:${user?._id || 'guest'}:${contentId}`;
    setSavedArticle(localStorage.getItem(key) === '1');
  }, [contentId, user?._id]);

  useEffect(() => {
    if (!contentId) return;
    const likeCount = Number(article?.likeCount ?? article?.likes?.length ?? 0);
    const commentCount = comments.length || Number(article?.commentCount ?? 0);

    const detail = {
      contentId,
      pathname: window.location.pathname,
      type: 'article',
      likeCount: Number.isFinite(likeCount) ? likeCount : 0,
      commentCount: Number.isFinite(commentCount) ? commentCount : 0,
      liked,
    };
    window.__lekhonContentStats = detail;
    window.dispatchEvent(new CustomEvent('lekhon:content-stats', { detail }));
  }, [article?.likeCount, article?.likes, article?.commentCount, comments.length, contentId, liked]);

  useEffect(() => {
    // console.log('ArticleDetails mounted, id:', id);
    fetchArticle();
    fetchComments();
    trackView();
  }, [id]);

  useEffect(() => {
    const handleNewComment = () => {
      fetchComments();
    };

    window.addEventListener('newComment', handleNewComment);

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('comment:new', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(article?._id)) {
          fetchComments();
        }
      });

      socket.on('comment:updated', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(article?._id)) {
          fetchComments();
        }
      });

      socket.on('comment:deleted', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(article?._id)) {
          fetchComments();
        }
      });
    }

    return () => {
      window.removeEventListener('newComment', handleNewComment);
      if (socket) {
        socket.off('comment:new');
        socket.off('comment:updated');
        socket.off('comment:deleted');
      }
    };
  }, [id, article?._id]);

  const fetchArticle = async () => {
    try {
      // console.log('Fetching article:', id);
      const { data } = await api.get(`/articles/${id}`);
      // console.log('Article data:', data);
      setArticle(data.article);
      setLiked(data.article.likes?.some(like => like._id === user?._id));
      setIsFollowingAuthor(Boolean(data.article.author?.isFollowing));

      if (data.redirect?.shouldRedirect && data.redirect?.to) {
        navigate(data.redirect.to, { replace: true });
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error('Failed to load article');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      await api.post(`/articles/${contentId}/view`);
    } catch (error) {
      console.error('View tracking failed');
    }
  };

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/comments/${contentId}?isArticle=true`);
      const commentsWithReplies = await Promise.all(data.comments.map(async (comment) => {
        const replyCount = await api.get(`/comments/${comment._id}/replies`).then(res => res.data.replies.length).catch(() => 0);
        return { ...comment, replyCount };
      }));
      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchReplies = async (commentId, keepOpen = false) => {
    setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
    try {
      const { data } = await api.get(`/comments/${commentId}/replies`);
      setReplies(prev => ({ ...prev, [commentId]: data.replies }));

      if (keepOpen) {
        setShowReplies(prev => ({ ...prev, [commentId]: true }));
      } else {
        setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/articles/${contentId}/like`);
      setArticle((current) => ({ ...current, likes: data.likes, likeCount: data.likeCount }));
      setLiked(data.liked);
      if (data.liked) toast.success('Article liked!');
    } catch (error) {
      toast.error('Failed to like article');
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyTextToClipboard = async (value, successMessage = 'Link copied to clipboard!') => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success(successMessage);
      } catch (err) {
        toast.error('Failed to copy link');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSaveArticle = () => {
    if (!contentId) return;
    const key = `lekhon:saved-article:${user?._id || 'guest'}:${contentId}`;
    const nextSaved = !savedArticle;
    setSavedArticle(nextSaved);
    if (nextSaved) {
      localStorage.setItem(key, '1');
      toast.success('Article saved to your reading list.');
    } else {
      localStorage.removeItem(key);
      toast.success('Article removed from saved items.');
    }
  };

  const handleRepost = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!article) return;

    navigate('/create', {
      state: {
        repostContent: article.content || '',
        repostTitle: article.title || '',
        repostTags: Array.isArray(article.tags) ? article.tags.join(', ') : article.tags || '',
        repostMetaDescription: article.metaDescription || article.excerpt || '',
        repostCategory: article.category,
        repostCoverImage: article.coverImage || article.image || article.featuredImage,
      },
    });
  };

  const handleGiftArticle = () => {
    setShowGiftModal(true);
  };

  const scrollToComments = () => {
    const commentsSection = document.getElementById('article-comments-section');
    if (!commentsSection) return;
    commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const input = commentsSection.querySelector('.article-comments-textarea');
      if (input) input.focus({ preventScroll: true });
    }, 420);
  };

  useEffect(() => {
    const handleContentAction = (event) => {
      const action = event.detail?.action;
      if (action === 'like') handleLike();
      if (action === 'comment') scrollToComments();
      if (action === 'save') handleSaveArticle();
      if (action === 'share') handleShare();
      if (action === 'repost') handleRepost();
    };

    window.addEventListener('lekhon:content-action', handleContentAction);
    return () => window.removeEventListener('lekhon:content-action', handleContentAction);
  }, [handleLike, handleSaveArticle, handleRepost, handleShare, scrollToComments]);

  const handleFollowAuthor = async () => {
    const authorId = article?.author?._id;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!authorId || authorId === user._id) return;
    if (isFollowingAuthor) return;

    setFollowLoading(true);
    try {
      const { data } = await api.post(`/social/follow-only/${authorId}`);
      const nextFollowing = Boolean(data.following);
      setIsFollowingAuthor(nextFollowing);
      setArticle((current) => {
        if (!current?.author) return current;
        const wasFollowing = Boolean(current.author.isFollowing ?? isFollowingAuthor);
        const currentFollowerCount = Number(
          current.author.followerCount ?? current.author.followersCount ?? 0
        );
        const apiFollowerCount = Number(data.followerCount);
        const nextFollowerCount = Number.isFinite(apiFollowerCount)
          ? apiFollowerCount
          : Math.max(0, currentFollowerCount + (nextFollowing && !wasFollowing ? 1 : 0));
        return {
          ...current,
          author: {
            ...current.author,
            isFollowing: nextFollowing,
            followerCount: nextFollowerCount,
            followersCount: nextFollowerCount,
          },
        };
      });
      toast.success(data.alreadyFollowing ? 'Already following author.' : 'Following author.');
    } catch (error) {
      toast.error('Failed to follow author.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBackToArticles = () => {
    navigate('/home?content=articles', { state: { contentFilter: 'articles' } });
  };

  const shareUrl = window.location.href;
  const shareTitle = article?.title || 'Check out this article';
  const giftUrl = (() => {
    try {
      const url = new URL(shareUrl);
      url.searchParams.set('gift', '1');
      return url.toString();
    } catch (error) {
      return `${shareUrl}${shareUrl.includes('?') ? '&' : '?'}gift=1`;
    }
  })();

  const handleReply = async (parentCommentId, content, replyToUserId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/comments/${contentId}?isArticle=true`, {
        content,
        parentComment: parentCommentId,
        replyTo: replyToUserId
      });

      setComments(prev => updateCommentsById(prev, parentCommentId, comment => bumpReplyCount(comment, 1)));
      setReplies(prev => updateReplyMapById(prev, parentCommentId, comment => bumpReplyCount(comment, 1)));

      await fetchReplies(parentCommentId, true);
      window.dispatchEvent(new CustomEvent('newComment'));
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/comments/${commentId}/like`);

      setComments(prev => prev.map(comment =>
        comment._id === commentId ? { ...comment, likes: data.likes, dislikes: data.dislikes } : comment
      ));

      setReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].map(reply =>
            reply._id === commentId ? { ...reply, likes: data.likes, dislikes: data.dislikes } : reply
          );
        });
        return newReplies;
      });
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleDislikeComment = async (commentId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/comments/${commentId}/dislike`);

      setComments(prev => prev.map(comment =>
        comment._id === commentId ? { ...comment, likes: data.likes, dislikes: data.dislikes } : comment
      ));

      setReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].map(reply =>
            reply._id === commentId ? { ...reply, likes: data.likes, dislikes: data.dislikes } : reply
          );
        });
        return newReplies;
      });
    } catch (error) {
      console.error('Error disliking comment:', error);
    }
  };

  const handleHeartComment = async (commentId) => {
    if (!user || !article || user._id !== article.author._id) return;

    try {
      const { data } = await api.post(`/comments/${commentId}/heart`);
      setComments(prev => prev.map(comment =>
        comment._id === commentId ? { ...comment, isHearted: data.isHearted } : comment
      ));
      setReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].map(reply =>
            reply._id === commentId ? { ...reply, isHearted: data.isHearted } : reply
          );
        });
        return newReplies;
      });
    } catch (error) {
      console.error('Error hearting comment:', error);
    }
  };

  const handlePinComment = async (commentId) => {
    if (!user || !article || user._id !== article.author._id) return;

    try {
      const { data } = await api.post(`/comments/${commentId}/pin`);
      setComments(prev => prev.map(comment =>
        comment._id === commentId ? { ...comment, isPinned: data.isPinned } : comment
      ));
      fetchComments();
    } catch (error) {
      console.error('Error pinning comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    setDeletingComment(commentId);
    try {
      await api.delete(`/comments/${commentId}`);

      setComments(prev => prev.filter(c => c._id !== commentId));
      setReplies(prev => removeCommentFromReplyMap(prev, commentId));
      await fetchArticle();
      window.dispatchEvent(new CustomEvent('newComment'));
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setDeletingComment(null);
    }
  };

  const handleEditComment = (commentId, currentText) => {
    setEditingComment(commentId);
    setEditText(currentText);
  };

  const handleSaveEdit = async (commentId) => {
    try {
      const { data } = await api.put(`/comments/${commentId}`, { content: editText });
      setComments(prev => prev.map(comment =>
        comment._id === commentId ? { ...comment, content: data.comment.content } : comment
      ));
      setReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].map(reply =>
            reply._id === commentId ? { ...reply, content: data.comment.content } : reply
          );
        });
        return newReplies;
      });
      setEditingComment(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const sortedComments = useMemo(() => {
    const sorted = [...comments].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else {
        const aEngagement = (a.likes?.length || 0) + (a.replyCount || 0);
        const bEngagement = (b.likes?.length || 0) + (b.replyCount || 0);
        return bEngagement - aEngagement;
      }
    });
    return sorted;
  }, [comments, sortBy]);

  const shareOptions = [
    {
      key: 'facebook',
      name: 'Facebook',
      icon: <FaFacebook />,
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
    },
    {
      key: 'twitter',
      name: 'Twitter',
      icon: <FaXTwitter />,
      action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank')
    },
    {
      key: 'linkedin',
      name: 'LinkedIn',
      icon: <FaLinkedin />,
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp',
      icon: <FaWhatsapp />,
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`, '_blank')
    },
    {
      key: 'email',
      name: 'Email',
      icon: <FaEnvelope />,
      action: () => window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`
    },
    {
      key: 'copy',
      name: 'Copy Link',
      icon: <FaLink />,
      action: async () => {
        await copyTextToClipboard(shareUrl);
        setShowShareModal(false);
      }
    }
  ];

  const performDelete = async ({ sensitiveActionToken, twoFactorToken } = {}) => {
    await api.delete(`/articles/${contentId}`, {
      headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
      data: {
        ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
        ...(twoFactorToken ? { twoFactorToken } : {}),
      },
    });
    toast.success('Article deleted successfully!');
    setTimeout(() => navigate(-1), 1000);
  };

  const handleDelete = async () => {
    if (!['admin', 'coAdmin'].includes(user?.role)) {
      setShowDeleteModal(false);
      setSensitiveAuthPrompt(true);
      return;
    }

    setDeleting(true);
    try {
      await performDelete();
    } catch (error) {
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        setTwoFactorPrompt({
          ...requirement,
          onVerified: performDelete,
        });
        setShowDeleteModal(false);
        setDeleting(false);
        return;
      }
      toast.error('Failed to delete article');
      setDeleting(false);
    }
  };

  const handleTwoFactorVerified = async (token) => {
    const prompt = twoFactorPrompt;
    setTwoFactorPrompt(null);
    if (!prompt?.onVerified) return;
    setDeleting(true);
    try {
      await prompt.onVerified(token);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete article');
      setDeleting(false);
    }
  };

  const handleSensitiveAuthVerified = async (result) => {
    setSensitiveAuthPrompt(false);
    const sensitiveActionToken = result.sensitiveActionToken;
    if (result.requiresTwoFactor) {
      setTwoFactorPrompt({
        action: result.action || 'delete_article',
        actionLabel: result.actionLabel || 'delete this article',
        twoFactor: result.twoFactor,
        onVerified: async (twoFactorToken) => performDelete({ sensitiveActionToken, twoFactorToken }),
      });
      return;
    }

    setDeleting(true);
    try {
      await performDelete({ sensitiveActionToken });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete article');
      setDeleting(false);
    }
  };

  const handleDeleteForgotPassword = () => {
    setSensitiveAuthPrompt(false);
    navigate('/profile?forgotPassword=1');
  };

  const canonicalPath = typeof window !== 'undefined' ? window.location.pathname : `/article/${id}`;
  const seoTitle = article?.title || (loading ? 'Loading Article' : 'Article Not Found');
  const seoDescription = article?.metaDescription || '';
  const seoContent = article?.content || '';
  const seoImage = article?.coverImage || '/image/lekhon_url.png';
  const seoNoIndex = !loading && !article;
  const authorName = article?.author?.fullName || article?.author?.username || 'Editorial Desk';
  const articleCategory = article?.category || 'General';
  const articlePublishedDate = formatArticleDate(article?.publishedAt || article?.createdAt);
  const articleReadMinutes = article?.readingTime || article?.readTime || estimateReadTime(article?.content);
  const articleDescription = article?.metaDescription || article?.excerpt || article?.summary || '';
  const articleCoverImage = article?.coverImage || article?.image || article?.featuredImage || '/image/lekhon_url.png';
  const articleGalleryMedia = useMemo(
    () => normalizeArticleGalleryMedia(article, articleCoverImage),
    [article, articleCoverImage]
  );
  const articleProductTags = useMemo(
    () => normalizeArticleProductTags(article),
    [article]
  );
  const authorFollowerCount = article?.author?.followerCount ?? article?.author?.followersCount ?? article?.author?.followers?.length ?? 0;
  const authorArticleCountFromApi = Number(article?.author?.articleCount ?? article?.author?.articlesCount ?? 0);
  const authorArticleCount = Math.max(
    authorArticleCountFromApi,
    article?._id ? 1 : 0,
    (authorContent.filter((item) => item.contentType === 'article').length || 0) + (article?._id ? 1 : 0)
  );
  const authorFirstName = getAuthorFirstName(authorName);
  const canFollowAuthor = Boolean(user && article?.author?._id && user._id !== article.author._id);
  const authorRelatedContent = authorContent.slice(0, 8);
  const bottomRelatedContent = relatedContent.slice(0, 12);
  const getMobileCardVariant = (item, index, section) => {
    const sectionOffset = hashString(`${mobileCardSeed}:${section}`) % 3;
    return (index + sectionOffset) % 3 === 0 ? 'split' : 'editorial';
  };
  const { lead: articleLead, rest: articleRest } = useMemo(
    () => splitArticleContent(article?.content || ''),
    [article?.content]
  );

  useEffect(() => {
    if (activeGalleryIndex >= articleGalleryMedia.length) {
      setActiveGalleryIndex(0);
    }
  }, [activeGalleryIndex, articleGalleryMedia.length]);

  if (loading) {
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          content={seoContent}
          canonicalUrl={canonicalPath}
          image={seoImage}
          type="article"
        />
        <ArticleDetailSkeleton />
      </>
    );
  }

  if (!article) {
    return (
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        content={seoContent}
        canonicalUrl={canonicalPath}
        image={seoImage}
        type="article"
        noIndex={seoNoIndex}
      />
    );
  }

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        content={seoContent}
        canonicalUrl={canonicalPath}
        image={seoImage}
        type="article"
      />
      <div className="article-detail-page-custom" style={{ minHeight: '100vh' }}>
        {/* Reading Progress Bar */}
        <div className="reading-progress"
          style={{ width:`${progress}%`, background:'linear-gradient(90deg, var(--article-accent), var(--article-accent-soft))' }} />
        <Toaster />
        
        <div className="article-detail-backbar-custom">
        <div className="article-detail-backinner-custom">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={handleBackToArticles}
              className="article-detail-backbutton-custom"
              aria-label={t('Back to all articles')}
            >
              <FaArrowLeft /> {t('Back to all articles')}
            </button>
          </div>
        </div>
      </div>

      <article className="article-detail-shell-custom relative">
        <section className="article-editorial-layout" aria-label={article.title}>
          <div className="article-editorial-top">
            <header className="article-editorial-head">
              <div className="article-editorial-logo-mark" aria-hidden="true">
                <img className="article-editorial-logo-dark" src="/image/article_logo_dark.png" alt="" />
                <img className="article-editorial-logo-light" src="/image/article_logo_light.png" alt="" />
              </div>
              <p className="article-editorial-kicker">
                Custom Layout <span>|</span> {articleCategory}
              </p>
              <h1 className="article-editorial-title">{article.title}</h1>
              {articleDescription && (
                <p className="article-editorial-deck">{articleDescription}</p>
              )}
              <div className="article-editorial-meta-strip" aria-label="Article summary">
                <span><FaFeatherAlt /> {article?.customTemplate?.name || article?.templateName || 'My Signature Layout 102'}</span>
                <span>By {authorName}</span>
                <span>{articlePublishedDate}</span>
                <span>{articleReadMinutes} min read</span>
              </div>
            </header>

            <aside className="article-editorial-meta-panel" aria-label="Article information">
              <dl className="article-editorial-meta-list">
                <div>
                  <dt><FaRegUser /> Author</dt>
                  <dd>{authorName}</dd>
                </div>
                <div>
                  <dt><FaRegCalendarAlt /> Published</dt>
                  <dd>{articlePublishedDate}</dd>
                </div>
                <div>
                  <dt><FaRegClock /> Read Time</dt>
                  <dd>{articleReadMinutes} min</dd>
                </div>
                <div>
                  <dt><FaRegFolderOpen /> Category</dt>
                  <dd><span className="article-editorial-category-pill">{articleCategory}</span></dd>
                </div>
              </dl>
              <div className="article-editorial-actions" aria-label="Article actions">
                <button
                  type="button"
                  onClick={handleSaveArticle}
                  className={savedArticle ? 'is-active' : ''}
                  aria-label={savedArticle ? t('Remove saved article') : t('Save article')}
                  aria-pressed={savedArticle}
                >
                  <FaRegBookmark />
                  <span>{t('Save')}</span>
                </button>
                <button type="button" onClick={handleRepost} aria-label={t('Repost')}>
                  <FaRetweet />
                  <span>{t('Repost')}</span>
                </button>
                <button type="button" onClick={handleGiftArticle} aria-label={t('Gift this article')}>
                  <FaGift />
                  <span>{t('Gift')}</span>
                </button>
                <button type="button" onClick={handleShare} aria-label={t('More')}>
                  <FaEllipsisH />
                  <span>{t('More')}</span>
                </button>
              </div>
            </aside>

            <ArticleGalleryDock
              title={article.title}
              category={articleCategory}
              mediaItems={articleGalleryMedia}
              activeIndex={activeGalleryIndex}
              setActiveIndex={setActiveGalleryIndex}
              productTags={articleProductTags}
              placements={article?.productTagPlacements || []}
            />
          </div>

          <div className="article-editorial-reader-grid">
            <aside className="article-editorial-engagement-rail" aria-label="Article engagement">
              <button
                type="button"
                onClick={handleLike}
                className={liked ? 'is-active' : ''}
                aria-label={liked ? t('Unlike article') : t('Like article')}
              >
                <FaHeart />
                <span>{compactCount(article.likeCount || article.likes?.length || 0)}</span>
              </button>
              <button type="button" onClick={scrollToComments} aria-label={t('Jump to comments')}>
                <FaRegCommentDots />
                <span>{compactCount(article.commentCount || comments.length)}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveArticle}
                className={savedArticle ? 'is-active' : ''}
                aria-label={savedArticle ? t('Remove saved article') : t('Save article')}
                aria-pressed={savedArticle}
              >
                <FaRegBookmark />
              </button>
              <button type="button" onClick={handleRepost} aria-label={t('Repost')}>
                <FaRetweet />
              </button>
              <button type="button" onClick={handleShare} aria-label={t('Share')}>
                <FaRegShareSquare />
              </button>
            </aside>

            <section className="article-editorial-body">
              {articleLead && <p className="article-editorial-lead">{articleLead}</p>}
              {articleRest && <ReactMarkdown>{articleRest}</ReactMarkdown>}
            </section>

            <aside className="article-editorial-author-panel" aria-label={t('About the Author')}>
              <div className="article-editorial-author-row">
                {article.author?.hasActiveStatus && article.author?.statuses?.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAuthorStatusViewer(true)}
                    className="article-editorial-author-avatar"
                    title={t('View author status')}
                  >
                    <Avatar user={article.author} size="lg" showStatusRing />
                  </button>
                ) : (
                  <Link to={`/user/${article.author?._id || ''}`} className="article-editorial-author-avatar">
                    <Avatar user={article.author} size="lg" showStatusRing />
                  </Link>
                )}
                <div>
                  <Link to={`/user/${article.author?._id || ''}`} className="article-editorial-author-name">
                    <span>{authorName}</span>
                    {article.author?.isGuest ? (
                      <TbBrandAmongUs className="article-editorial-author-guest" size={15} />
                    ) : article.author?.isVerified && (
                      <GoVerified className="article-editorial-author-verified" size={15} />
                    )}
                  </Link>
                  <p>{article.author?.roleLabel || article.author?.occupation || 'Writer & Researcher'}</p>
                </div>
              </div>
              <div className="article-editorial-author-stats">
                <span>{compactCount(authorFollowerCount)} followers</span>
                <span>{compactCount(authorArticleCount)} articles</span>
                {canFollowAuthor && (
                  <button
                    type="button"
                    onClick={handleFollowAuthor}
                    disabled={followLoading || isFollowingAuthor}
                    className={`article-editorial-follow-button ${isFollowingAuthor ? 'is-following' : ''}`}
                    aria-pressed={isFollowingAuthor}
                    aria-label={isFollowingAuthor ? t('Following author') : t('Follow author')}
                  >
                    {followLoading ? (
                      t('...')
                    ) : isFollowingAuthor ? (
                      <>
                        <FaUserCheck /> {t('Following')}
                      </>
                    ) : (
                      <>
                        <FaUserPlus /> {t('Follow')}
                      </>
                    )}
                  </button>
                )}
              </div>
              {article.author?.bio && (
                <p className="article-editorial-author-bio">{article.author.bio}</p>
              )}
              <Link to={`/user/${article.author?._id || ''}`} className="article-editorial-profile-link">
                {t('View full profile')} <span aria-hidden="true">-></span>
              </Link>
              {user?._id === article.author?._id && (
                <div className="article-editorial-owner-tools">
                  <button type="button" onClick={() => navigate(`/edit/${contentId}`)}>
                    <FaEdit /> {t('Edit')}
                  </button>
                  <button type="button" onClick={() => setShowDeleteModal(true)}>
                    <FaTrash /> {t('Delete')}
                  </button>
                </div>
              )}
              {(authorRelatedContent.length > 0 || authorContentLoading) && (
                <section className="article-editorial-side-related article-author-related-section" aria-label={`More from ${authorName}`}>
                  <p className="article-editorial-side-related-title">More From {authorFirstName}</p>
                  <div className="article-author-content-grid">
                    {authorContentLoading && authorRelatedContent.length === 0 ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <div className="article-related-card is-compact is-loading" key={`author-loading-${index}`}>
                          <span />
                          <span />
                        </div>
                      ))
                    ) : (
                      authorRelatedContent.map((item, index) => (
                        <RelatedContentCard
                          key={`${item.contentType}-${item._id}`}
                          item={item}
                          variant="editorial"
                          mobileVariant={getMobileCardVariant(item, index, 'author')}
                        />
                      ))
                    )}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </section>

        <div className="article-detail-afterword-custom">
        {(bottomRelatedContent.length > 0 || relatedLoading) && (
          <section className="article-related-section" aria-label="More like this content">
            <div className="article-related-heading">
              <span />
              <div>
                <p>More Like This</p>
                <small>Popular reads from {articleCategory} and nearby interests.</small>
              </div>
            </div>
            <div className="article-related-grid article-related-limited-grid">
              {relatedLoading && bottomRelatedContent.length === 0 ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div className="article-related-card is-loading" key={`related-loading-${index}`}>
                    <span />
                    <span />
                  </div>
                ))
              ) : (
                bottomRelatedContent.map((item, index) => (
                  <RelatedContentCard
                    key={`${item.contentType}-${item._id}`}
                    item={item}
                    variant="split"
                    mobileVariant={getMobileCardVariant(item, index, 'related')}
                  />
                ))
              )}
            </div>
          </section>
        )}
        {showAuthorStatusViewer && article.author?.statuses?.length > 0 && (
          <StatusViewer
            statuses={article.author.statuses}
            initialIndex={0}
            onClose={() => setShowAuthorStatusViewer(false)}
            userName={article.author?.username || t('Author')}
          />
        )}

        <section id="article-comments-section" className="article-comments-panel" aria-label={t('Comments')}>
          <div className="article-comments-header">
            <h2 className="article-comments-title">{t('Comments')} <span>{comments.length}</span></h2>
            <div className="article-comments-sort">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="article-comments-sort-button"
              >
                <BiMenuAltRight className="w-4 h-4" />
                {sortBy === 'newest' ? t('Newest First') : t('Most Engaging')}
              </button>
              {showSortMenu && (
                <div className="article-comments-sort-menu">
                  <button
                    className={sortBy === 'top' ? 'is-active' : ''}
                    onClick={() => { setSortBy('top'); setShowSortMenu(false); }}
                  >
                    {t('Most Engaging')}
                  </button>
                  <button
                    className={sortBy === 'newest' ? 'is-active' : ''}
                    onClick={() => { setSortBy('newest'); setShowSortMenu(false); }}
                  >
                    {t('Newest First')}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {user && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newComment.trim()) return;
              try {
                await api.post(`/comments/${contentId}?isArticle=true`, { content: newComment });
                setNewComment('');
                await fetchComments();
                await fetchArticle();
                toast.success('Comment added!');
              } catch (error) {
                toast.error('Failed to add comment');
              }
            }} className="article-comments-form">
              <div className="article-comments-compose">
                <Avatar user={user} size="sm" />
                <div className="article-comments-editor">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="article-comments-textarea"
                    rows="3"
                    placeholder={t('Write a comment...')}
                  />
                  {newComment.trim() && (
                    <div className="article-comments-form-actions">
                      <button
                        type="button"
                        onClick={() => setNewComment('')}
                        className="article-comments-soft-button"
                      >
                        {t('Cancel')}
                      </button>
                      <button
                        type="submit"
                        className="article-comments-primary-button"
                      >
                        {t('Add Comment')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}

          <div className="article-comments-list">
            {sortedComments.length === 0 ? (
              <div className="article-comments-empty">
                <FaComment />
                <p>{t('No comments yet. Be the first to comment!')}</p>
              </div>
            ) : (
              sortedComments.map((comment) => (
                <EnhancedComment
                  key={comment._id}
                  comment={comment}
                  isOwner={user?._id === article?.author._id}
                  onReply={handleReply}
                  onLike={handleLikeComment}
                  onDislike={handleDislikeComment}
                  onHeart={handleHeartComment}
                  onPin={handlePinComment}
                  onDelete={handleDeleteComment}
                  onEdit={handleEditComment}
                  onSaveEdit={handleSaveEdit}
                  editingComment={editingComment}
                  editText={editText}
                  setEditText={setEditText}
                  onLoadReplies={fetchReplies}
                  replies={replies[comment._id] || []}
                  replyMap={replies}
                  showReplies={showReplies[comment._id]}
                  showRepliesMap={showReplies}
                  loadingReplies={loadingReplies[comment._id]}
                  loadingRepliesMap={loadingReplies}
                  deletingComment={deletingComment}
                  postOwner={article?.author}
                  showAuthorBadge={true}
                />
              ))
            )}
          </div>
        </section>
        </div>
      </article>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 theme-modal-overlay article-share-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="theme-modal-card article-share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="article-share-head">
              <div>
                <p>{t('Share')}</p>
                <h3>{t('Share this article')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="article-share-close"
                aria-label={t('Close share dialog')}
              >
                <FaTimes />
              </button>
            </div>

            <div className="article-share-preview">
              <span className="article-share-preview-mark" aria-hidden="true">
                <img src="/image/article_logo_light.png" alt="" />
              </span>
              <span>
                <strong>{article.title}</strong>
                <small>{new URL(shareUrl).host}</small>
              </span>
            </div>

            <div className="article-share-options">
              {shareOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={option.action}
                  className={`article-share-option is-${option.key}`}
                  aria-label={`${t('Share with')} ${option.name}`}
                >
                  <span className="article-share-icon" aria-hidden="true">{option.icon}</span>
                  <span>{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showGiftModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowGiftModal(false)}>
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full article-gift-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <p className="article-gift-modal-kicker">{t('Gift article')}</p>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{article.title}</h3>
              </div>
              <button onClick={() => setShowGiftModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label={t('Close gift dialog')}>
                <FaTimes size={22} />
              </button>
            </div>
            <p className="article-gift-modal-copy">
              {t('Send a clean gift link so someone can open this article directly.')}
            </p>
            <div className="article-gift-link-box">
              <span>{giftUrl}</span>
              <button
                type="button"
                onClick={async () => {
                  await copyTextToClipboard(giftUrl, 'Gift link copied.');
                  setShowGiftModal(false);
                }}
              >
                <FaLink /> {t('Copy gift link')}
              </button>
            </div>
            <button
              type="button"
              className="article-gift-share-button"
              onClick={() => {
                setShowGiftModal(false);
                setShowShareModal(true);
              }}
            >
              <FaRegShareSquare /> {t('More sharing options')}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
        {showDeleteModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('Delete Article')}</h3>
            <p className="text-[var(--text-secondary)] mb-6">{t('Are you sure you want to delete this article? This action cannot be undone.')}</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? t('Deleting...') : t('Delete')}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 theme-soft-button px-6 py-2 rounded-lg disabled:opacity-50"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>
        )}

      <TwoFactorVerificationModal
        open={Boolean(twoFactorPrompt)}
        action={twoFactorPrompt?.action}
        actionLabel={twoFactorPrompt?.actionLabel}
        twoFactor={twoFactorPrompt?.twoFactor}
        requestChallenge={requestAuthenticatedTwoFactorChallenge}
        verifyChallenge={verifyAuthenticatedTwoFactorChallenge}
        onVerified={handleTwoFactorVerified}
        onClose={() => setTwoFactorPrompt(null)}
      />

      <SensitiveActionAuthModal
        open={sensitiveAuthPrompt}
        action="delete_article"
        actionLabel="delete this article"
        title={t('Verify before deleting')}
        description={t('Confirm your password before this article is permanently deleted.')}
        onVerified={handleSensitiveAuthVerified}
        onForgotPassword={handleDeleteForgotPassword}
        onClose={() => setSensitiveAuthPrompt(false)}
      />
      </div>
    </>
  );
};

export default ArticleDetails;


