import React, { useState } from 'react';
import { FaCheckCircle, FaImage, FaStar, FaRegStar } from 'react-icons/fa';
import api from '../services/api';

// Usage in OrderDetail.js:
// <ReviewForm orderId={order._id} productId={item.productId?._id} productTitle={item.title} onSubmitted={() => refetch()} />

const ReviewForm = ({ orderId, productId, productTitle, productImage, onSubmitted }) => {
  const [rating,   setRating]   = useState(0);
  const [hovered,  setHovered]  = useState(0);
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [images,   setImages]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const handleSubmit = async () => {
    if (!rating) { setError('Please select a star rating.'); return; }
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('rating', rating);
      formData.append('title', title);
      formData.append('body', body);
      images.forEach(image => formData.append('images', image));
      await api.post(`/marketplace/${productId}/reviews`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDone(true);
      onSubmitted && onSubmitted();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit review.');
    }
    setLoading(false);
  };

  if (done) return (
    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium py-3">
      <FaCheckCircle size={14} /> Review submitted. Thank you!
    </div>
  );

  return (
    <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
      <div className="flex items-center gap-3">
        {productImage && (
          <img
            src={productImage}
            alt={productTitle}
            className="w-12 h-12 rounded-xl object-cover bg-[var(--bg-secondary)] border border-[var(--border-color)]"
            referrerPolicy="no-referrer"
          />
        )}
        <p className="text-sm font-semibold text-[var(--text-primary)] min-w-0">
          <span className="block">Write product review</span>
          <span className="block font-normal text-[var(--text-muted)] truncate">{productTitle}</span>
        </p>
      </div>

      {/* Star picker */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110"
          >
            {(hovered || rating) >= star
              ? <FaStar size={24} className="text-amber-400" />
              : <FaRegStar size={24} className="text-gray-300 dark:text-gray-600" />
            }
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-[var(--text-muted)] self-center">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </span>
        )}
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Review title (optional)"
        maxLength={100}
        className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
      />

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Share your experience with this product..."
        rows={3}
        maxLength={1000}
        className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
      />
      <p className="text-xs text-[var(--text-muted)] text-right -mt-2">{body.length}/1000</p>

      <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)] cursor-pointer hover:border-violet-400 transition-colors">
        <FaImage className="text-violet-500" />
        <span>{images.length ? `${images.length} image${images.length > 1 ? 's' : ''} selected` : 'Upload product images'}</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => setImages(Array.from(e.target.files || []).slice(0, 4))}
        />
      </label>
      {images.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {images.map(image => image.name).join(', ')}
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !rating}
        className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
};

export default ReviewForm;
