import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaComments, FaHome, FaPlusCircle, FaStore, FaUserCircle } from 'react-icons/fa';
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

const MobileAppNav = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const pathname = (location.pathname || '/').replace(/\/+$/, '') || '/';

  if (!user) {
    return null;
  }

  return (
    <nav className="mobile-app-bottom-nav" aria-label="Primary mobile app navigation">
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
    </nav>
  );
};

export default MobileAppNav;
