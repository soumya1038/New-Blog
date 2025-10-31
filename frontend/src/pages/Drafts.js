import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaEdit, FaTrash, FaClock, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
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
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchDrafts();
  }, [user]); // Removed navigate from dependencies

  const fetchDrafts = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      console.log('User:', user);
      console.log('Fetching drafts from: /blogs?draft=true');
      
      const { data } = await api.get('/blogs?draft=true');
      console.log('Drafts response:', data);
      console.log('Number of drafts:', data.blogs?.length || 0);
      
      if (data.success) {
        setDrafts(data.blogs || []);
      } else {
        setError(data.message || 'Failed to load drafts');
        setDrafts([]);
      }
    } catch (err) {
      console.error('Error fetching drafts:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      if (err.response?.status === 401) {
        setError('Please login to view your drafts');
      } else {
        setError('Failed to load drafts. Please try again.');
      }
      setDrafts([]);
    } finally {
      setLoading(false);
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

  const handlePublish = async () => {
    setActionLoading(true);
    try {
      await api.put(`/blogs/${selectedDraft._id}`, { isDraft: false });
      setDrafts(drafts.filter(d => d._id !== selectedDraft._id));
      toast.success('Draft published successfully!');
      setShowPublishModal(false);
    } catch (error) {
      toast.error('Failed to publish draft');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/blogs/${selectedDraft._id}`);
      setDrafts(drafts.filter(d => d._id !== selectedDraft._id));
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <BeatLoader color="#3B82F6" size={15} />
          <p className="mt-4 text-gray-600">Loading drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <Toaster />
      {editLoading && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <BarLoader color="#3B82F6" width="100%" height={4} />
        </div>
      )}
      <div className="container mx-auto px-4 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 font-semibold"
        >
          <FaArrowLeft /> {t('Back')}
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('My Drafts')}</h1>
            <button
              onClick={fetchDrafts}
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm"
            >
              {t('Refresh')}
            </button>
          </div>

          {showWarning && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FaClock className="text-yellow-600" />
                <span className="text-sm">
                  ⚠️ Drafts are automatically deleted after 42 hours of inactivity
                </span>
              </div>
              <button
                onClick={() => setShowWarning(false)}
                className="text-yellow-600 hover:text-yellow-800 font-bold"
              >
                ✕
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
            <div className="space-y-4">
              {drafts.map(draft => (
                <div key={draft._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition bg-white dark:bg-gray-700/50">
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
                        <span>{draft.wordCount} words</span>
                        {draft.tags?.length > 0 && (
                          <span className="text-blue-600">
                            {draft.tags.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                      <button
                        onClick={() => openPublishModal(draft)}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                        title="Publish draft"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">📢 Publish Draft</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to publish this draft? It will be visible to everyone.
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
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">🗑️ Delete Draft</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
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
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
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
