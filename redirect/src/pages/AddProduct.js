import React, { useState, useContext, useRef } from 'react';
import { useNavigate, Link }  from 'react-router-dom';
import { useTranslation }     from 'react-i18next';
import { AuthContext }        from '../context/AuthContext';
import api                    from '../services/api';
import {
  FaUpload, FaPlus, FaTimes, FaImage,
  FaFilePdf, FaBoxOpen, FaLink, FaWrench,
} from 'react-icons/fa';

const CATEGORIES = [
  'Writing', 'Design', 'Photography', 'Music', 'Education',
  'Technology', 'Business', 'Art', 'Lifestyle', 'Other',
];

const TYPE_INFO = {
  digital:  { icon: FaFilePdf, label: 'Digital Product',   desc: 'eBook, template, design file, course…', color: 'border-blue-400   bg-blue-50   dark:bg-blue-900/20   text-blue-700   dark:text-blue-300'   },
  physical: { icon: FaBoxOpen, label: 'Physical Product',  desc: 'Book, merchandise, handmade item…',     color: 'border-green-400  bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-300'  },
  service:  { icon: FaWrench,  label: 'Service',           desc: 'Freelance writing, design, consulting…',color: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' },
  external: { icon: FaLink,   label: 'External Link',      desc: 'Amazon, Etsy, Gumroad listing…',        color: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' },
};

const InputField = ({ label, required, children, hint }) => (
  <div>
    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
  </div>
);

const inputCls = "w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500 transition";
const sectionCls = "p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4";
const BADGE_OPTIONS = ['Bestseller', 'New', 'Limited Edition', 'Top Rated', 'Staff Pick'];

const AddProduct = () => {
  const { t }       = useTranslation();
  const { user }    = useContext(AuthContext);
  const navigate    = useNavigate();
  const fileInputRef= useRef();
  const digitalRef  = useRef();

  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [images,   setImages]   = useState([]);    // { file, preview }
  const [digitalFile, setDigitalFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [createdId, setCreatedId] = useState(null);

  const [form, setForm] = useState({
    type:          '',
    title:         '',
    description:   '',
    category:      [],
    tags:          '',
    price:         '',
    compareAtPrice:'',
    currency:      'INR',
    isFree:        false,
    seoTitle:      '',
    seoDescription:'',
    status:        'draft',
    // decoration
    promoBanner:   '',
    badges:        [],
    faqs:          [],
    // digital
    maxDownloads:  5,
    // physical
    stock:         '',
    sku:           '',
    weight:        '',
    shippingFee:   '',
    estimatedDeliveryDays: 7,
    shippingZones: ['India'],
    // service
    deliveryDays:  3,
    revisions:     1,
    includes:      '',
    excludes:      '',
    // external
    externalUrl:   '',
    externalPlatform: 'Other',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCategory = (cat) => {
    const cats = form.category.includes(cat)
      ? form.category.filter(c => c !== cat)
      : [...form.category, cat];
    set('category', cats);
  };

  // Image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files).slice(0, 8 - images.length);
    const newImgs = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...newImgs].slice(0, 8));
  };

  const removeImage = (idx) => {
    URL.revokeObjectURL(images[idx].preview);
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDigitalFile = (e) => {
    const f = e.target.files[0];
    if (f) setDigitalFile(f);
  };

  const validate = () => {
    if (!form.type)  return 'Please select a product type.';
    if (!form.title.trim()) return 'Product title is required.';
    if (!form.isFree && !form.price) return 'Price is required (or mark as free).';
    if (form.type === 'external' && !form.externalUrl.trim()) return 'External URL is required.';
    if (form.type === 'physical' && !form.stock) return 'Stock quantity is required.';
    return null;
  };

  const handleSave = async (publishStatus) => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');

    try {
      // Build FormData for images
      const fd = new FormData();
      fd.append('type',         form.type);
      fd.append('title',        form.title);
      fd.append('description',  form.description);
      fd.append('category',     JSON.stringify(form.category));
      fd.append('tags',         JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)));
      fd.append('price',        form.isFree ? '0' : form.price);
      fd.append('isFree',       form.isFree);
      fd.append('currency',     form.currency);
      fd.append('status',       publishStatus);
      fd.append('seoTitle',     form.seoTitle || form.title);
      fd.append('seoDescription', form.seoDescription);
      fd.append('decoration',   JSON.stringify({ promoBanner: form.promoBanner, badges: form.badges, faqs: form.faqs }));
      if (form.compareAtPrice)  fd.append('compareAtPrice', form.compareAtPrice);

      // Type-specific fields
      if (form.type === 'digital') {
        fd.append('digital', JSON.stringify({ maxDownloads: parseInt(form.maxDownloads) }));
      }
      if (form.type === 'physical') {
        fd.append('physical', JSON.stringify({
          stock: parseInt(form.stock),
          sku: form.sku,
          weight: parseFloat(form.weight) || 0,
          shippingFee: parseFloat(form.shippingFee) || 0,
          estimatedDeliveryDays: parseInt(form.estimatedDeliveryDays),
          shippingZones: form.shippingZones,
        }));
      }
      if (form.type === 'service') {
        fd.append('service', JSON.stringify({
          deliveryDays: parseInt(form.deliveryDays),
          revisions: parseInt(form.revisions),
          includes: form.includes.split('\n').filter(Boolean),
          excludes: form.excludes.split('\n').filter(Boolean),
        }));
      }
      if (form.type === 'external') {
        fd.append('external', JSON.stringify({ url: form.externalUrl, platform: form.externalPlatform }));
      }

      images.forEach(img => fd.append('images', img.file));

      const { data } = await api.post('/marketplace/seller/products', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const productId = data.product._id;
      setCreatedId(productId);

      // Upload digital file separately if provided
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
        state: { toast: publishStatus === 'active' ? 'Product published!' : 'Draft saved.' }
      });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save product. Please try again.');
    } finally {
      setSaving(false);
      setUploadingFile(false);
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
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/seller/dashboard" className="text-xs text-[var(--text-muted)] hover:text-violet-500">← Seller Dashboard</Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">Add New Product</h1>
          </div>
        </div>

        {/* ── Step 1: Product Type ─────────────────────────────────────────── */}
        <div className={sectionCls}>
          <h2 className="font-bold text-[var(--text-primary)]">Product Type <span className="text-red-500">*</span></h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(TYPE_INFO).map(([key, info]) => {
              const Icon = info.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('type', key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center
                    ${form.type === key ? info.color + ' border-2' : 'border-[var(--border-color)] hover:border-violet-400 bg-[var(--bg-secondary)]'}`}
                >
                  <Icon size={22} />
                  <span className="text-xs font-semibold">{info.label}</span>
                  <span className="text-[10px] leading-tight opacity-70">{info.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {form.type && (
          <>
            {/* ── Step 2: Basic Info ─────────────────────────────────────── */}
            <div className={sectionCls}>
              <h2 className="font-bold text-[var(--text-primary)]">Basic Information</h2>

              <InputField label="Product Title" required>
                <input
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Give your product a clear, descriptive name"
                  maxLength={200}
                  className={inputCls}
                />
                <p className="text-xs text-[var(--text-muted)] text-right mt-0.5">{form.title.length}/200</p>
              </InputField>

              <InputField label="Description" hint="Markdown supported. Describe what buyers get.">
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={5}
                  placeholder="What's included? Who is it for? What problem does it solve?"
                  className={inputCls + ' resize-none'}
                />
              </InputField>

              <InputField label="Categories">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                        ${form.category.includes(cat)
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-violet-400'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </InputField>

              <InputField label="Tags" hint="Comma-separated. Helps buyers find your product.">
                <input
                  value={form.tags}
                  onChange={e => set('tags', e.target.value)}
                  placeholder="writing, template, hindi, blog, ebook"
                  className={inputCls}
                />
              </InputField>
            </div>

            {/* ── Step 3: Images ────────────────────────────────────────── */}
            <div className={sectionCls}>
              <h2 className="font-bold text-[var(--text-primary)]">Product Images</h2>
              <p className="text-xs text-[var(--text-muted)]">Up to 8 images. First image is the thumbnail.</p>

              <div className="grid grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] group">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-semibold">Cover</span>
                    )}
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FaTimes size={8} />
                    </button>
                  </div>
                ))}
                {images.length < 8 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center gap-1.5 text-[var(--text-muted)] hover:border-violet-400 hover:text-violet-500 transition-colors"
                  >
                    <FaImage size={20} />
                    <span className="text-[10px]">Add Image</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* ── Step 4: Type-specific fields ──────────────────────────── */}
            {form.type === 'digital' && (
              <div className={sectionCls}>
                <h2 className="font-bold text-[var(--text-primary)]">Digital File</h2>
                <InputField label="Upload File" hint="PDF, ZIP, MP4, EPUB, etc. Up to 500MB. Buyers download after payment.">
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
                        <p className="text-xs mt-0.5">Max 500MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={digitalRef} type="file" onChange={handleDigitalFile} className="hidden" />
                </InputField>
                <InputField label="Download Limit per Buyer" hint="How many times can each buyer download?">
                  <input type="number" min="1" max="100" value={form.maxDownloads} onChange={e => set('maxDownloads', e.target.value)} className={inputCls + ' w-32'} />
                </InputField>
              </div>
            )}

            {form.type === 'physical' && (
              <div className={sectionCls}>
                <h2 className="font-bold text-[var(--text-primary)]">Physical Product Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Stock Quantity" required>
                    <input type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="100" className={inputCls} />
                  </InputField>
                  <InputField label="SKU" hint="Optional product code">
                    <input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Auto-generated if blank" className={inputCls} />
                  </InputField>
                  <InputField label="Weight (grams)">
                    <input type="number" min="0" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="250" className={inputCls} />
                  </InputField>
                  <InputField label="Shipping Fee (₹)">
                    <input type="number" min="0" value={form.shippingFee} onChange={e => set('shippingFee', e.target.value)} placeholder="0 for free" className={inputCls} />
                  </InputField>
                  <InputField label="Estimated Delivery (days)">
                    <input type="number" min="1" value={form.estimatedDeliveryDays} onChange={e => set('estimatedDeliveryDays', e.target.value)} className={inputCls} />
                  </InputField>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Shipping Zones</label>
                  <div className="flex gap-3">
                    {['India', 'Worldwide'].map(zone => (
                      <label key={zone} className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={form.shippingZones.includes(zone)}
                          onChange={e => set('shippingZones', e.target.checked ? [...form.shippingZones, zone] : form.shippingZones.filter(z => z !== zone))}
                          className="rounded"
                        />
                        {zone}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {form.type === 'service' && (
              <div className={sectionCls}>
                <h2 className="font-bold text-[var(--text-primary)]">Service Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Delivery Time (days)" required>
                    <input type="number" min="1" value={form.deliveryDays} onChange={e => set('deliveryDays', e.target.value)} className={inputCls} />
                  </InputField>
                  <InputField label="Revisions Included">
                    <input type="number" min="0" value={form.revisions} onChange={e => set('revisions', e.target.value)} className={inputCls} />
                  </InputField>
                </div>
                <InputField label="What's Included" hint="One item per line">
                  <textarea rows={3} value={form.includes} onChange={e => set('includes', e.target.value)} placeholder={"Full article (1000 words)\nSEO optimization\n2 revisions"} className={inputCls + ' resize-none'} />
                </InputField>
                <InputField label="What's NOT Included" hint="One item per line">
                  <textarea rows={2} value={form.excludes} onChange={e => set('excludes', e.target.value)} placeholder={"Rush delivery\nImages or graphics"} className={inputCls + ' resize-none'} />
                </InputField>
              </div>
            )}

            {form.type === 'external' && (
              <div className={sectionCls}>
                <h2 className="font-bold text-[var(--text-primary)]">External Link</h2>
                <InputField label="Product URL" required hint="Full URL to your Amazon, Etsy, Gumroad, etc. listing">
                  <input value={form.externalUrl} onChange={e => set('externalUrl', e.target.value)} placeholder="https://amazon.in/dp/XXXXXXXXXX" className={inputCls} />
                </InputField>
                <InputField label="Platform">
                  <select value={form.externalPlatform} onChange={e => set('externalPlatform', e.target.value)} className={inputCls}>
                    {['Amazon', 'Etsy', 'Gumroad', 'Flipkart', 'Other'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </InputField>
              </div>
            )}

            {/* ── Step 5: Pricing ───────────────────────────────────────── */}
            <div className={sectionCls}>
              <h2 className="font-bold text-[var(--text-primary)]">Pricing</h2>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.isFree} onChange={e => set('isFree', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">This is a free product</span>
              </label>
              {!form.isFree && (
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Selling Price" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] font-medium">₹</span>
                      <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="499" className={inputCls + ' pl-7'} />
                    </div>
                  </InputField>
                  <InputField label="Compare-at Price (MRP)" hint="Shows as strikethrough">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] font-medium">₹</span>
                      <input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={e => set('compareAtPrice', e.target.value)} placeholder="999" className={inputCls + ' pl-7'} />
                    </div>
                  </InputField>
                </div>
              )}
            </div>

            {/* ── Step 6: Marketing ─────────────────────────────────────── */}
            <div className={sectionCls}>
              <h2 className="font-bold text-[var(--text-primary)]">Marketing & SEO <span className="text-xs font-normal text-[var(--text-muted)]">(optional)</span></h2>
              <InputField label="Promo Banner Text" hint="Shown as a highlighted banner on the product page">
                <input value={form.promoBanner} onChange={e => set('promoBanner', e.target.value)} placeholder="🔥 Launch offer — 40% off this week only!" className={inputCls} />
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
                <input value={form.seoTitle} onChange={e => set('seoTitle', e.target.value)} placeholder={form.title || 'Defaults to product title'} className={inputCls} />
              </InputField>
              <InputField label="SEO Description">
                <textarea rows={2} value={form.seoDescription} onChange={e => set('seoDescription', e.target.value)} placeholder="Brief description for search engines (160 chars)" maxLength={160} className={inputCls + ' resize-none'} />
              </InputField>
            </div>

            {/* ── Error + Actions ───────────────────────────────────────── */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pb-8">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex-1 py-3 rounded-xl border-2 border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : '💾 Save as Draft'}
              </button>
              <button
                onClick={() => handleSave('active')}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {uploadingFile ? 'Uploading file…' : saving ? 'Publishing…' : '🚀 Publish Product'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddProduct;
