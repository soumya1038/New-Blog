import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaCamera, FaKey, FaTrash, FaEye, FaEyeSlash, FaCopy, FaPlus, FaEdit, FaTimes, FaArrowLeft, FaArrowRight, FaShare, FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaFacebookF } from 'react-icons/fa';
import { PiBookOpenTextThin } from 'react-icons/pi';
import { FaXTwitter } from 'react-icons/fa6';
import { GoVerified, GoUnverified } from 'react-icons/go';
import AIBioGenerator from '../components/AIBioGenerator';
import Avatar from '../components/Avatar';
import GuestBadge from '../components/GuestBadge';
import { ScaleLoader, SyncLoader, BeatLoader, HashLoader } from 'react-spinners';
import ScrollToTop from '../components/ScrollToTop';
import ProfileCompleteness from '../components/ProfileCompleteness';
import ActivityStats from '../components/ActivityStats';
import QuickActions from '../components/QuickActions';
import PrivacySettings from '../components/PrivacySettings';
import Achievements from '../components/Achievements';
import QRCodeModal from '../components/QRCodeModal';

const ProfileNew = () => {
  const { t } = useTranslation();
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const profileRef = React.useRef(null);

  // State
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '', dateOfBirth: '', bio: '', socialMedia: [] });
  const [blogs, setBlogs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDeleting, setImageDeleting] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [sendingPasswordCode, setSendingPasswordCode] = useState(false);
  const [showPasswordCodeModal, setShowPasswordCodeModal] = useState(false);
  const [passwordCode, setPasswordCode] = useState('');
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState({});
  const [showContactSection, setShowContactSection] = useState(false);
  const [contactForm, setContactForm] = useState({ issue: '', advice: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [sendingDeleteCode, setSendingDeleteCode] = useState(false);
  const [showDeleteCodeModal, setShowDeleteCodeModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [showSocialSection, setShowSocialSection] = useState(false);
  const [socialForm, setSocialForm] = useState({ name: '', url: '', editIndex: -1 });
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });
  const [showQRModal, setShowQRModal] = useState(false);
  const [showProfileShareModal, setShowProfileShareModal] = useState(false);

  // Fetch data
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [profileRes, keysRes, blogsRes, articlesRes, shortsRes] = await Promise.all([
          api.get('/users/profile'),
          api.get('/users/api-keys'),
          api.get(`/blogs?author=${user._id}`),
          api.get(`/articles?author=${user._id}`),
          api.get(`/shorts?author=${user._id}`)
        ]);
        setProfile(profileRes.data.user);
        setApiKeys(keysRes.data.apiKeys);
        setBlogs(blogsRes.data.blogs);
        setArticles(articlesRes.data.articles);
        setShorts(shortsRes.data.shorts);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (expandedCard && profileRef.current && !profileRef.current.contains(e.target)) {
        setExpandedCard(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expandedCard]);

  const showModal = (type, title, message, onConfirm = null) => {
    setModal({ show: true, type, title, message, onConfirm });
  };

  const closeModal = () => {
    setModal({ show: false, type: '', title: '', message: '', onConfirm: null });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put('/users/profile', profile);
      showModal('success', 'Success', 'Profile updated!');
      setShowProfileForm(false);
    } catch (error) {
      showModal('error', 'Error', 'Failed to update profile');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('profileImage', file);
    setImageUploading(true);
    try {
      const { data } = await api.post('/users/profile/image', formData);
      setUser({ ...user, profileImage: data.profileImage });
      showModal('success', 'Success', 'Image updated!');
    } catch (error) {
      showModal('error', 'Error', 'Upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    showModal('confirm', 'Remove Image', 'Remove profile image?', async () => {
      setImageDeleting(true);
      try {
        await api.delete('/users/profile/image');
        setUser({ ...user, profileImage: '' });
        showModal('success', 'Success', 'Image removed!');
      } catch (error) {
        showModal('error', 'Error', 'Failed to remove');
      } finally {
        setImageDeleting(false);
      }
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSendingPasswordCode(true);
    try {
      await api.post('/users/password/request', passwords);
      setShowPasswordForm(false);
      setShowPasswordCodeModal(true);
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed');
    } finally {
      setSendingPasswordCode(false);
    }
  };

  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/password/confirm', { code: passwordCode });
      showModal('success', 'Success', 'Password changed!');
      setShowPasswordCodeModal(false);
      setPasswordCode('');
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (error) {
      showModal('error', 'Error', 'Invalid code');
    }
  };

  const generateApiKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      await api.post('/users/api-keys', { name: newKeyName });
      showModal('success', 'Success', 'API key generated!');
      setNewKeyName('');
      setShowApiKeyForm(false);
      const { data } = await api.get('/users/api-keys');
      setApiKeys(data.apiKeys);
    } catch (error) {
      showModal('error', 'Error', 'Failed to generate');
    }
  };

  const revokeApiKey = (keyId, keyName) => {
    showModal('confirm', 'Revoke Key', `Revoke "${keyName}"?`, async () => {
      try {
        await api.delete(`/users/api-keys/${keyId}`);
        showModal('success', 'Success', 'Key revoked');
        const { data } = await api.get('/users/api-keys');
        setApiKeys(data.apiKeys);
      } catch (error) {
        showModal('error', 'Error', 'Failed to revoke');
      }
    });
  };

  const saveSocialMedia = async () => {
    if (!socialForm.url.trim()) return;
    const updatedSocial = [...profile.socialMedia];
    const newItem = { name: socialForm.name.trim(), url: socialForm.url.trim() };
    if (socialForm.editIndex >= 0) {
      updatedSocial[socialForm.editIndex] = newItem;
    } else {
      updatedSocial.push(newItem);
    }
    try {
      await api.put('/users/profile', { ...profile, socialMedia: updatedSocial });
      setProfile({ ...profile, socialMedia: updatedSocial });
      setShowSocialSection(false);
      setSocialForm({ name: '', url: '', editIndex: -1 });
      showModal('success', 'Success', 'Link saved!');
    } catch (error) {
      showModal('error', 'Error', 'Failed to save');
    }
  };

  const deleteSocialMedia = (index) => {
    showModal('confirm', 'Delete Link', 'Delete this link?', async () => {
      const updatedSocial = profile.socialMedia.filter((_, i) => i !== index);
      try {
        await api.put('/users/profile', { ...profile, socialMedia: updatedSocial });
        setProfile({ ...profile, socialMedia: updatedSocial });
        showModal('success', 'Success', 'Link deleted!');
      } catch (error) {
        showModal('error', 'Error', 'Failed to delete');
      }
    });
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || newUsername.trim().length < 3) return;
    setUsernameLoading(true);
    try {
      const { data } = await api.put('/users/username', { username: newUsername.trim() });
      setUser({ ...user, username: data.user.username });
      setShowUsernameModal(false);
      setNewUsername('');
      showModal('success', 'Success', 'Username updated!');
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) return;
    setSendingDeleteCode(true);
    try {
      await api.post('/users/account/delete-request', { password: deletePassword });
      setShowDeleteModal(false);
      setShowDeleteCodeModal(true);
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed');
    } finally {
      setSendingDeleteCode(false);
    }
  };

  const handleConfirmDeleteAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/account/delete-confirm', { code: deleteCode });
      showModal('success', 'Success', 'Account deleted');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      showModal('error', 'Error', 'Invalid code');
    }
  };

  const handleShare = (postId, postTitle, isArticle = false) => {
    const url = `${window.location.origin}/${isArticle ? 'article' : 'blog'}/${postId}`;
    setShareUrl(url);
    setShareTitle(postTitle);
    setShowShareModal(true);
  };

  const formatPostDate = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffDays = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return postDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getContributionData = () => {
    const weeks = [];
    const months = [];
    const startDate = new Date(heatmapYear, 0, 1);
    const endDate = new Date(heatmapYear, 11, 31);
    const allContent = [...blogs, ...articles, ...shorts];
    const current = new Date(startDate);
    let week = [];
    let weekCount = 0;
    const startDay = startDate.getDay();
    for (let i = 0; i < startDay; i++) {
      week.push({ date: null, count: -1, isInYear: false });
    }
    const monthFirstWeek = {};
    while (current <= endDate) {
      const monthNum = current.getMonth();
      if (current.getDate() === 1) {
        monthFirstWeek[monthNum] = weekCount;
      }
      const dateStr = current.toDateString();
      const count = allContent.filter(item => new Date(item.createdAt).toDateString() === dateStr).length;
      week.push({ date: new Date(current), count, isInYear: true });
      if (week.length === 7) {
        weeks.push([...week]);
        week = [];
        weekCount++;
      }
      current.setDate(current.getDate() + 1);
    }
    if (week.length > 0) {
      while (week.length < 7) {
        week.push({ date: null, count: -1, isInYear: false });
      }
      weeks.push(week);
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < 12; i++) {
      if (monthFirstWeek.hasOwnProperty(i)) {
        months.push({ month: monthNames[i], weekIndex: monthFirstWeek[i] });
      }
    }
    return { weeks, months };
  };

  const getAvailableYears = () => {
    const allContent = [...blogs, ...articles, ...shorts];
    if (allContent.length === 0) return [new Date().getFullYear()];
    const years = new Set();
    allContent.forEach(item => years.add(new Date(item.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  };

  const getHeatmapColor = (count, isInYear) => {
    if (!isInYear) return 'bg-transparent';
    if (count === 0) return 'bg-gray-100 dark:bg-gray-700';
    if (count === 1) return 'bg-green-200 dark:bg-green-800';
    if (count === 2) return 'bg-green-400 dark:bg-green-600';
    if (count >= 3) return 'bg-green-600 dark:bg-green-400';
    return 'bg-gray-100 dark:bg-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen theme-page-bg flex items-center justify-center">
        <ScaleLoader color="#6366f1" />
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-page-bg py-8">
      <ScrollToTop />
      <div className="container mx-auto px-4 max-w-7xl" ref={profileRef}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 font-semibold text-[var(--brand-primary)] hover:opacity-80 transition">
          <FaArrowLeft /> {t('Back')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Card */}
            <div className="theme-panel rounded-3xl shadow-xl p-6 transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center md:gap-6 lg:flex-col lg:items-center">
                {/* Avatar Section */}
                <div className="flex flex-col items-center md:items-start lg:items-center mb-4 md:mb-0 lg:mb-4">
                  <div className="relative mb-3">
                    <Avatar user={user} size="xl" />
                    {(imageUploading || imageDeleting) && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <ScaleLoader color="#fff" height={20} width={3} />
                      </div>
                    )}
                    {user?.profileImage && !imageUploading && !imageDeleting && (
                      <button onClick={handleRemoveImage} className="absolute top-0 right-0 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600" title="Remove">
                        <FaTimes size={12} />
                      </button>
                    )}
                    <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700">
                      <FaCamera />
                      <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" disabled={imageUploading || imageDeleting} />
                    </label>
                  </div>
                  <div className="text-center md:text-left lg:text-center">
                    <div className="flex items-center justify-center md:justify-start lg:justify-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user?.username}</h2>
                      {!user?.isGuest && user?.role !== 'guest' && (
                        user?.isVerified ? (
                          <div className="bg-blue-600 rounded-full p-1"><GoVerified className="text-white" size={18} /></div>
                        ) : (
                          <GoUnverified className="text-gray-400" size={20} />
                        )
                      )}
                      {(user?.isGuest || user?.role === 'guest') && <GuestBadge size="lg" />}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('Member since')} {new Date(user?.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {!showProfileForm ? (
                  <div className="w-full md:flex-1 lg:w-full">
                    <div className="space-y-3 mb-4">
                      {profile.fullName && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('Name')}</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{profile.fullName}</span>
                        </div>
                      )}
                      {profile.email && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('Email')}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-300 truncate ml-2">{profile.email}</span>
                        </div>
                      )}
                      {profile.phone && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('Phone')}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-300">{profile.phone}</span>
                        </div>
                      )}
                      {profile.bio && (
                        <div className="pt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('Bio')}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
                        </div>
                      )}
                    </div>
                    {/* Buttons always at bottom */}
                    <div className="flex gap-2 w-full">
                      <button onClick={() => { setNewUsername(user?.username || ''); setShowUsernameModal(true); }} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                        <FaEdit size={14} /> {t('Username')}
                      </button>
                      <button onClick={() => setShowProfileForm(true)} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2">
                        <FaEdit size={14} /> {t('Profile')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="w-full space-y-3">
                    <input type="text" placeholder={t('Full Name')} value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="email" placeholder={t('Email')} value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="tel" placeholder={t('Phone')} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="date" value={profile.dateOfBirth?.split('T')[0] || ''} onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-semibold dark:text-gray-300">{t('Bio')}</label>
                        <AIBioGenerator onGenerate={(bio) => setProfile({ ...profile, bio })} />
                      </div>
                      <textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows="3" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">{t('Save')}</button>
                      <button type="button" onClick={() => setShowProfileForm(false)} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">{t('Cancel')}</button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Social Media Card */}
            <div className="theme-panel rounded-3xl shadow-xl p-6 transition-all duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('Social Links')}</h3>
                <button onClick={() => setShowSocialSection(!showSocialSection)} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                  {showSocialSection ? <FaTimes /> : <FaPlus />}
                </button>
              </div>
              
              {showSocialSection && (
                <div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                  <div className="space-y-3">
                    <input type="text" value={socialForm.name} onChange={(e) => setSocialForm({ ...socialForm, name: e.target.value })} placeholder="Name (optional)" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" />
                    <input type="url" value={socialForm.url} onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required />
                    <div className="flex gap-2">
                      <button onClick={saveSocialMedia} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t('Save')}</button>
                      <button onClick={() => { setShowSocialSection(false); setSocialForm({ name: '', url: '', editIndex: -1 }); }} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">{t('Cancel')}</button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className={`grid gap-3 ${
                profile.socialMedia?.length === 1 ? 'grid-cols-1' :
                profile.socialMedia?.length === 2 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-1' :
                'grid-cols-1 md:grid-cols-3 lg:grid-cols-1'
              }`}>
                {profile.socialMedia?.map((social, index) => (
                  <div key={index} className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm dark:text-gray-200 truncate">{social.name || 'Link'}</p>
                      <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{social.url}</a>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setSocialForm({ ...social, editIndex: index }); setShowSocialSection(true); }} className="text-blue-600 hover:text-blue-800"><FaEdit size={14} /></button>
                      <button onClick={() => deleteSocialMedia(index)} className="text-red-600 hover:text-red-800"><FaTrash size={14} /></button>
                    </div>
                  </div>
                ))}
                {(!profile.socialMedia || profile.socialMedia.length === 0) && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">{t('No links added')}</p>
                )}
              </div>
            </div>

            {/* Quick Actions - Only on large+ screens */}
            <div className="hidden lg:block">
              <QuickActions 
                user={user} 
                onShareProfile={() => setShowProfileShareModal(true)}
                onShowQR={() => setShowQRModal(true)}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-9 space-y-6">
            {/* Profile Completeness */}
            <ProfileCompleteness user={user} profile={profile} />

            {/* Activity Statistics */}
            <ActivityStats blogs={blogs} articles={articles} shorts={shorts} user={user} />

            {/* Quick Actions - Only on small/medium screens */}
            <div className="lg:hidden">
              <QuickActions 
                user={user} 
                onShareProfile={() => setShowProfileShareModal(true)}
                onShowQR={() => setShowQRModal(true)}
              />
            </div>

            {/* Achievements */}
            <Achievements blogs={blogs} articles={articles} shorts={shorts} user={user} />

            {/* Activity Graph */}
            {(blogs.length > 0 || articles.length > 0 || shorts.length > 0) && (
              <div className="theme-panel rounded-3xl shadow-xl p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('Activity')}</h3>
                  <select value={heatmapYear} onChange={(e) => setHeatmapYear(Number(e.target.value))} className="text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {getAvailableYears().map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <div className="overflow-x-auto pb-2">
                  <div className="inline-flex gap-0.5 min-w-max">
                    <div className="flex flex-col gap-0.5 mr-1">
                      <div className="h-2.5"></div>
                      <div className="w-6 h-2.5 text-[9px] text-gray-500 flex items-center">Mon</div>
                      <div className="w-6 h-2.5"></div>
                      <div className="w-6 h-2.5 text-[9px] text-gray-500 flex items-center">Wed</div>
                      <div className="w-6 h-2.5"></div>
                      <div className="w-6 h-2.5 text-[9px] text-gray-500 flex items-center">Fri</div>
                      <div className="w-6 h-2.5"></div>
                    </div>
                    <div>
                      <div className="relative h-3 mb-0.5">
                        {getContributionData().months.map((m, idx) => (
                          <div key={idx} className="text-[9px] text-gray-500 absolute" style={{ left: `${m.weekIndex * 12}px` }}>{m.month}</div>
                        ))}
                      </div>
                      <div className="flex gap-0.5">
                        {getContributionData().weeks.map((week, weekIndex) => (
                          <div key={weekIndex} className="flex flex-col gap-0.5">
                            {week.map((day, dayIndex) => (
                              <div key={dayIndex} className={`w-2.5 h-2.5 rounded-sm ${getHeatmapColor(day.count, day.isInYear)} ${day.isInYear && day.count > 0 ? 'hover:ring-1 hover:ring-blue-400 cursor-pointer' : ''} transition`} title={day.isInYear ? `${day.date.toLocaleDateString()}: ${day.count} post${day.count !== 1 ? 's' : ''}` : ''}></div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-600 dark:text-gray-400">
                  <span>Less</span>
                  <div className="flex gap-0.5">
                    <div className="w-2.5 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-sm"></div>
                    <div className="w-2.5 h-2.5 bg-green-200 dark:bg-green-800 rounded-sm"></div>
                    <div className="w-2.5 h-2.5 bg-green-400 dark:bg-green-600 rounded-sm"></div>
                    <div className="w-2.5 h-2.5 bg-green-600 dark:bg-green-400 rounded-sm"></div>
                  </div>
                  <span>More</span>
                </div>
              </div>
            )}

            {/* Posts & Shorts Row */}
            <div className="flex flex-col md:flex-row gap-6">
              <div onClick={() => setExpandedCard(expandedCard === 'posts' ? null : 'posts')} className={`theme-panel rounded-3xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 ${
                expandedCard === 'posts' ? 'md:w-full' : expandedCard === 'shorts' ? 'md:w-1/2' : 'md:w-1/2'
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('Posts')} ({blogs.length + articles.length})</h3>
                  {(blogs.length > 0 || articles.length > 0) && (
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/user/${user._id}`); }} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-semibold">
                      {t('View All')} <FaArrowRight size={12} />
                    </button>
                  )}
                </div>
                {(blogs.length > 0 || articles.length > 0) ? (
                  <div className={`grid gap-3 ${expandedCard === 'posts' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5' : 'grid-cols-1'}`}>
                    {[...blogs, ...articles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, expandedCard === 'posts' ? 10 : 2).map(post => (
                      <div key={post._id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border dark:border-gray-600 hover:border-blue-500 hover:shadow-md transition group">
                        <div onClick={(e) => { e.stopPropagation(); navigate(post.author ? `/blog/${post._id}` : `/article/${post._id}`); }} className="cursor-pointer">
                          <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate mb-1" title={post.title}>{post.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatPostDate(post.createdAt)}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleShare(post._id, post.title, !post.author); }} className="mt-2 text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <FaShare size={10} /> Share
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('No posts yet')}</p>
                )}
              </div>
              
              <div onClick={() => setExpandedCard(expandedCard === 'shorts' ? null : 'shorts')} className={`theme-panel rounded-3xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 ${
                expandedCard === 'shorts' ? 'md:w-full' : expandedCard === 'posts' ? 'md:w-1/2' : 'md:w-1/2'
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('Shorts')} ({shorts.length})</h3>
                  {shorts.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/user/${user._id}`); }} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-semibold">
                      {t('View All')} <FaArrowRight size={12} />
                    </button>
                  )}
                </div>
                {shorts.length > 0 ? (
                  <div className={`grid gap-3 ${expandedCard === 'shorts' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5' : 'grid-cols-1'}`}>
                    {shorts.slice(0, expandedCard === 'shorts' ? 10 : 2).map(short => (
                      <div key={short._id} onClick={(e) => { e.stopPropagation(); navigate(`/shorts/${short._id}`); }} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border dark:border-gray-600 hover:border-purple-500 hover:shadow-md transition cursor-pointer">
                        <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate mb-1" title={short.title}>{short.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatPostDate(short.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('No shorts yet')}</p>
                )}
              </div>
            </div>

            {/* Developer & Contact Row */}
            <div className="flex flex-col md:flex-row gap-6">
              <div onClick={() => setExpandedCard(expandedCard === 'developer' ? null : 'developer')} className={`theme-panel rounded-3xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 ${
                expandedCard === 'developer' ? 'md:w-full' : expandedCard === 'contact' ? 'md:w-1/2' : 'md:w-1/2'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Developer')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('Generate API keys for external access')}</p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                    <FaKey className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowApiKeyForm(!showApiKeyForm); }} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 mb-4 flex items-center gap-2">
                  {showApiKeyForm ? <><FaTimes /> {t('Cancel')}</> : <><FaPlus /> {t('Generate Key')}</>}
                </button>
                {showApiKeyForm && (
                  <form onSubmit={(e) => { e.preventDefault(); generateApiKey(e); }} className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg mb-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Key name" className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white" required />
                      <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">{t('Generate')}</button>
                    </div>
                  </form>
                )}
                <div className="space-y-3">
                  {apiKeys.map(key => (
                    <div key={key._id} className="bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200">{key.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(key.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); revokeApiKey(key._id, key.name); }} className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1">
                          <FaTrash size={12} /> {t('Revoke')}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-600">
                        <code className="flex-1 text-sm font-mono overflow-x-auto">{visibleKeys[key._id] ? key.key : '*'.repeat(40)}</code>
                        <button onClick={(e) => { e.stopPropagation(); setVisibleKeys(prev => ({ ...prev, [key._id]: !prev[key._id] })); }} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 p-1">
                          {visibleKeys[key._id] ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(key.key); showModal('success', 'Success', 'Copied!'); }} className="text-blue-600 hover:text-blue-800 p-1">
                          <FaCopy />
                        </button>
                      </div>
                    </div>
                  ))}
                  {apiKeys.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('No keys')}</p>}
                </div>
              </div>
              
              <div onClick={() => setExpandedCard(expandedCard === 'contact' ? null : 'contact')} className={`theme-panel rounded-3xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 ${
                expandedCard === 'contact' ? 'md:w-full' : expandedCard === 'developer' ? 'md:w-1/2' : 'md:w-1/2'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Help & Info')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('Get support or learn about us')}</p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                    <FaEdit className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                </div>
                <div className="flex gap-3 mb-4">
                  <button onClick={(e) => { e.stopPropagation(); navigate('/about'); }} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-2">
                    <PiBookOpenTextThin size={20} /> About Us
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowContactSection(true); }} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                    <FaEdit /> Contact
                  </button>
                </div>
                {showContactSection && (
                  <div className="bg-green-50 dark:bg-gray-700 p-4 rounded-lg" onClick={(e) => e.stopPropagation()}>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!contactForm.issue.trim()) return;
                      setContactLoading(true);
                      try {
                        await api.post('/users/contact', { issue: contactForm.issue, advice: contactForm.advice, userEmail: user.email, username: user.username });
                        setShowContactSection(false);
                        setContactForm({ issue: '', advice: '' });
                        showModal('success', 'Success', 'Message sent!');
                      } catch (error) {
                        showModal('error', 'Error', 'Failed to send');
                      } finally {
                        setContactLoading(false);
                      }
                    }}>
                      <div className="space-y-3">
                        <textarea value={contactForm.issue} onChange={(e) => setContactForm({ ...contactForm, issue: e.target.value })} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white" rows="3" placeholder="Your issue..." required />
                        <textarea value={contactForm.advice} onChange={(e) => setContactForm({ ...contactForm, advice: e.target.value })} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white" rows="2" placeholder="Suggestions..." />
                        <div className="flex gap-2">
                          <button type="submit" disabled={contactLoading} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                            {contactLoading ? <HashLoader color="#fff" size={20} /> : t('Send')}
                          </button>
                          <button type="button" onClick={() => { setShowContactSection(false); setContactForm({ issue: '', advice: '' }); }} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">{t('Cancel')}</button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Password & Security */}
            <div className="theme-panel rounded-3xl shadow-xl p-6 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Password & Security')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('Manage your account security')}</p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                  <FaKey className="text-purple-600 dark:text-purple-400" size={24} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowPasswordForm(!showPasswordForm); setShowForgotPassword(false); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  <FaKey /> {t('Change Password')}
                </button>
                <button onClick={() => { setShowForgotPassword(!showForgotPassword); setShowPasswordForm(false); }} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
                  <FaKey /> {t('Forgot Password')}
                </button>
              </div>
              {showPasswordForm && (
                <form onSubmit={handleChangePassword} className="space-y-4 mt-4 bg-blue-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="relative">
                    <input type={showCurrentPassword ? 'text' : 'password'} placeholder={t('Current Password')} value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white" required />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      {showCurrentPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showNewPassword ? 'text' : 'password'} placeholder={t('New Password')} value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white" required minLength={6} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      {showNewPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                  {/* Password Strength Meter */}
                  {passwords.newPassword && (
                    <div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              passwords.newPassword.length >= level * 3
                                ? passwords.newPassword.length < 6
                                  ? 'bg-red-500'
                                  : passwords.newPassword.length < 10
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {passwords.newPassword.length < 6 ? 'Weak' : passwords.newPassword.length < 10 ? 'Medium' : 'Strong'}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2" disabled={sendingPasswordCode}>
                      {sendingPasswordCode ? <SyncLoader color="#fff" size={8} /> : t('Change Password')}
                    </button>
                    <button type="button" onClick={() => { setShowPasswordForm(false); setPasswords({ currentPassword: '', newPassword: '' }); }} className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">{t('Cancel')}</button>
                  </div>
                </form>
              )}
              {showForgotPassword && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.post('/users/forgot-password', { email: user.email });
                    showModal('success', 'Success', 'Reset link sent to your email!');
                    setShowForgotPassword(false);
                  } catch (error) {
                    showModal('error', 'Error', error.response?.data?.message || 'Failed to send reset link');
                  }
                }} className="mt-4 bg-orange-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{t('A password reset link will be sent to')} <strong>{user.email}</strong></p>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700">{t('Send Reset Link')}</button>
                    <button type="button" onClick={() => setShowForgotPassword(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">{t('Cancel')}</button>
                  </div>
                </form>
              )}
            </div>

            {/* Privacy Settings */}
            <PrivacySettings profile={profile} onUpdate={async (updates) => {
              try {
                await api.put('/users/profile', { ...profile, ...updates });
                setProfile({ ...profile, ...updates });
                showModal('success', 'Success', 'Privacy settings updated!');
              } catch (error) {
                showModal('error', 'Error', 'Failed to update settings');
              }
            }} />

            {/* Danger Zone */}
            {!user?.isGuest && user?.role !== 'guest' && (
              <div className="theme-panel rounded-3xl shadow-xl p-6 border border-red-200 dark:border-red-700">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">{t('Danger Zone')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('Delete account permanently')}</p>
                <button onClick={() => setShowDeleteModal(true)} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2">
                  <FaTrash /> {t('Delete Account')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Universal Modal */}
      {modal.show && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-[60] p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {modal.type === 'success' && <FaCheckCircle className="text-green-500 text-3xl" />}
                {modal.type === 'error' && <FaTimesCircle className="text-red-500 text-3xl" />}
                {modal.type === 'confirm' && <FaExclamationCircle className="text-yellow-500 text-3xl" />}
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-2 ${modal.type === 'success' ? 'text-green-700' : modal.type === 'error' ? 'text-red-700' : 'text-yellow-700'}`}>{modal.title}</h3>
                <p className="text-gray-700 dark:text-gray-300">{modal.message}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {modal.type === 'confirm' ? (
                <>
                  <button onClick={() => { modal.onConfirm(); closeModal(); }} className="flex-1 bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600">Confirm</button>
                  <button onClick={closeModal} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">Cancel</button>
                </>
              ) : (
                <button onClick={closeModal} className={`w-full px-6 py-2 rounded-lg ${modal.type === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Username Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">{t('Edit Username')}</h3>
            <form onSubmit={handleUpdateUsername}>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="New username" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white" minLength={3} required />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2" disabled={usernameLoading}>
                  {usernameLoading ? <BeatLoader color="#fff" size={8} /> : t('Change')}
                </button>
                <button type="button" onClick={() => { setShowUsernameModal(false); setNewUsername(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Code Modal */}
      {showPasswordCodeModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-blue-600 mb-4">{t('Enter Code')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{t('6-digit code sent to email')}</p>
            <form onSubmit={handleConfirmPasswordChange}>
              <input type="text" value={passwordCode} onChange={(e) => setPasswordCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4 text-center text-2xl tracking-widest dark:bg-gray-700 dark:border-gray-600 dark:text-white" maxLength={6} required />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">{t('Confirm')}</button>
                <button type="button" onClick={() => { setShowPasswordCodeModal(false); setPasswordCode(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('Delete Account')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{t('This will permanently delete all your data')}</p>
            <p className="text-red-600 font-semibold mb-4">{t('This cannot be undone!')}</p>
            <form onSubmit={handleDeleteAccount}>
              <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder={t('Your password')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2" disabled={sendingDeleteCode}>
                  {sendingDeleteCode ? <SyncLoader color="#fff" size={8} /> : t('Delete')}
                </button>
                <button type="button" onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Code Modal */}
      {showDeleteCodeModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('Enter Code')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">{t('6-digit code sent to email')}</p>
            <p className="text-red-600 font-semibold mb-4 flex items-center gap-1"><FaExclamationCircle className="text-red-500" /> {t('Permanent!')}</p>
            <form onSubmit={handleConfirmDeleteAccount}>
              <input type="text" value={deleteCode} onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 mb-4 text-center text-2xl tracking-widest dark:bg-gray-700 dark:border-gray-600 dark:text-white" maxLength={6} required />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">{t('Delete')}</button>
                <button type="button" onClick={() => { setShowDeleteCodeModal(false); setDeleteCode(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('Share')}</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-500 hover:text-gray-700"><FaTimes size={24} /></button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaFacebookF className="text-2xl" />
                <span className="text-xs font-semibold">Facebook</span>
              </button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank')} className="bg-black hover:bg-gray-800 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaXTwitter className="text-2xl" />
                <span className="text-xs font-semibold">Twitter</span>
              </button>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); showModal('success', 'Success', 'Link copied!'); setShowShareModal(false); }} className="bg-gray-800 hover:bg-gray-900 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaCopy className="text-2xl" />
                <span className="text-xs font-semibold">Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Share Modal */}
      {showProfileShareModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowProfileShareModal(false)}>
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Share Profile</h3>
              <button onClick={() => setShowProfileShareModal(false)} className="text-gray-500 hover:text-gray-700"><FaTimes size={24} /></button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/user/${user._id}`)}`, '_blank')} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaFacebookF className="text-2xl" />
                <span className="text-xs font-semibold">Facebook</span>
              </button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/user/${user._id}`)}&text=${encodeURIComponent(`Check out ${user.username}'s profile!`)}`, '_blank')} className="bg-black hover:bg-gray-800 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaXTwitter className="text-2xl" />
                <span className="text-xs font-semibold">Twitter</span>
              </button>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/user/${user._id}`); showModal('success', 'Success', 'Profile link copied!'); setShowProfileShareModal(false); }} className="bg-gray-800 hover:bg-gray-900 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaCopy className="text-2xl" />
                <span className="text-xs font-semibold">Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QRCodeModal 
        show={showQRModal} 
        onClose={() => setShowQRModal(false)}
        profileUrl={`${window.location.origin}/user/${user._id}`}
        username={user.username}
      />
    </div>
  );
};

export default ProfileNew;


