import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { FaBell, FaSignOutAlt, FaChevronDown, FaBars, FaTimes, FaComments, FaMoon, FaSun } from 'react-icons/fa';
import LanguageSelector from './LanguageSelector';
import Avatar from './Avatar';

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
    <nav className="navbar bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="New Blog Logo" className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-lg" />
            <span className="text-2xl font-bold">{t('Modern Blog')}</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-6">
            {user ? (
              <>
                {(user.role === 'admin' || user.role === 'coAdmin') && (
                  <Link to="/admin" className="hover:text-gray-200 font-semibold">{t(user.role === 'coAdmin' ? 'Co-Admin Panel' : 'Admin Panel')}</Link>
                )}
                <Link to="/create" className="create-blog-btn hover:text-gray-200">{t('Create Blog')}</Link>
                <Link to="/drafts" className="hover:text-gray-200">{t('My Drafts')}</Link>
                <button
                  onClick={toggleTheme}
                  className="hover:text-gray-200 p-2 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-110"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    {isDarkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
                  </div>
                </button>
                <LanguageSelector />
                <Link to="/notifications" className="notifications-btn hover:text-gray-200 relative">
                  <FaBell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                
                {/* User Profile Dropdown */}
                <div className="profile-menu relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition"
                  >
                    <div className="border-2 border-white rounded-full">
                      <Avatar user={user} size="sm" />
                    </div>
                    <span className="font-medium">{user.username}</span>
                    <FaChevronDown size={12} />
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 z-50">
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
                  className="hover:text-gray-200 p-2 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-110"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    {isDarkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
                  </div>
                </button>
                <LanguageSelector />
                <Link to="/login" className="hover:text-gray-200">{t('Login')}</Link>
                <Link to="/register" className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100">{t('Sign Up')}</Link>
              </>
            )}
          </div>

          {/* Tablet Menu (md) */}
          <div className="hidden md:flex lg:hidden items-center gap-4">
            {user ? (
              <>
                <Link to="/create" className="hover:text-gray-200 text-sm">{t('Create')}</Link>
                <button
                  onClick={toggleTheme}
                  className="hover:text-gray-200 p-2 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-110"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    {isDarkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
                  </div>
                </button>
                <LanguageSelector />
                <Link to="/notifications" className="hover:text-gray-200 relative">
                  <FaBell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative" ref={tabletDropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 hover:bg-white/10 px-2 py-2 rounded-lg transition"
                  >
                    <div className="border-2 border-white rounded-full">
                      <Avatar user={user} size="sm" />
                    </div>
                    <FaChevronDown size={12} />
                  </button>
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 z-50">
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
                  className="hover:text-gray-200 p-2 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-110"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    {isDarkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
                  </div>
                </button>
                <LanguageSelector />
                <Link to="/login" className="hover:text-gray-200 text-sm">{t('Login')}</Link>
                <Link to="/register" className="bg-white text-blue-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-100 text-sm">{t('Sign Up')}</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button & Notification */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="hover:text-gray-200 p-2 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-110"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                {isDarkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
              </div>
            </button>
            {user && (
              <Link to="/notifications" className="hover:text-gray-200 relative">
                <FaBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-white"
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
          <div className="md:hidden mt-4 pb-4">
            {user ? (
              <>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/20">
                  <div className="border-2 border-white rounded-full">
                    <Avatar user={user} size="md" />
                  </div>
                  <span className="font-semibold">{user.username}</span>
                </div>
                {(user.role === 'admin' || user.role === 'coAdmin') && (
                  <Link
                    to="/admin"
                    onClick={() => setShowMobileMenu(false)}
                    className="block py-2 hover:bg-white/10 px-3 rounded font-semibold"
                  >
                    {t(user.role === 'coAdmin' ? 'Co-Admin Panel' : 'Admin Panel')}
                  </Link>
                )}
                <Link
                  to="/create"
                  onClick={() => setShowMobileMenu(false)}
                  className="block py-2 hover:bg-white/10 px-3 rounded"
                >
                  {t('Create Blog')}
                </Link>
                <Link
                  to="/drafts"
                  onClick={() => setShowMobileMenu(false)}
                  className="block py-2 hover:bg-white/10 px-3 rounded"
                >
                  {t('My Drafts')}
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setShowMobileMenu(false)}
                  className="block py-2 hover:bg-white/10 px-3 rounded"
                >
                  {t('My Profile')}
                </Link>
                <Link
                  to="/chat"
                  onClick={() => setShowMobileMenu(false)}
                  className="block py-2 hover:bg-white/10 px-3 rounded flex items-center gap-2"
                >
                  <FaComments /> {t('Chat')}
                </Link>
                <div className="py-2 px-3 flex items-center gap-3">
                  <button
                    onClick={toggleTheme}
                    className="hover:bg-white/10 p-2 rounded-lg transition-all duration-300 transform hover:scale-110"
                    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      {isDarkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
                    </div>
                  </button>
                  <LanguageSelector />
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-left py-2 hover:bg-white/10 px-3 rounded flex items-center gap-2 mt-2"
                >
                  <FaSignOutAlt /> {t('Logout')}
                </button>
              </>
            ) : (
              <>
                <div className="py-2 px-3 flex items-center gap-3">
                  <button
                    onClick={toggleTheme}
                    className="hover:bg-white/10 p-2 rounded-lg transition-all duration-300 transform hover:scale-110"
                    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    <div className="transition-transform duration-500 ease-in-out" style={{ transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      {isDarkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
                    </div>
                  </button>
                  <LanguageSelector />
                </div>
                <Link
                  to="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="block py-2 hover:bg-white/10 px-3 rounded"
                >
                  {t('Login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setShowMobileMenu(false)}
                  className="block py-2 bg-white text-blue-600 px-3 rounded font-semibold mt-2 text-center"
                >
                  {t('Sign Up')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
