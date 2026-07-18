import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaBoxOpen,
  FaChartLine,
  FaComments,
  FaHeart,
  FaHome,
  FaPlusCircle,
  FaRegBookmark,
  FaRegCommentDots,
  FaShoppingCart,
  FaShare,
  FaStore,
  FaRetweet,
  FaUserCircle,
  FaWallet,
} from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const tabs = [
  {
    label: 'Home',
    ariaLabel: 'Open home workspace',
    to: '/home',
    icon: FaHome,
    matches: ['/home', '/news', '/blog', '/article', '/shorts', '/short-blogs'],
  },
  {
    label: 'Market',
    ariaLabel: 'Open marketplace',
    to: '/marketplace',
    icon: FaStore,
    matches: ['/marketplace', '/store', '/become-seller', '/seller', '/checkout', '/my-orders', '/order'],
  },
  {
    label: 'Create',
    ariaLabel: 'Create content',
    to: '/create',
    icon: FaPlusCircle,
    matches: ['/create', '/edit', '/drafts'],
    primary: true,
  },
  {
    label: 'Chat',
    ariaLabel: 'Open chat',
    to: '/chat',
    icon: FaComments,
    matches: ['/chat', '/join-group'],
  },
  {
    label: 'Profile',
    ariaLabel: 'Open profile',
    to: '/profile',
    icon: FaUserCircle,
    matches: ['/profile', '/user', '/notifications', '/admin'],
  },
];

const pathMatches = (pathname, prefixes) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const compactCount = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count)) return null;
  return new Intl.NumberFormat('en-US', {
    notation: count >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(count);
};

const isSellerUser = (user = {}) =>
  Boolean(
    user?.isSeller ||
    user?.role === 'seller' ||
    user?.seller?.approved ||
    user?.seller?.status === 'approved' ||
    user?.sellerStatus === 'approved'
  );

const dispatchContentAction = (action) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('lekhon:content-action', { detail: { action } }));
};

const buildContentTabs = (pathname) => {
  if (!pathMatches(pathname, ['/blog', '/article'])) return [];

  return [
    {
      key: 'like',
      label: 'Like',
      ariaLabel: 'Like this content',
      icon: FaHeart,
    },
    {
      key: 'save',
      label: 'Save',
      ariaLabel: 'Save this content',
      icon: FaRegBookmark,
    },
    {
      key: 'share',
      label: 'Share',
      ariaLabel: 'Share this content',
      icon: FaShare,
    },
    {
      key: 'repost',
      label: 'Repost',
      ariaLabel: 'Repost this content',
      icon: FaRetweet,
    },
    {
      key: 'comment',
      label: 'Comment',
      ariaLabel: 'Open comments',
      icon: FaRegCommentDots,
    },
  ];
};

const buildMarketplaceTabs = (user) => {
  const username = user?.username ? encodeURIComponent(user.username) : '';

  if (isSellerUser(user)) {
    return [
      {
        label: 'Browse',
        ariaLabel: 'Browse marketplace products',
        to: '/marketplace',
        icon: FaStore,
        matches: ['/marketplace'],
      },
      {
        label: 'My Store',
        ariaLabel: 'Open seller store',
        to: username ? `/store/${username}` : '/seller/dashboard',
        icon: FaStore,
        matches: ['/store'],
      },
      {
        label: 'Add',
        ariaLabel: 'Add marketplace product',
        to: '/seller/add-product',
        icon: FaPlusCircle,
        matches: ['/seller/add-product', '/seller/edit-product'],
        primary: true,
      },
      {
        label: 'Dashboard',
        ariaLabel: 'Open seller dashboard',
        to: '/seller/dashboard',
        icon: FaChartLine,
        matches: ['/seller/dashboard'],
      },
      {
        label: 'Earnings',
        ariaLabel: 'Open seller earnings',
        to: '/seller/earnings',
        icon: FaWallet,
        matches: ['/seller/earnings'],
      },
    ];
  }

  return [
    {
      label: 'Home',
      ariaLabel: 'Open home workspace',
      to: '/home',
      icon: FaHome,
      matches: ['/home'],
    },
    {
      label: 'Browse',
      ariaLabel: 'Browse marketplace products',
      to: '/marketplace',
      icon: FaStore,
      matches: ['/marketplace'],
    },
    {
      label: 'Cart',
      ariaLabel: 'Open checkout cart',
      to: '/checkout',
      icon: FaShoppingCart,
      matches: ['/checkout'],
    },
    {
      label: 'Orders',
      ariaLabel: 'Open my orders',
      to: '/my-orders',
      icon: FaBoxOpen,
      matches: ['/my-orders', '/order'],
    },
    {
      label: 'Profile',
      ariaLabel: 'Open profile',
      to: '/profile',
      icon: FaUserCircle,
      matches: ['/profile', '/user', '/notifications'],
    },
  ];
};

const MobileAppNav = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const pathname = (location.pathname || '/').replace(/\/+$/, '') || '/';
  const isMarketplaceContext = pathMatches(pathname, tabs[1].matches);
  const contentTabs = buildContentTabs(pathname);
  const isContentMode = contentTabs.length > 0;
  const marketplaceTabs = isMarketplaceContext && !isContentMode ? buildMarketplaceTabs(user) : [];
  const primaryTabs = isContentMode ? contentTabs : marketplaceTabs.length > 0 ? marketplaceTabs : tabs;
  const [contentStats, setContentStats] = useState({
    likeCount: null,
    commentCount: null,
    liked: false,
  });

  useEffect(() => {
    if (!isContentMode) {
      setContentStats({ likeCount: null, commentCount: null, liked: false });
      return undefined;
    }

    setContentStats({ likeCount: null, commentCount: null, liked: false });

    const applyStatsUpdate = (detail = {}) => {
      if (detail.pathname && detail.pathname !== pathname) return;
      setContentStats((current) => ({
        ...current,
        ...detail,
      }));
    };

    const handleStatsUpdate = (event) => applyStatsUpdate(event.detail);

    window.addEventListener('lekhon:content-stats', handleStatsUpdate);
    applyStatsUpdate(window.__lekhonContentStats);
    return () => window.removeEventListener('lekhon:content-stats', handleStatsUpdate);
  }, [isContentMode, pathname]);

  if (!user) {
    return null;
  }

  return (
    <nav
      className={`mobile-app-bottom-nav${isMarketplaceContext && !isContentMode ? ' mobile-app-bottom-nav--marketplace-mode' : ''}${isContentMode ? ' mobile-app-bottom-nav--content-mode' : ''}`}
      aria-label={isContentMode ? 'Content mobile actions' : isMarketplaceContext ? 'Marketplace mobile navigation' : 'Primary mobile app navigation'}
    >
      <div className="mobile-app-bottom-nav__main">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.matches ? pathMatches(pathname, tab.matches) : false;
          const metric =
            isContentMode && tab.key === 'like'
              ? compactCount(contentStats.likeCount)
              : isContentMode && tab.key === 'comment'
              ? compactCount(contentStats.commentCount)
              : null;
          const isContentActionActive = isContentMode && tab.key === 'like' && contentStats.liked;

          if (!tab.to) {
            return (
              <button
                key={tab.key}
                type="button"
                aria-label={metric ? `${tab.ariaLabel}, ${metric}` : tab.ariaLabel}
                className={`mobile-app-bottom-nav__item${isContentActionActive ? ' is-active' : ''}`}
                onClick={() => dispatchContentAction(tab.key)}
              >
                <span className="mobile-app-bottom-nav__icon" aria-hidden="true">
                  <Icon />
                </span>
                {metric !== null && (
                  <span className="mobile-app-bottom-nav__metric">{metric}</span>
                )}
                <span className="mobile-app-bottom-nav__label">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-label={tab.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`mobile-app-bottom-nav__item${isActive ? ' is-active' : ''}${tab.primary ? ' is-primary' : ''}`}
            >
              <span className="mobile-app-bottom-nav__icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="mobile-app-bottom-nav__label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileAppNav;
