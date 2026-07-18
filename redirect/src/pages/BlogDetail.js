import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import ReadingProgressBar from '../components/ReadingProgressBar';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import SafeMarkdown from '../components/SafeMarkdown';
import { FaHeart, FaComment, FaClock, FaEdit, FaTrash, FaArrowLeft, FaShare, FaRetweet, FaTimes, FaFacebook, FaLinkedin, FaWhatsapp, FaEnvelope, FaLink, FaUserPlus, FaUserCheck, FaChevronDown, FaChevronUp, FaEye, FaLock, FaExternalLinkAlt, FaRegBookmark, FaRegCommentDots, FaFeatherAlt } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { GoVerified } from 'react-icons/go';
import { BiMenuAltRight } from 'react-icons/bi';
import { TbBrandAmongUs, TbBrandBlogger } from 'react-icons/tb';
import { MdOutlineSwitchAccessShortcutAdd } from 'react-icons/md';
import { RxVideo } from 'react-icons/rx';
import { BlogDetailSkeleton } from '../components/SkeletonLoader';
import soundNotification from '../utils/soundNotifications';
import { BarLoader, ScaleLoader } from 'react-spinners';
import toast, { Toaster } from 'react-hot-toast';
import Avatar from '../components/Avatar';
import AudioControls from '../components/AudioControls';
import ScrollToTop from '../components/ScrollToTop';
import EnhancedComment from '../components/EnhancedComment';
import StatusViewer from '../components/StatusViewer';
import SEOHead from '../components/SEOHead';
import { bumpReplyCount, removeCommentFromReplyMap, updateCommentsById, updateReplyMapById } from '../utils/commentTree';
import TwoFactorVerificationModal from '../components/TwoFactorVerificationModal';
import SensitiveActionAuthModal from '../components/SensitiveActionAuthModal';
import {
  buildSensitiveActionHeaders,
  getTwoFactorRequirement,
  requestAuthenticatedTwoFactorChallenge,
  verifyAuthenticatedTwoFactorChallenge,
} from '../utils/twoFactorFlow';
import {
  getSavedUserKey,
  isSavedContentMeta,
  removeSavedContentMeta,
  saveSavedContentMeta,
} from '../utils/savedItemsStorage';
import {
  SAFE_EMBED_IFRAME_ALLOW,
  SAFE_EMBED_IFRAME_SANDBOX,
  SAFE_EMBED_REFERRER_POLICY,
  getSafeHttpUrl,
  getSafeDirectVideoUrl,
  getSafeVideoRenderInfo,
} from '../utils/safeMediaUrls';

const compactCount = (value = 0) => {
  const count = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    notation: count >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(count);
};

const estimateReadTime = (content = '') => {
  const wordCount = String(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 220));
};

const stripInlineMarkdown = (value = '') =>
  String(value)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const hashString = (value = '') => {
  const text = String(value || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getAuthorFirstName = (name = '') => String(name || 'Author').trim().split(/\s+/)[0] || 'Author';

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

const clampPercent = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(4, Math.min(96, numeric));
};

const normalizeBlogImages = (blog) => {
  const seen = new Set();
  return [blog?.coverImage, ...(Array.isArray(blog?.galleryImages) ? blog.galleryImages : [])]
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
};

const normalizeVideoUrls = (blog) => {
  const seen = new Set();
  return (Array.isArray(blog?.videoUrls) ? blog.videoUrls : [])
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
};

const isDirectVideoUrl = (url) => Boolean(getSafeDirectVideoUrl(url));

const normalizeBlogGalleryMedia = (blog) => [
  ...normalizeBlogImages(blog).map((src, index) => ({
    id: `image-${index}-${src}`,
    type: 'image',
    src,
  })),
  ...normalizeVideoUrls(blog)
    .map((src, index) => {
      const renderInfo = getSafeVideoRenderInfo(src);
      if (!renderInfo) return null;

      return {
        id: `video-${index}-${renderInfo.src}`,
        type: 'video',
        src: renderInfo.src,
        embedSrc: renderInfo.type === 'embed' ? renderInfo.src : '',
      };
    })
    .filter(Boolean),
];

const normalizeBlogProductTags = (blog) => {
  const productMap = new Map();
  const addProduct = (product) => {
    if (!product || typeof product !== 'object') return;
    const key = getMarketplaceProductKey(product);
    if (!key || key === 'product:' || productMap.has(key)) return;
    productMap.set(key, {
      key,
      source: 'marketplace',
      title: product.title || 'Marketplace product',
      image: product.transparentThumbnail || product.thumbnail || '/image/lekhon_url.png',
      meta: formatProductPrice(product),
      href: `/marketplace/${product.slug || product._id || product.id}`,
      external: false,
    });
  };

  (Array.isArray(blog?.linkedProducts) ? blog.linkedProducts : []).forEach(addProduct);
  addProduct(blog?.linkedProduct);

  const externalTags = (Array.isArray(blog?.externalProductLinks) ? blog.externalProductLinks : [])
    .filter(link => link && typeof link === 'object' && link.url)
    .map((link, index) => {
      const href = getSafeHttpUrl(link.url);
      if (!href) return null;
      return {
        key: getExternalProductKey(link, index),
        source: 'external',
        title: link.title || 'External product',
        image: getSafeHttpUrl(link.thumbnail) || '/image/lekhon_url.png',
        meta: link.priceLabel || link.platform || 'External',
        href,
        external: true,
      };
    })
    .filter(Boolean);

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
  if (item?.contentType === 'article') return `/article/${idOrSlug}`;
  if (item?.contentType === 'short') return `/shorts/${idOrSlug}`;
  return `/blog/${idOrSlug}`;
};

const getRelatedImage = (item) =>
  item?.coverImage || item?.image || item?.featuredImage || item?.galleryImages?.[0] || '/image/article_logo_dark.png';

const getRelatedExcerpt = (item) =>
  stripInlineMarkdown(item?.metaDescription || item?.excerpt || item?.summary || item?.content || '').slice(0, 128);

const getRelatedAuthorName = (item) =>
  item?.author?.fullName || item?.author?.username || item?.authorName || 'Lekhon author';

const getRelatedReadMinutes = (item) =>
  item?.readingTime || item?.readTime || estimateReadTime(item?.content || item?.metaDescription || '');

const getRelatedTypeLabel = (type) => {
  if (type === 'article') return 'Article';
  if (type === 'short') return 'Short';
  return 'Blog';
};

const getRelatedTypeIcon = (type) => {
  if (type === 'article') return FaFeatherAlt;
  if (type === 'short') return MdOutlineSwitchAccessShortcutAdd;
  return TbBrandBlogger;
};

const getRelatedTypeClass = (type) => {
  if (type === 'article' || type === 'short') return type;
  return 'blog';
};

const RelatedContentCard = ({ item, variant = 'split', mobileVariant = '' }) => {
  if (!item) return null;
  const image = getRelatedImage(item);
  const path = getRelatedPath(item);
  const label = getRelatedTypeLabel(item.contentType);
  const TypeIcon = getRelatedTypeIcon(item.contentType);
  const typeClass = getRelatedTypeClass(item.contentType);
  const useTypeLogoMedia = item.contentType === 'blog' || item.contentType === 'short';
  const author = item?.author && typeof item.author === 'object'
    ? item.author
    : { username: getRelatedAuthorName(item) };
  const authorName = getRelatedAuthorName(item);
  const readMinutes = getRelatedReadMinutes(item);
  const tags = (Array.isArray(item.tags) ? item.tags : []).filter(Boolean).slice(0, 3);

  return (
    <Link to={path} className={`article-related-card is-${variant} ${mobileVariant ? `mobile-${mobileVariant}` : ''}`}>
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
        {tags.length > 0 && (
          <span className="article-related-tags">
            {tags.map((tag) => <span key={tag}>{tag}</span>)}
          </span>
        )}
        <strong>{item.title || 'Untitled content'}</strong>
        <small>{getRelatedExcerpt(item)}</small>
        <span className="article-related-stats">
          <span><FaEye /> {compactCount(item.views || 0)}</span>
          <span><FaHeart /> {compactCount(item.likeCount || item.likes?.length || 0)}</span>
          <span><FaRegCommentDots /> {compactCount(item.commentCount || 0)}</span>
        </span>
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
      </span>
    </Link>
  );
};

const BlogGalleryDock = ({
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
  const touchStartX = useRef(null);
  const activeMedia = mediaItems[activeIndex] || mediaItems[0];
  const hasGallery = mediaItems.length > 1;
  const activeIsVideo = activeMedia?.type === 'video';

  useEffect(() => {
    setProductListOpen(false);
  }, [activeIndex]);

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
      if (event.key === 'Escape') setLightboxOpen(false);
      if (hasGallery && event.key === 'ArrowRight') {
        setActiveIndex((current) => (current + 1) % mediaItems.length);
      }
      if (hasGallery && event.key === 'ArrowLeft') {
        setActiveIndex((current) => (current - 1 + mediaItems.length) % mediaItems.length);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasGallery, mediaItems.length, lightboxOpen, setActiveIndex]);

  const goToMedia = (index) => {
    setIsPaused(false);
    setActiveIndex(index);
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
      };
    })
    .filter(Boolean);
  const firstTaggedProduct = activeProductDots[0];

  if (!activeMedia) return null;

  const openLightbox = () => {
    setIsPaused(true);
    setLightboxOpen(true);
  };

  const handleVideoKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openLightbox();
    }
  };

  return (
    <>
      <figure className="article-editorial-gallery blog-detail-gallery">
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
              role="button"
              tabIndex={0}
              onClick={openLightbox}
              onKeyDown={handleVideoKeyDown}
              aria-label="Open blog video"
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
                    src={activeMedia.embedSrc}
                    title={`${title} video ${activeIndex + 1}`}
                    allow={SAFE_EMBED_IFRAME_ALLOW}
                    sandbox={SAFE_EMBED_IFRAME_SANDBOX}
                    referrerPolicy={SAFE_EMBED_REFERRER_POLICY}
                    loading="lazy"
                    allowFullScreen
                  />
                )}
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="article-gallery-image-button"
              onClick={openLightbox}
              aria-label="Open blog image"
            >
              <img src={activeMedia.src} alt={title} />
            </button>
          )}

          {activeProductDots.length > 0 && (
            <div
              className={`blog-product-tag-overlay ${productListOpen ? 'is-open' : ''}`}
              aria-label="Tagged products"
              onClick={(event) => event.stopPropagation()}
            >
              {firstTaggedProduct?.image && (
                <img
                  className="blog-product-tag-preview"
                  src={firstTaggedProduct.image}
                  alt={firstTaggedProduct.title || 'Tagged product'}
                  loading="lazy"
                />
              )}
              <button
                type="button"
                className="blog-product-tag-trigger"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsPaused(true);
                  setProductListOpen((current) => !current);
                }}
                aria-label={`View ${activeProductDots.length} tagged product${activeProductDots.length === 1 ? '' : 's'}`}
                aria-expanded={productListOpen}
              >
                <span>{activeProductDots.length} product{activeProductDots.length === 1 ? '' : 's'}</span>
                {productListOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              {productListOpen && (
                <div className="blog-product-tag-panel">
                  <div className="blog-product-tag-head">
                    <strong>Tagged products</strong>
                    <small>{activeProductDots.length} item{activeProductDots.length === 1 ? '' : 's'}</small>
                  </div>
                  <div className="blog-product-tag-list">
                    {activeProductDots.map((tag) => (
                      <div className="blog-product-tag-item" key={tag.key}>
                        <img src={tag.image || '/image/lekhon_url.png'} alt="" />
                        <span className="blog-product-tag-copy">
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
          <div className="article-gallery-dots" aria-label="Blog media carousel">
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
          aria-label={activeIsVideo ? 'Blog video viewer' : 'Blog image viewer'}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="article-gallery-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image viewer"
          >
            <FaTimes />
          </button>
          <div className="article-gallery-lightbox-inner" onClick={(event) => event.stopPropagation()}>
            {activeIsVideo ? (
              <div className="article-gallery-lightbox-video">
                {isDirectVideoUrl(activeMedia.src) ? (
                  <video src={activeMedia.src} controls playsInline autoPlay />
                ) : (
                  <iframe
                    src={activeMedia.embedSrc}
                    title={`${title} video ${activeIndex + 1}`}
                    allow={SAFE_EMBED_IFRAME_ALLOW}
                    sandbox={SAFE_EMBED_IFRAME_SANDBOX}
                    referrerPolicy={SAFE_EMBED_REFERRER_POLICY}
                    loading="lazy"
                    allowFullScreen
                  />
                )}
              </div>
            ) : (
              <img src={activeMedia.src} alt={title} />
            )}
            {hasGallery && (
              <div className="article-gallery-lightbox-dots">
                {mediaItems.map((media, index) => (
                  <button
                    key={`${media.id}-lightbox-${index}`}
                    type="button"
                    className={`${media.type === 'video' ? 'is-video' : ''} ${activeIndex === index ? 'is-active' : ''}`.trim()}
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

const BlogDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [savedBlog, setSavedBlog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [relatedContent, setRelatedContent] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [authorContent, setAuthorContent] = useState([]);
  const [authorContentLoading, setAuthorContentLoading] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [mobileCardSeed] = useState(() => `${Date.now()}-${Math.random()}`);
  const [replies, setReplies] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [deletingComment, setDeletingComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [twoFactorPrompt, setTwoFactorPrompt] = useState(null);
  const [sensitiveAuthPrompt, setSensitiveAuthPrompt] = useState(false);
  const [progress, setProgress] = useState(0);
  const readerScrollRef = useRef(null);
  const commentsRef = useRef(null);
  const contentId = blog?._id || id;

  useEffect(() => {
    if (!contentId) return;
    setSavedBlog(isSavedContentMeta({
      type: 'blog',
      userKey: getSavedUserKey(user),
      id: contentId,
    }));
  }, [contentId, user?._id]);

  useEffect(() => {
    if (!contentId) return;
    const likeCount = Number(blog?.likeCount ?? blog?.likes?.length ?? 0);
    const commentCount = comments.length || Number(blog?.commentCount ?? 0);

    const detail = {
      contentId,
      pathname: window.location.pathname,
      type: 'blog',
      likeCount: Number.isFinite(likeCount) ? likeCount : 0,
      commentCount: Number.isFinite(commentCount) ? commentCount : 0,
      liked,
    };
    window.__lekhonContentStats = detail;
    window.dispatchEvent(new CustomEvent('lekhon:content-stats', { detail }));
  }, [blog?.likeCount, blog?.likes, blog?.commentCount, comments.length, contentId, liked]);

  useEffect(() => {
    const update = () => {
      const reader = readerScrollRef.current;
      if (reader) {
        const scrollHeight = reader.scrollHeight - reader.clientHeight;
        setProgress(scrollHeight > 0 ? (reader.scrollTop / scrollHeight) * 100 : 0);
        return;
      }

      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    const reader = readerScrollRef.current;
    update();
    reader?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      reader?.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update);
    };
  }, [contentId, loading]);

  useEffect(() => {
    fetchBlog();
    fetchComments();
  }, [id]);

  useEffect(() => {
    setShowAllComments(false);
    setActiveGalleryIndex(0);
  }, [id]);

  useEffect(() => {
    if (!blog?._id) {
      setRelatedContent([]);
      setAuthorContent([]);
      setRelatedLoading(false);
      setAuthorContentLoading(false);
      return undefined;
    }

    let cancelled = false;
    setRelatedLoading(true);
    api.get(`/blogs/${blog._id}/related?limit=12`)
      .then(({ data }) => {
        if (!cancelled) setRelatedContent(Array.isArray(data.related) ? data.related : []);
      })
      .catch((error) => {
        console.error('Error fetching related blog content:', error);
        if (!cancelled) setRelatedContent([]);
      })
      .finally(() => {
        if (!cancelled) setRelatedLoading(false);
      });

    setAuthorContentLoading(true);
    api.get(`/blogs/${blog._id}/author-content?limit=12`)
      .then(({ data }) => {
        if (!cancelled) setAuthorContent(Array.isArray(data.authorContent) ? data.authorContent : []);
      })
      .catch((error) => {
        console.error('Error fetching author blog content:', error);
        if (!cancelled) setAuthorContent([]);
      })
      .finally(() => {
        if (!cancelled) setAuthorContentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [blog?._id]);

  useEffect(() => {
    const handleNewComment = () => {
      fetchComments();
    };

    window.addEventListener('newComment', handleNewComment);

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('comment:new', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(blog?._id)) {
          fetchComments();
        }
      });

      socket.on('comment:updated', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(blog?._id)) {
          fetchComments();
        }
      });

      socket.on('comment:deleted', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(blog?._id)) {
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
  }, [id, blog?._id]);

  const fetchBlog = async () => {
    try {
      const { data } = await api.get(`/blogs/${id}`);
      setBlog(data.blog);
      setLiked(data.blog.likes?.some(like => like._id === user?._id));
      if (typeof data.blog?.author?.isFollowing === 'boolean') {
        setIsFollowing(data.blog.author.isFollowing);
      }

      if (data.redirect?.shouldRedirect && data.redirect?.to) {
        navigate(data.redirect.to, { replace: true });
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (user && blog?.author?._id && blog.author._id !== user._id) {
      try {
        const { data } = await api.get('/users/profile');
        // following is populated with user objects, extract _id
        const followingIds = data.user.following?.map(f => typeof f === 'object' ? f._id : f) || [];
        setIsFollowing(followingIds.includes(blog.author._id));
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    }
  };

  useEffect(() => {
    if (blog && user) {
      checkFollowStatus();
    }
  }, [blog?.author?._id, user?._id]);

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/comments/${contentId}`);
      setComments((data.comments || []).map((comment) => ({
        ...comment,
        replyCount: comment.replyCount || 0
      })));
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
      const { data } = await api.post(`/blogs/${contentId}/like`);
      setLiked(data.liked);
      setBlog((current) => ({ ...current, likeCount: data.likeCount }));

      if (data.liked) {
        soundNotification.playLikeActionSound();
      }
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/comments/${contentId}`, { content: newComment });
      await fetchComments();
      setNewComment('');
      window.dispatchEvent(new CustomEvent('newComment'));
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleReply = async (parentCommentId, content, replyToUserId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/comments/${contentId}`, {
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
    if (!user || !blog || user._id !== blog.author._id) return;

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
    if (!user || !blog || user._id !== blog.author._id) return;

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

  const performDelete = async ({ sensitiveActionToken, twoFactorToken } = {}) => {
    await api.delete(`/blogs/${contentId}`, {
      headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
      data: {
        ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
        ...(twoFactorToken ? { twoFactorToken } : {}),
      },
    });
    navigate('/home');
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
        return;
      }
      console.error('Error deleting blog:', error);
      alert('Failed to delete blog');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
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
      console.error('Error deleting blog:', error);
      alert(error.response?.data?.message || 'Failed to delete blog');
    } finally {
      setDeleting(false);
    }
  };

  const handleSensitiveAuthVerified = async (result) => {
    setSensitiveAuthPrompt(false);
    const sensitiveActionToken = result.sensitiveActionToken;
    if (result.requiresTwoFactor) {
      setTwoFactorPrompt({
        action: result.action || 'delete_blog',
        actionLabel: result.actionLabel || 'delete this blog',
        twoFactor: result.twoFactor,
        onVerified: async (twoFactorToken) => performDelete({ sensitiveActionToken, twoFactorToken }),
      });
      return;
    }

    setDeleting(true);
    try {
      await performDelete({ sensitiveActionToken });
    } catch (error) {
      console.error('Error deleting blog:', error);
      alert(error.response?.data?.message || 'Failed to delete blog');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteForgotPassword = () => {
    setSensitiveAuthPrompt(false);
    navigate('/profile?forgotPassword=1');
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleSaveBlog = () => {
    if (!contentId) return;
    const savedUserKey = getSavedUserKey(user);
    const nextSaved = !savedBlog;
    setSavedBlog(nextSaved);
    if (nextSaved) {
      saveSavedContentMeta({
        type: 'blog',
        userKey: savedUserKey,
        id: contentId,
        title: blog?.title || 'Saved blog',
        image: blog?.coverImage || blog?.image || blog?.featuredImage || blog?.thumbnail || '',
        subtitle: blog?.author?.username || blog?.author?.fullName || '',
        path: `/blog/${blog?.slug || contentId}`,
      });
      toast.success('Blog saved to your reading list.');
    } else {
      removeSavedContentMeta({ type: 'blog', userKey: savedUserKey, id: contentId });
      toast.success('Blog removed from saved items.');
    }
  };

  const shareUrl = window.location.href;
  const shareTitle = blog?.title || 'Check out this blog';

  const shareOptions = [
    {
      name: 'Facebook',
      icon: <FaFacebook className="text-2xl" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')
    },
    {
      name: 'Twitter',
      icon: <FaXTwitter className="text-2xl" />,
      color: 'bg-black hover:bg-gray-800',
      action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank', 'noopener,noreferrer')
    },
    {
      name: 'LinkedIn',
      icon: <FaLinkedin className="text-2xl" />,
      color: 'bg-blue-700 hover:bg-blue-800',
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')
    },
    {
      name: 'WhatsApp',
      icon: <FaWhatsapp className="text-2xl" />,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`, '_blank', 'noopener,noreferrer')
    },
    {
      name: 'Email',
      icon: <FaEnvelope className="text-2xl" />,
      color: 'bg-gray-600 hover:bg-gray-700',
      action: () => window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Copy Link',
      icon: <FaLink className="text-2xl" />,
      color: 'bg-gray-800 hover:bg-gray-900',
      action: () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
          toast.success('Link copied to clipboard!');
          setShowShareModal(false);
        });
      }
    }
  ];

  const handleRepost = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/create', {
      state: {
        repostContent: blog.content,
        repostTitle: blog.title,
        repostTags: blog.tags?.join(', '),
        repostMetaDescription: blog.metaDescription,
        repostCategory: blog.category,
        repostCoverImage: blog.coverImage
      }
    });
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!blog?.author?._id || blog.author._id === user._id || isFollowing) return;

    setFollowLoading(true);
    try {
      const { data } = await api.post(`/social/follow-only/${blog.author._id}`);
      const nextFollowing = Boolean(data.following);
      setIsFollowing(nextFollowing);
      setBlog((current) => {
        if (!current?.author) return current;
        const currentFollowerCount = Number(
          current.author.followerCount ?? current.author.followersCount ?? 0
        );
        const apiFollowerCount = Number(data.followerCount);
        const nextFollowerCount = Number.isFinite(apiFollowerCount)
          ? apiFollowerCount
          : currentFollowerCount + (nextFollowing ? 1 : 0);
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
      console.error('Error following user:', error);
      toast.error('Failed to follow author.');
    } finally {
      setFollowLoading(false);
    }
  };

  const scrollToComments = () => {
    const commentsSection = commentsRef.current || document.getElementById('comments-section');
    if (commentsSection) {
      const reader = readerScrollRef.current;
      if (reader) {
        const readerTop = reader.getBoundingClientRect().top;
        const targetTop = commentsSection.getBoundingClientRect().top;
        reader.scrollTo({
          top: reader.scrollTop + targetTop - readerTop - 24,
          behavior: 'smooth',
        });
        return;
      }
      commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const handleContentAction = (event) => {
      const action = event.detail?.action;
      if (action === 'like') handleLike();
      if (action === 'comment') scrollToComments();
      if (action === 'save') handleSaveBlog();
      if (action === 'share') handleShare();
      if (action === 'repost') handleRepost();
    };

    window.addEventListener('lekhon:content-action', handleContentAction);
    return () => window.removeEventListener('lekhon:content-action', handleContentAction);
  }, [handleLike, handleSaveBlog, handleRepost, handleShare, scrollToComments]);

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

  const blogImages = useMemo(() => normalizeBlogImages(blog), [blog]);
  const blogGalleryMedia = useMemo(() => normalizeBlogGalleryMedia(blog), [blog]);
  const blogProductTags = useMemo(() => normalizeBlogProductTags(blog), [blog]);
  const visibleComments = showAllComments ? sortedComments : sortedComments.slice(0, 1);
  const hiddenCommentCount = Math.max(sortedComments.length - visibleComments.length, 0);
  const bottomRelatedContent = relatedContent.slice(0, 12);
  const getMobileCardVariant = (item, index, section) => {
    const sectionOffset = hashString(`${mobileCardSeed}:${section}`) % 3;
    return (index + sectionOffset) % 3 === 0 ? 'split' : 'editorial';
  };

  useEffect(() => {
    if (activeGalleryIndex >= blogGalleryMedia.length) {
      setActiveGalleryIndex(0);
    }
  }, [activeGalleryIndex, blogGalleryMedia.length]);

  const canonicalPath = typeof window !== 'undefined' ? window.location.pathname : `/blog/${id}`;
  const seoTitle = blog?.title || (loading ? 'Loading Blog' : 'Blog Not Found');
  const seoDescription = blog?.metaDescription || '';
  const seoContent = blog?.content || '';
  const seoImage = blogImages[0] || '/image/lekhon_url.png';
  const seoNoIndex = !loading && !blog;

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
        <div className="blog-detail-shell blog-detail-loading-shell" style={{ background: 'var(--blog-page-bg)' }}>
          <div className="reading-progress blog-detail-reading-progress blog-detail-skeleton-progress" />
          <BlogDetailSkeleton />
        </div>
      </>
    );
  }

  if (!blog) {
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          content={seoContent}
          canonicalUrl={canonicalPath}
          image={seoImage}
          type="article"
          noIndex={seoNoIndex}
        />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="text-center">
            <img
              src="/image/failed_to_load.png"
              alt="Blog Not Found"
              className="w-64 h-64 mx-auto mb-6 object-contain"
            />
            <h1 className="text-4xl font-bold text-gray-800 mb-4">{t('Blog Not Found')}</h1>
            <p className="text-gray-600 mb-8 text-lg">
              {t('The blog you are looking for does not exist or has been removed.')}
            </p>
            <button
              onClick={() => navigate('/home')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {t('Go to Home')}
            </button>
          </div>
        </div>
      </>
    );
  }

  const author = blog.author || {};
  const authorName = author.username || t('Unknown Author');
  const authorRole = author.title || author.profession || author.roleLabel || t('Writer & Researcher');
  const authorFollowerCount = Number(
    author.followerCount ?? author.followersCount ?? author.followers?.length ?? 0
  );
  const authorPostCount = Number(
    author.articleCount ?? author.articlesCount ?? author.blogCount ?? author.blogsCount ?? author.postsCount ?? 0
  );
  const formattedDate = blog.createdAt
    ? new Date(blog.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const readingTimeLabel = `${blog.readingTime || 1} ${t('min read')}`;
  const categoryLabel = blog.category || t('Blog');
  const tags = Array.isArray(blog.tags) ? blog.tags : [];
  const canManageBlog = user?._id === author?._id;
  const canFollowAuthor = user && user._id !== author?._id;
  const authorFirstName = getAuthorFirstName(authorName);
  const authorRelatedContent = authorContent.slice(0, 8);
  const authorStrip = (
    <section className="blog-detail-author-strip">
      <div className="blog-detail-author-strip-main">
        <button
          type="button"
          onClick={() => {
            if (author?.hasActiveStatus && author?.statuses?.length > 0) {
              if (user) {
                setShowStatusViewer(true);
              } else {
                setShowLoginModal(true);
              }
            }
          }}
          className={`blog-detail-avatar-button ${author?.hasActiveStatus ? 'has-status' : ''}`}
          aria-label={t('Open author status')}
        >
          <Avatar user={author} size="lg" showStatusRing={true} />
        </button>
        <div>
          <Link to={`/user/${author?._id}`} className="blog-detail-author-name">
            {authorName}
            {(author?.isGuest || author?.role === 'guest') ? (
              <TbBrandAmongUs className="text-purple-500" size={15} title="Guest User" />
            ) : author?.isVerified && (
              <GoVerified className="blog-detail-verified" size={15} title="Verified" />
            )}
          </Link>
          <p>{authorRole}</p>
          <span>{authorFollowerCount} {t('followers')} <i /> {authorPostCount} {t('articles')}</span>
        </div>
      </div>
      {canFollowAuthor && (
        <button
          type="button"
          onClick={handleFollow}
          disabled={followLoading || isFollowing}
          className={`blog-detail-follow-button ${isFollowing ? 'is-following' : ''}`}
        >
          {followLoading ? '...' : isFollowing ? <><FaUserCheck /> {t('Following')}</> : <><FaUserPlus /> {t('Follow')}</>}
        </button>
      )}
    </section>
  );
  const renderAuthorContentSection = (className = '') => {
    if (!authorRelatedContent.length && !authorContentLoading) return null;

    return (
      <section
        className={`article-editorial-side-related article-author-related-section blog-detail-author-related-section ${className}`.trim()}
        aria-label={`More from ${authorName}`}
      >
        <p className="article-editorial-side-related-title">More From {authorFirstName}</p>
        <div className="article-author-content-grid">
          {authorContentLoading && authorRelatedContent.length === 0 ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div className="article-related-card is-compact is-loading" key={`blog-author-loading-${index}`}>
                <span />
                <span />
              </div>
            ))
          ) : (
            authorRelatedContent.map((item, index) => (
              <RelatedContentCard
                key={`${item.contentType}-${item._id || index}`}
                item={item}
                variant="editorial"
                mobileVariant={getMobileCardVariant(item, index, 'blog-author')}
              />
            ))
          )}
        </div>
      </section>
    );
  };

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
      <div className="blog-detail-shell" style={{ background:'var(--blog-page-bg)' }}>
        {/* Reading Progress Bar */}
        <div className="reading-progress blog-detail-reading-progress"
          style={{ width:`${progress}%`, background:'var(--blog-accent)' }} />
        <Toaster />
        <ScrollToTop />
        {editLoading && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <BarLoader color="#3B82F6" width="100%" height={4} />
          </div>
        )}
        <div className="blog-detail-layout">
          <aside className="blog-detail-engagement-rail" aria-label={t('Blog engagement')}>
            <button
              type="button"
              onClick={handleLike}
              className={`blog-detail-rail-action ${liked ? 'is-active' : ''}`}
              aria-label={t('Like this blog')}
            >
              <FaHeart />
              <span>{blog.likeCount || 0}</span>
            </button>
            <button
              type="button"
              onClick={scrollToComments}
              className="blog-detail-rail-action"
              aria-label={t('View comments')}
            >
              <FaComment />
              <span>{blog.commentCount || comments.length || 0}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveBlog}
              className={`blog-detail-rail-action ${savedBlog ? 'is-active' : ''}`}
              aria-label={savedBlog ? t('Remove saved blog') : t('Save blog')}
              aria-pressed={savedBlog}
            >
              <FaRegBookmark />
              <span>{t('Save')}</span>
            </button>
            {user?._id !== author?._id && (
              <button
                type="button"
                onClick={handleRepost}
                className="blog-detail-rail-action"
                aria-label={t('Repost')}
              >
                <FaRetweet />
                <span>{t('Repost')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="blog-detail-rail-action"
              aria-label={t('Share')}
            >
              <FaShare />
              <span>{t('Share')}</span>
            </button>
          </aside>

          <main className="blog-detail-reader-panel" ref={readerScrollRef}>
            <article className="blog-detail-reader-card">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="blog-detail-back-button"
              >
                <FaArrowLeft /> {t('Back to all blogs')}
              </button>

              <header className="blog-detail-hero">
                <p className="blog-detail-kicker" aria-label={`${t('Blog')} - ${categoryLabel}`}>
                  <TbBrandBlogger className="blog-detail-kicker-icon" aria-hidden="true" />
                  <span className="blog-detail-kicker-separator">-</span>
                  <span>{categoryLabel}</span>
                </p>
                <h1 className="blog-detail-title">{blog.title}</h1>
                {blog.metaDescription && (
                  <p className="blog-detail-subtitle">{blog.metaDescription}</p>
                )}

                <div className="blog-detail-meta-line">
                  <button
                    type="button"
                    onClick={() => {
                      if (author?.hasActiveStatus && author?.statuses?.length > 0) {
                        if (user) {
                          setShowStatusViewer(true);
                        } else {
                          setShowLoginModal(true);
                        }
                      }
                    }}
                    className={`blog-detail-avatar-button ${author?.hasActiveStatus ? 'has-status' : ''}`}
                    aria-label={t('Open author status')}
                  >
                    <Avatar user={author} size="sm" showStatusRing={true} />
                  </button>
                  <Link to={`/user/${author?._id}`} className="blog-detail-author-link">
                    {t('By')} {authorName}
                    {(author?.isGuest || author?.role === 'guest') ? (
                      <TbBrandAmongUs className="text-purple-500" size={15} title="Guest User" />
                    ) : author?.isVerified && (
                      <GoVerified className="blog-detail-verified" size={15} title="Verified" />
                    )}
                  </Link>
                  <span className="blog-detail-meta-dot" />
                  <span>{formattedDate}</span>
                  <span className="blog-detail-meta-dot" />
                  <span><FaClock /> {readingTimeLabel}</span>
                </div>

                {tags.length > 0 && (
                  <div className="blog-detail-tags">
                    {tags.map((tag, idx) => (
                      <span key={`${tag}-${idx}`}>{tag}</span>
                    ))}
                  </div>
                )}

                {blogGalleryMedia.length > 0 && (
                  <BlogGalleryDock
                    title={blog.title}
                    category={categoryLabel}
                    mediaItems={blogGalleryMedia}
                    activeIndex={activeGalleryIndex}
                    setActiveIndex={setActiveGalleryIndex}
                    productTags={blogProductTags}
                    placements={blog.productTagPlacements}
                  />
                )}
              </header>

              <div className="blog-detail-action-strip" aria-label={t('Blog actions')}>
                <button type="button" onClick={handleLike} className={liked ? 'is-active' : ''}>
                  <FaHeart /> <span>{blog.likeCount || 0}</span>
                </button>
                <button type="button" onClick={scrollToComments}>
                  <FaComment /> <span>{blog.commentCount || comments.length || 0}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveBlog}
                  className={savedBlog ? 'is-active' : ''}
                  aria-pressed={savedBlog}
                >
                  <FaRegBookmark /> <span>{t('Save')}</span>
                </button>
                <span>
                  <FaClock /> <span>{readingTimeLabel}</span>
                </span>
                {user?._id !== author?._id && (
                  <button type="button" onClick={handleRepost}>
                    <FaRetweet /> <span>{t('Repost')}</span>
                  </button>
                )}
                <button type="button" onClick={handleShare}>
                  <FaShare /> <span>{t('Share')}</span>
                </button>
                {canManageBlog && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditLoading(true);
                        navigate(`/edit/${contentId}`);
                      }}
                    >
                      <FaEdit /> <span>{t('Edit')}</span>
                    </button>
                    <button type="button" onClick={() => setShowDeleteModal(true)} className="is-danger">
                      <FaTrash /> <span>{t('Delete')}</span>
                    </button>
                  </>
                )}
              </div>

              <section className="blog-detail-body-frame">
                <AudioControls text={blog.content} content={blog.content} blogId={blog._id} />
                <div className="blog-content blog-detail-markdown">
                  <SafeMarkdown>{blog.content}</SafeMarkdown>
                </div>
              </section>

              {authorStrip}
              {renderAuthorContentSection('blog-detail-inline-author-related')}

              <section id="comments-section" ref={commentsRef} className="blog-detail-comments-panel">
                <div className="blog-detail-comments-header">
                  <div className="blog-detail-comments-title">
                    <span>{t('Comments')}</span>
                    <strong>{comments.length}</strong>
                  </div>
                  <div className="blog-detail-sort">
                    <button
                      type="button"
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="blog-detail-sort-button"
                    >
                      <BiMenuAltRight />
                      {sortBy === 'newest' ? t('Newest First') : t('Most Engaging')}
                    </button>
                    {showSortMenu && (
                      <div className="blog-detail-sort-menu">
                        <button
                          type="button"
                          onClick={() => { setSortBy('top'); setShowSortMenu(false); }}
                          className={sortBy === 'top' ? 'is-active' : ''}
                        >
                          {t('Most Engaging')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSortBy('newest'); setShowSortMenu(false); }}
                          className={sortBy === 'newest' ? 'is-active' : ''}
                        >
                          {t('Newest First')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {user && (
                  <form onSubmit={handleComment} className="blog-detail-comment-form">
                    <Avatar user={user} size="sm" />
                    <div className="blog-detail-comment-editor">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows="1"
                        placeholder={t('Write a comment...')}
                        required
                      />
                      {newComment.trim() && (
                        <div className="blog-detail-comment-actions">
                          <button type="button" onClick={() => setNewComment('')}>
                            {t('Cancel')}
                          </button>
                          <button type="submit">
                            {t('Add Comment')}
                          </button>
                        </div>
                      )}
                    </div>
                  </form>
                )}

                <div className="blog-detail-comment-list">
                  {sortedComments.length === 0 ? (
                    <div className="blog-detail-comments-empty">
                      <FaComment />
                      <p>{t('No comments yet. Be the first to comment!')}</p>
                    </div>
                  ) : (
                    <>
                      {visibleComments.map((comment) => (
                        <EnhancedComment
                          key={comment._id}
                          comment={comment}
                          isOwner={user?._id === blog?.author._id}
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
                          postOwner={blog?.author}
                          showAuthorBadge={true}
                        />
                      ))}
                      {sortedComments.length > 1 && (
                        <button
                          type="button"
                          className="blog-detail-comments-toggle"
                          onClick={() => setShowAllComments((current) => !current)}
                        >
                          <BiMenuAltRight />
                          {showAllComments
                            ? t('Show latest comment')
                            : `${t('View all comments')} (${hiddenCommentCount})`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </section>

              {(bottomRelatedContent.length > 0 || relatedLoading) && (
                <section className="article-related-section blog-detail-related-section" aria-label={t('More like this content')}>
                  <div className="article-related-heading">
                    <span />
                    <div>
                      <p>{t('More Like This')}</p>
                      <small>{t('Popular reads from this category and nearby interests.')}</small>
                    </div>
                  </div>
                  <div className="article-related-grid article-related-limited-grid">
                    {relatedLoading && bottomRelatedContent.length === 0 ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <div className="article-related-card is-loading" key={`blog-related-loading-${index}`}>
                          <span />
                          <span />
                        </div>
                      ))
                    ) : (
                      bottomRelatedContent.map((item, index) => (
                        <RelatedContentCard
                          key={`${item.contentType}-${item._id || index}`}
                          item={item}
                          variant="split"
                          mobileVariant={getMobileCardVariant(item, index, 'blog-related')}
                        />
                      ))
                    )}
                  </div>
                </section>
              )}
            </article>
          </main>

          <aside className="blog-detail-side-panel" aria-label={t('Author and blog details')}>
            <section className="blog-detail-side-card blog-detail-side-author">
              <p className="blog-detail-side-label">{t('About the author')}</p>
              <div className="blog-detail-side-author-head">
                <Avatar user={author} size="lg" showStatusRing={true} />
                <div>
                  <Link to={`/user/${author?._id}`} className="blog-detail-author-name">
                    {authorName}
                    {(author?.isGuest || author?.role === 'guest') ? (
                      <TbBrandAmongUs className="text-purple-500" size={15} title="Guest User" />
                    ) : author?.isVerified && (
                      <GoVerified className="blog-detail-verified" size={15} title="Verified" />
                    )}
                  </Link>
                  <p>{authorRole}</p>
                </div>
              </div>
              <div className="blog-detail-author-stats">
                <span>{authorFollowerCount} {t('followers')}</span>
                <i />
                <span>{authorPostCount} {t('articles')}</span>
              </div>
              {canFollowAuthor && (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followLoading || isFollowing}
                  className={`blog-detail-follow-button ${isFollowing ? 'is-following' : ''}`}
                >
                  {followLoading ? '...' : isFollowing ? <><FaUserCheck /> {t('Following')}</> : <><FaUserPlus /> {t('Follow')}</>}
                </button>
              )}
              {author.bio && <p className="blog-detail-author-bio">{author.bio}</p>}
              <Link to={`/user/${author?._id}`} className="blog-detail-profile-link">
                {t('View full profile')} <span>-&gt;</span>
              </Link>
              {canManageBlog && (
                <div className="blog-detail-owner-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditLoading(true);
                      navigate(`/edit/${contentId}`);
                    }}
                  >
                    <FaEdit /> {t('Edit')}
                  </button>
                  <button type="button" onClick={() => setShowDeleteModal(true)}>
                    <FaTrash /> {t('Delete')}
                  </button>
                </div>
              )}
              {renderAuthorContentSection('blog-detail-side-author-related')}
            </section>

            <section className="blog-detail-side-card">
              <p className="blog-detail-side-label">{t('On this post')}</p>
              <div className="blog-detail-side-row">
                <span>{t('Published')}</span>
                <strong>{formattedDate}</strong>
              </div>
              <div className="blog-detail-side-row">
                <span>{t('Read time')}</span>
                <strong>{readingTimeLabel}</strong>
              </div>
              <div className="blog-detail-side-row">
                <span>{t('Category')}</span>
                <strong>{categoryLabel}</strong>
              </div>
              {tags.length > 0 && (
                <div className="blog-detail-side-tags">
                  {tags.slice(0, 5).map((tag, idx) => (
                    <span key={`${tag}-side-${idx}`}>{tag}</span>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>

        <div className="blog-detail-mobile-actions" aria-label={t('Blog shortcuts')}>
          <button type="button" onClick={handleLike} className={liked ? 'is-active' : ''}>
            <FaHeart />
            <span>{blog.likeCount || 0}</span>
          </button>
          <button type="button" onClick={scrollToComments}>
            <FaComment />
            <span>{blog.commentCount || comments.length || 0}</span>
          </button>
          <button type="button" onClick={handleSaveBlog} className={savedBlog ? 'is-active' : ''} aria-pressed={savedBlog}>
            <FaRegBookmark />
            <span>{t('Save')}</span>
          </button>
          {user?._id !== author?._id && (
            <button type="button" onClick={handleRepost}>
              <FaRetweet />
              <span>{t('Repost')}</span>
            </button>
          )}
          <button type="button" onClick={handleShare}>
            <FaShare />
            <span>{t('Share')}</span>
          </button>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 theme-modal-overlay blog-detail-share-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
            <div className="blog-detail-share-card" onClick={(e) => e.stopPropagation()}>
              <div className="blog-detail-share-head">
                <div>
                  <p>{t('Share')}</p>
                  <h3>{t('Share this post')}</h3>
                </div>
                <button type="button" onClick={() => setShowShareModal(false)} aria-label={t('Close')}>
                  <FaTimes />
                </button>
              </div>
              <div className="blog-detail-share-grid">
                {shareOptions.map((option) => (
                  <button
                    key={option.name}
                    type="button"
                    onClick={option.action}
                    className="blog-detail-share-option"
                    data-platform={option.name.toLowerCase().replace(/\s+/g, '-')}
                  >
                    {option.icon}
                    <span>{option.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status Viewer */}
        {showStatusViewer && blog.author?.statuses?.length > 0 && (
          <StatusViewer 
            statuses={blog.author.statuses} 
            onClose={() => setShowStatusViewer(false)}
            userName={blog.author.username}
          />
        )}

        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
            <div className="theme-modal-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
              <div className="text-6xl mb-4 flex justify-center text-blue-600">
                <FaLock />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t('Login Required')}</h2>
              <p className="text-[var(--text-secondary)] mb-6">{t('Please login to view status posts.')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/login', { state: { from: `/blog/${id}` } })}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  {t('Login')}
                </button>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 theme-soft-button px-6 py-3 rounded-lg font-semibold transition"
                >
                  {t('Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center p-4">
            <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <FaTrash className="text-red-600" /> {t('Delete Blog')}
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                {t('Are you sure you want to delete this blog? This action cannot be undone.')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <ScaleLoader color="#fff" height={20} width={3} /> : t('Yes, Delete')}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 theme-soft-button py-3 rounded-lg font-semibold transition disabled:opacity-50"
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
          action="delete_blog"
          actionLabel="delete this blog"
          title={t('Verify before deleting')}
          description={t('Confirm your password before this blog is permanently deleted.')}
          onVerified={handleSensitiveAuthVerified}
          onForgotPassword={handleDeleteForgotPassword}
          onClose={() => setSensitiveAuthPrompt(false)}
        />
      </div>
    </>
  );
};

export default BlogDetail;


