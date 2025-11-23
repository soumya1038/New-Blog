import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { MdOutlineSwitchAccessShortcutAdd } from 'react-icons/md';
import { IoIosCheckmarkCircle } from 'react-icons/io';
import { GridLoader } from 'react-spinners';

const CreateBlog = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState('General');
  const [coverImage, setCoverImage] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [metaDescription, setMetaDescription] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveSuccess, setAutoSaveSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isShortMode, setIsShortMode] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const autoSaveTimerRef = useRef(null);
  const simpleMDERef = useRef(null);

  useEffect(() => {
    if (location.state?.repostContent) {
      setContent(location.state.repostContent);
      setTitle(location.state.repostTitle || '');
      if (location.state.repostTags) {
        setTags(location.state.repostTags.split(',').map(t => t.trim()).filter(t => t));
      }
      if (location.state.repostMetaDescription) {
        setMetaDescription(location.state.repostMetaDescription);
      }
      if (location.state.repostCategory) {
        setCategory(location.state.repostCategory);
      }
      if (location.state.repostCoverImage) {
        setCoverImage(location.state.repostCoverImage);
      }
      if (location.state.isShortMode) {
        setIsShortMode(true);
      }
      toast.success('Blog content loaded for repost!');
    }
  }, [location.state]);

  // Track unsaved changes
  useEffect(() => {
    if (title || content || tags.length > 0 || coverImage || metaDescription) {
      setHasUnsavedChanges(true);
    }
  }, [title, content, tags, coverImage, metaDescription]);

  // Warn before leaving with unsaved changes
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

  // Auto-save draft every 30 seconds
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

  const autoSaveDraft = async () => {
    if (!title.trim() || !content.trim()) return;
    setAutoSaving(true);
    try {
      if (draftId) {
        await api.put(`/blogs/${draftId}`, { 
          title, 
          content, 
          tags: tags.join(', '),
          category,
          coverImage,
          metaDescription,
          isDraft: true 
        });
      } else {
        const { data } = await api.post('/blogs', { 
          title, 
          content, 
          tags: tags.join(', '),
          category,
          coverImage,
          metaDescription,
          isDraft: true 
        });
        setDraftId(data.blog._id);
      }
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
    
    if (!user) {
      navigate('/login');
      return;
    }

    // Validation
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
      let uploadedImageUrl = '';
      let cloudinaryPublicId = '';

      // Upload image if selected
      if (coverImageFile) {
        const formData = new FormData();
        formData.append('image', coverImageFile);
        const { data: imageData } = await api.post('/blogs/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedImageUrl = imageData.url;
        cloudinaryPublicId = imageData.public_id;
      }

      const { data } = await api.post('/blogs', { 
        title, 
        content, 
        tags: tags.join(', '),
        category,
        coverImage: uploadedImageUrl,
        cloudinaryPublicId,
        metaDescription,
        isDraft 
      });
      setHasUnsavedChanges(false);
      toast.success('Blog published successfully!');
      setTimeout(() => navigate(`/blog/${data.blog._id}`), 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create blog');
      setError(err.response?.data?.message || 'Failed to create blog');
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
      let uploadedImageUrl = '';
      let cloudinaryPublicId = '';

      // Upload image if selected
      if (coverImageFile) {
        const formData = new FormData();
        formData.append('image', coverImageFile);
        const { data: imageData } = await api.post('/blogs/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedImageUrl = imageData.url;
        cloudinaryPublicId = imageData.public_id;
      }

      if (draftId) {
        // Update existing draft
        await api.put(`/blogs/${draftId}`, { 
          title, 
          content, 
          tags: tags.join(', '),
          category,
          coverImage: uploadedImageUrl || coverImage,
          cloudinaryPublicId: cloudinaryPublicId || undefined,
          metaDescription,
          isDraft: true 
        });
      } else {
        // Create new draft
        const { data } = await api.post('/blogs', { 
          title, 
          content, 
          tags: tags.join(', '),
          category,
          coverImage: uploadedImageUrl,
          cloudinaryPublicId,
          metaDescription,
          isDraft: true 
        });
        setDraftId(data.blog._id);
      }
      
      // Clear file after upload
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

  const handleAIGenerate = (aiContent, aiMetaDescription) => {
    setContent(aiContent);
    if (aiMetaDescription) {
      setMetaDescription(aiMetaDescription);
    }
    toast.success('AI content generated!');
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelModal(true);
    } else {
      navigate('/');
    }
  };

  const confirmCancel = () => {
    setShowCancelModal(false);
    navigate('/');
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
    toast.success('Image selected! Will upload on publish.');
  };

  const handleRemoveImage = () => {
    setCoverImage('');
    setCoverImageFile(null);
    toast.success('Image removed.');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <Toaster />
      <div className="container mx-auto px-4 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 font-semibold"
        >
          <FaArrowLeft /> {t('Back')}
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
                {isShortMode ? t('Create Short Blog') : t('Create New Blog Post')}
              </h1>
              <button
                type="button"
                onClick={() => setIsShortMode(!isShortMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                  isShortMode 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <MdOutlineSwitchAccessShortcutAdd className="w-5 h-5" />
                {isShortMode ? t('Regular Blog') : t('Create Short')}
              </button>
            </div>
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold">{t('Title')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                placeholder={isShortMode ? t('Enter short blog title...') : t('Enter blog title...')}
                maxLength={100}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{title.length}/100 {t('characters')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold">{t('Category')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="General">{t('General')}</option>
                  <option value="Technology">{t('Technology')}</option>
                  <option value="Lifestyle">{t('Lifestyle')}</option>
                  <option value="Travel">{t('Travel')}</option>
                  <option value="Food">{t('Food')}</option>
                  <option value="Health">{t('Health')}</option>
                  <option value="Business">{t('Business')}</option>
                  <option value="Education">{t('Education')}</option>
                  <option value="Entertainment">{t('Entertainment')}</option>
                  <option value="Sports">{t('Sports')}</option>
                  <option value="Science">{t('Science')}</option>
                  <option value="Fashion">{t('Fashion')}</option>
                  <option value="Finance">{t('Finance')}</option>
                  <option value="Gaming">{t('Gaming')}</option>
                  <option value="Music">{t('Music')}</option>
                  <option value="Art">{t('Art')}</option>
                  <option value="Photography">{t('Photography')}</option>
                  <option value="DIY">{t('DIY')}</option>
                  <option value="Parenting">{t('Parenting')}</option>
                  <option value="Pets">{t('Pets')}</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold">{t('Cover Image')}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {uploadingImage && <p className="text-xs text-blue-600 mt-1">{t('Uploading...')}</p>}
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
              <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold">{t('SEO Meta Description')}</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={t('Brief description for search engines (max 160 characters)')}
                maxLength={160}
                rows={2}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{metaDescription.length}/160 {t('characters')}</p>
            </div>
            
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <label className="block text-gray-700 dark:text-gray-300 font-semibold">{t('Content')}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition"
                  >
                    {previewMode ? t('Write') : t('Preview')}
                  </button>
                  <AIBlogGenerator 
                    title={title} 
                    tags={tags.join(', ')}
                    category={category}
                    existingContent={content}
                    onGenerate={handleAIGenerate}
                    onMetaGenerate={setMetaDescription}
                    isShortMode={isShortMode}
                  />
                </div>
              </div>
              
              {previewMode ? (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[300px] prose dark:prose-invert max-w-none bg-white dark:bg-gray-700">
                  <ReactMarkdown>{content || `*${t('No content to preview')}*`}</ReactMarkdown>
                </div>
              ) : isShortMode ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder={t('Write your short blog (max 100 words)...')}
                  rows={6}
                  maxLength={700}
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
                  {t('Word Count')}: {wordCount} {isShortMode && wordCount > 100 && <span className="text-red-500">({t('Max 100 words')})</span>} | {t('Reading Time')}: {readingTime} {t('min read')}
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
              <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold">{t('Tags')}</label>
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={t('Type tag and press Enter or comma')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('Press Enter or comma to add tags')}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('Publishing...') : t('Publish')}
                </button>
                
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={loading}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('Saving...') : t('Save Draft')}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="bg-red-100 text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('Cancel')}
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
                      <span className="text-xs text-gray-600">{t('Saving...')}</span>
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

      {/* GridLoader for Publishing */}
      {loading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <GridLoader color="#3B82F6" size={20} />
            <p className="mt-6 text-white text-lg font-semibold">
              {t('Saving...')}
            </p>
            {coverImageFile && (
              <p className="mt-2 text-gray-300 text-sm">{t('Uploading...')}</p>
            )}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">⚠️ {t('Unsaved Changes')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('You have unsaved changes. Are you sure you want to leave? All your progress will be lost.')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmCancel}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                {t('Yes, Leave')}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                {t('Stay')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CreateBlog;
