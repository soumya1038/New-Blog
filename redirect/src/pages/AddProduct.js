import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
  FaArrowLeft,
  FaArrowRight,
  FaBoxOpen,
  FaCamera,
  FaCheck,
  FaFilePdf,
  FaImage,
  FaLink,
  FaMagic,
  FaPlus,
  FaRocket,
  FaSave,
  FaSpinner,
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
const LOCAL_WORKING_COPY_DB = 'lekhon-product-working-copy';
const LOCAL_WORKING_COPY_STORE = 'productWorkingCopies';
const LOCAL_WORKING_COPY_ID = 'add-product';
const LOCAL_WORKING_COPY_TTL_MS = 60 * 60 * 1000;

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

const createDefaultForm = () => ({
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

const createPreviewImage = (file) => ({
  file,
  preview: URL.createObjectURL(file),
});

const isBlobLike = (value) =>
  typeof Blob !== 'undefined' && value instanceof Blob;

const hasProductWorkingInput = (form, images = [], digitalFile = null) => {
  if (images.length > 0 || digitalFile) return true;
  const defaults = createDefaultForm();
  return Object.keys(defaults).some(key =>
    JSON.stringify(form[key] ?? '') !== JSON.stringify(defaults[key] ?? '')
  );
};

const hasText = (value) => String(value || '').trim().length > 0;

const getFileSignature = (file) => {
  const source = file?.file || file;
  if (!isBlobLike(source)) return '';
  return [
    source.name || '',
    source.size || 0,
    source.type || '',
    source.lastModified || 0,
  ].join(':');
};

const getStepSignatures = (form, images = [], digitalFile = null) => ({
  basic: JSON.stringify({
    type: form.type,
    title: String(form.title || '').trim(),
    description: String(form.description || '').trim(),
    specifications: cleanSpecifications(form.specifications),
    warranty: String(form.warranty || '').trim(),
    countryOfOrigin: String(form.countryOfOrigin || '').trim(),
    category: form.category || [],
    tags: String(form.tags || '').trim(),
  }),
  images: images.map(getFileSignature).filter(Boolean).join('|'),
  details: JSON.stringify({
    type: form.type,
    digitalFile: getFileSignature(digitalFile),
    stock: String(form.stock || '').trim(),
    minimumOrderQuantity: String(form.minimumOrderQuantity || '').trim(),
    sku: String(form.sku || '').trim(),
    weight: String(form.weight || '').trim(),
    dimensionL: String(form.dimensionL || '').trim(),
    dimensionW: String(form.dimensionW || '').trim(),
    dimensionH: String(form.dimensionH || '').trim(),
    estimatedDeliveryDays: String(form.estimatedDeliveryDays || '').trim(),
    shippingZones: form.shippingZones || [],
    deliveryDays: String(form.deliveryDays || '').trim(),
    revisions: String(form.revisions || '').trim(),
    includes: String(form.includes || '').trim(),
    excludes: String(form.excludes || '').trim(),
    externalUrl: String(form.externalUrl || '').trim(),
    externalPlatform: String(form.externalPlatform || '').trim(),
  }),
  pricing: JSON.stringify({
    isFree: Boolean(form.isFree),
    price: String(form.price || '').trim(),
    compareAtPrice: String(form.compareAtPrice || '').trim(),
    currency: form.currency,
  }),
  marketing: JSON.stringify({
    seoTitle: String(form.seoTitle || '').trim(),
    seoDescription: String(form.seoDescription || '').trim(),
    promoBanner: String(form.promoBanner || '').trim(),
    badges: form.badges || [],
  }),
});

const getCompletedSteps = (form, images = [], digitalFile = null) => {
  const completed = [];

  if (hasText(form.type) && hasText(form.title)) {
    completed.push('basic');
  }

  if (images.length > 0) {
    completed.push('images');
  }

  if (form.type === 'digital' && isBlobLike(digitalFile)) {
    completed.push('details');
  }
  if (
    form.type === 'physical' &&
    hasText(form.stock) &&
    hasText(form.weight) &&
    hasText(form.dimensionL) &&
    hasText(form.dimensionW) &&
    hasText(form.dimensionH)
  ) {
    completed.push('details');
  }
  if (form.type === 'service' && hasText(form.deliveryDays) && String(form.revisions ?? '').trim() !== '') {
    completed.push('details');
  }
  if (form.type === 'external' && hasText(form.externalUrl)) {
    completed.push('details');
  }

  if (form.isFree || hasText(form.price)) {
    completed.push('pricing');
  }

  if (
    hasText(form.promoBanner) ||
    hasText(form.seoTitle) ||
    hasText(form.seoDescription) ||
    (form.badges || []).length > 0
  ) {
    completed.push('marketing');
  }

  return completed;
};

const STEP_FORM_FIELDS = {
  basic: [
    'type',
    'title',
    'description',
    'specifications',
    'warranty',
    'countryOfOrigin',
    'category',
    'tags',
  ],
  details: [
    'maxDownloads',
    'stock',
    'minimumOrderQuantity',
    'sku',
    'weight',
    'dimensionL',
    'dimensionW',
    'dimensionH',
    'estimatedDeliveryDays',
    'shippingZones',
    'deliveryDays',
    'revisions',
    'includes',
    'excludes',
    'externalUrl',
    'externalPlatform',
  ],
  pricing: ['price', 'compareAtPrice', 'currency', 'isFree'],
  marketing: ['seoTitle', 'seoDescription', 'promoBanner', 'badges'],
};

const cloneFormValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(item => (item && typeof item === 'object' ? { ...item } : item));
  }
  if (value && typeof value === 'object') {
    return { ...value };
  }
  return value;
};

const applyStepFormValues = (targetForm, sourceForm, stepId) => {
  (STEP_FORM_FIELDS[stepId] || []).forEach(field => {
    targetForm[field] = cloneFormValue(sourceForm[field]);
  });
};

const openWorkingCopyDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Local product save is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(LOCAL_WORKING_COPY_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_WORKING_COPY_STORE)) {
        db.createObjectStore(LOCAL_WORKING_COPY_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open local product save.'));
  });

const withWorkingCopyStore = async (mode, callback) => {
  const db = await openWorkingCopyDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LOCAL_WORKING_COPY_STORE, mode);
    const store = transaction.objectStore(LOCAL_WORKING_COPY_STORE);
    const result = callback(store);

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('Local product save failed.'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('Local product save was interrupted.'));
    };
  });
};

const saveProductWorkingCopy = (payload) =>
  withWorkingCopyStore('readwrite', store => {
    store.put({
      id: LOCAL_WORKING_COPY_ID,
      savedAt: Date.now(),
      ...payload,
    });
  });

const deleteProductWorkingCopy = () =>
  withWorkingCopyStore('readwrite', store => {
    store.delete(LOCAL_WORKING_COPY_ID);
  }).catch(() => {});

const loadProductWorkingCopy = () =>
  new Promise(async (resolve) => {
    try {
      const db = await openWorkingCopyDb();
      const transaction = db.transaction(LOCAL_WORKING_COPY_STORE, 'readonly');
      const store = transaction.objectStore(LOCAL_WORKING_COPY_STORE);
      const request = store.get(LOCAL_WORKING_COPY_ID);

      request.onsuccess = async () => {
        const record = request.result;
        db.close();
        if (!record) {
          resolve(null);
          return;
        }

        if (Date.now() - Number(record.savedAt || 0) > LOCAL_WORKING_COPY_TTL_MS) {
          await deleteProductWorkingCopy();
          resolve(null);
          return;
        }

        resolve(record);
      };

      request.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

const AddProduct = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const cameraFileInputRef = useRef();
  const digitalRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const cameraStreamRef = useRef(null);
  const imagesRef = useRef([]);
  const saveFeedbackTimerRef = useRef(null);

  const [activeStep, setActiveStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [images, setImages] = useState([]);
  const [digitalFile, setDigitalFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [aiLoading, setAiLoading] = useState('');
  const [localSaveMessage, setLocalSaveMessage] = useState('');
  const [localSaveState, setLocalSaveState] = useState('idle');
  const [localSaveFeedbackStep, setLocalSaveFeedbackStep] = useState(null);
  const [savedStepIds, setSavedStepIds] = useState(() => new Set());
  const [savedStepSignatures, setSavedStepSignatures] = useState({});
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [form, setForm] = useState(createDefaultForm);

  const currentStep = STEPS[activeStep];

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    let cancelled = false;

    const restoreWorkingCopy = async () => {
      const record = await loadProductWorkingCopy();
      if (cancelled) return;

      if (record?.form) {
        setForm({ ...createDefaultForm(), ...record.form });
        setActiveStep(Math.min(Number(record.activeStep || 0), STEPS.length - 1));
        setHighestStep(Math.min(Number(record.highestStep || record.activeStep || 0), STEPS.length - 1));

        const restoredImages = (record.imageFiles || [])
          .filter(isBlobLike)
          .slice(0, 8)
          .map(createPreviewImage);
        setImages(restoredImages);

        if (isBlobLike(record.digitalFile)) {
          setDigitalFile(record.digitalFile);
        }

        const completedSteps = record.completedSteps || getCompletedSteps(record.form, restoredImages, record.digitalFile);
        const stepSignatures = record.stepSignatures || getStepSignatures(record.form, restoredImages, record.digitalFile);
        setSavedStepIds(new Set(completedSteps));
        setSavedStepSignatures(stepSignatures);

        setLocalSaveMessage('Restored saved info from this device.');
      }
    };

    restoreWorkingCopy();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistWorkingCopy = useCallback(async () => {
    const previousRecord = await loadProductWorkingCopy();
    const savedForm = { ...createDefaultForm(), ...(previousRecord?.form || {}) };
    const currentStepId = currentStep.id;

    applyStepFormValues(savedForm, form, currentStepId);

    const savedImages = currentStepId === 'images'
      ? images.map(image => image.file).filter(isBlobLike)
      : (previousRecord?.imageFiles || []).filter(isBlobLike);
    const savedDigitalFile = currentStepId === 'details'
      ? (isBlobLike(digitalFile) ? digitalFile : null)
      : (isBlobLike(previousRecord?.digitalFile) ? previousRecord.digitalFile : null);

    if (!hasProductWorkingInput(savedForm, savedImages, savedDigitalFile)) {
      await deleteProductWorkingCopy();
      setSavedStepIds(new Set());
      setSavedStepSignatures({});
      setLocalSaveMessage('No product inputs to save.');
      return false;
    }

    const completedSteps = getCompletedSteps(savedForm, savedImages, savedDigitalFile);
    const stepSignatures = getStepSignatures(savedForm, savedImages, savedDigitalFile);

    await saveProductWorkingCopy({
      form: savedForm,
      activeStep,
      highestStep,
      imageFiles: savedImages,
      digitalFile: savedDigitalFile,
      completedSteps,
      stepSignatures,
    });

    setSavedStepIds(new Set(completedSteps));
    setSavedStepSignatures(stepSignatures);
    return true;
  }, [activeStep, currentStep.id, highestStep, form, images, digitalFile]);

  useEffect(() => () => {
    clearTimeout(saveFeedbackTimerRef.current);
    stopCamera();
    imagesRef.current.forEach(image => {
      if (image?.preview) URL.revokeObjectURL(image.preview);
    });
  }, [stopCamera]);

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

  const addImageFiles = (selectedFiles) => {
    const filesToReview = Array.from(selectedFiles || []);
    if (!filesToReview.length) return;

    const validFiles = filesToReview.filter(file => file.size <= MAX_PRODUCT_IMAGE_SIZE_BYTES);
    const remainingSlots = Math.max(0, 8 - images.length);
    const files = validFiles.slice(0, remainingSlots);
    const skippedCount = filesToReview.length - files.length;
    const newImages = files.map(createPreviewImage);

    setImages(prev => [...prev, ...newImages].slice(0, 8));
    if (skippedCount > 0) {
      setFieldMessage('images', `${skippedCount} image(s) were too large or exceeded the 8 image limit and were skipped.`);
    } else {
      clearFieldError('images');
    }
  };

  const handleImageSelect = (event) => {
    addImageFiles(event.target.files || []);
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

  const getCameraErrorMessage = (error) => {
    if (!error) return 'Unable to access camera.';
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Camera permission denied. Allow camera access and try again.';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera found on this device.';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'Camera is already in use by another app.';
    }
    if (error.name === 'SecurityError') {
      return 'Camera requires HTTPS, localhost, or the mobile app.';
    }
    return error.message || 'Unable to access camera.';
  };

  const openCamera = async () => {
    if (images.length >= 8) {
      setFieldMessage('images', 'You can upload up to 8 product images.');
      return;
    }

    setCameraOpen(true);
    setCameraLoading(true);
    setCameraError('');
    stopCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setCameraError(getCameraErrorMessage(error));
    } finally {
      setCameraLoading(false);
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
    setCameraLoading(false);
    setCameraError('');
  };

  const captureCameraImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is still starting. Please try again in a moment.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Could not capture the photo. Please try again.');
        return;
      }
      const photo = new File([blob], `product-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      addImageFiles([photo]);
      closeCamera();
    }, 'image/jpeg', 0.9);
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

	      await deleteProductWorkingCopy();
	      setSavedStepIds(new Set());
	      setSavedStepSignatures({});
	      setLocalSaveMessage('');
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

	  const handleLocalSave = async () => {
	    if (localSaveState === 'saving') return;
	    clearTimeout(saveFeedbackTimerRef.current);
	    setLocalSaveMessage('');
	    setLocalSaveFeedbackStep(activeStep);
	    setLocalSaveState('saving');

	    try {
	      const didSave = await persistWorkingCopy();
	      if (!didSave) {
	        setLocalSaveState('idle');
	        return;
	      }
	      setLocalSaveState('saved');
	      saveFeedbackTimerRef.current = setTimeout(() => {
	        setLocalSaveState('idle');
	        setLocalSaveFeedbackStep(null);
	      }, 2600);
	    } catch (error) {
	      setLocalSaveState('idle');
	      setLocalSaveMessage(error.message || 'Could not save on this device.');
	    }
	  };

	  const handleCancel = async () => {
	    const hasInputs = hasProductWorkingInput(form, images, digitalFile) || savedStepIds.size > 0;
	    if (hasInputs) {
	      setCancelModalOpen(true);
	      return;
	    }

	    await confirmCancel();
	  };

	  const confirmCancel = async () => {
	    images.forEach(image => {
	      if (image?.preview) URL.revokeObjectURL(image.preview);
	    });
	    setImages([]);
	    setDigitalFile(null);
	    setForm(createDefaultForm());
	    setActiveStep(0);
	    setHighestStep(0);
	    setSavedStepIds(new Set());
	    setSavedStepSignatures({});
	    setCancelModalOpen(false);
	    await deleteProductWorkingCopy();
	    navigate('/seller/dashboard');
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
	          <div className="aspect-square rounded-xl border-2 border-dashed border-[var(--border-color)] p-2 flex flex-col items-stretch justify-center gap-2 text-[var(--text-muted)]">
	            <button
	              type="button"
	              onClick={() => fileInputRef.current?.click()}
	              className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[var(--bg-secondary)] hover:text-violet-500 transition-colors"
	            >
	              <FaImage size={18} />
	              <span className="text-[10px] font-semibold">Upload</span>
	            </button>
	            <button
	              type="button"
	              onClick={openCamera}
	              className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[var(--bg-secondary)] hover:text-violet-500 transition-colors"
	            >
	              <FaCamera size={17} />
	              <span className="text-[10px] font-semibold">Camera</span>
	            </button>
	          </div>
	        )}
	      </div>
	      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
	      <input ref={cameraFileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
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

	  const currentStepSignatures = getStepSignatures(form, images, digitalFile);
	  const isSavedCompleteStep = (stepId) =>
	    stepId !== 'review' &&
	    savedStepIds.has(stepId) &&
	    savedStepSignatures[stepId] &&
	    savedStepSignatures[stepId] === currentStepSignatures[stepId];
	  const showLocalSaveSuccess = localSaveState === 'saved' && localSaveFeedbackStep === activeStep;
	  const isLocalSaving = localSaveState === 'saving' && localSaveFeedbackStep === activeStep;

	  return (
	    <div className="lekhon-seller-page lekhon-product-wizard min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="lekhon-seller-content max-w-4xl mx-auto space-y-6">
	        <div className="flex items-center justify-between">
	          <div>
	            <Link to="/seller/dashboard" className="text-xs text-[var(--text-muted)] hover:text-violet-500">Back to Seller Dashboard</Link>
	            <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">Add New Product</h1>
	          </div>
	          <Link
	            to="/help/article/add-and-save-product"
	            className="text-xs font-bold text-[var(--brand-primary)] no-underline"
	          >
	            How saving works
	          </Link>
	        </div>

	        {localSaveMessage && (
	          <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300">
	            {localSaveMessage}
	          </div>
	        )}

        <div className="lekhon-product-stepper rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
          <div className="flex flex-wrap gap-2">
	            {STEPS.map((step, index) => {
	              const stepHasError = hasStepError(step.id);
	              const stepSavedComplete = isSavedCompleteStep(step.id);
	              const stepClass = stepHasError
	                ? index === activeStep
	                  ? 'bg-red-600 text-white border-red-600'
	                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border-red-300 dark:border-red-700'
	                : stepSavedComplete
	                  ? index === activeStep
	                    ? 'bg-green-600 text-white border-green-600 shadow-sm shadow-green-500/20'
	                    : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
	                  : index === activeStep
	                    ? 'bg-violet-600 text-white border-violet-600'
	                    : index < activeStep
	                      ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-700'
	                      : 'border-[var(--border-color)] text-[var(--text-muted)]';

	              return (
	                <button
	                  key={step.id}
	                  type="button"
	                  onClick={() => {
	                    if (index <= highestStep) setActiveStep(index);
	                  }}
	                  disabled={index > highestStep}
	                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${stepClass} ${index > highestStep ? 'cursor-not-allowed opacity-60' : ''}`}
	                >
	                  {stepSavedComplete ? <FaCheck size={10} /> : <span>{index + 1}.</span>}
	                  {step.label}
	                </button>
	              );
	            })}
          </div>
        </div>

        {renderStep()}

	        <div className="lekhon-product-wizard-actions flex flex-col gap-3 pb-8 sm:flex-row sm:items-center sm:justify-between">
	          <div className="flex gap-2">
	            <button
	              type="button"
	              onClick={handleCancel}
	              disabled={saving}
	              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
	            >
	              <FaTimes /> Cancel
	            </button>
	            <button
	              type="button"
	              onClick={goPrev}
	              disabled={activeStep === 0 || saving}
	              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
	            >
	              <FaArrowLeft /> Previous
	            </button>
	          </div>

	          <div className="flex gap-2 sm:justify-end">
	            {activeStep < STEPS.length - 1 ? (
	              <>
		                <button
		                  type="button"
		                  onClick={handleLocalSave}
		                  disabled={saving || isLocalSaving}
		                  className="relative inline-flex flex-1 items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-60 sm:flex-none"
		                >
		                  {isLocalSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}
		                  {isLocalSaving ? 'Saving...' : 'Save'}
		                  {showLocalSaveSuccess && (
		                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-green-500 text-white shadow-sm shadow-green-500/40">
		                      <FaCheck size={10} />
		                    </span>
		                  )}
		                </button>
	                <button
	                  type="button"
	                  onClick={goNext}
	                  disabled={saving}
	                  className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 sm:flex-none"
	                >
	                  Next <FaArrowRight />
	                </button>
	              </>
	            ) : (
	              <>
	                <button
	                  type="button"
	                  onClick={() => handleSave('draft')}
	                  disabled={saving}
	                  className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 sm:flex-none"
	                >
	                  <FaSave /> {saving ? 'Saving...' : 'Save Draft'}
	                </button>
	                <button
	                  type="button"
	                  onClick={() => handleSave('active')}
	                  disabled={saving}
	                  className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 sm:flex-none"
	                >
	                  <FaRocket /> {uploadingFile ? 'Uploading file...' : saving ? 'Publishing...' : 'Publish'}
	                </button>
	              </>
	            )}
	          </div>
	        </div>
	      </div>

	      {cameraOpen && (
	        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
	          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl">
	            <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
	              <div>
	                <h2 className="font-semibold text-white">Take Product Photo</h2>
	                <p className="text-xs text-white/70">Capture a clear image for the product gallery.</p>
	              </div>
	              <button
	                type="button"
	                onClick={closeCamera}
	                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
	                aria-label="Close camera"
	              >
	                <FaTimes />
	              </button>
	            </div>

	            <div className="relative aspect-[3/4] max-h-[78vh] w-full bg-black sm:aspect-video">
	              {cameraLoading && (
	                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-sm text-white">
	                  Opening camera...
	                </div>
	              )}
	              {cameraError ? (
	                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
	                  <FaCamera size={34} className="opacity-70" />
	                  <p className="text-sm">{cameraError}</p>
	                  <button
	                    type="button"
	                    onClick={() => {
	                      closeCamera();
	                      cameraFileInputRef.current?.click();
	                    }}
	                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
	                  >
	                    Use device picker
	                  </button>
	                </div>
	              ) : (
	                <video
	                  ref={videoRef}
	                  autoPlay
	                  playsInline
	                  muted
	                  className="h-full w-full object-cover"
	                />
	              )}
	              <canvas ref={canvasRef} className="hidden" />
	            </div>

	            {!cameraError && (
	              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent p-5">
	                <button
	                  type="button"
	                  onClick={captureCameraImage}
	                  disabled={cameraLoading}
	                  className="grid h-16 w-16 place-items-center rounded-full border-4 border-white/70 bg-white text-black shadow-lg transition-transform hover:scale-105 disabled:opacity-60"
	                  aria-label="Capture product photo"
	                >
	                  <FaCamera size={24} />
	                </button>
	              </div>
	            )}
	          </div>
	        </div>
	      )}

	      {cancelModalOpen && (
	        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
	          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-[var(--bg-card)] p-5 shadow-2xl dark:border-red-900/60">
	            <div className="mb-4 flex items-start gap-3">
	              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
	                <FaTimes />
	              </div>
	              <div>
	                <h2 className="font-bold text-[var(--text-primary)]">Cancel this product?</h2>
	                <p className="mt-1 text-sm text-[var(--text-muted)]">
	                  This will close the add-product flow and delete the saved product information from this device.
	                </p>
	              </div>
	            </div>

	            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
	              <p className="font-semibold">What will happen:</p>
	              <ul className="mt-2 list-disc space-y-1 pl-4">
	                <li>Saved basic info, images, and other local inputs for this product will be removed.</li>
	                <li>Unsaved changes in the current section will not be recoverable.</li>
	                <li>Already published products or backend saved drafts are not affected.</li>
	              </ul>
	            </div>

	            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
	              <button
	                type="button"
	                onClick={() => setCancelModalOpen(false)}
	                className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
	              >
	                Keep Editing
	              </button>
	              <button
	                type="button"
	                onClick={confirmCancel}
	                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
	              >
	                Cancel and Delete Saved Info
	              </button>
	            </div>
	          </div>
	        </div>
	      )}
	    </div>
	  );
	};

export default AddProduct;
