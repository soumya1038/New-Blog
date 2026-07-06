import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaEdit, FaTrash, FaClock, FaCheckCircle, FaArrowLeft, FaCalendarAlt, FaExclamationTriangle, FaTimes, FaBullhorn } from 'react-icons/fa';
import { TbBrandBlogger } from 'react-icons/tb';
import { MdOutlineSwitchAccessShortcutAdd, MdOutlineAutoDelete } from 'react-icons/md';
import { BsFillCalendarRangeFill } from 'react-icons/bs';
import { BeatLoader, BarLoader, GridLoader, ScaleLoader } from 'react-spinners';
import toast, { Toaster } from 'react-hot-toast';

const Drafts = () => {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWarning, setShowWarning] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);

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
    if (!user) {
      navigate('/login');
      return;
    }
    fetchDrafts();
  }, [user]);

  // Refresh when returning from edit
  useEffect(() => {
    if (location.state?.refreshDrafts) {
      fetchDrafts();
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const fetchDrafts = async () => {
    try {
      setError('');
      setRefreshing(true);
      
      // Single API call for all drafts
      const { data } = await api.get('/drafts');
      
      if (data.success) {
        setDrafts(data.drafts || []);
      } else {
        setError(data.message || 'Failed to load drafts');
        setDrafts([]);
      }
    } catch (err) {
      console.error('Error fetching drafts:', err);
      if (err.response?.status === 401) {
        setError('Please login to view your drafts');
      } else {
        setError('Failed to load drafts. Please try again.');
      }
      setDrafts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openPublishModal = (draft) => {
    setSelectedDraft(draft);
    setShowPublishModal(true);
  };

  const openDeleteModal = (draft) => {
    setSelectedDraft(draft);
    setShowDeleteModal(true);
  };

  const openRescheduleModal = (draft) => {
    setSelectedDraft(draft);
    if (draft.scheduledPublishDate) {
      const scheduleDate = new Date(draft.scheduledPublishDate);
      setRescheduleDate(scheduleDate.toISOString().split('T')[0]);
      setRescheduleTime(scheduleDate.toTimeString().slice(0, 5));
    }
    setShowRescheduleModal(true);
  };

  const handlePublish = async () => {
    setActionLoading(true);
    try {
      const endpoint = selectedDraft.isArticle ? `/articles/${selectedDraft._id}` : (selectedDraft.isShortBlog ? `/shorts/${selectedDraft._id}` : `/blogs/${selectedDraft._id}`);
      await api.put(endpoint, { 
        isDraft: false, 
        isScheduled: false, 
        scheduledPublishDate: null 
      });
      setShowPublishModal(false);
      await fetchDrafts();
      toast.success('Draft published successfully!');
    } catch (error) {
      console.error('Publish error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to publish draft');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      toast.error('Please select both date and time');
      return;
    }
    const scheduleDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
    if (scheduleDateTime <= new Date()) {
      toast.error('Scheduled date must be in the future');
      return;
    }
    setActionLoading(true);
    try {
      const endpoint = selectedDraft.isArticle ? `/articles/${selectedDraft._id}` : (selectedDraft.isShortBlog ? `/shorts/${selectedDraft._id}` : `/blogs/${selectedDraft._id}`);
      await api.put(endpoint, { 
        isScheduled: true,
        scheduledPublishDate: scheduleDateTime.toISOString()
      });
      setShowRescheduleModal(false);
      await fetchDrafts();
      toast.success('Rescheduled successfully!');
    } catch (error) {
      toast.error('Failed to reschedule');
    } finally {
      setActionLoading(false);
    }
  };

  const DeletionTimer = ({ updatedAt }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      const calculateTimeLeft = () => {
        const updated = new Date(updatedAt);
        const deleteTime = new Date(updated.getTime() + 42 * 60 * 60 * 1000);
        const now = new Date();
        const diff = deleteTime - now;

        if (diff <= 0) {
          setTimeLeft('Deleting...');
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        setTimeLeft(`${hours}h ${minutes}m`);
      };

      calculateTimeLeft();
      const interval = setInterval(calculateTimeLeft, 60000);
      return () => clearInterval(interval);
    }, [updatedAt]);

    return (
      <span className="text-red-600 dark:text-red-400 font-semibold">
        {timeLeft}
      </span>
    );
  };

  const CountdownTimer = ({ scheduledDate }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      const calculateTimeLeft = () => {
        const now = new Date();
        const target = new Date(scheduledDate);
        const diff = target - now;

        if (diff <= 0) {
          setTimeLeft('Publishing soon...');
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
      };

      calculateTimeLeft();
      const interval = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(interval);
    }, [scheduledDate]);

    return (
      <span className="text-blue-600 dark:text-blue-400 font-semibold animate-pulse">
        {timeLeft}
      </span>
    );
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const endpoint = selectedDraft.isArticle ? `/articles/${selectedDraft._id}` : (selectedDraft.isShortBlog ? `/shorts/${selectedDraft._id}` : `/blogs/${selectedDraft._id}`);
      await api.delete(endpoint);
      await fetchDrafts();
      toast.success('Draft deleted successfully!');
      setShowDeleteModal(false);
    } catch (error) {
      toast.error('Failed to delete draft');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen theme-page-bg flex items-center justify-center">
        <div className="text-center">
          <BeatLoader color="#3B82F6" size={15} />
          <p className="mt-4 text-[var(--text-secondary)]">Loading drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lekhon-drafts-page min-h-screen theme-page-bg py-8">
      <Toaster />
      {editLoading && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <BarLoader color="#3B82F6" width="100%" height={4} />
        </div>
      )}
      <div className="lekhon-drafts-shell container mx-auto px-4 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-4 font-semibold text-[var(--brand-primary)] hover:opacity-80 transition"
        >
          <FaArrowLeft /> {t('Back')}
        </button>
        <div className="lekhon-drafts-card theme-modal-card rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('My Drafts')}</h1>
            <button
              onClick={fetchDrafts}
              disabled={refreshing}
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {refreshing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('Refreshing...')}
                </>
              ) : (
                t('Refresh')
              )}
            </button>
          </div>

          {showWarning && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FaClock className="text-yellow-600" />
                <span className="text-sm">
                  <FaExclamationTriangle className="text-yellow-700" /> Drafts are automatically deleted after 42 hours (scheduled content excluded)
                </span>
              </div>
              <button
                onClick={() => setShowWarning(false)}
                className="text-yellow-600 hover:text-yellow-800 font-bold"
              >
                <FaTimes />
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {drafts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">{t('No drafts yet')}</p>
              <Link to="/create" className="text-blue-600 hover:underline">
                Create your first blog post
              </Link>
            </div>
          ) : (
            <div className="lekhon-drafts-list space-y-4">
              {drafts.map(draft => (
                <div key={draft._id} className="lekhon-draft-item theme-panel rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition relative">
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 text-gray-400 dark:text-gray-500">
                    {draft.isScheduled && (
                      <BsFillCalendarRangeFill className="w-5 h-5 text-blue-600 dark:text-blue-400" title="Scheduled" />
                    )}
                    {draft.isArticle ? (
                      <img src={isDark ? '/image/article_logo_light.png' : '/image/article_logo_dark.png'} alt="Article" className="w-6 h-6" title="Article" />
                    ) : draft.isShortBlog ? (
                      <MdOutlineSwitchAccessShortcutAdd className="w-6 h-6" title="Short Blog" />
                    ) : (
                      <TbBrandBlogger className="w-6 h-6" title="Blog" />
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{draft.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {draft.content.substring(0, 150)}...
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <FaClock /> {new Date(draft.updatedAt).toLocaleDateString()}
                        </span>
                        {!draft.isScheduled && (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <MdOutlineAutoDelete className="w-4 h-4" /> <DeletionTimer updatedAt={draft.updatedAt} />
                          </span>
                        )}
                        <span>{draft.wordCount} words</span>
                        {draft.tags?.length > 0 && (
                          <span className="text-blue-600">
                            {draft.tags.slice(0, 2).join(', ')}
                          </span>
                        )}
                        {draft.isScheduled && draft.scheduledPublishDate && (
                          <>
                            <span className="flex items-center gap-1">
                              <FaCalendarAlt className="text-blue-600" /> 
                              {new Date(draft.scheduledPublishDate).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <FaClock className="text-blue-600" /> 
                              <CountdownTimer scheduledDate={draft.scheduledPublishDate} />
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="lekhon-draft-actions flex flex-wrap sm:flex-nowrap gap-2">
                      {draft.isScheduled && (
                        <button
                          onClick={() => openRescheduleModal(draft)}
                          className="flex items-center gap-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm"
                          title="Reschedule"
                        >
                          <BsFillCalendarRangeFill /> <span className="hidden sm:inline">{t('Reschedule')}</span>
                        </button>
                      )}
                      <button
                        onClick={() => openPublishModal(draft)}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                        title={draft.isScheduled ? "Cancel schedule and publish now" : "Publish draft"}
                      >
                        <FaCheckCircle /> <span className="hidden sm:inline">{t('Publish')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditLoading(true);
                          navigate(`/edit/${draft._id}`);
                        }}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <FaEdit /> <span className="hidden sm:inline">{t('Edit')}</span>
                      </button>
                      <button
                        onClick={() => openDeleteModal(draft)}
                        className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm"
                      >
                        <FaTrash /> <span className="hidden sm:inline">{t('Delete')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center p-4">
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><FaBullhorn className="text-green-600" /> Publish {selectedDraft?.isScheduled ? 'Now' : 'Draft'}</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              {selectedDraft?.isScheduled 
                ? 'This will cancel the schedule and publish immediately. Continue?' 
                : 'Are you sure you want to publish this draft? It will be visible to everyone.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handlePublish}
                disabled={actionLoading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <GridLoader color="#fff" size={8} /> : 'Yes, Publish'}
              </button>
              <button
                onClick={() => setShowPublishModal(false)}
                disabled={actionLoading}
                className="flex-1 theme-soft-button py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center p-4">
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <BsFillCalendarRangeFill className="text-blue-600" /> Reschedule Publication
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[var(--text-secondary)] mb-2 text-sm">Publish Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--surface-card)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-2 text-sm">Publish Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--surface-card)] text-[var(--text-primary)]"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReschedule}
                disabled={actionLoading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <GridLoader color="#fff" size={8} /> : 'Reschedule'}
              </button>
              <button
                onClick={() => setShowRescheduleModal(false)}
                disabled={actionLoading}
                className="flex-1 theme-soft-button py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center p-4">
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><FaTrash className="text-red-600" /> Delete Draft</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete this draft? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <ScaleLoader color="#fff" height={20} width={3} /> : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="flex-1 theme-soft-button py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drafts;
