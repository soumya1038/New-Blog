import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { TbBrandBlogger } from "react-icons/tb";
import { FaUsers, FaUserCheck, FaTrash, FaBan, FaCheckCircle, FaEye, FaSearch, FaUserShield, FaUserTie, FaTimes, FaServer, FaExclamationTriangle, FaChartLine, FaBug, FaTachometerAlt, FaEnvelope, FaStore } from 'react-icons/fa';
import { GoVerified, GoUnverified } from 'react-icons/go';
import { MdOutlineSwitchAccessShortcutAdd } from 'react-icons/md';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatsCardSkeleton, TableRowSkeleton } from '../components/SkeletonLoader';
import { BarLoader, PropagateLoader } from 'react-spinners';
import AdminSellerApplications from '../components/AdminSellerApplications';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [guests, setGuests] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [blogSearch, setBlogSearch] = useState('');
  const [articleSearch, setArticleSearch] = useState('');
  const [shortSearch, setShortSearch] = useState('');
  const [timeRange, setTimeRange] = useState(7);
  const [isDark, setIsDark] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const [suspendDays, setSuspendDays] = useState('');
  const [suspendUnit, setSuspendUnit] = useState('days');
  const [modalError, setModalError] = useState('');
  const [loadingStats, setLoadingStats] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [verifyingUserId, setVerifyingUserId] = useState(null);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'admin' && user.role !== 'coAdmin')) {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate, authLoading]);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, guestsRes, blogsRes, articlesRes, shortsRes, metricsRes] = await Promise.all([
        api.get(`/admin/stats?days=${timeRange}`),
        api.get('/admin/users'),
        api.get('/admin/guests'),
        api.get('/admin/blogs'),
        api.get('/admin/articles'),
        api.get('/admin/shorts'),
        api.get('/admin/metrics')
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setGuests(guestsRes.data.guests);
      setBlogs(blogsRes.data.blogs);
      setArticles(articlesRes.data.articles);
      setShorts(shortsRes.data.shorts);
      setSystemMetrics(metricsRes.data.metrics);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'coAdmin')) {
      setLoadingStats(true);
      fetchData().finally(() => setLoadingStats(false));
    }
  }, [timeRange]);

  const openModal = (config) => {
    setModalConfig(config);
    setModalError('');
    setSuspendDays(config.needsInput ? '1' : '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalConfig({});
    setModalError('');
    setSuspendDays('1');
    setSuspendUnit('days');
    setSuspendLoading(false);
  };

  const handleDeleteUser = (userId, username) => {
    openModal({
      type: 'delete-user',
      title: t('Delete User'),
      message: `${t('Are you sure you want to delete')} ${username}? ${t('All their blogs and comments will be permanently deleted.')}`,
      confirmText: t('Delete'),
      onConfirm: async () => {
        try {
          await api.delete(`/admin/users/${userId}`);
          setUsers(users.filter(u => u._id !== userId));
          closeModal();
          openModal({ type: 'success', title: t('Success!'), message: t('User deleted successfully') });
        } catch (error) {
          setModalError(error.response?.data?.message || 'Error deleting user');
        }
      }
    });
  };

  const handleSuspendUser = (userId, username, isActive) => {
    openModal({
      type: 'suspend-user',
      title: isActive ? t('Suspend User') : t('Unsuspend User'),
      message: isActive ? `${t('Enter suspension duration for')} ${username}:` : `${t('Unsuspend')} ${username}?`,
      confirmText: isActive ? t('Suspend') : t('Unsuspend'),
      needsInput: isActive,
      userId,
      isActive
    });
  };

  const handleSendWarningEmail = async (userId, username) => {
    const reasonInput = window.prompt(
      `Enter warning reason for ${username}:`,
      'Policy warning issued by moderation team'
    );

    if (reasonInput === null) return;

    const reason = reasonInput.trim() || 'Policy warning issued by moderation team';

    try {
      await api.post(`/admin/users/${userId}/warn-email`, { reason });
      openModal({
        type: 'success',
        title: t('Success!'),
        message: `Warning email queued for ${username}.`,
      });
    } catch (error) {
      openModal({
        type: 'delete-user',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to queue warning email',
      });
    }
  };

  const handleSendPreDeletionEmail = async (userId, username) => {
    const daysInput = window.prompt(
      `Enter days remaining for pre-deletion warning email for ${username}:`,
      '7'
    );

    if (daysInput === null) return;

    const parsedDays = Number(daysInput);
    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      openModal({
        type: 'delete-user',
        title: 'Error',
        message: 'Please enter a valid positive number of days.',
      });
      return;
    }

    const daysRemaining = Math.max(1, Math.floor(parsedDays));
    const deletionDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString();

    try {
      await api.post(`/admin/users/${userId}/pre-deletion-email`, {
        daysRemaining,
        deletionDate,
      });
      openModal({
        type: 'success',
        title: t('Success!'),
        message: `Pre-deletion warning email queued for ${username} (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining).`,
      });
    } catch (error) {
      openModal({
        type: 'delete-user',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to queue pre-deletion warning email',
      });
    }
  };

  const handleModalConfirm = async () => {
    const { userId, isActive } = modalConfig;
    
    try {
      if (isActive && (!suspendDays || suspendDays.toString().trim() === '')) {
        setModalError('Please enter a duration');
        return;
      }
      
      const value = parseFloat(suspendDays);
      
      if (isActive && (isNaN(value) || value <= 0)) {
        setModalError('Please enter a valid number');
        return;
      }
      
      setSuspendLoading(true);
      
      // Convert to days based on unit
      let days = 0;
      if (isActive) {
        if (suspendUnit === 'hours') {
          days = value / 24;
        } else if (suspendUnit === 'days') {
          days = value;
        } else if (suspendUnit === 'months') {
          days = value * 30;
        }
      }
      
      console.log('Sending to backend:', { value, suspendUnit, days });
      const response = await api.put(`/admin/users/${userId}/suspend`, { days });
      console.log('Backend response:', response.data);
      await fetchData();
      setSuspendLoading(false);
      closeModal();
      
      const durationText = response.data.message || 'User status updated successfully';
      
      openModal({ type: 'success', title: t('Success!'), message: durationText });
    } catch (error) {
      setSuspendLoading(false);
      setModalError(error.response?.data?.message || 'Error updating user status');
    }
  };

  const handleMakeAdmin = (userId, username) => {
    openModal({
      type: 'make-admin',
      title: t('Make Admin'),
      message: `${t('Are you sure you want to delete')} ${username} ${t('to admin')}? ${t('They will have full administrative privileges')}.`,
      confirmText: t('Make Admin'),
      onConfirm: async () => {
        try {
          await api.put(`/admin/users/${userId}/make-admin`);
          await fetchData();
          closeModal();
          openModal({ type: 'success', title: t('Success!'), message: `${username} ${t('is now an admin')}` });
        } catch (error) {
          setModalError(error.response?.data?.message || 'Error promoting user');
        }
      }
    });
  };

  const handleMakeCoAdmin = (userId, username) => {
    openModal({
      type: 'make-coadmin',
      title: t('Make Co-Admin'),
      message: `${t('Promote')} ${username} ${t('to co-admin')}? ${t('They will have read-only access to the admin panel')}.`,
      confirmText: t('Make Co-Admin'),
      onConfirm: async () => {
        try {
          await api.put(`/admin/users/${userId}/make-coadmin`);
          await fetchData();
          closeModal();
          openModal({ type: 'success', title: t('Success!'), message: `${username} ${t('is now a co-admin')}` });
        } catch (error) {
          setModalError(error.response?.data?.message || 'Error promoting user');
        }
      }
    });
  };

  const handleRemoveCoAdmin = (userId, username) => {
    openModal({
      type: 'remove-coadmin',
      title: t('Remove Co-Admin'),
      message: `${t('Remove')} ${t('co-admin privileges from')} ${username}? ${t('They will become a regular user')}.`,
      confirmText: t('Remove'),
      onConfirm: async () => {
        try {
          await api.put(`/admin/users/${userId}/remove-coadmin`);
          await fetchData();
          closeModal();
          openModal({ type: 'success', title: t('Success!'), message: `${username} ${t('is now a regular user')}` });
        } catch (error) {
          setModalError(error.response?.data?.message || 'Error removing co-admin');
        }
      }
    });
  };

  const handleDeleteBlog = (blogId, title) => {
    openModal({
      type: 'delete-blog',
      title: t('Delete Blog'),
      message: `${t('Are you sure you want to delete')} "${title}"? ${t('This action cannot be undone.')}.`,
      confirmText: t('Delete'),
      onConfirm: async () => {
        try {
          await api.delete(`/admin/blogs/${blogId}`);
          setBlogs(blogs.filter(b => b._id !== blogId));
          closeModal();
          openModal({ type: 'success', title: t('Success!'), message: t('Blog deleted successfully!') });
        } catch (error) {
          setModalError(error.response?.data?.message || 'Error deleting blog');
        }
      }
    });
  };

  const handleDeleteArticle = (articleId, title) => {
    openModal({
      type: 'delete-article',
      title: t('Delete Article'),
      message: `${t('Are you sure you want to delete')} "${title}"? ${t('This action cannot be undone.')}.`,
      confirmText: t('Delete'),
      onConfirm: async () => {
        try {
          await api.delete(`/admin/articles/${articleId}`);
          setArticles(articles.filter(a => a._id !== articleId));
          closeModal();
          openModal({ type: 'success', title: t('Success!'), message: t('Article deleted successfully!') });
        } catch (error) {
          setModalError(error.response?.data?.message || 'Error deleting article');
        }
      }
    });
  };

  const handleDeleteShort = (shortId, title) => {
    openModal({
      type: 'delete-short',
      title: t('Delete Short'),
      message: `${t('Are you sure you want to delete')} "${title}"? ${t('This action cannot be undone.')}.`,
      confirmText: t('Delete'),
      onConfirm: async () => {
        try {
          await api.delete(`/admin/shorts/${shortId}`);
          setShorts(shorts.filter(s => s._id !== shortId));
          closeModal();
          openModal({ type: 'success', title: t('Success!'), message: t('Short deleted successfully!') });
        } catch (error) {
          setModalError(error.response?.data?.message || 'Error deleting short');
        }
      }
    });
  };

  const handleToggleVerification = async (userId, username, isVerified) => {
    setVerifyingUserId(userId);
    try {
      await api.put(`/admin/users/${userId}/verify`);
      await fetchData();
      openModal({ type: 'success', title: t('Success!'), message: `${username} ${isVerified ? 'unverified' : 'verified'} successfully` });
    } catch (error) {
      openModal({ type: 'error', title: t('Error'), message: error.response?.data?.message || 'Failed to update verification' });
    } finally {
      setVerifyingUserId(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--background-secondary)] via-[var(--background-primary)] to-[var(--background-secondary)] dark:from-[var(--background-primary)] dark:via-[var(--background-secondary)] dark:to-[var(--background-tertiary)] py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8 text-[var(--text-primary)]">{t('Admin Dashboard')}</h1>
          <div className="flex gap-4 mb-6 border-b">
            <div className="px-4 py-2 font-semibold border-b-2 border-blue-600 text-blue-600">{t('Overview')}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
            {[...Array(5)].map((_, i) => <StatsCardSkeleton key={i} />)}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
              <div className="h-6 bg-[var(--background-secondary)] rounded w-48 mb-4 animate-pulse"></div>
              <div className="h-64 bg-[var(--surface-elevated)] rounded animate-pulse"></div>
            </div>
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
              <div className="h-6 bg-[var(--background-secondary)] rounded w-48 mb-4 animate-pulse"></div>
              <div className="h-64 bg-[var(--surface-elevated)] rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isCoAdmin = user?.role === 'coAdmin';

  const chartTheme = {
    gridStroke: isDark ? 'rgba(201, 198, 184, 0.22)' : 'rgba(95, 95, 95, 0.2)',
    axisTick: isDark ? '#c9c6b8' : '#5f5f5f',
    axisLine: isDark ? '#2a332a' : '#d6c4a8',
    tooltipBg: isDark ? '#1f281f' : '#ffffff',
    tooltipBorder: isDark ? '#2a332a' : '#e5d9c8',
    tooltipText: isDark ? '#f2f1ea' : '#1c1c1c'
  };

  const axisProps = {
    tick: { fill: chartTheme.axisTick, fontSize: 12 },
    axisLine: { stroke: chartTheme.axisLine },
    tickLine: { stroke: chartTheme.axisLine }
  };

  const tooltipProps = {
    contentStyle: {
      backgroundColor: chartTheme.tooltipBg,
      border: `1px solid ${chartTheme.tooltipBorder}`,
      borderRadius: '8px',
      color: chartTheme.tooltipText
    },
    labelStyle: { color: chartTheme.tooltipText, fontWeight: 600 },
    itemStyle: { color: chartTheme.tooltipText }
  };

  const legendProps = {
    wrapperStyle: { color: chartTheme.axisTick }
  };

  const alertStatus = systemMetrics?.alerts?.status || 'healthy';
  const alertItems = systemMetrics?.alerts?.items || [];
  const statusBreakdown = systemMetrics?.statusBreakdown || {};
  const topSlowRoutes = systemMetrics?.topSlowRoutes || [];

  const alertStatusClasses =
    alertStatus === 'critical'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-700/60'
      : alertStatus === 'warning'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background-secondary)] via-[var(--background-primary)] to-[var(--background-secondary)] dark:from-[var(--background-primary)] dark:via-[var(--background-secondary)] dark:to-[var(--background-tertiary)] py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-[var(--text-primary)]">
            {isCoAdmin ? t('Co-Admin Dashboard') : t('Admin Dashboard')}
          </h1>
          {isCoAdmin && (
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg font-semibold border border-blue-200 dark:border-blue-700/50">
              {t('Read-Only Access')}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--border-default)] overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 font-semibold whitespace-nowrap text-sm md:text-base ${activeTab === 'overview' ? 'border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t('Overview')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-2 font-semibold whitespace-nowrap text-sm md:text-base ${activeTab === 'users' ? 'border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t('Users')}
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`px-3 py-2 font-semibold whitespace-nowrap text-sm md:text-base ${activeTab === 'guests' ? 'border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t('Guest Users')}
          </button>
          <button
            onClick={() => setActiveTab('blogs')}
            className={`px-3 py-2 font-semibold whitespace-nowrap text-sm md:text-base ${activeTab === 'blogs' ? 'border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t('Blogs')}
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-3 py-2 font-semibold whitespace-nowrap text-sm md:text-base ${activeTab === 'articles' ? 'border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t('Articles')}
          </button>
          <button
            onClick={() => setActiveTab('shorts')}
            className={`px-3 py-2 font-semibold whitespace-nowrap text-sm md:text-base ${activeTab === 'shorts' ? 'border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t('Shorts')}
          </button>
          <button
            onClick={() => setActiveTab('seller-applications')}
            className={`px-3 py-2 font-semibold whitespace-nowrap text-sm md:text-base flex items-center gap-1.5 ${activeTab === 'seller-applications' ? 'border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <FaStore size={14} />
            {t('Sellers')}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--text-muted)] text-sm">{t('Total Users')}</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalUsers || 0}</p>
                  </div>
                  <FaUsers className="text-4xl text-blue-600" />
                </div>
              </div>
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--text-muted)] text-sm">{t('Total Blogs')}</p>
                    <p className="text-3xl font-bold text-green-600">{stats.totalBlogs || 0}</p>
                  </div>
                  <TbBrandBlogger className="text-4xl text-blue-600" />
                </div>
              </div>
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--text-muted)] text-sm">{t('Total Articles')}</p>
                    <p className="text-3xl font-bold text-teal-600">{stats.totalArticles || 0}</p>
                  </div>
                  <img src={isDark ? '/image/article_logo_light.png' : '/image/article_logo_dark.png'} alt="Article" className="w-10 h-10" />
                </div>
              </div>
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--text-muted)] text-sm">{t('Total Shorts')}</p>
                    <p className="text-3xl font-bold text-pink-600">{stats.totalShorts || 0}</p>
                  </div>
                  <MdOutlineSwitchAccessShortcutAdd className="text-4xl text-pink-600" />
                </div>
              </div>
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--text-muted)] text-sm">{t('Active Today')}</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.activeUsersToday || 0}</p>
                  </div>
                  <FaUserCheck className="text-4xl text-orange-600" />
                </div>
              </div>
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--text-muted)] text-sm">{t('Guests Today')}</p>
                    <p className="text-3xl font-bold text-teal-600">{stats.guestToday || 0}</p>
                  </div>
                  <FaUsers className="text-4xl text-teal-600" />
                </div>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="mb-6 flex flex-wrap justify-end gap-2">
              {loadingStats && (
                <div className="w-full mb-4">
                  <BarLoader color="#3b82f6" width="100%" height={4} />
                </div>
              )}
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg shadow p-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setTimeRange(7)}
                  className={`px-3 py-2 rounded text-sm font-semibold ${timeRange === 7 ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'}`}
                >
                  {t('7 Days')}
                </button>
                <button
                  onClick={() => setTimeRange(30)}
                  className={`px-3 py-2 rounded text-sm font-semibold ${timeRange === 30 ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'}`}
                >
                  {t('30 Days')}
                </button>
                <button
                  onClick={() => setTimeRange(90)}
                  className={`px-3 py-2 rounded text-sm font-semibold ${timeRange === 90 ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'}`}
                >
                  {t('90 Days')}
                </button>
                <button
                  onClick={() => setTimeRange(180)}
                  className={`px-3 py-2 rounded text-sm font-semibold ${timeRange === 180 ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'}`}
                >
                  {t('6 Months')}
                </button>
                <button
                  onClick={() => setTimeRange(365)}
                  className={`px-3 py-2 rounded text-sm font-semibold ${timeRange === 365 ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'}`}
                >
                  {t('1 Year')}
                </button>
              </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">{t('Posts Per Day')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.blogsPerDay}>
                    <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Legend {...legendProps} />
                    <Bar dataKey="blogs" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Blogs" />
                    <Bar dataKey="articles" fill="#14b8a6" radius={[8, 8, 0, 0]} name="Articles" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">{t('Shorts Per Day')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.shortsPerDay || []}>
                    <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Bar dataKey="count" fill="#ec4899" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">{t('Comments Per Day')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.commentsPerDay || []}>
                    <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">{t('Active Users Per Day')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.activeUsersPerDay}>
                    <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Legend {...legendProps} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Active Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">{t('User Registrations')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.userRegistrations}>
                    <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Legend {...legendProps} />
                    <Line type="monotone" dataKey="User" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Users" />
                    <Line type="monotone" dataKey="Guest" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Guests" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">{t('Guest Analytics')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.guestAnalytics || []}>
                    <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Legend {...legendProps} />
                    <Line type="monotone" dataKey="uniqueVisitors" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Unique Visitors" />
                    <Line type="monotone" dataKey="pageViews" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Page Views" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Health Section */}
            {systemMetrics && (
              <div className="bg-[var(--surface-card)] rounded-xl shadow-lg p-6 border border-[var(--border-default)]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <FaServer className="text-blue-500" /> {t('System Health')}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${alertStatusClasses}`}>
                    {alertStatus === 'critical' ? t('Critical') : alertStatus === 'warning' ? t('Warning') : t('Healthy')}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">{t('Uptime')}</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {Math.floor(systemMetrics.uptime / 3600)}h {Math.floor((systemMetrics.uptime % 3600) / 60)}m
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">{t('Total Requests')}</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{systemMetrics.requests.toLocaleString()}</p>
                  </div>

                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/30 rounded-lg p-4 border border-violet-200 dark:border-violet-700">
                    <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-2">{t('Active Users')}</p>
                    <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">{systemMetrics.activeUsers || 0}</p>
                  </div>
                  
                  <div className={`bg-gradient-to-br rounded-lg p-4 border ${
                    systemMetrics.avgResponseTime < 200 
                      ? 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border-emerald-200 dark:border-emerald-700' 
                      : systemMetrics.avgResponseTime < 500 
                      ? 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-700' 
                      : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700'
                  }`}>
                    <p className={`text-xs font-medium mb-2 ${
                      systemMetrics.avgResponseTime < 200 
                        ? 'text-emerald-700 dark:text-emerald-300' 
                        : systemMetrics.avgResponseTime < 500 
                        ? 'text-amber-700 dark:text-amber-300' 
                        : 'text-red-700 dark:text-red-300'
                    }`}>{t('Avg Response')}</p>
                    <p className={`text-2xl font-bold ${
                      systemMetrics.avgResponseTime < 200 
                        ? 'text-emerald-900 dark:text-emerald-100' 
                        : systemMetrics.avgResponseTime < 500 
                        ? 'text-amber-900 dark:text-amber-100' 
                        : 'text-red-900 dark:text-red-100'
                    }`}>{systemMetrics.avgResponseTime}ms</p>
                  </div>

                  <div className={`bg-gradient-to-br rounded-lg p-4 border ${
                    (systemMetrics.p95ResponseTime || 0) < 500
                      ? 'from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 border-indigo-200 dark:border-indigo-700'
                      : (systemMetrics.p95ResponseTime || 0) < 1200
                      ? 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-700'
                      : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700'
                  }`}>
                    <p className={`text-xs font-medium mb-2 ${
                      (systemMetrics.p95ResponseTime || 0) < 500
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : (systemMetrics.p95ResponseTime || 0) < 1200
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>{t('P95 Response')}</p>
                    <p className={`text-2xl font-bold ${
                      (systemMetrics.p95ResponseTime || 0) < 500
                        ? 'text-indigo-900 dark:text-indigo-100'
                        : (systemMetrics.p95ResponseTime || 0) < 1200
                        ? 'text-amber-900 dark:text-amber-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>{systemMetrics.p95ResponseTime || 0}ms</p>
                  </div>

                  <div className={`bg-gradient-to-br rounded-lg p-4 border ${
                    (systemMetrics.errorRatePercent || 0) < 1
                      ? 'from-lime-50 to-lime-100 dark:from-lime-900/30 dark:to-lime-800/30 border-lime-200 dark:border-lime-700'
                      : (systemMetrics.errorRatePercent || 0) < 3
                      ? 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-700'
                      : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700'
                  }`}>
                    <p className={`text-xs font-medium mb-2 ${
                      (systemMetrics.errorRatePercent || 0) < 1
                        ? 'text-lime-700 dark:text-lime-300'
                        : (systemMetrics.errorRatePercent || 0) < 3
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>{t('5xx Error Rate')}</p>
                    <p className={`text-2xl font-bold ${
                      (systemMetrics.errorRatePercent || 0) < 1
                        ? 'text-lime-900 dark:text-lime-100'
                        : (systemMetrics.errorRatePercent || 0) < 3
                        ? 'text-amber-900 dark:text-amber-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>{systemMetrics.errorRatePercent || 0}%</p>
                  </div>
                  
                  <div className={`bg-gradient-to-br rounded-lg p-4 border ${
                    systemMetrics.memory < 300 
                      ? 'from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 border-teal-200 dark:border-teal-700' 
                      : systemMetrics.memory < 400 
                      ? 'from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700' 
                      : 'from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 border-rose-200 dark:border-rose-700'
                  }`}>
                    <p className={`text-xs font-medium mb-2 ${
                      systemMetrics.memory < 300 
                        ? 'text-teal-700 dark:text-teal-300' 
                        : systemMetrics.memory < 400 
                        ? 'text-orange-700 dark:text-orange-300' 
                        : 'text-rose-700 dark:text-rose-300'
                    }`}>{t('Memory Usage')}</p>
                    <p className={`text-2xl font-bold ${
                      systemMetrics.memory < 300 
                        ? 'text-teal-900 dark:text-teal-100' 
                        : systemMetrics.memory < 400 
                        ? 'text-orange-900 dark:text-orange-100' 
                        : 'text-rose-900 dark:text-rose-100'
                    }`}>{systemMetrics.memory}MB</p>
                  </div>
                  
                  <div className={`bg-gradient-to-br rounded-lg p-4 border ${
                    systemMetrics.database === 'connected' 
                      ? 'from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 border-cyan-200 dark:border-cyan-700' 
                      : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700'
                  }`}>
                    <p className={`text-xs font-medium mb-2 ${
                      systemMetrics.database === 'connected' 
                        ? 'text-cyan-700 dark:text-cyan-300' 
                        : 'text-red-700 dark:text-red-300'
                    }`}>{t('Database')}</p>
                    <p className={`text-2xl font-bold ${
                      systemMetrics.database === 'connected' 
                        ? 'text-cyan-900 dark:text-cyan-100' 
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {systemMetrics.database === 'connected' ? (
                        <span className="inline-flex items-center gap-2">
                          <FaCheckCircle className="text-emerald-500" />
                          {t('Connected')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <FaTimes className="text-red-500" />
                          {t('Disconnected')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-4 mt-5">
                  <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <FaExclamationTriangle className={alertStatus === 'healthy' ? 'text-emerald-500' : alertStatus === 'warning' ? 'text-amber-500' : 'text-red-500'} />
                      {t('Alert Summary')}
                    </h4>
                    {alertItems.length > 0 ? (
                      <div className="space-y-2">
                        {alertItems.map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className={`rounded-md px-3 py-2 text-sm border ${
                              item.severity === 'critical'
                                ? 'bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/60'
                                : 'bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/60'
                            }`}
                          >
                            <p className="font-semibold">{item.label}</p>
                            <p>{item.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/60 rounded-md px-3 py-2">
                        {t('No active alerts. All tracked thresholds are within healthy range.')}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <FaChartLine className="text-blue-500" />
                      {t('Traffic and Latency Insights')}
                    </h4>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        2xx: {statusBreakdown['2xx'] || 0}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                        3xx: {statusBreakdown['3xx'] || 0}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        4xx: {statusBreakdown['4xx'] || 0}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        5xx: {statusBreakdown['5xx'] || 0}
                      </span>
                    </div>

                    {topSlowRoutes.length > 0 ? (
                      <div className="space-y-2">
                        {topSlowRoutes.slice(0, 3).map((route, idx) => (
                          <div key={`${route.route}-${idx}`} className="rounded-md border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate flex items-center gap-2">
                              <FaTachometerAlt className="text-indigo-500" />
                              {route.route}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                              Avg: {route.avgResponseTime}ms | Max: {route.maxResponseTime}ms | Calls: {route.count}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                        <FaBug className="text-[var(--text-muted)]" />
                        {t('Route-level latency samples will appear as traffic increases.')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Guests Tab */}
        {activeTab === 'guests' && (
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-[var(--border-default)]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder={t('Search guests...')}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[var(--text-primary)]">
                <thead className="bg-[var(--background-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Users')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Blogs')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Shorts')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Joined')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {guests.filter(g => 
                    g.username.toLowerCase().includes(userSearch.toLowerCase())
                  ).map(g => (
                    <tr key={g._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <img src={g.profileImage || 'https://via.placeholder.com/40'} alt={g.username} className="w-10 h-10 rounded-full" />
                          <div>
                            <p className="font-semibold">{g.username}</p>
                            <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-2 py-1 rounded">Guest</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{g.blogCount}</td>
                      <td className="px-6 py-4 text-sm">{g.shortCount || 0}</td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{new Date(g.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={`/user/${g._id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title={t('View Profile')}
                          >
                            <FaEye size={18} />
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteUser(g._id, g.username)}
                              className="text-red-600 hover:text-red-800"
                              title={t('Delete')}
                            >
                              <FaTrash size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-[var(--border-default)]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder={t('Search users...')}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[var(--text-primary)]">
                <thead className="bg-[var(--background-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Users')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Verify')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Email Address')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Blogs')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Articles')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Shorts')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Joined')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {users.filter(u => 
                    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
                  ).map(u => (
                    <tr key={u._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <img src={u.profileImage || 'https://via.placeholder.com/40'} alt={u.username} className="w-10 h-10 rounded-full" />
                          <div>
                            <p className="font-semibold">{u.username}</p>
                            {u.role === 'admin' && <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-2 py-1 rounded">Admin</span>}
                            {u.role === 'coAdmin' && <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-1 rounded">Co-Admin</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleVerification(u._id, u.username, u.isVerified)}
                            className={`${u.isVerified ? 'text-blue-500' : 'text-[var(--text-muted)]'} hover:opacity-70 transition`}
                            title={u.isVerified ? t('Verified - Click to unverify') : t('Not verified - Click to verify')}
                            disabled={verifyingUserId === u._id}
                          >
                            {verifyingUserId === u._id ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                            ) : u.isVerified ? (
                              <GoVerified size={24} />
                            ) : (
                              <GoUnverified size={24} />
                            )}
                          </button>
                        )}
                        {!isAdmin && u.isVerified && <GoVerified size={24} className="text-blue-500" />}
                        {!isAdmin && !u.isVerified && <GoUnverified size={24} className="text-[var(--text-muted)]" />}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{u.blogCount}</td>
                      <td className="px-6 py-4 text-sm">{u.articleCount || 0}</td>
                      <td className="px-6 py-4 text-sm">{u.shortCount || 0}</td>
                      <td className="px-6 py-4">
                        {u.isActive ? (
                          <span className="text-green-600 flex items-center gap-1"><FaCheckCircle /> {t('Active')}</span>
                        ) : (
                          <div className="text-red-600">
                            <div className="flex items-center gap-1 font-semibold"><FaBan /> {t('Suspended')}</div>
                            {u.suspendedUntil && (
                              <div className="text-xs text-[var(--text-secondary)] mt-1">
                                Until: {new Date(u.suspendedUntil).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={`/user/${u._id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title={t('View Profile')}
                          >
                            <FaEye size={18} />
                          </Link>
                          {isAdmin && u.role === 'user' && (
                            <>
                              <button
                                onClick={() => handleMakeAdmin(u._id, u.username)}
                                className="text-purple-600 hover:text-purple-800"
                                title={t('Make Admin')}
                              >
                                <FaUserShield size={18} />
                              </button>
                              <button
                                onClick={() => handleMakeCoAdmin(u._id, u.username)}
                                className="text-blue-600 hover:text-blue-800"
                                title={t('Make Co-Admin')}
                              >
                                <FaUserTie size={18} />
                              </button>
                              <button
                                onClick={() => handleSuspendUser(u._id, u.username, u.isActive)}
                                className="text-orange-600 hover:text-orange-800"
                                title={t('Suspend') + '/' + t('Unsuspend')}
                              >
                                <FaBan size={18} />
                              </button>
                              <button
                                onClick={() => handleSendWarningEmail(u._id, u.username)}
                                className="text-amber-600 hover:text-amber-800"
                                title="Send Account Warning Email"
                              >
                                <FaEnvelope size={18} />
                              </button>
                              <button
                                onClick={() => handleSendPreDeletionEmail(u._id, u.username)}
                                className="text-rose-600 hover:text-rose-800"
                                title="Send Pre-Deletion Warning Email"
                              >
                                <FaEnvelope size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u._id, u.username)}
                                className="text-red-600 hover:text-red-800"
                                title={t('Delete')}
                              >
                                <FaTrash size={18} />
                              </button>
                            </>
                          )}
                          {isAdmin && u.role === 'coAdmin' && (
                            <>
                              <button
                                onClick={() => handleSuspendUser(u._id, u.username, u.isActive)}
                                className="text-orange-600 hover:text-orange-800"
                                title={t('Suspend') + '/' + t('Unsuspend')}
                              >
                                <FaBan size={18} />
                              </button>
                              <button
                                onClick={() => handleSendWarningEmail(u._id, u.username)}
                                className="text-amber-600 hover:text-amber-800"
                                title="Send Account Warning Email"
                              >
                                <FaEnvelope size={18} />
                              </button>
                              <button
                                onClick={() => handleSendPreDeletionEmail(u._id, u.username)}
                                className="text-rose-600 hover:text-rose-800"
                                title="Send Pre-Deletion Warning Email"
                              >
                                <FaEnvelope size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u._id, u.username)}
                                className="text-red-600 hover:text-red-800"
                                title={t('Delete')}
                              >
                                <FaTrash size={18} />
                              </button>
                              <button
                                onClick={() => handleMakeAdmin(u._id, u.username)}
                                className="text-purple-600 hover:text-purple-800"
                                title={t('Make Admin')}
                              >
                                <FaUserShield size={18} />
                              </button>
                              <button
                                onClick={() => handleRemoveCoAdmin(u._id, u.username)}
                                className="text-red-600 hover:text-red-800"
                                title={t('Remove Co-Admin')}
                              >
                                <FaTimes size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shorts Tab */}
        {activeTab === 'shorts' && (
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-[var(--border-default)]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder={t('Search shorts...')}
                  value={shortSearch}
                  onChange={(e) => setShortSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[var(--text-primary)]">
                <thead className="bg-[var(--background-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Title')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Author')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Likes')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Comments')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Created')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {shorts.filter(short => 
                    short.title.toLowerCase().includes(shortSearch.toLowerCase()) ||
                    short.author?.username.toLowerCase().includes(shortSearch.toLowerCase())
                  ).map(short => (
                    <tr key={short._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[var(--text-primary)] truncate max-w-xs">{short.title}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{short.author?.username}</td>
                      <td className="px-6 py-4 text-sm">{short.likes?.length || 0}</td>
                      <td className="px-6 py-4 text-sm">{short.commentCount || 0}</td>
                      <td className="px-6 py-4">
                        {short.isDraft ? (
                          <span className="text-yellow-600 text-sm">{t('Draft')}</span>
                        ) : (
                          <span className="text-green-600 text-sm">{t('Published')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{new Date(short.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={short.isDraft ? `/edit/${short._id}` : `/shorts/${short._id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title={short.isDraft ? t('View Draft') : t('View Short')}
                          >
                            <FaEye size={18} />
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteShort(short._id, short.title)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <FaTrash size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'seller-applications' && (
          <AdminSellerApplications />
        )}

        {/* Blogs Tab */}
        {activeTab === 'blogs' && (
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-[var(--border-default)]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder={t('Search blogs...')}
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[var(--text-primary)]">
                <thead className="bg-[var(--background-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Title')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Author')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Likes')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Comments')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Created')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {blogs.filter(blog => 
                    blog.title.toLowerCase().includes(blogSearch.toLowerCase()) ||
                    blog.author?.username.toLowerCase().includes(blogSearch.toLowerCase())
                  ).map(blog => (
                    <tr key={blog._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[var(--text-primary)] truncate max-w-xs">{blog.title}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{blog.author?.username}</td>
                      <td className="px-6 py-4 text-sm">{blog.likes?.length || 0}</td>
                      <td className="px-6 py-4 text-sm">{blog.commentCount || 0}</td>
                      <td className="px-6 py-4">
                        {blog.isDraft ? (
                          <span className="text-yellow-600 text-sm">{t('Draft')}</span>
                        ) : (
                          <span className="text-green-600 text-sm">{t('Published')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{new Date(blog.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={`/blog/${blog._id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title={t('View Blog')}
                          >
                            <FaEye size={18} />
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteBlog(blog._id, blog.title)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <FaTrash size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-[var(--border-default)]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder={t('Search articles...')}
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[var(--text-primary)]">
                <thead className="bg-[var(--background-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Title')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Author')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Likes')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Comments')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Created')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {(articles || []).filter(article => 
                    article.title.toLowerCase().includes(articleSearch.toLowerCase()) ||
                    article.author?.username.toLowerCase().includes(articleSearch.toLowerCase())
                  ).map(article => (
                    <tr key={article._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[var(--text-primary)] truncate max-w-xs">{article.title}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{article.author?.username}</td>
                      <td className="px-6 py-4 text-sm">{article.likes?.length || 0}</td>
                      <td className="px-6 py-4 text-sm">{article.commentCount || 0}</td>
                      <td className="px-6 py-4">
                        {article.isDraft ? (
                          <span className="text-yellow-600 text-sm">{t('Draft')}</span>
                        ) : (
                          <span className="text-green-600 text-sm">{t('Published')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{new Date(article.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={`/article/${article._id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title={t('View Article')}
                          >
                            <FaEye size={18} />
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteArticle(article._id, article.title)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <FaTrash size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Professional Modal */}
        {showModal && (
          <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
            <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
              <h3 className={`text-xl font-bold mb-4 ${
                modalConfig.type === 'success' ? 'text-green-600' :
                modalConfig.type === 'delete-user' || modalConfig.type === 'delete-blog' || modalConfig.type === 'delete-article' || modalConfig.type === 'delete-short' || modalConfig.type === 'remove-coadmin' ? 'text-red-600' :
                modalConfig.type === 'make-admin' ? 'text-purple-600' :
                modalConfig.type === 'make-coadmin' ? 'text-blue-600' :
                'text-orange-600'
              }`}>{modalConfig.title}</h3>
              <p className="text-[var(--text-secondary)] mb-4">{modalConfig.message}</p>
              
              {modalError && <div className="bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 text-sm border border-red-200 dark:border-red-700/60">{modalError}</div>}
              
              {suspendLoading && (
                <div className="flex justify-center mb-4">
                  <PropagateLoader color="#f97316" size={15} />
                </div>
              )}
              
              {modalConfig.needsInput && (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={suspendDays}
                      onChange={(e) => setSuspendDays(e.target.value)}
                      placeholder="Enter duration"
                      className="flex-1 px-4 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      min="1"
                    />
                    <select
                      value={suspendUnit}
                      onChange={(e) => setSuspendUnit(e.target.value)}
                      className="px-4 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-[var(--surface-card)] text-[var(--text-primary)]"
                    >
                      <option value="hours">{t('Hours')}</option>
                      <option value="days">{t('Days')}</option>
                      <option value="months">{t('Months')}</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                {modalConfig.type === 'success' ? (
                  <button
                    onClick={closeModal}
                    className="w-full bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
                  >
                    {t('OK')}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={modalConfig.type === 'suspend-user' ? handleModalConfirm : modalConfig.onConfirm}
                      className={`flex-1 px-6 py-2 rounded-lg hover:opacity-90 font-semibold text-white ${
                        modalConfig.type === 'delete-user' || modalConfig.type === 'delete-blog' || modalConfig.type === 'delete-article' || modalConfig.type === 'delete-short' || modalConfig.type === 'remove-coadmin' ? 'bg-red-600' :
                        modalConfig.type === 'make-admin' ? 'bg-purple-600' :
                        modalConfig.type === 'make-coadmin' ? 'bg-blue-600' :
                        'bg-orange-600'
                      }`}
                    >
                      {modalConfig.confirmText}
                    </button>
                    <button
                      onClick={closeModal}
                      className="flex-1 theme-soft-button px-6 py-2 rounded-lg font-semibold"
                    >
                      {t('Cancel')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

