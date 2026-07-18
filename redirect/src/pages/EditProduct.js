import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation }   from 'react-i18next';
import { AuthContext }      from '../context/AuthContext';
import api                  from '../services/api';
import { getSafeImageUrl }  from '../utils/safeMediaUrls';
import {
  FaUpload, FaTimes, FaImage, FaFilePdf,
  FaBoxOpen, FaCheckCircle, FaLink, FaWrench, FaSave,
} from 'react-icons/fa';

const CATEGORIES = [
  'Writing', 'Design', 'Photography', 'Music', 'Education',
  'Technology', 'Business', 'Art', 'Lifestyle', 'Other',
];

const inputCls  = "w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500 transition";
const sectionCls= "p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4";
const BADGE_OPTIONS = ['Bestseller', 'New', 'Limited Edition', 'Top Rated', 'Staff Pick'];
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

const getSafeProductImageUrl = (image) => {
  const preview = String(image?.preview || '');
  if (preview.startsWith('blob:')) return preview;
  return getSafeImageUrl(preview || image?.url);
};

const InputField = ({ label, required, children, hint }) => (
  <div>
    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
  </div>
);

const EditProduct = () => {
  const { id }    = useParams();
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();
  const fileRef   = useRef();
  const digitalRef= useRef();

  const [loadingProduct, setLoadingProduct] = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  const [images,         setImages]         = useState([]); // { url, file?, preview? }
  const [newDigitalFile, setNewDigitalFile] = useState(null);
  const [currentFile,    setCurrentFile]    = useState(''); // existing filename

  const [form, setForm] = useState({
    type: '', title: '', description: '', category: [], tags: '',
    price: '', compareAtPrice: '', currency: 'INR', isFree: false,
    seoTitle: '', seoDescription: '', status: 'draft', promoBanner: '',
    badges: [], faqs: [],
    maxDownloads: 5,
    stock: '', minimumOrderQuantity: 1, sku: '', weight: '', shippingFee: '', estimatedDeliveryDays: 7,
    shippingZones: ['India'],
    deliveryDays: 3, revisions: 1, includes: '', excludes: '',
    externalUrl: '', externalPlatform: 'Other',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Load existing product ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    api.get(`/seller/products/${id}`)
      .then(({ data }) => {
        // Try seller-specific endpoint first, fallback to public slug endpoint
        populateForm(data.product);
      })
      .catch(() => {
        // Fallback: fetch by querying seller products list
        api.get(`/marketplace/seller/products?limit=100`)
          .then(({ data }) => {
            const product = data.products?.find(p => p._id === id);
            if (product) populateForm(product);
            else navigate('/seller/dashboard');
          })
          .catch(() => navigate('/seller/dashboard'));
      })
      .finally(() => setLoadingProduct(false));
  }, [id, navigate]);

  const populateForm = (p) => {
    setForm({
      type:          p.type || '',
      title:         p.title || '',
      description:   p.description || '',
      category:      p.category || [],
      tags:          (p.tags || []).join(', '),
      price:         p.price?.toString() || '',
      compareAtPrice:p.compareAtPrice?.toString() || '',
      currency:      p.currency || 'INR',
      isFree:        p.isFree || false,
      seoTitle:      p.seoTitle || '',
      seoDescription:p.seoDescription || '',
      status:        p.status || 'draft',
      promoBanner:   p.decoration?.promoBanner || '',
      badges:        p.decoration?.badges || [],
      faqs:          p.decoration?.faqs || [],
      maxDownloads:  p.digital?.maxDownloads || 5,
      stock:         p.physical?.stock?.toString() || '',
      minimumOrderQuantity: p.physical?.minimumOrderQuantity?.toString() || '1',
      sku:           p.physical?.sku || '',
      weight:        p.physical?.weight?.toString() || '',
      shippingFee:   p.physical?.shippingFee?.toString() || '',
      estimatedDeliveryDays: p.physical?.estimatedDeliveryDays || 7,
      shippingZones: p.physical?.shippingZones || ['India'],
      deliveryDays:  p.service?.deliveryDays || 3,
      revisions:     p.service?.revisions || 1,
      includes:      (p.service?.includes || []).join('\n'),
      excludes:      (p.service?.excludes || []).join('\n'),
      externalUrl:   p.external?.url || '',
      externalPlatform: p.external?.platform || 'Other',
    });
    // Existing images
    if (p.images?.length) {
      setImages(p.images.map(url => ({ url, file: null, preview: url })));
    }
    // Show existing digital file info
    if (p.digital?.fileFormat) {
      setCurrentFile(`Current file: ${p.digital.fileFormat.toUpperCase()} (${p.digital.fileSize ? (p.digital.fileSize / 1024 / 1024).toFixed(1) + ' MB' : 'uploaded'})`);
    }
  };

  const toggleCategory = (cat) => {
    set('category', form.category.includes(cat)
      ? form.category.filter(c => c !== cat)
      : [...form.category, cat]
    );
  };

  const handleImageSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => file.size <= MAX_PRODUCT_IMAGE_SIZE_BYTES);
    const skippedCount = selectedFiles.length - validFiles.length;
    const files = validFiles.slice(0, 8 - images.length);
    const newImgs = files.map(f => ({ url: '', file: f, preview: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...newImgs].slice(0, 8));
    if (skippedCount > 0) setError(`${skippedCount} image(s) were larger than 4MB and skipped.`);
    e.target.value = '';
  };

  const removeImage = (idx) => {
    if (images[idx].preview && images[idx].file) URL.revokeObjectURL(images[idx].preview);
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const validate = () => {
    if (!form.title.trim()) return 'Product title is required.';
    if (!form.isFree && !form.price) return 'Price is required (or mark as free).';
    if (form.type === 'external' && !form.externalUrl.trim()) return 'External URL is required.';
    if (form.type === 'physical' && !form.stock) return 'Stock quantity is required.';
    return null;
  };

  const handleSave = async (publishStatus) => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError('');

    try {
      const fd = new FormData();
      fd.append('title',         form.title);
      fd.append('description',   form.description);
      fd.append('category',      JSON.stringify(form.category));
      fd.append('tags',          JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)));
      fd.append('price',         form.isFree ? '0' : form.price);
      fd.append('isFree',        form.isFree);
      fd.append('compareAtPrice',form.compareAtPrice || '');
      fd.append('currency',      form.currency);
      fd.append('status',        publishStatus);
      fd.append('seoTitle',      form.seoTitle || form.title);
      fd.append('seoDescription',form.seoDescription);
      fd.append('decoration',    JSON.stringify({ promoBanner: form.promoBanner, badges: form.badges, faqs: form.faqs }));

      if (form.type === 'digital')  fd.append('digital',  JSON.stringify({ maxDownloads: parseInt(form.maxDownloads) }));
      if (form.type === 'physical') fd.append('physical', JSON.stringify({
        stock: parseInt(form.stock), minimumOrderQuantity: parseInt(form.minimumOrderQuantity) || 1, sku: form.sku,
        weight: parseFloat(form.weight) || 0,
        shippingFee: parseFloat(form.shippingFee) || 0,
        estimatedDeliveryDays: parseInt(form.estimatedDeliveryDays),
        shippingZones: form.shippingZones,
      }));
      if (form.type === 'service')  fd.append('service', JSON.stringify({
        deliveryDays: parseInt(form.deliveryDays), revisions: parseInt(form.revisions),
        includes: form.includes.split('\n').filter(Boolean),
        excludes: form.excludes.split('\n').filter(Boolean),
      }));
      if (form.type === 'external') fd.append('external', JSON.stringify({
        url: form.externalUrl, platform: form.externalPlatform,
      }));

      // Only append NEW file images (those with file property)
      const newImages = images.filter(img => img.file);
      newImages.forEach(img => fd.append('images', img.file));

      fd.append('existingImages', JSON.stringify(images.filter(i => !i.file && i.url).map(i => i.url)));

      await api.put(`/marketplace/seller/products/${id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Upload new digital file if provided
      if (form.type === 'digital' && newDigitalFile) {
        const fileFd = new FormData();
        fileFd.append('file', newDigitalFile);
        await api.post(`/marketplace/seller/products/${id}/upload-file`, fileFd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate('/seller/dashboard', {
        state: { toast: publishStatus === 'active' ? 'Product updated & published!' : 'Changes saved.' },
      });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save. Please try again.');
    }
    setSaving(false);
  };

  if (loadingProduct) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="lekhon-seller-page lekhon-product-wizard min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="lekhon-seller-content max-w-3xl mx-auto space-y-6">

        <div>
          <Link to="/seller/dashboard" className="text-xs text-[var(--text-muted)] hover:text-violet-500">← Seller Dashboard</Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">Edit Product</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize">
            Type: {form.type} &nbsp;·&nbsp; Status:
            <span className={`ml-1 font-semibold ${form.status === 'active' ? 'text-green-500' : 'text-amber-500'}`}>
              {form.status}
            </span>
          </p>
        </div>

        {/* ── Basic Info ───────────────────────────────────────────────────── */}
        <div className={sectionCls}>
          <h2 className="font-bold text-[var(--text-primary)]">Basic Information</h2>
          <InputField label="Title" required>
            <input value={form.title} onChange={e => set('title', e.target.value)} maxLength={200} className={inputCls} />
          </InputField>
          <InputField label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} className={inputCls + ' resize-none'} />
          </InputField>
          <InputField label="Categories">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${form.category.includes(cat) ? 'bg-violet-600 text-white border-violet-600' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-violet-400'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </InputField>
          <InputField label="Tags" hint="Comma-separated">
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="writing, template, ebook" className={inputCls} />
          </InputField>
        </div>

        {/* ── Images ───────────────────────────────────────────────────────── */}
        <div className={sectionCls}>
          <h2 className="font-bold text-[var(--text-primary)]">Images</h2>
          <p className="text-xs text-[var(--text-muted)]">Existing images shown. Add new ones up to 4MB each or remove to update.</p>
          <div className="grid grid-cols-4 gap-3">
            {images.map((img, idx) => {
              const safeImage = getSafeProductImageUrl(img);
              return (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] group">
                  {safeImage ? (
                    <img src={safeImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-secondary)]">
                      <FaImage size={20} />
                    </div>
                  )}
                  {idx === 0 && <span className="absolute top-1 left-1 text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-semibold">Cover</span>}
                  <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <FaTimes size={8} />
                  </button>
                </div>
              );
            })}
            {images.length < 8 && (
              <button onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center gap-1.5 text-[var(--text-muted)] hover:border-violet-400 hover:text-violet-500 transition-colors">
                <FaImage size={20} /><span className="text-[10px]">Add</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
        </div>

        {/* ── Type-specific ─────────────────────────────────────────────────── */}
        {form.type === 'digital' && (
          <div className={sectionCls}>
            <h2 className="font-bold text-[var(--text-primary)]">Digital File</h2>
            {currentFile && <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5"><FaCheckCircle size={12} /> {currentFile}</p>}
            <InputField label="Replace File" hint="Leave blank to keep existing file">
              <div onClick={() => digitalRef.current?.click()} className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-5 text-center cursor-pointer hover:border-violet-400 transition-colors">
                {newDigitalFile
                  ? <p className="text-sm text-[var(--text-primary)]">{newDigitalFile.name} ({(newDigitalFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                  : <p className="text-sm text-[var(--text-muted)]"><FaUpload className="inline mr-1.5" /> Click to upload new file</p>
                }
              </div>
              <input ref={digitalRef} type="file" onChange={e => setNewDigitalFile(e.target.files[0])} className="hidden" />
            </InputField>
            <InputField label="Download Limit per Buyer">
              <input type="number" min="1" max="100" value={form.maxDownloads} onChange={e => set('maxDownloads', e.target.value)} className={inputCls + ' w-32'} />
            </InputField>
          </div>
        )}

        {form.type === 'physical' && (
          <div className={sectionCls}>
            <h2 className="font-bold text-[var(--text-primary)]">Physical Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Stock" required><input type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} className={inputCls} /></InputField>
              <InputField label="Minimum Order Quantity"><input type="number" min="1" value={form.minimumOrderQuantity} onChange={e => set('minimumOrderQuantity', e.target.value)} className={inputCls} /></InputField>
              <InputField label="SKU"><input value={form.sku} onChange={e => set('sku', e.target.value)} className={inputCls} /></InputField>
              <InputField label="Weight (g)"><input type="number" min="0" value={form.weight} onChange={e => set('weight', e.target.value)} className={inputCls} /></InputField>
              <InputField label="Shipping Fee (₹)"><input type="number" min="0" value={form.shippingFee} onChange={e => set('shippingFee', e.target.value)} className={inputCls} /></InputField>
              <InputField label="Delivery (days)"><input type="number" min="1" value={form.estimatedDeliveryDays} onChange={e => set('estimatedDeliveryDays', e.target.value)} className={inputCls} /></InputField>
            </div>
          </div>
        )}

        {form.type === 'service' && (
          <div className={sectionCls}>
            <h2 className="font-bold text-[var(--text-primary)]">Service Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Delivery (days)"><input type="number" min="1" value={form.deliveryDays} onChange={e => set('deliveryDays', e.target.value)} className={inputCls} /></InputField>
              <InputField label="Revisions"><input type="number" min="0" value={form.revisions} onChange={e => set('revisions', e.target.value)} className={inputCls} /></InputField>
            </div>
            <InputField label="What's Included" hint="One per line"><textarea rows={3} value={form.includes} onChange={e => set('includes', e.target.value)} className={inputCls + ' resize-none'} /></InputField>
            <InputField label="Not Included" hint="One per line"><textarea rows={2} value={form.excludes} onChange={e => set('excludes', e.target.value)} className={inputCls + ' resize-none'} /></InputField>
          </div>
        )}

        {form.type === 'external' && (
          <div className={sectionCls}>
            <h2 className="font-bold text-[var(--text-primary)]">External Link</h2>
            <InputField label="URL" required><input value={form.externalUrl} onChange={e => set('externalUrl', e.target.value)} className={inputCls} /></InputField>
            <InputField label="Platform">
              <select value={form.externalPlatform} onChange={e => set('externalPlatform', e.target.value)} className={inputCls}>
                {['Amazon', 'Etsy', 'Gumroad', 'Flipkart', 'Other'].map(p => <option key={p}>{p}</option>)}
              </select>
            </InputField>
          </div>
        )}

        {/* ── Pricing ───────────────────────────────────────────────────────── */}
        <div className={sectionCls}>
          <h2 className="font-bold text-[var(--text-primary)]">Pricing</h2>
          <label className="flex items-center gap-2.5 cursor-not-allowed opacity-75">
            <input type="checkbox" checked={form.isFree} disabled className="w-4 h-4 rounded" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">This is a free product</span>
          </label>
          <p className="text-xs text-[var(--text-muted)]">
            Selling price is locked during product edit. Use Seller Dashboard - Price Changes to request an admin-approved increase.
          </p>
          {!form.isFree && (
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Selling Price (₹)" required>
                <input type="number" min="0" value={form.price} disabled className={`${inputCls} cursor-not-allowed opacity-75`} />
              </InputField>
              <InputField label="MRP / Compare-at (₹)">
                <input type="number" min="0" value={form.compareAtPrice} onChange={e => set('compareAtPrice', e.target.value)} className={inputCls} />
              </InputField>
            </div>
          )}
        </div>

        {/* ── Marketing ─────────────────────────────────────────────────────── */}
        <div className={sectionCls}>
          <h2 className="font-bold text-[var(--text-primary)]">Marketing & SEO</h2>
          <InputField label="Promo Banner">
            <input value={form.promoBanner} onChange={e => set('promoBanner', e.target.value)} placeholder="Limited offer..." className={inputCls} />
          </InputField>
          <InputField label="Product Badges" hint="Help your product stand out in the marketplace listing">
            <div className="flex flex-wrap gap-2">
              {BADGE_OPTIONS.map(badge => {
                const selected = form.badges.includes(badge);
                return (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => {
                      const updated = selected
                        ? form.badges.filter(b => b !== badge)
                        : [...form.badges, badge];
                      set('badges', updated);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors
                      ${selected
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-amber-400'}`}
                  >
                    {badge}
                  </button>
                );
              })}
            </div>
          </InputField>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              FAQ <span className="text-xs font-normal text-[var(--text-muted)]">(shown as accordion on product page)</span>
            </label>
            {form.faqs.map((faq, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <div className="flex-1 space-y-1.5">
                  <input
                    value={faq.question}
                    onChange={e => {
                      const faqs = [...form.faqs];
                      faqs[idx] = { ...faqs[idx], question: e.target.value };
                      set('faqs', faqs);
                    }}
                    placeholder={`Question ${idx + 1}`}
                    className={inputCls}
                  />
                  <input
                    value={faq.answer}
                    onChange={e => {
                      const faqs = [...form.faqs];
                      faqs[idx] = { ...faqs[idx], answer: e.target.value };
                      set('faqs', faqs);
                    }}
                    placeholder="Answer"
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => set('faqs', form.faqs.filter((_, i) => i !== idx))}
                  className="px-2 text-[var(--text-muted)] hover:text-red-500 self-start mt-1"
                >
                  <FaTimes size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('faqs', [...form.faqs, { question: '', answer: '' }])}
              className="text-xs text-violet-600 hover:underline mt-1"
            >
              + Add FAQ
            </button>
          </div>

          <InputField label="SEO Title">
            <input value={form.seoTitle} onChange={e => set('seoTitle', e.target.value)} className={inputCls} />
          </InputField>
          <InputField label="SEO Description">
            <textarea rows={2} value={form.seoDescription} onChange={e => set('seoDescription', e.target.value)} maxLength={160} className={inputCls + ' resize-none'} />
          </InputField>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pb-8">
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="flex-1 py-3 rounded-xl border-2 border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : <><FaSave className="inline mr-2" size={12} /> Save Draft</>}
          </button>
          <button onClick={() => handleSave('active')} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            <FaSave className="inline mr-1.5" size={12} />
            {saving ? 'Updating…' : 'Update & Publish'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProduct;
