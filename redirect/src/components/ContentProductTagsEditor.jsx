import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaChevronDown, FaExternalLinkAlt, FaTimes, FaUpload } from 'react-icons/fa';
import { MdStorefront } from 'react-icons/md';
import api from '../services/api';

const MAX_EXTERNAL_PRODUCT_IMAGE_BYTES = 3 * 1024 * 1024;

const ContentProductTagsEditor = ({
  linkedProducts,
  setLinkedProducts,
  externalProductLinks,
  setExternalProductLinks,
}) => {
  const [addMode, setAddMode] = useState('marketplace');
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [externalProductDraft, setExternalProductDraft] = useState({
    title: '',
    url: '',
    platform: 'Other',
    priceLabel: '',
  });
  const [externalImageFile, setExternalImageFile] = useState(null);
  const [externalImagePreview, setExternalImagePreview] = useState('');
  const [uploadingExternalImage, setUploadingExternalImage] = useState(false);

  const totalTags = linkedProducts.length + externalProductLinks.length;

  useEffect(() => () => {
    if (externalImagePreview?.startsWith('blob:')) URL.revokeObjectURL(externalImagePreview);
  }, [externalImagePreview]);

  const updateExternalDraft = (key, value) => {
    setExternalProductDraft(draft => ({ ...draft, [key]: value }));
  };

  const searchMarketplaceProducts = async (query) => {
    setProductSearch(query);
    if (!query.trim()) {
      setProductResults([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const { data } = await api.get('/marketplace', { params: { search: query, limit: 20 } });
      const selectedIds = new Set(linkedProducts.map(product => product._id));
      setProductResults((data.products || []).filter(product => !selectedIds.has(product._id)));
    } catch {
      setProductResults([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  const addLinkedProduct = (product) => {
    setLinkedProducts(current => (
      current.some(item => item._id === product._id) ? current : [...current, product]
    ));
    setProductSearch('');
    setProductResults([]);
  };

  const removeLinkedProduct = (productId) => {
    setLinkedProducts(current => current.filter(product => product._id !== productId));
  };

  const selectExternalImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_EXTERNAL_PRODUCT_IMAGE_BYTES) {
      toast.error('External product image must be 3MB or smaller.');
      event.target.value = '';
      return;
    }

    if (externalImagePreview?.startsWith('blob:')) URL.revokeObjectURL(externalImagePreview);
    setExternalImageFile(file);
    setExternalImagePreview(URL.createObjectURL(file));
    event.target.value = '';
  };

  const clearExternalImage = () => {
    if (externalImagePreview?.startsWith('blob:')) URL.revokeObjectURL(externalImagePreview);
    setExternalImageFile(null);
    setExternalImagePreview('');
  };

  const uploadExternalImage = async () => {
    const formData = new FormData();
    formData.append('image', externalImageFile);
    const { data } = await api.post('/blogs/upload-product-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  };

  const addExternalProductLink = async () => {
    const title = externalProductDraft.title.trim();
    const url = externalProductDraft.url.trim();
    if (!title || !url || !externalImageFile) {
      toast.error('External product title, URL, and image are required.');
      return;
    }

    setUploadingExternalImage(true);
    try {
      const image = await uploadExternalImage();
      setExternalProductLinks(current => [
        ...current,
        {
          title,
          url,
          platform: externalProductDraft.platform || 'Other',
          priceLabel: externalProductDraft.priceLabel.trim(),
          thumbnail: image.url || '',
          thumbnailPublicId: image.public_id || '',
          originalThumbnail: image.original_url || image.url || '',
          originalThumbnailPublicId: image.original_public_id || image.public_id || '',
          backgroundRemovalStatus: image.backgroundRemovalStatus || '',
        },
      ]);
      setExternalProductDraft({ title: '', url: '', platform: 'Other', priceLabel: '' });
      clearExternalImage();
      if (image.backgroundRemovalStatus === 'failed') {
        toast.success('External product added with original image.');
      } else {
        toast.success('External product added.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to upload external product image.');
    } finally {
      setUploadingExternalImage(false);
    }
  };

  return (
    <div className="border border-[var(--border-color)] rounded-xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
          <MdStorefront className="text-violet-500" size={16} />
          Product Tags
        </label>
        <div className="relative">
          <select
            value={addMode}
            onChange={event => setAddMode(event.target.value)}
            className="appearance-none pr-8 pl-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="marketplace">Marketplace product</option>
            <option value="external">External product</option>
          </select>
          <FaChevronDown size={10} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        </div>
      </div>

      {addMode === 'marketplace' && (
        <div className="space-y-2">
          <input
            value={productSearch}
            onChange={event => searchMarketplaceProducts(event.target.value)}
            placeholder="Search marketplace products..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {searchingProducts && <p className="text-xs text-[var(--text-muted)]">Searching...</p>}
          {productResults.map(product => (
            <button
              key={product._id}
              type="button"
              onClick={() => addLinkedProduct(product)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border-color)] hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors text-left"
            >
              <img src={product.transparentThumbnail || product.thumbnail || ''} alt="" className="w-10 h-10 rounded-lg object-cover bg-[var(--bg-secondary)] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{product.title}</p>
                <p className="text-xs text-[var(--text-muted)]">INR {product.price?.toLocaleString('en-IN')}</p>
              </div>
            </button>
          ))}
          {productSearch && productResults.length === 0 && !searchingProducts && (
            <p className="text-xs text-[var(--text-muted)]">No products match "{productSearch}"</p>
          )}
        </div>
      )}

      {addMode === 'external' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={externalProductDraft.title}
            onChange={event => updateExternalDraft('title', event.target.value)}
            placeholder="External product title"
            className="px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            value={externalProductDraft.url}
            onChange={event => updateExternalDraft('url', event.target.value)}
            placeholder="External or affiliate URL"
            className="px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <select
            value={externalProductDraft.platform}
            onChange={event => updateExternalDraft('platform', event.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {['Amazon', 'Flipkart', 'Etsy', 'Gumroad', 'Other'].map(platform => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
          <input
            value={externalProductDraft.priceLabel}
            onChange={event => updateExternalDraft('priceLabel', event.target.value)}
            placeholder="Price label"
            className="px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="md:col-span-2 rounded-xl border border-dashed border-[var(--border-color)] p-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] cursor-pointer hover:border-violet-400">
                <FaUpload size={12} />
                Product image
                <input type="file" accept="image/*" onChange={selectExternalImage} className="hidden" />
              </label>
              <span className="text-xs text-[var(--text-muted)]">Required, max 3MB. Background is removed after upload.</span>
            </div>
            {externalImagePreview && (
              <div className="mt-3 flex items-center gap-3">
                <img src={externalImagePreview} alt="" className="h-16 w-16 rounded-lg object-cover bg-[var(--bg-secondary)]" />
                <button type="button" onClick={clearExternalImage} className="text-xs text-red-500 hover:underline">
                  Remove image
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={addExternalProductLink}
            disabled={uploadingExternalImage}
            className="md:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50"
          >
            {uploadingExternalImage ? (
              'Uploading...'
            ) : (
              <>
                <FaExternalLinkAlt size={11} /> Add external product
              </>
            )}
          </button>
        </div>
      )}

      {linkedProducts.length > 0 && (
        <div className="space-y-2">
          {linkedProducts.map(product => (
            <div key={product._id} className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
              <img src={product.transparentThumbnail || product.thumbnail || ''} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{product.title}</p>
                <p className="text-xs text-violet-600 dark:text-violet-400">Marketplace product</p>
              </div>
              <button type="button" onClick={() => removeLinkedProduct(product._id)} className="text-[var(--text-muted)] hover:text-red-500">
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {externalProductLinks.length > 0 && (
        <div className="space-y-2">
          {externalProductLinks.map((link, index) => (
            <div key={`${link.url}-${index}`} className="flex items-center gap-3 p-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
              {link.thumbnail ? (
                <img src={link.thumbnail} alt="" className="h-10 w-10 rounded-lg object-cover bg-[var(--bg-secondary)] shrink-0" />
              ) : (
                <FaExternalLinkAlt className="text-orange-500 shrink-0" size={16} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{link.title}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{link.platform || 'External'} - {link.url}</p>
              </div>
              <button
                type="button"
                onClick={() => setExternalProductLinks(current => current.filter((_, itemIndex) => itemIndex !== index))}
                className="text-[var(--text-muted)] hover:text-red-500"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)]">{totalTags} product{totalTags === 1 ? '' : 's'} tagged.</p>
    </div>
  );
};

export default ContentProductTagsEditor;
