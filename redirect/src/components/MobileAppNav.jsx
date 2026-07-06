import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaBoxOpen,
  FaChartLine,
  FaComments,
  FaHome,
  FaPlusCircle,
  FaShoppingCart,
  FaStore,
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
    matches: ['/marketplace', '/store', '/become-seller', '/seller', '/my-orders', '/order'],
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

const isSellerUser = (user = {}) =>
  Boolean(
    user?.isSeller ||
    user?.role === 'seller' ||
    user?.seller?.approved ||
    user?.seller?.status === 'approved' ||
    user?.sellerStatus === 'approved'
  );

const isGuestUser = (user = {}) => Boolean(user?.isGuest || user?.role === 'guest');

const buildMarketplaceActions = (user) => {
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
        label: 'Store',
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
      label: isGuestUser(user) ? 'Join' : 'Sell',
      ariaLabel: isGuestUser(user) ? 'Create an account to sell' : 'Become a seller',
      to: isGuestUser(user) ? '/register' : '/become-seller',
      icon: FaStore,
      matches: ['/become-seller'],
    },
  ];
};

const MobileAppNav = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const pathname = (location.pathname || '/').replace(/\/+$/, '') || '/';
  const isMarketplaceContext = pathMatches(pathname, tabs[1].matches);
  const marketplaceActions = isMarketplaceContext ? buildMarketplaceActions(user) : [];

  if (!user) {
    return null;
  }

  return (
    <nav
      className={`mobile-app-bottom-nav${marketplaceActions.length > 0 ? ' mobile-app-bottom-nav--with-context' : ''}`}
      aria-label="Primary mobile app navigation"
    >
      {marketplaceActions.length > 0 && (
        <div className="mobile-app-market-context" aria-label="Marketplace shortcuts">
          {marketplaceActions.map((action) => {
            const Icon = action.icon;
            const isActive = pathMatches(pathname, action.matches);

            return (
              <Link
                key={action.to}
                to={action.to}
                aria-label={action.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                className={`mobile-app-market-context__item${isActive ? ' is-active' : ''}`}
              >
                <Icon aria-hidden="true" />
                <span className="mobile-app-market-context__label">{action.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mobile-app-bottom-nav__main">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathMatches(pathname, tab.matches);

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
