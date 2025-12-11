import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaUsers, FaFileAlt, FaComments, FaUserCheck, FaTrash, FaBan, FaCheckCircle, FaEye, FaSearch, FaUserShield, FaUserTie, FaTimes } from 'react-icons/fa';
import { MdOutlineSwitchAccessShortcutAdd } from 'react-icons/md';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatsCardSkeleton, TableRowSkeleton } from '../components/SkeletonLoader';
import { BarLoader, PropagateLoader } from 'react-spinners';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [blogSearch, setBlogSearch] = useState('');
  const [shortSearch, setShortSearch] = useState('');
  const [timeRange, setTimeRange] = useState(7);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const [suspendDays, setSuspendDays] = useState('');
  const [suspendUnit, setSuspendUnit] = useState('days');
  const [modalError, setModalError] = useState('');
  const [loadingStats, setLoadingStats] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState(false);

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
      const [statsRes, usersRes, blogsRes, shortsRes] = await Promise.all([
        api.get(`/admin/stats?days=${timeRange}`),
        api.get('/admin/users'),
        api.get('/admin/blogs'),
        api.get('/admin/shorts')
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setBlogs(blogsRes.data.blogs);
      setShorts(shortsRes.data.shorts);
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8 text-gray-800">{t('Admin Dashboard')}</h1>
          <div className="flex gap-4 mb-6 border-b">
            <div className="px-4 py-2 font-semibold border-b-2 border-blue-600 text-blue-600">{t('Overview')}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
            {[...Array(5)].map((_, i) => <StatsCardSkeleton key={i} />)}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
              <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
              <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isCoAdmin = user?.role === 'coAdmin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            {isCoAdmin ? t('Co-Admin Dashboard') : t('Admin Dashboard')}
          </h1>
          {isCoAdmin && (
            <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold">
              {t('Read-Only Access')}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            {t('Overview')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-semibold ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            {t('Users')}
          </button>
          <button
            onClick={() => setActiveTab('blogs')}
            className={`px-4 py-2 font-semibold ${activeTab === 'blogs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            {t('Blogs')}
          </button>
          <button
            onClick={() => setActiveTab('shorts')}
            className={`px-4 py-2 font-semibold ${activeTab === 'shorts' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            {t('Shorts')}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">{t('Total Users')}</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalUsers || 0}</p>
                  </div>
                  <FaUsers className="text-4xl text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">{t('Total Blogs')}</p>
                    <p className="text-3xl font-bold text-green-600">{stats.totalBlogs || 0}</p>
                  </div>
                  <FaFileAlt className="text-4xl text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">{t('Total Shorts')}</p>
                    <p className="text-3xl font-bold text-pink-600">{stats.totalShorts || 0}</p>
                  </div>
                  <MdOutlineSwitchAccessShortcutAdd className="text-4xl text-pink-600" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">{t('Total Comments')}</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalComments || 0}</p>
                  </div>
                  <FaComments className="text-4xl text-purple-600" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">{t('Active Today')}</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.activeUsersToday || 0}</p>
                  </div>
                  <FaUserCheck className="text-4xl text-orange-600" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">{t('Guests Today')}</p>
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
              <div className="bg-white rounded-lg shadow p-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setTimeRange(7)}
                  className={`px-3 py-2 rounded text-sm font-semibold ${timeRange === 7 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t('7 Days')}
                </button>
                <button
                  onClick={() => setTimeRange(30)}
                  className={`px-3 py-2 rounded text-sm font-semibold ${timeRange === 30 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t('30 Days')}
                </button>
                <button
                  onClick={() => setTimeRange(90)}
                  className={`px-3 py-2 rounded text-sm font-semibold ${timeRange === 90 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t('90 Days')}
                </button>
                <button
                  onClick={() => setTimeRange(180)}
                  className={`px-3 py-2 rounded text-sm font-semibold ${timeRange === 180 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t('6 Months')}
                </button>
                <button
                  onClick={() => setTimeRange(365)}
                  className={`px-3 py-2 rounded text-sm font-semibold ${timeRange === 365 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t('1 Year')}
                </button>
              </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">{t('Blogs Per Day')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.blogsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">{t('Shorts Per Day')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.shortsPerDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ec4899" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">{t('Comments Per Day')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.commentsPerDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">{t('Active Users Per Day')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.activeUsersPerDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Active Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">{t('User Registrations')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.userRegistrations}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">{t('Guest Analytics')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.guestAnalytics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={timeRange > 30 ? -45 : 0} textAnchor={timeRange > 30 ? 'end' : 'middle'} height={timeRange > 30 ? 80 : 30} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="uniqueVisitors" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Unique Visitors" />
                    <Line type="monotone" dataKey="pageViews" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Page Views" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>


          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b">
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('Search users...')}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Users')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Email Address')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Blogs')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Shorts')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Joined')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.filter(u => 
                    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
                  ).map(u => (
                    <tr key={u._id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <img src={u.profileImage || 'https://via.placeholder.com/40'} alt={u.username} className="w-10 h-10 rounded-full" />
                          <div>
                            <p className="font-semibold">{u.username}</p>
                            {u.role === 'admin' && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">Admin</span>}
                            {u.role === 'coAdmin' && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Co-Admin</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{u.blogCount}</td>
                      <td className="px-6 py-4 text-sm">{u.shortCount || 0}</td>
                      <td className="px-6 py-4">
                        {u.isActive ? (
                          <span className="text-green-600 flex items-center gap-1"><FaCheckCircle /> {t('Active')}</span>
                        ) : (
                          <div className="text-red-600">
                            <div className="flex items-center gap-1 font-semibold"><FaBan /> {t('Suspended')}</div>
                            {u.suspendedUntil && (
                              <div className="text-xs text-gray-600 mt-1">
                                Until: {new Date(u.suspendedUntil).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(u.createdAt).toLocaleDateString()}</td>
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
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b">
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('Search shorts...')}
                  value={shortSearch}
                  onChange={(e) => setShortSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Title')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Author')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Likes')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Comments')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Created')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {shorts.filter(short => 
                    short.title.toLowerCase().includes(shortSearch.toLowerCase()) ||
                    short.author?.username.toLowerCase().includes(shortSearch.toLowerCase())
                  ).map(short => (
                    <tr key={short._id}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800 truncate max-w-xs">{short.title}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{short.author?.username}</td>
                      <td className="px-6 py-4 text-sm">{short.likes?.length || 0}</td>
                      <td className="px-6 py-4 text-sm">{short.commentCount || 0}</td>
                      <td className="px-6 py-4">
                        {short.isDraft ? (
                          <span className="text-yellow-600 text-sm">{t('Draft')}</span>
                        ) : (
                          <span className="text-green-600 text-sm">{t('Published')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(short.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={`/shorts/${short._id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title={t('View Short')}
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

        {/* Blogs Tab */}
        {activeTab === 'blogs' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b">
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('Search blogs...')}
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Title')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Author')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Likes')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Comments')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Created')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {blogs.filter(blog => 
                    blog.title.toLowerCase().includes(blogSearch.toLowerCase()) ||
                    blog.author?.username.toLowerCase().includes(blogSearch.toLowerCase())
                  ).map(blog => (
                    <tr key={blog._id}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800 truncate max-w-xs">{blog.title}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{blog.author?.username}</td>
                      <td className="px-6 py-4 text-sm">{blog.likes?.length || 0}</td>
                      <td className="px-6 py-4 text-sm">{blog.commentCount || 0}</td>
                      <td className="px-6 py-4">
                        {blog.isDraft ? (
                          <span className="text-yellow-600 text-sm">{t('Draft')}</span>
                        ) : (
                          <span className="text-green-600 text-sm">{t('Published')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(blog.createdAt).toLocaleDateString()}</td>
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

        {/* Professional Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className={`text-xl font-bold mb-4 ${
                modalConfig.type === 'success' ? 'text-green-600' :
                modalConfig.type === 'delete-user' || modalConfig.type === 'delete-blog' || modalConfig.type === 'delete-short' || modalConfig.type === 'remove-coadmin' ? 'text-red-600' :
                modalConfig.type === 'make-admin' ? 'text-purple-600' :
                modalConfig.type === 'make-coadmin' ? 'text-blue-600' :
                'text-orange-600'
              }`}>{modalConfig.title}</h3>
              <p className="text-gray-700 mb-4">{modalConfig.message}</p>
              
              {modalError && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{modalError}</div>}
              
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
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="1"
                    />
                    <select
                      value={suspendUnit}
                      onChange={(e) => setSuspendUnit(e.target.value)}
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
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
                        modalConfig.type === 'delete-user' || modalConfig.type === 'delete-blog' || modalConfig.type === 'delete-short' || modalConfig.type === 'remove-coadmin' ? 'bg-red-600' :
                        modalConfig.type === 'make-admin' ? 'bg-purple-600' :
                        modalConfig.type === 'make-coadmin' ? 'bg-blue-600' :
                        'bg-orange-600'
                      }`}
                    >
                      {modalConfig.confirmText}
                    </button>
                    <button
                      onClick={closeModal}
                      className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
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
