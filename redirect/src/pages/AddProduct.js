import React, { useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
  FaArrowLeft,
  FaArrowRight,
  FaBoxOpen,
  FaFilePdf,
  FaImage,
  FaLink,
  FaMagic,
  FaPlus,
  FaRocket,
  FaSave,
  FaTable,
  FaTimes,
  FaUpload,
  FaWrench,
} from 'react-icons/fa';

const CATEGORIES = [
  'Writing', 'Design', 'Photography', 'Music', 'Education',
  'Technology', 'Business', 'Art', 'Lifestyle', 'Other',
];

const TYPE_INFO = {
  digital: {
    icon: FaFilePdf,
    label: 'Digital Product',
    desc: 'eBook, template, design file, course',
    color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  },
  physical: {
    icon: FaBoxOpen,
    label: 'Physical Product',
    desc: 'Book, merchandise, handmade item',
    color: 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  },
  service: {
    icon: FaWrench,
    label: 'Service',
    desc: 'Writing, design, consulting',
    color: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  },
  external: {
    icon: FaLink,
    label: 'External Link',
    desc: 'Amazon, Etsy, Gumroad listing',
    color: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  },
};

const STEPS = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'images', label: 'Product Images' },
  { id: 'details', label: 'Product Details' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'marketing', label: 'Marketing & SEO' },
  { id: 'review', label: 'Review & Publish' },
];

const BADGE_OPTIONS = ['Bestseller', 'New', 'Limited Edition', 'Top Rated', 'Staff Pick'];
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

const inputCls = 'w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500 transition';
const sectionCls = 'p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4';

const FieldError = ({ message }) => (
  message ? (
    <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      {message}
    </p>
  ) : null
);

const InputField = ({ label, required, children, hint, action, error }) => (
  <div>
    <div className="mb-1 flex items-center justify-between gap-3">
      <label className="block text-sm font-medium text-[var(--text-secondary)]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {action}
    </div>
    {children}
    <FieldError message={error} />
    {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
  </div>
);

const AiButton = ({ onClick, loading, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-violet-300/60 text-[11px] font-semibold text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-60"
  >
    <FaMagic size={10} />
    {loading ? 'Working...' : children}
  </button>
);

const cleanSpecifications = (items) =>
  (items || [])
    .map(item => ({ key: String(item.key || '').trim(), value: String(item.value || '').trim() }))
    .filter(item => item.key || item.value);

const FIELD_STEPS = {
  type: 'basic',
  title: 'basic',
  description: 'basic',
  specifications: 'basic',
  warranty: 'basic',
  tags: 'basic',
  images: 'images',
  stock: 'details',
  weight: 'details',
  dimensions: 'details',
  externalUrl: 'details',
  price: 'pricing',
  marketing: 'marketing',
  review: 'review',
};

const getStepIndex = (stepId) => Math.max(0, STEPS.findIndex(step => step.id === stepId));

const AddProduct = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const digitalRef = useRef();

  const [activeStep, setActiveStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [images, setImages] = useState([]);
  const [digitalFile, setDigitalFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [aiLoading, setAiLoading] = useState('');

  const [form, setForm] = useState({
    type: '',
    title: '',
    description: '',
    specifications: [{ key: '', value: '' }],
    warranty: '',
    countryOfOrigin: 'India',
    category: [],
    tags: '',
    price: '',
    compareAtPrice: '',
    currency: 'INR',
    isFree: false,
    seoTitle: '',
    seoDescription: '',
    promoBanner: '',
    badges: [],
    maxDownloads: 5,
    stock: '',
    minimumOrderQuantity: 1,
    sku: '',
    weight: '',
    dimensionL: '',
    dimensionW: '',
    dimensionH: '',
    estimatedDeliveryDays: 7,
    shippingZones: ['India'],
    deliveryDays: 3,
    revisions: 1,
    includes: '',
    excludes: '',
    externalUrl: '',
    externalPlatform: 'Other',
  });

  const currentStep = STEPS[activeStep];
  const clearFieldError = (...fields) => {
    setFieldErrors(prev => {
      const next = { ...prev };
      let changed = false;
      fields.forEach(field => {
        if (next[field]) {
          delete next[field];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const setFieldMessage = (field, message) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }));
  };

  const clearStepErrors = (stepId) => {
    setFieldErrors(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(FIELD_STEPS).forEach(([field, fieldStep]) => {
        if (fieldStep === stepId && next[field]) {
          delete next[field];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const hasStepError = (stepId) =>
    Object.entries(fieldErrors).some(([field]) => FIELD_STEPS[field] === stepId);

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    clearFieldError(key);
    if (['dimensionL', 'dimensionW', 'dimensionH'].includes(key)) clearFieldError('dimensions');
  };

  const toggleCategory = (category) => {
    set('category', form.category.includes(category)
      ? form.category.filter(item => item !== category)
      : [...form.category, category]);
  };

  const updateSpecification = (index, field, value) => {
    const next = [...form.specifications];
    next[index] = { ...next[index], [field]: value };
    set('specifications', next);
    clearFieldError('specifications');
  };

  const addSpecification = () => {
    set('specifications', [...form.specifications, { key: '', value: '' }]);
  };

  const removeSpecification = (index) => {
    const next = form.specifications.filter((_, i) => i !== index);
    set('specifications', next.length ? next : [{ key: '', value: '' }]);
  };

  const handleImageSelect = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = selectedFiles.filter(file => file.size <= MAX_PRODUCT_IMAGE_SIZE_BYTES);
    const skippedCount = selectedFiles.length - validFiles.length;
    const files = validFiles.slice(0, 8 - images.length);
    const newImages = files.map(file => ({ file, preview: URL.createObjectURL(file) }));

    setImages(prev => [...prev, ...newImages].slice(0, 8));
    if (skippedCount > 0) {
      setFieldMessage('images', `${skippedCount} image(s) were larger than 4MB and skipped.`);
    } else {
      clearFieldError('images');
    }
    event.target.value = '';
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(images[index].preview);
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDigitalFile = (event) => {
    const file = event.target.files?.[0];
    if (file) setDigitalFile(file);
  };

  const validateStep = (stepId = currentStep.id) => {
    if (stepId === 'basic') {
      if (!form.type) return { field: 'type', message: 'Please select a product type.' };
      if (!form.title.trim()) return { field: 'title', message: 'Product title is required.' };
    }
    if (stepId === 'details') {
      if (form.type === 'physical') {
        if (!form.stock) return { field: 'stock', message: 'Stock quantity is required.' };
        if (!form.weight) return { field: 'weight', message: 'Weight is required for shipping.' };
        if (!form.dimensionL || !form.dimensionW || !form.dimensionH) {
          return { field: 'dimensions', message: 'Length, width, and height are required for shipping.' };
        }
      }
      if (form.type === 'external' && !form.externalUrl.trim()) {
        return { field: 'externalUrl', message: 'External URL is required.' };
      }
    }
    if (stepId === 'pricing' && !form.isFree && !form.price) {
      return { field: 'price', message: 'Price is required, or mark the product as free.' };
    }
    return null;
  };

  const validateAll = () => {
    for (let index = 0; index < STEPS.length - 1; index += 1) {
      const message = validateStep(STEPS[index].id);
      if (message) return { ...message, index };
    }
    return null;
  };

  const goNext = () => {
    const message = validateStep();
    if (message) {
      setFieldMessage(message.field, message.message);
      return;
    }
    clearStepErrors(currentStep.id);
    setActiveStep(step => {
      const nextStep = Math.min(step + 1, STEPS.length - 1);
      setHighestStep(current => Math.max(current, nextStep));
      return nextStep;
    });
  };

  const goPrev = () => {
    setActiveStep(step => Math.max(step - 1, 0));
  };

  const buildAiProduct = () => ({
    type: form.type,
    title: form.title,
    description: form.description,
    specifications: cleanSpecifications(form.specifications),
    warranty: form.warranty,
    countryOfOrigin: form.countryOfOrigin,
    category: form.category,
    tags: form.tags,
  });

  const runProductAi = async (target) => {
    const errorFieldByTarget = {
      description: 'description',
      specifications: 'specifications',
      warranty: 'warranty',
      tags: 'tags',
      marketing: 'marketing',
    };
    const errorField = errorFieldByTarget[target] || 'review';

    if (!form.title.trim()) {
      setFieldMessage('title', 'Add a product title before using AI.');
      return;
    }

    setAiLoading(target);
    clearFieldError(errorField, 'title');
    try {
      const { data } = await api.post('/ai/product-listing', {
        target,
        product: buildAiProduct(),
      });

      if (target === 'description') {
        const description = String(data.description || data.content || '').trim();
        if (description) {
          set('description', description);
        } else {
          setFieldMessage('description', 'AI finished, but it did not return a description. Try again with a more specific title.');
        }
      }
      if (target === 'specifications') {
        if (data.specifications?.length) {
          set('specifications', data.specifications);
        } else {
          setFieldMessage('specifications', 'AI finished, but it did not return specification rows. Add a little more product detail and try again.');
        }
      }
      if (target === 'warranty') {
        const warranty = String(data.warranty || '').trim();
        if (warranty) {
          set('warranty', warranty);
        } else {
          setFieldMessage('warranty', 'AI finished, but it did not return warranty text.');
        }
      }
      if (target === 'tags') {
        if (data.tags?.length) {
          set('tags', data.tags.join(', '));
        } else {
          setFieldMessage('tags', 'AI finished, but it did not return tags. Add a clearer title or category and try again.');
        }
      }
      if (target === 'marketing') {
        if (data.promoBanner) set('promoBanner', data.promoBanner);
        if (data.badges?.length) set('badges', data.badges.filter(badge => BADGE_OPTIONS.includes(badge)));
        if (data.seoTitle) set('seoTitle', data.seoTitle);
        if (data.seoDescription) set('seoDescription', data.seoDescription);
        if (!data.promoBanner && !data.seoTitle && !data.seoDescription && !data.badges?.length) {
          setFieldMessage('marketing', 'AI finished, but it did not return marketing fields. Add more product details and try again.');
        }
      }
    } catch (err) {
      setFieldMessage(errorField, err.response?.data?.message || 'AI generation failed. Please try again.');
    } finally {
      setAiLoading('');
    }
  };

  const handleSave = async (publishStatus) => {
    const validation = validateAll();
    if (validation) {
      setActiveStep(validation.index);
      setFieldMessage(validation.field, validation.message);
      return;
    }

    setSaving(true);
    clearFieldError('review');

    try {
      const fd = new FormData();
      fd.append('type', form.type);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('specifications', JSON.stringify(cleanSpecifications(form.specifications)));
      fd.append('warranty', form.warranty);
      fd.append('countryOfOrigin', form.countryOfOrigin);
      fd.append('category', JSON.stringify(form.category));
      fd.append('tags', JSON.stringify(form.tags.split(',').map(tag => tag.trim()).filter(Boolean)));
      fd.append('price', form.isFree ? '0' : form.price);
      fd.append('isFree', form.isFree);
      fd.append('currency', form.currency);
      fd.append('status', publishStatus);
      fd.append('seoTitle', form.seoTitle || form.title);
      fd.append('seoDescription', form.seoDescription);
      fd.append('decoration', JSON.stringify({ promoBanner: form.promoBanner, badges: form.badges }));
      if (form.compareAtPrice) fd.append('compareAtPrice', form.compareAtPrice);

      if (form.type === 'digital') {
        fd.append('digital', JSON.stringify({ maxDownloads: parseInt(form.maxDownloads, 10) || 5 }));
      }

      if (form.type === 'physical') {
        fd.append('physical', JSON.stringify({
          stock: parseInt(form.stock, 10) || 0,
          minimumOrderQuantity: parseInt(form.minimumOrderQuantity, 10) || 1,
          sku: form.sku,
          weight: parseFloat(form.weight) || 0,
          dimensions: {
            l: parseFloat(form.dimensionL) || 0,
            w: parseFloat(form.dimensionW) || 0,
            h: parseFloat(form.dimensionH) || 0,
          },
          shippingFee: 0,
          estimatedDeliveryDays: parseInt(form.estimatedDeliveryDays, 10) || 7,
          shippingZones: form.shippingZones,
        }));
      }

      if (form.type === 'service') {
        fd.append('service', JSON.stringify({
          deliveryDays: parseInt(form.deliveryDays, 10) || 3,
          revisions: parseInt(form.revisions, 10) || 0,
          includes: form.includes.split('\n').map(item => item.trim()).filter(Boolean),
          excludes: form.excludes.split('\n').map(item => item.trim()).filter(Boolean),
        }));
      }

      if (form.type === 'external') {
        fd.append('external', JSON.stringify({ url: form.externalUrl, platform: form.externalPlatform }));
      }

      images.forEach(image => fd.append('images', image.file));

      const { data } = await api.post('/marketplace/seller/products', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const productId = data.product._id;
      if (form.type === 'digital' && digitalFile) {
        setUploadingFile(true);
        const fileFd = new FormData();
        fileFd.append('file', digitalFile);
        await api.post(`/marketplace/seller/products/${productId}/upload-file`, fileFd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setUploadingFile(false);
      }

      navigate('/seller/dashboard', {
        state: { toast: publishStatus === 'active' ? 'Product published!' : 'Draft saved.' },
      });
    } catch (err) {
      setFieldMessage('review', err.response?.data?.message || 'Failed to save product. Please try again.');
    } finally {
      setSaving(false);
      setUploadingFile(false);
    }
  };

  const renderBasic = () => (
    <div className={sectionCls}>
      <h2 className="font-bold text-[var(--text-primary)]">Basic Information</h2>

      <InputField label="Product Type" required error={fieldErrors.type}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(TYPE_INFO).map(([key, info]) => {
            const Icon = info.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set('type', key)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                  form.type === key
                    ? `${info.color} border-2`
                    : 'border-[var(--border-color)] hover:border-violet-400 bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                <Icon size={22} />
                <span className="text-xs font-semibold">{info.label}</span>
                <span className="text-[10px] leading-tight opacity-75">{info.desc}</span>
              </button>
            );
          })}
        </div>
      </InputField>

      <InputField label="Product Title" required error={fieldErrors.title}>
        <input
          value={form.title}
          onChange={event => set('title', event.target.value)}
          placeholder="Give your product a clear, descriptive name"
          maxLength={200}
          className={inputCls}
        />
        <p className="text-xs text-[var(--text-muted)] text-right mt-0.5">{form.title.length}/200</p>
      </InputField>

      <InputField
        label="Description"
        hint="AI can draft it, but review all facts before publishing."
        action={<AiButton loading={aiLoading === 'description'} onClick={() => runProductAi('description')}>Write with AI</AiButton>}
        error={fieldErrors.description}
      >
        <textarea
          value={form.description}
          onChange={event => set('description', event.target.value)}
          rows={5}
          placeholder="What do buyers get? Who is it for? What problem does it solve?"
          className={`${inputCls} resize-none`}
        />
      </InputField>

      <InputField
        label="Specifications"
        hint="Displayed as a key-value table on the product page."
        action={<AiButton loading={aiLoading === 'specifications'} onClick={() => runProductAi('specifications')}>Generate specs</AiButton>}
        error={fieldErrors.specifications}
      >
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)]">
          <div className="grid grid-cols-[1fr_1fr_44px] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-muted)]">
            <span className="px-3 py-2 border-r border-[var(--border-color)]">Key</span>
            <span className="px-3 py-2 border-r border-[var(--border-color)]">Value</span>
            <span className="px-3 py-2 text-center"><FaTable className="inline" /></span>
          </div>
          {form.specifications.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_44px] border-t border-[var(--border-color)]">
              <input
                value={item.key}
                onChange={event => updateSpecification(index, 'key', event.target.value)}
                placeholder="Material"
                className="px-3 py-2 text-sm bg-transparent border-r border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
              />
              <input
                value={item.value}
                onChange={event => updateSpecification(index, 'value', event.target.value)}
                placeholder="ABS Plastic"
                className="px-3 py-2 text-sm bg-transparent border-r border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeSpecification(index)}
                className="grid place-items-center text-[var(--text-muted)] hover:text-red-500"
                aria-label="Remove specification"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSpecification}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:underline"
        >
          <FaPlus size={10} /> Add row
        </button>
      </InputField>

      <InputField
        label="Warranty"
        hint="Keep this accurate. AI drafts should be edited by the seller."
        action={<AiButton loading={aiLoading === 'warranty'} onClick={() => runProductAi('warranty')}>Draft warranty</AiButton>}
        error={fieldErrors.warranty}
      >
        <textarea
          value={form.warranty}
          onChange={event => set('warranty', event.target.value)}
          rows={3}
          placeholder="Example: 6 months seller warranty against manufacturing defects."
          className={`${inputCls} resize-none`}
        />
      </InputField>

      <InputField label="Country of Origin">
        <input
          value={form.countryOfOrigin}
          onChange={event => set('countryOfOrigin', event.target.value)}
          placeholder="India"
          className={inputCls}
        />
      </InputField>

      <InputField label="Categories">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.category.includes(category)
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-violet-400'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </InputField>

      <InputField
        label="Tags"
        hint="Comma-separated tags. Use the AI button to generate search-friendly tags."
        action={<AiButton loading={aiLoading === 'tags'} onClick={() => runProductAi('tags')}>Generate tags</AiButton>}
        error={fieldErrors.tags}
      >
        <input
          value={form.tags}
          onChange={event => set('tags', event.target.value)}
          placeholder="writing, template, ebook"
          className={inputCls}
        />
      </InputField>
    </div>
  );

  const renderImages = () => (
    <div className={sectionCls}>
      <h2 className="font-bold text-[var(--text-primary)]">Product Images</h2>
      <p className="text-xs text-[var(--text-muted)]">Up to 8 images, max 4MB each. First image is the thumbnail.</p>
      <FieldError message={fieldErrors.images} />

      <div className="grid grid-cols-4 gap-3">
        {images.map((image, index) => (
          <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] group">
            <img src={image.preview} alt="" className="w-full h-full object-cover" />
            {index === 0 && (
              <span className="absolute top-1 left-1 text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-semibold">Cover</span>
            )}
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <FaTimes size={8} />
            </button>
          </div>
        ))}
        {images.length < 8 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center gap-1.5 text-[var(--text-muted)] hover:border-violet-400 hover:text-violet-500 transition-colors"
          >
            <FaImage size={20} />
            <span className="text-[10px]">Add Image</span>
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
    </div>
  );

  const renderDetails = () => {
    if (form.type === 'digital') {
      return (
        <div className={sectionCls}>
          <h2 className="font-bold text-[var(--text-primary)]">Digital File</h2>
          <InputField label="Upload File" hint="PDF, ZIP, MP4, EPUB, etc. Buyers download after payment.">
            <div
              onClick={() => digitalRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-6 text-center cursor-pointer hover:border-violet-400 transition-colors"
            >
              {digitalFile ? (
                <div className="text-sm text-[var(--text-primary)]">
                  <p className="font-medium">{digitalFile.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{(digitalFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div className="text-[var(--text-muted)]">
                  <FaUpload size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click to select file</p>
                </div>
              )}
            </div>
            <input ref={digitalRef} type="file" onChange={handleDigitalFile} className="hidden" />
          </InputField>
          <InputField label="Download Limit per Buyer">
            <input type="number" min="1" max="100" value={form.maxDownloads} onChange={event => set('maxDownloads', event.target.value)} className={`${inputCls} w-32`} />
          </InputField>
        </div>
      );
    }

    if (form.type === 'physical') {
      return (
        <div className={sectionCls}>
          <h2 className="font-bold text-[var(--text-primary)]">Physical Product Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Stock Quantity" required error={fieldErrors.stock}>
              <input type="number" min="0" value={form.stock} onChange={event => set('stock', event.target.value)} placeholder="100" className={inputCls} />
            </InputField>
            <InputField label="Minimum Order Quantity">
              <input type="number" min="1" value={form.minimumOrderQuantity} onChange={event => set('minimumOrderQuantity', event.target.value)} placeholder="1" className={inputCls} />
            </InputField>
            <InputField label="SKU" hint="Optional product code">
              <input value={form.sku} onChange={event => set('sku', event.target.value)} placeholder="Auto-generated if blank" className={inputCls} />
            </InputField>
            <InputField label="Weight (grams)" required error={fieldErrors.weight}>
              <input type="number" min="1" value={form.weight} onChange={event => set('weight', event.target.value)} placeholder="250" className={inputCls} />
            </InputField>
            <InputField label="Length (cm)" required>
              <input type="number" min="1" value={form.dimensionL} onChange={event => set('dimensionL', event.target.value)} placeholder="20" className={inputCls} />
            </InputField>
            <InputField label="Width (cm)" required>
              <input type="number" min="1" value={form.dimensionW} onChange={event => set('dimensionW', event.target.value)} placeholder="15" className={inputCls} />
            </InputField>
            <InputField label="Height (cm)" required>
              <input type="number" min="1" value={form.dimensionH} onChange={event => set('dimensionH', event.target.value)} placeholder="10" className={inputCls} />
            </InputField>
            <InputField label="Handling / Prep Days">
              <input type="number" min="1" value={form.estimatedDeliveryDays} onChange={event => set('estimatedDeliveryDays', event.target.value)} className={inputCls} />
            </InputField>
          </div>
          <FieldError message={fieldErrors.dimensions} />
          <InputField label="Shipping Zones" hint="Shipping fee will be calculated by the shipping method later, not entered by the seller.">
            <div className="flex gap-3">
              {['India', 'Worldwide'].map(zone => (
                <label key={zone} className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={form.shippingZones.includes(zone)}
                    onChange={event => set('shippingZones', event.target.checked ? [...form.shippingZones, zone] : form.shippingZones.filter(item => item !== zone))}
                    className="rounded"
                  />
                  {zone}
                </label>
              ))}
            </div>
          </InputField>
        </div>
      );
    }

    if (form.type === 'service') {
      return (
        <div className={sectionCls}>
          <h2 className="font-bold text-[var(--text-primary)]">Service Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Delivery Time (days)" required>
              <input type="number" min="1" value={form.deliveryDays} onChange={event => set('deliveryDays', event.target.value)} className={inputCls} />
            </InputField>
            <InputField label="Revisions Included">
              <input type="number" min="0" value={form.revisions} onChange={event => set('revisions', event.target.value)} className={inputCls} />
            </InputField>
          </div>
          <InputField label="What's Included" hint="One item per line">
            <textarea rows={3} value={form.includes} onChange={event => set('includes', event.target.value)} placeholder={'Full article (1000 words)\nSEO optimization\n2 revisions'} className={`${inputCls} resize-none`} />
          </InputField>
          <InputField label="What's NOT Included" hint="One item per line">
            <textarea rows={2} value={form.excludes} onChange={event => set('excludes', event.target.value)} placeholder={'Rush delivery\nImages or graphics'} className={`${inputCls} resize-none`} />
          </InputField>
        </div>
      );
    }

    return (
      <div className={sectionCls}>
        <h2 className="font-bold text-[var(--text-primary)]">External Link</h2>
        <InputField label="Product URL" required error={fieldErrors.externalUrl}>
          <input value={form.externalUrl} onChange={event => set('externalUrl', event.target.value)} placeholder="https://amazon.in/dp/XXXXXXXXXX" className={inputCls} />
        </InputField>
        <InputField label="Platform">
          <select value={form.externalPlatform} onChange={event => set('externalPlatform', event.target.value)} className={inputCls}>
            {['Amazon', 'Etsy', 'Gumroad', 'Flipkart', 'Other'].map(platform => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
        </InputField>
      </div>
    );
  };

  const renderPricing = () => (
    <div className={sectionCls}>
      <h2 className="font-bold text-[var(--text-primary)]">Pricing</h2>
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={form.isFree} onChange={event => set('isFree', event.target.checked)} className="w-4 h-4 rounded" />
        <span className="text-sm font-medium text-[var(--text-secondary)]">This is a free product</span>
      </label>
      {!form.isFree && (
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Selling Price" required error={fieldErrors.price}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] font-medium">Rs.</span>
              <input type="number" min="0" step="0.01" value={form.price} onChange={event => set('price', event.target.value)} placeholder="499" className={`${inputCls} pl-10`} />
            </div>
          </InputField>
          <InputField label="Compare-at Price (MRP)" hint="Shows as strikethrough">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] font-medium">Rs.</span>
              <input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={event => set('compareAtPrice', event.target.value)} placeholder="999" className={`${inputCls} pl-10`} />
            </div>
          </InputField>
        </div>
      )}
    </div>
  );

  const renderMarketing = () => (
    <div className={sectionCls}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-[var(--text-primary)]">Marketing & SEO <span className="text-xs font-normal text-[var(--text-muted)]">(optional)</span></h2>
        <AiButton loading={aiLoading === 'marketing'} onClick={() => runProductAi('marketing')}>Enhance with AI</AiButton>
      </div>
      <FieldError message={fieldErrors.marketing} />

      <InputField label="Promo Banner Text" hint="Shown as a highlighted banner on the product page">
        <input value={form.promoBanner} onChange={event => set('promoBanner', event.target.value)} placeholder="Launch offer - 40% off this week only!" className={inputCls} />
      </InputField>

      <InputField label="Product Badges" hint="Help your product stand out in marketplace listings">
        <div className="flex flex-wrap gap-2">
          {BADGE_OPTIONS.map(badge => {
            const selected = form.badges.includes(badge);
            return (
              <button
                key={badge}
                type="button"
                onClick={() => set('badges', selected ? form.badges.filter(item => item !== badge) : [...form.badges, badge])}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  selected
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-amber-400'
                }`}
              >
                {badge}
              </button>
            );
          })}
        </div>
      </InputField>

      <InputField label="SEO Title">
        <input value={form.seoTitle} onChange={event => set('seoTitle', event.target.value)} placeholder={form.title || 'Defaults to product title'} className={inputCls} />
      </InputField>

      <InputField label="SEO Description">
        <textarea rows={2} value={form.seoDescription} onChange={event => set('seoDescription', event.target.value)} placeholder="Brief description for search engines (160 chars)" maxLength={160} className={`${inputCls} resize-none`} />
        <p className="text-xs text-[var(--text-muted)] text-right mt-0.5">{form.seoDescription.length}/160</p>
      </InputField>
    </div>
  );

  const renderReview = () => (
    <div className={sectionCls}>
      <h2 className="font-bold text-[var(--text-primary)]">Review & Publish</h2>
      <FieldError message={fieldErrors.review} />
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-muted)]">Type</p>
          <p className="font-semibold text-[var(--text-primary)]">{TYPE_INFO[form.type]?.label || 'Not selected'}</p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-muted)]">Price</p>
          <p className="font-semibold text-[var(--text-primary)]">{form.isFree ? 'Free' : `Rs. ${form.price || 0}`}</p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-muted)]">Images</p>
          <p className="font-semibold text-[var(--text-primary)]">{images.length} selected</p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-muted)]">Specifications</p>
          <p className="font-semibold text-[var(--text-primary)]">{cleanSpecifications(form.specifications).length} rows</p>
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Save as draft if you want to review the AI text or images later. Publish makes the product visible in the marketplace.
      </p>
    </div>
  );

  const renderStep = () => {
    switch (currentStep.id) {
      case 'basic': return renderBasic();
      case 'images': return renderImages();
      case 'details': return renderDetails();
      case 'pricing': return renderPricing();
      case 'marketing': return renderMarketing();
      case 'review': return renderReview();
      default: return null;
    }
  };

  if (!user?.isSeller) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-[var(--text-muted)]">You need a seller account to add products.</p>
          <Link to="/become-seller" className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium">Become a Seller</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/seller/dashboard" className="text-xs text-[var(--text-muted)] hover:text-violet-500">Back to Seller Dashboard</Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">Add New Product</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
          <div className="flex flex-wrap gap-2">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (index <= highestStep) setActiveStep(index);
                }}
                disabled={index > highestStep}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  index === activeStep
                    ? hasStepError(step.id)
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-violet-600 text-white border-violet-600'
                    : index < activeStep
                      ? hasStepError(step.id)
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border-red-300 dark:border-red-700'
                        : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-700'
                      : hasStepError(step.id)
                        ? 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-300'
                        : 'border-[var(--border-color)] text-[var(--text-muted)]'
                } ${index > highestStep ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {index + 1}. {step.label}
              </button>
            ))}
          </div>
        </div>

        {renderStep()}

        <div className="flex items-center justify-between gap-3 pb-8">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeStep === 0 || saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaArrowLeft /> Previous
          </button>

          {activeStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              Next <FaArrowRight />
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
              >
                <FaSave /> {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSave('active')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                <FaRocket /> {uploadingFile ? 'Uploading file...' : saving ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
