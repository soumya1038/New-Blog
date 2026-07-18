import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import toast, { Toaster } from 'react-hot-toast';
import AIBlogGenerator from '../components/AIBlogGenerator';
import AIContentTools from '../components/AIContentTools';
import TemplatePreview from '../components/TemplatePreview';
import ContentProductTagsEditor from '../components/ContentProductTagsEditor';
import ProductTagPlacementEditor from '../components/ProductTagPlacementEditor';
import SafeMarkdown from '../components/SafeMarkdown';
import { getSafeImageUrl } from '../utils/safeMediaUrls';
import {
  getArticleTemplateById,
  CUSTOM_ARTICLE_TEMPLATE_ID,
  createDefaultCustomTemplate,
  normalizeCustomTemplate
} from '../utils/articleTemplates';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import { IoIosCheckmarkCircle, IoIosCloseCircleOutline } from 'react-icons/io';
import { IoColorPaletteOutline } from 'react-icons/io5';
import { MdOutlineSwitchAccessShortcutAdd, MdOutlinePublish, MdStorefront } from 'react-icons/md';
import { TbBrandBlogger } from 'react-icons/tb';
import { CiSaveDown2 } from 'react-icons/ci';
import { BsFillCalendarRangeFill } from 'react-icons/bs';
import { BsPatchPlus } from 'react-icons/bs';
import { PiMonitorPlayDuotone } from 'react-icons/pi';
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
  const [galleryItems, setGalleryItems] = useState([]);
  const [removedGalleryPublicIds, setRemovedGalleryPublicIds] = useState([]);
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
  const [isArticleMode, setIsArticleMode] = useState(false);
  const [originalMode, setOriginalMode] = useState('blog');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [videoUrls, setVideoUrls] = useState(['']);
  const [isDark, setIsDark] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [selectedArticleTemplateId, setSelectedArticleTemplateId] = useState(CUSTOM_ARTICLE_TEMPLATE_ID);
  const [customArticleTemplate, setCustomArticleTemplate] = useState(createDefaultCustomTemplate());
  const [, setContentOrigin] = useState('manual');
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [externalProductLinks, setExternalProductLinks] = useState([]);
  const [productTagPlacements, setProductTagPlacements] = useState([]);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const autoSaveTimerRef = useRef(null);
  const simpleMDERef = useRef(null);
  const MAX_GALLERY_IMAGES = 8;
  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  const FORCED_TEMPLATE_THEME_MODE = 'auto';

  const isBlobUrl = (url = '') => typeof url === 'string' && url.startsWith('blob:');
  const getSafeEditorImageUrl = (url = '') => (isBlobUrl(url) ? url : getSafeImageUrl(url));

  const getPersistedGalleryPayload = () => {
    const persisted = galleryItems.filter((item) => !item.local && item.url && !isBlobUrl(item.url));
    return {
      galleryImages: persisted.map((item) => item.url),
      galleryImagePublicIds: persisted.map((item) => item.publicId || '')
    };
  };

  const deleteRemovedGalleryImages = async () => {
    if (!removedGalleryPublicIds.length) return;
    const uniqueIds = [...new Set(removedGalleryPublicIds.filter(Boolean))];
    await Promise.all(uniqueIds.map((publicId) => api.delete('/blogs/delete-image', { params: { publicId } })));
    setRemovedGalleryPublicIds([]);
  };

  const uploadGalleryItems = async () => {
    const uploaded = [];

    for (const item of galleryItems) {
      if (item.local && item.file) {
        const formData = new FormData();
        formData.append('image', item.file);
        const { data: imageData } = await api.post('/blogs/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploaded.push({ url: imageData.url, publicId: imageData.public_id || '' });
        continue;
      }

      if (item.url && !isBlobUrl(item.url)) {
        uploaded.push({ url: item.url, publicId: item.publicId || '' });
      }
    }

    return {
      galleryImages: uploaded.map((entry) => entry.url),
      galleryImagePublicIds: uploaded.map((entry) => entry.publicId)
    };
  };

  const normalizeProductTagPlacementsForSubmit = (imageSources = []) => {
    const validProductKeys = new Set([
      ...linkedProducts
        .map(product => `product:${product?._id || product?.id || product?.slug || product?.title || ''}`)
        .filter(key => key !== 'product:'),
      ...externalProductLinks
        .map((link, index) => `external:${link?.url || link?.title || index}`)
        .filter(key => key !== 'external:'),
    ]);
    const maxImageIndex = Math.max(0, imageSources.filter(Boolean).length - 1);

    return (productTagPlacements || [])
      .filter(placement => validProductKeys.has(placement.productKey))
      .map(placement => ({
        productKey: placement.productKey,
        source: placement.source === 'external' ? 'external' : 'marketplace',
        imageIndex: Math.max(0, Math.min(maxImageIndex, Math.floor(Number(placement.imageIndex) || 0))),
        x: Math.max(0, Math.min(100, Number(placement.x) || 50)),
        y: Math.max(0, Math.min(100, Number(placement.y) || 50)),
      }));
  };

  const productAttachmentPayload = ({ includePlacements = false, imageSources = [] } = {}) => ({
    linkedProduct: linkedProducts[0]?._id || null,
    linkedProducts: linkedProducts.map(product => product._id).filter(Boolean),
    externalProductLinks: JSON.stringify(externalProductLinks),
    isPromoPost: linkedProducts.length > 0 || externalProductLinks.length > 0,
    ...(includePlacements ? {
      productTagPlacements: JSON.stringify(normalizeProductTagPlacementsForSubmit(imageSources)),
    } : {}),
  });

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
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
    fetchBlog();
  }, [id, user, navigate]);

  useEffect(() => {
    if (title || content || tags.length > 0 || coverImage || galleryItems.length > 0 || metaDescription || linkedProducts.length > 0 || externalProductLinks.length > 0 || productTagPlacements.length > 0 || (isArticleMode && selectedArticleTemplateId)) {
      setHasUnsavedChanges(true);
    }
  }, [title, content, tags, coverImage, galleryItems, metaDescription, linkedProducts, externalProductLinks, productTagPlacements, isArticleMode, selectedArticleTemplateId, customArticleTemplate]);

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
  }, [title, content, tags, isArticleMode, isShortMode, originalMode, selectedArticleTemplateId, customArticleTemplate, category, coverImage, galleryItems, metaDescription, videoUrls, linkedProducts, externalProductLinks, productTagPlacements]);

  const fetchBlog = async () => {
    try {
      let data;
      let mode = 'blog';
      try {
        const response = await api.get(`/articles/${id}`);
        data = { blog: response.data.article };
        mode = 'article';
      } catch {
        try {
          const response = await api.get(`/shorts/${id}`);
          data = { blog: response.data.short };
          mode = 'short';
        } catch {
          const response = await api.get(`/blogs/${id}`);
          data = response.data;
          mode = 'blog';
        }
      }
      setIsShortMode(mode === 'short');
      setIsArticleMode(mode === 'article');
      setOriginalMode(mode);
      
      if (data.blog.author._id !== user._id) {
        toast.error('Not authorized to edit this content');
        navigate('/home');
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
      setIsScheduled(data.blog.isScheduled || false);
      setVideoUrls(data.blog.videoUrls && data.blog.videoUrls.length > 0 ? data.blog.videoUrls : ['']);
      const existingLinkedProducts = Array.isArray(data.blog.linkedProducts)
        ? data.blog.linkedProducts.filter(product => product && typeof product === 'object')
        : [];
      if (!existingLinkedProducts.length && data.blog.linkedProduct && typeof data.blog.linkedProduct === 'object') {
        existingLinkedProducts.push(data.blog.linkedProduct);
      }
      setLinkedProducts(existingLinkedProducts);
      setExternalProductLinks(Array.isArray(data.blog.externalProductLinks) ? data.blog.externalProductLinks : []);
      setProductTagPlacements(Array.isArray(data.blog.productTagPlacements) ? data.blog.productTagPlacements : []);
      const existingGalleryImages = Array.isArray(data.blog.galleryImages) ? data.blog.galleryImages : [];
      const existingGalleryIds = Array.isArray(data.blog.galleryImagePublicIds) ? data.blog.galleryImagePublicIds : [];
      setGalleryItems(
        existingGalleryImages
          .filter(Boolean)
          .slice(0, MAX_GALLERY_IMAGES)
          .map((url, index) => ({
            id: 'existing-' + index + '-' + Date.now(),
            url,
            publicId: existingGalleryIds[index] || '',
            local: false,
            file: null
          }))
      );
      setRemovedGalleryPublicIds([]);
      if (mode === 'article') {
        setSelectedArticleTemplateId(CUSTOM_ARTICLE_TEMPLATE_ID);
        setCustomArticleTemplate(normalizeCustomTemplate(data.blog.customTemplate || createDefaultCustomTemplate()));
      }
      if (data.blog.isScheduled && data.blog.scheduledPublishDate) {
        const scheduleDate = new Date(data.blog.scheduledPublishDate);
        setScheduledDate(scheduleDate.toISOString().split('T')[0]);
        setScheduledTime(scheduleDate.toTimeString().slice(0, 5));
      }
    } catch (err) {
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const autoSaveDraft = async () => {
    if (!title.trim() || !content.trim()) return;
    if (isShortMode !== (originalMode === 'short') || isArticleMode !== (originalMode === 'article')) return;
    setAutoSaving(true);
    try {
      const filteredVideoUrls = videoUrls.filter(url => url.trim());
      const persistedGallery = getPersistedGalleryPayload();
      const endpoint = originalMode === 'article' ? '/articles/' + id : (originalMode === 'short' ? '/shorts/' + id : '/blogs/' + id);
      await api.put(endpoint, { 
        title, 
        content, 
        tags: tags.join(', '),
        category,
        coverImage,
        videoUrls: JSON.stringify(filteredVideoUrls),
        metaDescription,
        isDraft: true,
        ...(isShortMode ? {} : productAttachmentPayload({
          includePlacements: isArticleMode,
          imageSources: [coverImage, ...persistedGallery.galleryImages],
        })),
        ...(!isShortMode ? {
          galleryImages: JSON.stringify(persistedGallery.galleryImages),
          galleryImagePublicIds: JSON.stringify(persistedGallery.galleryImagePublicIds)
        } : {}),
        ...(isArticleMode ? {
          templateId: selectedArticleTemplateId,
          customTemplate: selectedArticleTemplateId === CUSTOM_ARTICLE_TEMPLATE_ID ? customArticleTemplate : null,
          templateThemeMode: FORCED_TEMPLATE_THEME_MODE
        } : {}) 
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

    // Validate scheduled date
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Please select both date and time for scheduling');
        return;
      }
      const scheduleDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduleDateTime <= new Date()) {
        toast.error('Scheduled date must be in the future');
        return;
      }
    }

    setLoading(true);
    try {
      let uploadedImageUrl = coverImage;
      let cloudinaryPublicId = '';
      const scheduledPublishDate = isScheduled ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null;
      const filteredVideoUrls = videoUrls.filter(url => url.trim());
      const templateResolution = resolveArticleTemplateForSubmission();
      const templateIdForSubmit = templateResolution.templateId;
      const customTemplateForSubmit =
        templateIdForSubmit === CUSTOM_ARTICLE_TEMPLATE_ID ? customArticleTemplate : null;

      if (coverImageFile) {
        if (oldCloudinaryPublicId) {
          await api.delete('/blogs/delete-image', { params: { publicId: oldCloudinaryPublicId } });
        }
        const formData = new FormData();
        formData.append('image', coverImageFile);
        const { data: imageData } = await api.post('/blogs/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedImageUrl = imageData.url;
        cloudinaryPublicId = imageData.public_id;
      } else if (!coverImage && oldCloudinaryPublicId) {
        await api.delete('/blogs/delete-image', { params: { publicId: oldCloudinaryPublicId } });
        uploadedImageUrl = '';
      }

      const galleryUploadPayload = !isShortMode
        ? await uploadGalleryItems()
        : { galleryImages: [], galleryImagePublicIds: [] };
      await deleteRemovedGalleryImages();

      if ((isShortMode && originalMode !== 'short') || (isArticleMode && originalMode !== 'article') || (!isShortMode && !isArticleMode && originalMode !== 'blog')) {
        const createEndpoint = isArticleMode ? '/articles' : (isShortMode ? '/shorts' : '/blogs');
        const { data: newData } = await api.post(createEndpoint, { 
          title, 
          content, 
          tags: tags.join(', '),
          category,
          coverImage: uploadedImageUrl,
          cloudinaryPublicId: isArticleMode || isShortMode ? null : (cloudinaryPublicId || undefined),
          videoUrls: JSON.stringify(filteredVideoUrls),
          metaDescription,
          isDraft: false,
          isScheduled,
          scheduledPublishDate,
          ...(isShortMode ? {} : productAttachmentPayload({
            includePlacements: isArticleMode,
            imageSources: [uploadedImageUrl, ...galleryUploadPayload.galleryImages],
          })),
          ...(!isShortMode ? {
            galleryImages: JSON.stringify(galleryUploadPayload.galleryImages),
            galleryImagePublicIds: JSON.stringify(galleryUploadPayload.galleryImagePublicIds)
          } : {}),
          ...(isArticleMode ? {
            templateId: templateIdForSubmit,
            customTemplate: customTemplateForSubmit,
            templateThemeMode: FORCED_TEMPLATE_THEME_MODE
          } : {})
        });
        const deleteEndpoint = originalMode === 'article' ? `/articles/${id}` : (originalMode === 'short' ? `/shorts/${id}` : `/blogs/${id}`);
        await api.delete(deleteEndpoint);
        const newId = isArticleMode
          ? (newData.article.slug || newData.article._id)
          : (isShortMode ? newData.short._id : (newData.blog.slug || newData.blog._id));
        setHasUnsavedChanges(false);
        if (templateResolution.usedRecommendation && templateResolution.recommendation?.templateName) {
          toast.success(`Auto-selected suggested template: ${templateResolution.recommendation.templateName}`);
          setSelectedArticleTemplateId(templateIdForSubmit);
        }
        toast.success(isScheduled ? `Scheduled as ${isArticleMode ? 'article' : (isShortMode ? 'short' : 'blog')} successfully!` : `Converted to ${isArticleMode ? 'article' : (isShortMode ? 'short' : 'blog')} successfully!`);
        setTimeout(() => navigate(isScheduled ? '/drafts' : (isArticleMode ? `/article/${newId}` : (isShortMode ? `/shorts/${newId}` : `/blog/${newId}`))), 1000);
      } else {
        const endpoint = originalMode === 'article' ? `/articles/${id}` : (originalMode === 'short' ? `/shorts/${id}` : `/blogs/${id}`);
        const { data: updatedData } = await api.put(endpoint, { 
          title, 
          content, 
          tags: tags.join(', '),
          category,
          coverImage: uploadedImageUrl,
          cloudinaryPublicId: cloudinaryPublicId || undefined,
          videoUrls: JSON.stringify(filteredVideoUrls),
          metaDescription,
          isDraft: false,
          isScheduled,
          scheduledPublishDate,
          ...(isShortMode ? {} : productAttachmentPayload({
            includePlacements: isArticleMode,
            imageSources: [uploadedImageUrl, ...galleryUploadPayload.galleryImages],
          })),
          ...(!isShortMode ? {
            galleryImages: JSON.stringify(galleryUploadPayload.galleryImages),
            galleryImagePublicIds: JSON.stringify(galleryUploadPayload.galleryImagePublicIds)
          } : {}),
          ...(isArticleMode ? {
            templateId: templateIdForSubmit,
            customTemplate: customTemplateForSubmit,
            templateThemeMode: FORCED_TEMPLATE_THEME_MODE
          } : {})
        });
        const stayOnId = isArticleMode
          ? (updatedData.article?.slug || updatedData.article?._id || id)
          : (isShortMode ? id : (updatedData.blog?.slug || updatedData.blog?._id || id));
        setHasUnsavedChanges(false);
        if (templateResolution.usedRecommendation && templateResolution.recommendation?.templateName) {
          toast.success(`Auto-selected suggested template: ${templateResolution.recommendation.templateName}`);
          setSelectedArticleTemplateId(templateIdForSubmit);
        }
        toast.success(isScheduled ? `${isArticleMode ? 'Article' : (isShortMode ? 'Short' : 'Blog')} scheduled successfully!` : `${isArticleMode ? 'Article' : (isShortMode ? 'Short' : 'Blog')} updated successfully!`);
        setTimeout(() => navigate(isScheduled ? '/drafts' : (isArticleMode ? `/article/${stayOnId}` : (isShortMode ? `/shorts/${stayOnId}` : `/blog/${stayOnId}`))), 1000);
      }
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
      const scheduledPublishDate = isScheduled && scheduledDate && scheduledTime 
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() 
        : null;
      const filteredVideoUrls = videoUrls.filter(url => url.trim());

      if (coverImageFile) {
        if (oldCloudinaryPublicId) {
          await api.delete('/blogs/delete-image', { params: { publicId: oldCloudinaryPublicId } });
        }
        const formData = new FormData();
        formData.append('image', coverImageFile);
        const { data: imageData } = await api.post('/blogs/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedImageUrl = imageData.url;
        cloudinaryPublicId = imageData.public_id;
      } else if (!coverImage && oldCloudinaryPublicId) {
        await api.delete('/blogs/delete-image', { params: { publicId: oldCloudinaryPublicId } });
        uploadedImageUrl = '';
      }

      const galleryUploadPayload = originalMode !== 'short'
        ? await uploadGalleryItems()
        : { galleryImages: [], galleryImagePublicIds: [] };
      await deleteRemovedGalleryImages();

      if ((isShortMode && originalMode !== 'short') || (isArticleMode && originalMode !== 'article') || (!isShortMode && !isArticleMode && originalMode !== 'blog')) {
        toast.error('Cannot save as draft when converting. Please publish instead.');
        setLoading(false);
        return;
      }
      const endpoint = originalMode === 'article' ? `/articles/${id}` : (originalMode === 'short' ? `/shorts/${id}` : `/blogs/${id}`);
      await api.put(endpoint, { 
        title, 
        content, 
        tags: tags.join(', '),
        category,
        coverImage: uploadedImageUrl,
        cloudinaryPublicId: cloudinaryPublicId || undefined,
        videoUrls: JSON.stringify(filteredVideoUrls),
        metaDescription,
        isDraft: true,
        isScheduled,
        scheduledPublishDate,
        ...(isShortMode ? {} : productAttachmentPayload({
          includePlacements: originalMode === 'article',
          imageSources: [uploadedImageUrl, ...galleryUploadPayload.galleryImages],
        })),
        ...(originalMode !== 'short' ? {
          galleryImages: JSON.stringify(galleryUploadPayload.galleryImages),
          galleryImagePublicIds: JSON.stringify(galleryUploadPayload.galleryImagePublicIds)
        } : {}),
        ...(originalMode === 'article' ? {
          templateId: selectedArticleTemplateId,
          customTemplate: selectedArticleTemplateId === CUSTOM_ARTICLE_TEMPLATE_ID ? customArticleTemplate : null,
          templateThemeMode: FORCED_TEMPLATE_THEME_MODE
        } : {})
      });
      
      if (coverImageFile) {
        setCoverImageFile(null);
      }
      
      setHasUnsavedChanges(false);
      toast.success('Draft saved successfully!');
      setTimeout(() => navigate('/drafts', { state: { refreshDrafts: true } }), 1000);
    } catch (err) {
      toast.error('Failed to save draft');
      setError('Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = (aiContent) => {
    setContent(aiContent);
    setContentOrigin('ai');
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
      // console.log('Other title suggestions:', titles.slice(1));
    }
  };

  const handleTagsGenerated = (aiTags) => {
    const newTags = aiTags.split(',').map(t => t.trim()).filter(t => t);
    setTags(newTags);
    toast.success('Tags generated!');
  };

  const handleContentImproved = (improvedContent) => {
    setContent(improvedContent);
    setContentOrigin('ai');
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

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setCoverImageFile(file);
    setCoverImage(URL.createObjectURL(file));
    toast.success('Image selected! Will upload on save.');
  };

  const handleRemoveImage = () => {
    if (coverImageFile && isBlobUrl(coverImage)) {
      URL.revokeObjectURL(coverImage);
    }
    setCoverImage('');
    setCoverImageFile(null);
    toast.success('Image will be removed on save.');
  };

  const handleGalleryImagesUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const availableSlots = Math.max(0, MAX_GALLERY_IMAGES - galleryItems.length);
    if (availableSlots === 0) {
      toast.error('You can upload up to ' + MAX_GALLERY_IMAGES + ' gallery images.');
      event.target.value = '';
      return;
    }

    const validFiles = [];
    let oversizedCount = 0;

    files.forEach((file) => {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        oversizedCount += 1;
      } else {
        validFiles.push(file);
      }
    });

    const selected = validFiles.slice(0, availableSlots);
    const nextItems = selected.map((file, index) => ({
      id: 'gallery-' + Date.now() + '-' + index + '-' + Math.random().toString(36).slice(2, 8),
      url: URL.createObjectURL(file),
      file,
      local: true,
      publicId: ''
    }));

    setGalleryItems((prev) => [...prev, ...nextItems]);

    if (oversizedCount > 0) {
      toast.error(oversizedCount + ' image(s) were larger than 5MB and skipped.');
    }

    if (validFiles.length > availableSlots) {
      toast.error('Only ' + availableSlots + ' additional gallery image(s) could be added.');
    }

    if (nextItems.length > 0) {
      toast.success(nextItems.length + ' gallery image(s) added.');
    }

    event.target.value = '';
  };

  const handleRemoveGalleryImage = (itemId) => {
    setGalleryItems((prev) => {
      const target = prev.find((item) => item.id === itemId);
      if (!target) return prev;

      if (target.local && isBlobUrl(target.url)) {
        URL.revokeObjectURL(target.url);
      }

      if (!target.local && target.publicId) {
        setRemovedGalleryPublicIds((existing) => (
          existing.includes(target.publicId) ? existing : [...existing, target.publicId]
        ));
      }

      return prev.filter((item) => item.id !== itemId);
    });
  };

  const resolveArticleTemplateForSubmission = () => {
    if (!isArticleMode) {
      return {
        templateId: selectedArticleTemplateId,
        usedRecommendation: false,
        recommendation: null
      };
    }

    return {
      templateId: CUSTOM_ARTICLE_TEMPLATE_ID,
      usedRecommendation: false,
      recommendation: null
    };
  };

  const handleOpenTemplatePreview = () => {
    setShowTemplatePreview(true);
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
      <div className="lekhon-creator-loading min-h-screen flex flex-col items-center justify-center relative" style={{ background: isDark ? 'var(--background-primary)' : 'linear-gradient(180deg, var(--background-primary) 0%, var(--background-secondary) 100%)' }}>
        <div className="lekhon-creator-ambient absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ background: isDark ? 'rgba(107,122,58,0.55)' : 'rgba(201,162,39,0.28)' }}></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" style={{ background: isDark ? 'rgba(201,166,90,0.38)' : 'rgba(232,216,176,0.52)' }}></div>
        </div>
        <div className="relative z-10">
        <BarLoader color="#3B82F6" width={200} height={4} />
        <p className="mt-4 text-[var(--text-secondary)]">Loading blog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lekhon-creator-page min-h-screen py-8 relative overflow-hidden" style={{ background: isDark ? 'var(--background-primary)' : 'linear-gradient(180deg, var(--background-primary) 0%, var(--background-secondary) 100%)' }}>
      {/* Animated Background */}
      <div className="lekhon-creator-ambient absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ background: isDark ? 'rgba(107,122,58,0.55)' : 'rgba(201,162,39,0.28)' }}></div>
        <div className="absolute top-40 right-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" style={{ background: isDark ? 'rgba(201,166,90,0.38)' : 'rgba(232,216,176,0.52)' }}></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" style={{ background: isDark ? 'rgba(178,84,79,0.28)' : 'rgba(201,162,39,0.18)' }}></div>
      </div>
      
      <Toaster />
      <div className="lekhon-creator-shell container mx-auto px-4 max-w-4xl relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-4 font-semibold transition-colors" style={{ color: 'var(--brand-primary)' }}
        >
          <FaArrowLeft /> {t('Back')}
        </button>
        <div className="lekhon-creator-card backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-8 border" style={{ background: isDark ? 'rgba(24,32,24,0.84)' : 'rgba(255,255,255,0.9)', borderColor: 'var(--border-default)' }}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                {isDraft ? t('Edit Draft') : (isArticleMode ? t('Edit Article') : (isShortMode ? t('Edit Short') : t('Edit Blog')))}
              </h1>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsArticleMode(false);
                    setIsShortMode(false);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                    !isShortMode && !isArticleMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-sm hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  <TbBrandBlogger className="w-5 h-5" /> {t('Blog')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!user?.isVerified) {
                      toast.error('Only verified users can edit articles. Please verify your account.');
                      return;
                    }
                    setIsArticleMode(true);
                    setIsShortMode(false);
                  }}
                  disabled={!user?.isVerified}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                    isArticleMode
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : !user?.isVerified
                      ? 'bg-[var(--surface-card)] text-[var(--text-muted)] border border-[var(--border-default)] cursor-not-allowed opacity-60'
                      : 'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-sm hover:bg-[var(--surface-elevated)]'
                  }`}
                  title={!user?.isVerified ? 'Only verified users can edit articles' : ''}
                >
                  <img src={isArticleMode ? '/image/article_logo_light.png' : (isDark ? '/image/article_logo_light.png' : '/image/article_logo_dark.png')} alt="Article" className="w-5 h-5" /> {t('Article')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsArticleMode(false);
                    setIsShortMode(true);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                    isShortMode
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-sm hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  <MdOutlineSwitchAccessShortcutAdd className="w-5 h-5" /> {t('Short')}
                </button>
              </div>
            </div>
            {lastSaved && (
              <span className="text-xs text-[var(--text-muted)]">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {error && <div className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 p-3 rounded-lg mb-4">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6 create-edit-form">
            <div>
              <label className="block text-[var(--text-secondary)] mb-2 font-semibold">{t('Title')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                required
                placeholder={t('Enter blog title...')}
                maxLength={100}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">{title.length}/100 characters</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[var(--text-secondary)] mb-2 font-semibold">{t('Category')}</label>
                <select
                  value={showCustomCategory ? 'Others' : category}
                  onChange={(e) => {
                    if (e.target.value === 'Others') {
                      setShowCustomCategory(true);
                      setCategory('');
                    } else {
                      setShowCustomCategory(false);
                      setCategory(e.target.value);
                      setCustomCategory('');
                    }
                  }}
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
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
                  <option value="Others">{t('Others')}</option>
                </select>
                {showCustomCategory && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      setCategory(e.target.value);
                    }}
                    placeholder={t('Enter custom category...')}
                    className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] mt-2 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                )}
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-2 font-semibold">Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
                {uploadingImage && <p className="text-xs mt-1" style={{ color: 'var(--brand-primary)' }}>Uploading...</p>}
                {getSafeEditorImageUrl(coverImage) && (
                  <div className="mt-2 relative">
                    <img src={getSafeEditorImageUrl(coverImage)} alt="Cover" className="w-full h-32 object-cover rounded-lg" referrerPolicy="no-referrer" />
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

            {!isShortMode && (
              <div>
                <label className="block text-[var(--text-secondary)] mb-2 font-semibold">{t('Gallery Images')}</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryImagesUpload}
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">{t('Upload up to 8 gallery images. These images are used in the article or blog gallery.')}</p>

                {galleryItems.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {galleryItems.map((item) => {
                      const safeGalleryUrl = getSafeEditorImageUrl(item.url);
                      return (
                        <div key={item.id} className="relative rounded-lg overflow-hidden border border-[var(--border-default)] bg-[var(--surface-elevated)]">
                          {safeGalleryUrl ? (
                            <img
                              src={safeGalleryUrl}
                              alt="Gallery"
                              className="w-full h-24 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center text-[var(--text-muted)]">
                              <MdStorefront size={18} />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(item.id)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
                            aria-label="Remove gallery image"
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[var(--text-secondary)] mb-2 font-semibold flex items-center gap-2">
                <PiMonitorPlayDuotone className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                <span>Video URLs</span>
                <span className="text-xs text-[var(--text-muted)] font-normal">(Optional)</span>
              </label>
              {videoUrls.map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      const newUrls = [...videoUrls];
                      newUrls[index] = e.target.value;
                      setVideoUrls(newUrls);
                    }}
                    className="flex-1 px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  />
                  {videoUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setVideoUrls(videoUrls.filter((_, i) => i !== index))}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                    >
                      <IoIosCloseCircleOutline className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              {videoUrls.length < 5 && (
                <button
                  type="button"
                  onClick={() => setVideoUrls([...videoUrls, ''])}
                  className="p-2 rounded-lg transition" style={{ background: 'var(--tag-bg)', color: 'var(--brand-primary)' }}
                >
                  <BsPatchPlus className="w-5 h-5" />
                </button>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-2">Supports YouTube, Vimeo, and direct video links (max 5 videos)</p>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-2 font-semibold">SEO Meta Description</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                placeholder="Brief description for search engines (max 160 characters)"
                maxLength={160}
                rows={2}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">{metaDescription.length}/160 characters</p>
            </div>
            
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <label className="block text-[var(--text-secondary)] font-semibold">{t('Content')}</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="px-3 py-1 text-sm bg-[var(--background-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--surface-elevated)] rounded-lg transition"
                  >
                    {previewMode ? t('Write') : t('Preview')}
                  </button>
                  {isArticleMode && (
                    <button
                      type="button"
                      onClick={handleOpenTemplatePreview}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition font-semibold shadow-lg" style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
                    >
                      <IoColorPaletteOutline className="w-4 h-4" />
                      Template Preview
                    </button>
                  )}
                  <AIBlogGenerator 
                    title={title} 
                    tags={tags.join(', ')}
                    category={category}
                    existingContent={content}
                    isShortMode={isShortMode}
                    isArticleMode={isArticleMode}
                    onGenerate={handleAIGenerate}
                    onMetaGenerate={setMetaDescription}
                  />
                </div>
              </div>
              
              {isArticleMode && (
                <div className="mt-2 flex flex-col gap-2 text-xs text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="flex items-center gap-2">
                      <IoColorPaletteOutline className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                      Layout selected:
                      <span className="font-semibold">{getArticleTemplateById(selectedArticleTemplateId).name}</span>
                    </p>
                  </div>
                  <p className="rounded-lg border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: 'var(--border-default)', background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>Theme sync: Navbar mode</p>
                </div>
              )}

              {previewMode ? (
                <div className="border border-[var(--border-default)] rounded-lg p-4 min-h-[300px] prose dark:prose-invert max-w-none bg-[var(--surface-card)] text-[var(--text-primary)]">
                  <SafeMarkdown>{content || `*${t('No content to preview')}*`}</SafeMarkdown>
                </div>
              ) : isShortMode ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  placeholder={t('Write your short blog (max 100 words)...')}
                  rows={6}
                  maxLength={700}
                />
              ) : isArticleMode ? (
                <SimpleMDE
                  key="simplemde-article"
                  value={content}
                  onChange={(value) => setContent(value)}
                  options={mdeOptions}
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
                <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                  {t('Word Count')}: {wordCount} {isShortMode && wordCount > 100 && <span className="text-red-500">({t('Max 100 words')})</span>} | {t('Reading Time')}: {readingTime} {t('min read')}
                </p>
                <AIContentTools
                  content={content}
                  isShortMode={isShortMode}
                  isArticleMode={isArticleMode}
                  onTitlesGenerated={handleTitlesGenerated}
                  onTagsGenerated={handleTagsGenerated}
                  onContentImproved={handleContentImproved}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[var(--text-secondary)] mb-2 font-semibold">{t('Tags')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full text-sm flex items-center gap-2" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:opacity-80 transition"
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
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                placeholder="Type tag and press Enter or comma"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">Press Enter or comma to add tags</p>
            </div>
            
            {/* Schedule Publication Section */}
            <div className="border-t border-[var(--border-default)] pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BsFillCalendarRangeFill className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                  <label className="block text-[var(--text-secondary)] font-semibold">{t('Schedule Publication')}</label>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--surface-elevated)] dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--brand-soft)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-default)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-primary)] dark:peer-checked:bg-[#D9A56A]"></div>
                </label>
              </div>
              
              {isScheduled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-2 text-sm">{t('Publish Date')}</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      required={isScheduled}
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-2 text-sm">{t('Publish Time')}</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      required={isScheduled}
                    />
                  </div>
                </div>
              )}
            </div>

            {!isShortMode && (
              <>
                <ContentProductTagsEditor
                  linkedProducts={linkedProducts}
                  setLinkedProducts={setLinkedProducts}
                  externalProductLinks={externalProductLinks}
                  setExternalProductLinks={setExternalProductLinks}
                />
                {isArticleMode && (
                  <ProductTagPlacementEditor
                    coverImage={coverImage}
                    galleryImages={galleryItems.map(item => item.url)}
                    linkedProducts={linkedProducts}
                    externalProductLinks={externalProductLinks}
                    placements={productTagPlacements}
                    setPlacements={setProductTagPlacements}
                  />
                )}
              </>
            )}
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
                >
                  <MdOutlinePublish className="w-5 h-5" />
                  {loading ? t('Updating...') : (isScheduled ? t('Schedule') : (isDraft ? t('Publish') : t('Update')))}
                </button>
                
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={loading}
                  className="theme-soft-button px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CiSaveDown2 className="w-5 h-5" />
                  {loading ? t('Saving...') : t('Save Draft')}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="theme-soft-button px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('Cancel')}
                </button>
              </div>

              {/* Auto-save Indicator */}
              {(autoSaving || autoSaveSuccess) && (
                <div className="flex items-center gap-2">
                  {autoSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" style={{ color: 'var(--brand-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs text-[var(--text-secondary)]">Saving...</span>
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
        <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center">
          <div className="text-center">
            <GridLoader color="#3B82F6" size={20} />
            <p className="mt-6 text-white text-lg font-semibold">
              {t('Saving...')}
            </p>
            {(coverImageFile || galleryItems.some((item) => item.local)) && (
              <p className="mt-2 text-[var(--text-secondary)] text-sm">Uploading...</p>
            )}
          </div>
        </div>
      )}


      {/* Template Preview Modal */}
      {showTemplatePreview && (
        <TemplatePreview
          article={{
            title,
            content,
            author: user,
            coverImage,
            metaDescription,
            tags,
            category,
            videoUrls: videoUrls.filter(url => url.trim()),
            galleryImages: galleryItems.map((item) => item.url),
            linkedProduct: linkedProducts[0] || null,
            linkedProducts,
            externalProductLinks,
            productTagPlacements,
            templateThemeMode: FORCED_TEMPLATE_THEME_MODE,
            createdAt: new Date().toISOString()
          }}
          selectedTemplateId={selectedArticleTemplateId}
          customTemplate={customArticleTemplate}
          onApplyTemplate={(templateId, appliedCustomTemplate) => {
            setSelectedArticleTemplateId(templateId);
            if (templateId === CUSTOM_ARTICLE_TEMPLATE_ID) {
              setCustomArticleTemplate(normalizeCustomTemplate(appliedCustomTemplate || customArticleTemplate));
            }
            toast.success(`Template selected: ${getArticleTemplateById(templateId).name}`);
            setShowTemplatePreview(false);
          }}
          onClose={() => setShowTemplatePreview(false)}
        />
      )}
      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl p-6 max-w-md w-full border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Unsaved Changes</h3>
            <p className="text-[var(--text-secondary)] mb-6">
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
                className="flex-1 theme-soft-button py-3 rounded-lg font-semibold transition"
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










