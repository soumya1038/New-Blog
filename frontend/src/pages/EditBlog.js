import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import ReactMarkdown from 'react-markdown';
import toast, { Toaster } from 'react-hot-toast';
import AIBlogGenerator from '../components/AIBlogGenerator';
import AIContentTools from '../components/AIContentTools';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import { IoIosCheckmarkCircle } from 'react-icons/io';
import { BarLoader, GridLoader } from 'react-spinners';

const EditBlog = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState('General');
  const [coverImage, setCoverImage] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [oldCloudinaryPublicId, setOldCloudinaryPublicId] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveSuccess, setAutoSaveSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isShortMode, setIsShortMode] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const autoSaveTimerRef = useRef(null);
  const simpleMDERef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBlog();
  }, [id, user, navigate]);

  useEffect(() => {
    if (title || content || tags.length > 0 || coverImage || metaDescription) {
      setHasUnsavedChanges(true);
    }
  }, [title, content, tags, coverImage, metaDescription]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!title.trim() || !content.trim()) return;
    autoSaveTimerRef.current = setInterval(() => {
      autoSaveDraft();
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [title, content, tags]);

  const fetchBlog = async () => {
    try {
      const { data } = await api.get(`/blogs/${id}`);
      if (data.blog.author._id !== user._id) {
        toast.error('Not authorized to edit this blog');
        navigate('/');
        return;
      }
      setTitle(data.blog.title);
      setContent(data.blog.content);
      setTags(data.blog.tags || []);
      setCategory(data.blog.category || 'General');
      setCoverImage(data.blog.coverImage || '');
      setOldCloudinaryPublicId(data.blog.cloudinaryPublicId || '');
      setMetaDescription(data.blog.metaDescription || '');
      setIsDraft(data.blog.isDraft);
      setIsShortMode(data.blog.isShortBlog || false);
    } catch (err) {
      setError('Failed to load blog');
    } finally {
      setLoading(false);
    }
  };

  const autoSaveDraft = async () => {
    if (!title.trim() || !content.trim()) return;
    setAutoSaving(true);
    try {
      await api.put(`/blogs/${id}`, { 
        title, 
        content, 
        tags: tags.join(', '),
        category,
        coverImage,
        metaDescription,
        isDraft: true 
      });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setAutoSaving(false);
      setAutoSaveSuccess(true);
      setTimeout(() => setAutoSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Auto-save failed:', err);
      setAutoSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (title.length > 100) {
      toast.error('Title must be less than 100 characters');
      return;
    }
    if (!content.trim()) {
      toast.error('Content cannot be empty');
      return;
    }

    setLoading(true);
    try {
      let uploadedImageUrl = coverImage;
      let cloudinaryPublicId = '';

      if (coverImageFile) {
        if (oldCloudinaryPublicId) {
          await api.delete(`/blogs/delete-image/${oldCloudinaryPublicId}`);
        }
        const formData = new FormData();
        formData.append('image', coverImageFile);
        const { data: imageData } = await api.post('/blogs/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedImageUrl = imageData.url;
        cloudinaryPublicId = imageData.public_id;
      } else if (!coverImage && oldCloudinaryPublicId) {
        await api.delete(`/blogs/delete-image/${oldCloudinaryPublicId}`);
        uploadedImageUrl = '';
      }

      await api.put(`/blogs/${id}`, { 
        title, 
        content, 
        tags: tags.join(', '),
        category,
        coverImage: uploadedImageUrl,
        cloudinaryPublicId: cloudinaryPublicId || undefined,
        metaDescription,
        isDraft: false 
      });
      setHasUnsavedChanges(false);
      toast.success('Blog updated successfully!');
      setTimeout(() => navigate(`/blog/${id}`), 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update blog');
      setError(err.response?.data?.message || 'Failed to update blog');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title before saving draft');
      return;
    }
    setLoading(true);
    try {
      let uploadedImageUrl = coverImage;
      let cloudinaryPublicId = '';

      if (coverImageFile) {
        if (oldCloudinaryPublicId) {
          await api.delete(`/blogs/delete-image/${oldCloudinaryPublicId}`);
        }
        const formData = new FormData();
        formData.append('image', coverImageFile);
        const { data: imageData } = await api.post('/blogs/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedImageUrl = imageData.url;
        cloudinaryPublicId = imageData.public_id;
      } else if (!coverImage && oldCloudinaryPublicId) {
        await api.delete(`/blogs/delete-image/${oldCloudinaryPublicId}`);
        uploadedImageUrl = '';
      }

      await api.put(`/blogs/${id}`, { 
        title, 
        content, 
        tags: tags.join(', '),
        category,
        coverImage: uploadedImageUrl,
        cloudinaryPublicId: cloudinaryPublicId || undefined,
        metaDescription,
        isDraft: true 
      });
      
      if (coverImageFile) {
        setCoverImageFile(null);
      }
      
      setHasUnsavedChanges(false);
      toast.success('Draft saved successfully!');
      setTimeout(() => navigate('/drafts'), 1000);
    } catch (err) {
      toast.error('Failed to save draft');
      setError('Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = (aiContent) => {
    setContent(aiContent);
    toast.success('AI content generated!');
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelModal(true);
    } else {
      navigate(-1);
    }
  };

  const confirmCancel = () => {
    setShowCancelModal(false);
    navigate(-1);
  };

  const handleTitlesGenerated = (titles) => {
    if (titles.length > 0) {
      setTitle(titles[0]);
      toast.success('Title generated! Check other suggestions in console.');
      console.log('Other title suggestions:', titles.slice(1));
    }
  };

  const handleTagsGenerated = (aiTags) => {
    const newTags = aiTags.split(',').map(t => t.trim()).filter(t => t);
    setTags(newTags);
    toast.success('Tags generated!');
  };

  const handleContentImproved = (improvedContent) => {
    setContent(improvedContent);
    toast.success('Content improved!');
  };

  const addTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setCoverImageFile(file);
    setCoverImage(URL.createObjectURL(file));
    toast.success('Image selected! Will upload on save.');
  };

  const handleRemoveImage = () => {
    setCoverImage('');
    setCoverImageFile(null);
    toast.success('Image will be removed on save.');
  };

  const wordCount = content.split(/\s+/).filter(w => w).length;
  const readingTime = Math.ceil(wordCount / 200);

  const mdeOptions = useMemo(() => ({
    spellChecker: false,
    placeholder: t('Write your blog content in Markdown...'),
    minHeight: '300px',
    autofocus: false,
    status: false
  }), [t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center justify-center">
        <BarLoader color="#3B82F6" width={200} height={4} />
        <p className="mt-4 text-gray-600">Loading blog...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <Toaster />
      <div className="container mx-auto px-4 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 font-semibold"
        >
          <FaArrowLeft /> {t('Back')}
        </button>
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              {isDraft ? t('Edit Draft') : t('Edit Blog Post')}
            </h1>
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 mb-2 font-semibold">{t('Title')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder={t('Enter blog title...')}
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General">General</option>
                  <option value="Technology">Technology</option>
                  <option value="Lifestyle">Lifestyle</option>
                  <option value="Travel">Travel</option>
                  <option value="Food">Food</option>
                  <option value="Health">Health</option>
                  <option value="Business">Business</option>
                  <option value="Education">Education</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2 font-semibold">Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {uploadingImage && <p className="text-xs text-blue-600 mt-1">Uploading...</p>}
                {coverImage && (
                  <div className="mt-2 relative">
                    <img src={coverImage} alt="Cover" className="w-full h-32 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">SEO Meta Description</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description for search engines (max 160 characters)"
                maxLength={160}
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">{metaDescription.length}/160 characters</p>
            </div>
            
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <label className="block text-gray-700 font-semibold">{t('Content')}</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShortMode(!isShortMode)}
                    className={`px-3 py-1 text-sm rounded-lg transition ${
                      isShortMode ? 'bg-purple-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {isShortMode ? '📝 Short Mode' : '📄 Long Mode'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                  >
                    {previewMode ? '✍️ Write' : '👁️ Preview'}
                  </button>
                  <AIBlogGenerator 
                    title={title} 
                    tags={tags.join(', ')}
                    category={category}
                    existingContent={content}
                    isShortMode={isShortMode}
                    onGenerate={handleAIGenerate}
                    onMetaGenerate={setMetaDescription}
                  />
                </div>
              </div>
              
              {previewMode ? (
                <div className="border rounded-lg p-4 min-h-[300px] prose max-w-none">
                  <ReactMarkdown>{content || '*No content to preview*'}</ReactMarkdown>
                </div>
              ) : isShortMode ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Write your short blog (max 100 words)..."
                  rows={6}
                  maxLength={600}
                />
              ) : (
                <SimpleMDE
                  key="simplemde-editor"
                  value={content}
                  onChange={(value) => setContent(value)}
                  options={mdeOptions}
                />
              )}
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 gap-2">
                <p className="text-xs sm:text-sm text-gray-500">
                  Word Count: {wordCount} | Reading Time: {readingTime} min
                  {isShortMode && wordCount > 100 && (
                    <span className="text-red-500 ml-2">⚠️ Exceeds 100 words</span>
                  )}
                </p>
                <AIContentTools
                  content={content}
                  isShortMode={isShortMode}
                  onTitlesGenerated={handleTitlesGenerated}
                  onTagsGenerated={handleTagsGenerated}
                  onContentImproved={handleContentImproved}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2 font-semibold">{t('Tags')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-blue-800"
                    >
                      <FaTimes size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type tag and press Enter or comma"
              />
              <p className="text-xs text-gray-500 mt-1">Press Enter or comma to add tags</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : (isDraft ? t('Publish') : t('Update'))}
                </button>
                
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={loading}
                  className="bg-gray-200 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : t('Save Draft')}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="bg-red-100 text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>

              {/* Auto-save Indicator */}
              {(autoSaving || autoSaveSuccess) && (
                <div className="flex items-center gap-2">
                  {autoSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs text-gray-600">Saving...</span>
                    </>
                  ) : (
                    <IoIosCheckmarkCircle className="text-green-500 text-xl" />
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* GridLoader for Publishing/Updating */}
      {loading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <GridLoader color="#3B82F6" size={20} />
            <p className="mt-6 text-white text-lg font-semibold">
              {isDraft ? 'Saving Draft...' : 'Updating Blog...'}
            </p>
            {coverImageFile && (
              <p className="mt-2 text-gray-300 text-sm">Uploading image...</p>
            )}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">⚠️ Unsaved Changes</h3>
            <p className="text-gray-600 mb-6">
              You have unsaved changes. Are you sure you want to leave? All your progress will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmCancel}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Yes, Leave
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditBlog;
