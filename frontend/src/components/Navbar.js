import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { FaBell, FaSignOutAlt, FaChevronDown, FaBars, FaTimes, FaComments, FaMoon, FaSun } from 'react-icons/fa';
import LanguageSelector from './LanguageSelector';
import Avatar from './Avatar';
import AnimatedLogo from './AnimatedLogo';

const Navbar = () => {
  const { t } = useTranslation();
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const dropdownRef = useRef(null);
  const tabletDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          tabletDropdownRef.current && !tabletDropdownRef.current.contains(event.target)) {
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

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);

  return (
    <>
      <div className="h-20"></div>
      <nav className="navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-pink-600/90 backdrop-blur-xl border-b border-white/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
        <div className="container mx-auto px-4 py-3 relative z-10">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <img src="/image/lekhon_url.png" alt="Lekhon Logo" className="h-12 w-12 rounded-full bg-white/10 object-cover border-2 border-white/50 shadow-2xl relative z-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
            </div>
            <div className="group-hover:translate-x-1 transition-transform duration-300">
              <AnimatedLogo />
            </div>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden xl:flex items-center gap-3">
            {user ? (
              <>
                {(user.role === 'admin' || user.role === 'coAdmin') && (
                  <Link to="/admin" className="nav-link px-4 py-2 rounded-xl hover:bg-white/20 font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <span className="flex items-center gap-2">
                      <span className="text-yellow-300">⚡</span>
                      {t(user.role === 'coAdmin' ? 'Co-Admin' : 'Admin')}
                    </span>
                  </Link>
                )}
                <Link to="/news" className="nav-link px-4 py-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">📰</span>
                    <span className="font-medium">{t('News')}</span>
                  </span>
                </Link>
                <Link to="/create" className="create-blog-btn px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl border border-white/30">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    {t('Create Post')}
                  </span>
                </Link>
                <Link to="/drafts" className="nav-link px-4 py-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105">{t('My Drafts')}</Link>
                <button
                  onClick={toggleTheme}
                  className="p-3 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-12 border border-white/20 hover:border-white/40"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    {isDarkMode ? <FaSun size={20} className="text-yellow-300" /> : <FaMoon size={20} className="text-blue-200" />}
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
                <div className="profile-menu relative" ref={dropdownRef}>
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
                    <div className="absolute right-0 mt-3 w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl py-2 z-[9999] border border-gray-200/50 dark:border-gray-700/50 animate-slideDown">
                      {(user.role === 'admin' || user.role === 'coAdmin') && (
                        <Link
                          to="/admin"
                          onClick={() => setShowDropdown(false)}
                          className={`block px-4 py-3 mx-2 my-1 rounded-xl hover:bg-gradient-to-r font-semibold transition-all duration-300 hover:scale-105 hover:shadow-md ${
                            user.role === 'coAdmin' 
                              ? 'text-blue-600 dark:text-blue-400 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30' 
                              : 'text-purple-600 dark:text-purple-400 hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-900/30 dark:hover:to-purple-800/30'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>⚡</span>
                            {t(user.role === 'coAdmin' ? 'Co-Admin Panel' : 'Admin Panel')}
                          </span>
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-3 mx-2 my-1 rounded-xl text-gray-800 dark:text-gray-200 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-300 hover:scale-105"
                      >
                        <span className="flex items-center gap-2">
                          <span>👤</span>
                          {t('My Profile')}
                        </span>
                      </Link>
                      <Link
                        to="/drafts"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-3 mx-2 my-1 rounded-xl text-gray-800 dark:text-gray-200 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-300 hover:scale-105"
                      >
                        <span className="flex items-center gap-2">
                          <span>📝</span>
                          {t('My Drafts')}
                        </span>
                      </Link>
                      <Link
                        to="/chat"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-3 mx-2 my-1 rounded-xl text-gray-800 dark:text-gray-200 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-300 hover:scale-105 flex items-center gap-2"
                      >
                        <FaComments /> {t('Chat')}
                      </Link>
                      <hr className="my-2 border-gray-200/50 dark:border-gray-700/50" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 mx-2 my-1 rounded-xl text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/30 dark:hover:to-red-800/30 transition-all duration-300 hover:scale-105 flex items-center gap-2 font-semibold"
                      >
                        <FaSignOutAlt /> {t('Logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={toggleTheme}
                  className="p-3 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-12 border border-white/20 hover:border-white/40"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    {isDarkMode ? <FaSun size={20} className="text-yellow-300" /> : <FaMoon size={20} className="text-blue-200" />}
                  </div>
                </button>
                <LanguageSelector />
                <Link to="/login" className="px-5 py-2.5 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 font-medium">{t('Login')}</Link>
                <Link to="/register" className="bg-white text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2.5 rounded-xl font-bold hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-white hover:border-white/80">
                  <span className="bg-white px-6 py-2.5 rounded-xl">{t('Sign Up')}</span>
                </Link>
              </>
            )}
          </div>

          {/* Tablet/Large Menu */}
          <div className="hidden lg:flex xl:hidden items-center gap-2">
            {user ? (
              <>
                <Link to="/news" className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105">📰</Link>
                <Link to="/create" className="px-3 py-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 text-sm font-medium">✨</Link>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? <FaSun size={18} className="text-yellow-300" /> : <FaMoon size={18} className="text-blue-200" />}
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
                <div className="relative" ref={tabletDropdownRef}>
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
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 z-[99999]">
                      {(user.role === 'admin' || user.role === 'coAdmin') && (
                        <Link
                          to="/admin"
                          onClick={() => setShowDropdown(false)}
                          className={`block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold ${
                            user.role === 'coAdmin' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          {t(user.role === 'coAdmin' ? 'Co-Admin Panel' : 'Admin Panel')}
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('My Profile')}
                      </Link>
                      <Link
                        to="/drafts"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('My Drafts')}
                      </Link>
                      <Link
                        to="/chat"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FaComments /> {t('Chat')}
                      </Link>
                      <hr className="my-2 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FaSignOutAlt /> {t('Logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? <FaSun size={18} className="text-yellow-300" /> : <FaMoon size={18} className="text-blue-200" />}
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
                <Link to="/news" className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105">📰</Link>
                <Link to="/create" className="px-2 py-1.5 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 text-xs font-medium">✨</Link>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20"
                >
                  {isDarkMode ? <FaSun size={16} className="text-yellow-300" /> : <FaMoon size={16} className="text-blue-200" />}
                </button>
                <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20">
                  <FaBell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center text-[10px] shadow-lg border border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative" ref={tabletDropdownRef}>
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
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 z-[99999]">
                      {(user.role === 'admin' || user.role === 'coAdmin') && (
                        <Link
                          to="/admin"
                          onClick={() => setShowDropdown(false)}
                          className={`block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold ${
                            user.role === 'coAdmin' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          {t(user.role === 'coAdmin' ? 'Co-Admin Panel' : 'Admin Panel')}
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('My Profile')}
                      </Link>
                      <Link
                        to="/drafts"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('My Drafts')}
                      </Link>
                      <Link
                        to="/chat"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FaComments /> {t('Chat')}
                      </Link>
                      <hr className="my-2 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FaSignOutAlt /> {t('Logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/20"
                >
                  {isDarkMode ? <FaSun size={16} className="text-yellow-300" /> : <FaMoon size={16} className="text-blue-200" />}
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
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <FaSun size={18} className="text-yellow-300" /> : <FaMoon size={18} className="text-blue-200" />}
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
              className="text-white p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
            >
              {showMobileMenu ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>

        {/* Logout Modal */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">{t('Confirm Logout')}</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-6">{t('Are you sure you want to logout?')}</p>
              <div className="flex gap-3">
                <button
                  onClick={confirmLogout}
                  className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold"
                >
                  {t('Logout')}
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
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
                    ⚡ {t(user.role === 'coAdmin' ? 'Co-Admin Panel' : 'Admin Panel')}
                  </Link>
                )}
                <Link to="/news" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300">
                  📰 {t('News')}
                </Link>
                <Link to="/create" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300">
                  ✨ {t('Create Post')}
                </Link>
                <Link to="/drafts" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300">
                  📝 {t('My Drafts')}
                </Link>
                <Link to="/profile" onClick={() => setShowMobileMenu(false)} className="block py-3 hover:bg-white/10 px-4 rounded-xl mx-2 my-1 transition-all duration-300">
                  👤 {t('My Profile')}
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
    </nav>
    </>
  );
};

export default Navbar;
