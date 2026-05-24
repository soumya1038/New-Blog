import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { FaBell, FaSignOutAlt, FaChevronDown, FaBars, FaTimes, FaComments, FaMoon, FaSun, FaNewspaper, FaPlusCircle, FaStickyNote, FaUserCircle, FaBolt } from 'react-icons/fa';
import { PiBookOpenTextThin } from 'react-icons/pi';
import LanguageSelector from './LanguageSelector';
import Avatar from './Avatar';
import AnimatedLogo from './AnimatedLogo';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { t } = useTranslation();
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const desktopDropdownRef = useRef(null);
  const tabletLgDropdownRef = useRef(null);
  const tabletMdDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideDropdown =
        (desktopDropdownRef.current && desktopDropdownRef.current.contains(event.target)) ||
        (tabletLgDropdownRef.current && tabletLgDropdownRef.current.contains(event.target)) ||
        (tabletMdDropdownRef.current && tabletMdDropdownRef.current.contains(event.target));

      if (!isInsideDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      const handleNewNotification = () => {
        fetchUnreadCount();
      };
      
      window.addEventListener('newNotification', handleNewNotification);
      return () => window.removeEventListener('newNotification', handleNewNotification);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/social/notifications/unread-count`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
    setShowDropdown(false);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
    setShowLogoutModal(false);
  };

  const dropdownPanelBase =
    'theme-modal-card border border-[var(--border-default)] backdrop-blur-xl shadow-2xl py-2 animate-slideDown overflow-hidden';
  const dropdownDesktopItem =
    'block px-4 py-3 mx-2 my-1 rounded-xl text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-all duration-200 hover:scale-[1.02]';
  const dropdownCompactItem =
    'block px-4 py-2 mx-2 my-1 rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors duration-200';
  const dropdownAdminItem =
    'block px-4 py-3 mx-2 my-1 rounded-xl font-semibold hover:bg-[var(--surface-elevated)] transition-all duration-200 hover:scale-[1.02]';
  const dropdownDivider = 'my-2 border-[var(--border-default)]';
  const dropdownLogoutDesktop =
    'w-[calc(100%-1rem)] text-left px-4 py-3 mx-2 my-1 rounded-xl text-red-600 dark:text-red-400 hover:bg-[var(--surface-elevated)] transition-all duration-200 hover:scale-[1.02] flex items-center gap-2 font-semibold';
  const dropdownLogoutCompact =
    'w-full text-left px-4 py-2 mx-2 my-1 rounded-lg text-red-600 dark:text-red-400 hover:bg-[var(--surface-elevated)] transition-colors duration-200 flex items-center gap-2';

  return (
    <>
      <div className="h-20"></div>
      <nav className="navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div style={{
          background: isDark ? 'rgba(21, 27, 21, 0.94)' : 'rgba(248, 241, 231, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: isDark ? '1px solid rgba(201, 166, 90, 0.24)' : '1px solid rgba(214, 196, 168, 0.85)',
          color: isDark ? '#f2f1ea' : '#1c1c1c',
        }}>
          <div className="container mx-auto px-4 py-3 relative z-10">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/image/lekhon_url.png" 
              alt="Lekhon Logo" 
              className="h-12 w-12 object-cover transition-transform duration-300 group-hover:scale-105" 
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
            <div className="group-hover:translate-x-1 transition-transform duration-300">
              <AnimatedLogo />
            </div>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden xl:flex items-center gap-3">
            {user ? (
              <>
                {(user.role === 'admin' || user.role === 'coAdmin') && (
                  <Link 
                  to="/admin" 
                  className="px-4 py-2 rounded-xl font-semibold uppercase tracking-[0.05em] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--brand-primary)] transition hover:scale-105 hover:opacity-90"
                >
                  {t(user.role === 'coAdmin' ? 'Co-Admin' : 'Admin')}
                </Link>
                )}
                <Link 
                  to="/news" 
                  className="px-4 py-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors"
                >
                  {t('News')}
                </Link>
                <Link 
                  to="/create" 
                  className="px-5 py-2 rounded-xl text-white font-bold uppercase tracking-[0.05em] transition hover:scale-105 hover:opacity-90 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
                >
                  {t('Create Post')}
                </Link>
                <Link 
                  to="/drafts" 
                  className="px-4 py-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors"
                >
                  {t('My Drafts')}
                </Link>
                <button
                  onClick={toggleTheme}
                  className="p-3 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-12 border border-white/20 hover:border-white/40"
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDark ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    {isDark ? <FaSun size={20} className="text-yellow-300" /> : <FaMoon size={20} className="text-blue-200" />}
                  </div>
                </button>
                <LanguageSelector />
                <Link to="/notifications" className="notifications-btn relative p-3 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40">
                  <FaBell size={20} className="hover:animate-wiggle" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-bounce shadow-lg border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                
                {/* User Profile Dropdown */}
                <div className="profile-menu relative" ref={desktopDropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-3 hover:bg-white/20 px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/50 backdrop-blur-sm hover:shadow-xl"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/30 rounded-full blur-md"></div>
                      <div className="border-2 border-white rounded-full relative z-10 ring-2 ring-white/30">
                        <Avatar user={user} size="sm" />
                      </div>
                    </div>
                    <span className="font-semibold tracking-wide">{user.username}</span>
                    <FaChevronDown size={12} className={`transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showDropdown && (
                    <div className={`absolute right-0 mt-3 w-56 rounded-2xl z-[9999] ${dropdownPanelBase}`}>
                      {(user.role === 'admin' || user.role === 'coAdmin') && (
                        <Link
                          to="/admin"
                          onClick={() => setShowDropdown(false)}
                          className={`${dropdownAdminItem} ${
                            user.role === 'coAdmin' 
                              ? 'text-blue-600 dark:text-blue-300'
                              : 'text-purple-600 dark:text-purple-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <FaBolt className="text-xs" />
                            {t(user.role === 'coAdmin' ? 'Co-Admin Panel' : 'Admin Panel')}
                          </span>
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className={dropdownDesktopItem}
                      >
                        <span className="flex items-center gap-2">
                          <FaUserCircle />
                          {t('My Profile')}
                        </span>
                      </Link>
                      <Link
                        to="/drafts"
                        onClick={() => setShowDropdown(false)}
                        className={dropdownDesktopItem}
                      >
                        <span className="flex items-center gap-2">
                          <FaStickyNote />
                          {t('My Drafts')}
                        </span>
                      </Link>
                      <Link
                        to="/chat"
                        onClick={() => setShowDropdown(false)}
                        className={`${dropdownDesktopItem} flex items-center gap-2`}
                      >
                        <FaComments /> {t('Chat')}
                      </Link>
                      <hr className={dropdownDivider} />
                      <button
                        onClick={handleLogout}
                        className={dropdownLogoutDesktop}
                      >
                        <FaSignOutAlt /> {t('Logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/about" className="nav-link px-4 py-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <span className="flex items-center gap-2">
                    <PiBookOpenTextThin size={24} />
                    <span className="font-medium">{t('About Us')}</span>
                  </span>
                </Link>
                <button
                  onClick={toggleTheme}
                  className="p-3 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-12 border border-white/20 hover:border-white/40"
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDark ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    {isDark ? <FaSun size={20} className="text-yellow-300" /> : <FaMoon size={20} className="text-blue-200" />}
                  </div>
                </button>
                <LanguageSelector />
                <Link to="/login" className="px-5 py-2.5 rounded-xl text-[var(--text-primary)] hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 font-medium">{t('Login')}</Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
                >
                  {t('Sign Up')}
                </Link>
              </>
            )}
          </div>

          {/* Tablet/Large Menu */}
          <div className="hidden lg:flex xl:hidden items-center gap-2">
            {user ? (
              <>
                <Link to="/news" className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"><FaNewspaper size={16} /></Link>
                <Link to="/create" className="px-3 py-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 text-sm font-medium"><FaPlusCircle size={16} /></Link>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20"
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? <FaSun size={18} className="text-yellow-300" /> : <FaMoon size={18} className="text-blue-200" />}
                </button>
                <LanguageSelector />
                <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20">
                  <FaBell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce shadow-lg border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative" ref={tabletLgDropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 hover:bg-white/20 px-3 py-2 rounded-xl transition-all duration-300 hover:scale-105 border border-white/30 backdrop-blur-sm"
                  >
                    <div className="border-2 border-white rounded-full ring-1 ring-white/30">
                      <Avatar user={user} size="sm" />
                    </div>
                    <FaChevronDown size={12} className={`transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showDropdown && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-xl z-[99999] ${dropdownPanelBase}`}>
                      {(user.role === 'admin' || user.role === 'coAdmin') && (
                        <Link
                          to="/admin"
                          onClick={() => setShowDropdown(false)}
                          className={`${dropdownCompactItem} font-semibold ${
                            user.role === 'coAdmin' ? 'text-blue-600 dark:text-blue-300' : 'text-purple-600 dark:text-purple-300'
                          }`}
                        >
                          {t(user.role === 'coAdmin' ? 'Co-Admin Panel' : 'Admin Panel')}
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className={dropdownCompactItem}
                      >
                        {t('My Profile')}
                      </Link>
                      <Link
                        to="/drafts"
                        onClick={() => setShowDropdown(false)}
                        className={dropdownCompactItem}
                      >
                        {t('My Drafts')}
                      </Link>
                      <Link
                        to="/chat"
                        onClick={() => setShowDropdown(false)}
                        className={`${dropdownCompactItem} flex items-center gap-2`}
                      >
                        <FaComments /> {t('Chat')}
                      </Link>
                      <hr className={dropdownDivider} />
                      <button
                        onClick={handleLogout}
                        className={dropdownLogoutCompact}
                      >
                        <FaSignOutAlt /> {t('Logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/about" className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105">
                  <PiBookOpenTextThin size={20} />
                </Link>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20"
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? <FaSun size={18} className="text-yellow-300" /> : <FaMoon size={18} className="text-blue-200" />}
                </button>
                <LanguageSelector />
                <Link to="/login" className="px-4 py-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 text-sm font-medium">{t('Login')}</Link>
                <Link to="/register" className="bg-white/90 text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-white transition-all duration-300 hover:scale-105 text-sm shadow-lg">{t('Sign Up')}</Link>
              </>
            )}
          </div>

          {/* Small Tablet Menu */}
          <div className="hidden md:flex lg:hidden items-center gap-2">
            {user ? (
              <>
                <Link to="/news" className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"><FaNewspaper size={16} /></Link>
                <Link to="/create" className="px-2 py-1.5 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 text-xs font-medium"><FaPlusCircle size={14} /></Link>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20"
                >
                  {isDark ? <FaSun size={16} className="text-yellow-300" /> : <FaMoon size={16} className="text-blue-200" />}
                </button>
                <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20">
                  <FaBell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center text-[10px] shadow-lg border border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative" ref={tabletMdDropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-1 hover:bg-white/20 px-2 py-1.5 rounded-xl transition-all duration-300 hover:scale-105 border border-white/30 backdrop-blur-sm"
                  >
                    <div className="border-2 border-white rounded-full">
                      <Avatar user={user} size="sm" />
                    </div>
                    <FaChevronDown size={10} className={`transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showDropdown && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-xl z-[99999] ${dropdownPanelBase}`}>
                      {(user.role === 'admin' || user.role === 'coAdmin') && (
                        <Link
                          to="/admin"
                          onClick={() => setShowDropdown(false)}
                          className={`${dropdownCompactItem} font-semibold ${
                            user.role === 'coAdmin' ? 'text-blue-600 dark:text-blue-300' : 'text-purple-600 dark:text-purple-300'
                          }`}
                        >
                          {t(user.role === 'coAdmin' ? 'Co-Admin Panel' : 'Admin Panel')}
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className={dropdownCompactItem}
                      >
                        {t('My Profile')}
                      </Link>
                      <Link
                        to="/drafts"
                        onClick={() => setShowDropdown(false)}
                        className={dropdownCompactItem}
                      >
                        {t('My Drafts')}
                      </Link>
                      <Link
                        to="/chat"
                        onClick={() => setShowDropdown(false)}
                        className={`${dropdownCompactItem} flex items-center gap-2`}
                      >
                        <FaComments /> {t('Chat')}
                      </Link>
                      <hr className={dropdownDivider} />
                      <button
                        onClick={handleLogout}
                        className={dropdownLogoutCompact}
                      >
                        <FaSignOutAlt /> {t('Logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/about" className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105">
                  <PiBookOpenTextThin size={18} />
                </Link>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20"
                >
                  {isDark ? <FaSun size={16} className="text-yellow-300" /> : <FaMoon size={16} className="text-blue-200" />}
                </button>
                <LanguageSelector />
                <Link to="/login" className="px-3 py-1.5 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 text-xs font-medium">{t('Login')}</Link>
                <Link to="/register" className="bg-white/90 text-blue-600 px-3 py-1.5 rounded-xl font-bold hover:bg-white transition-all duration-300 hover:scale-105 text-xs shadow-lg">{t('Sign Up')}</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button & Notification */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <FaSun size={18} className="text-yellow-300" /> : <FaMoon size={18} className="text-blue-200" />}
            </button>
            {user && (
              <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20">
                <FaBell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce shadow-lg border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300" style={{ color: isDark ? '#f2f1ea' : '#1c1c1c' }}
            >
              {showMobileMenu ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>

        {/* Logout Modal */}
        {showLogoutModal && (
          <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
            <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{t('Confirm Logout')}</h3>
              <p className="text-[var(--text-secondary)] mb-6">{t('Are you sure you want to logout?')}</p>
              <div className="flex gap-3">
                <button
                  onClick={confirmLogout}
                  className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold"
                >
                  {t('Logout')}
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 theme-soft-button px-6 py-2 rounded-lg font-semibold"
                >
                  {t('Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden mt-4 pb-4 backdrop-blur-xl bg-white/5 rounded-2xl mx-2 border border-white/20">
            {user ? (
              <>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/20 px-4 pt-4">
                  <div className="border-2 border-white rounded-full ring-2 ring-white/30">
                    <Avatar user={user} size="md" />
                  </div>
                  <span className="font-bold text-lg">{user.username}</span>
                </div>
                {(user.role === 'admin' || user.role === 'coAdmin') && (
                  <Link
                    to="/admin"
                    onClick={() => setShowMobileMenu(false)}
                    className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 font-bold transition-all duration-300"
                  >
                    <FaBolt className="inline mr-2" /> {t(user.role === 'coAdmin' ? 'Co-Admin Panel' : 'Admin Panel')}
                  </Link>
                )}
                <Link to="/news" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300">
                  <FaNewspaper className="inline mr-2" /> {t('News')}
                </Link>
                <Link to="/create" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300">
                  <FaPlusCircle className="inline mr-2" /> {t('Create Post')}
                </Link>
                <Link to="/drafts" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300">
                  <FaStickyNote className="inline mr-2" /> {t('My Drafts')}
                </Link>
                <Link to="/profile" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300">
                  <FaUserCircle className="inline mr-2" /> {t('My Profile')}
                </Link>
                <Link to="/chat" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300 flex items-center gap-2">
                  <FaComments /> {t('Chat')}
                </Link>
                <div className="py-2 px-4 flex items-center gap-3 mx-2">
                  <LanguageSelector />
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-left py-3 hover:bg-red-500/20 px-4 rounded-xl mx-2 my-1 flex items-center gap-2 mt-2 text-red-400 font-bold transition-all duration-300"
                >
                  <FaSignOutAlt /> {t('Logout')}
                </button>
              </>
            ) : (
              <>
                <div className="py-3 px-4 flex items-center gap-3 mx-2">
                  <LanguageSelector />
                </div>
                <Link to="/about" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300 flex items-center gap-2">
                  <PiBookOpenTextThin size={20} /> {t('About Us')}
                </Link>
                <Link to="/login" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300">
                  {t('Login')}
                </Link>
                <Link to="/register" onClick={() => setShowMobileMenu(false)} className="block py-3 bg-white text-blue-600 px-4 rounded-xl mx-2 my-1 font-bold text-center hover:bg-white/90 transition-all duration-300 shadow-lg">
                  {t('Sign Up')}
                </Link>
              </>
            )}
          </div>
        )}
        </div>
      </div>
      </nav>
    </>
  );
};

export default Navbar;



