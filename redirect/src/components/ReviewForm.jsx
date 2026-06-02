import React, { useState } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import api from '../services/api';

// Usage in OrderDetail.js:
// <ReviewForm orderId={order._id} productId={item.productId?._id} productTitle={item.title} onSubmitted={() => refetch()} />

const ReviewForm = ({ orderId, productId, productTitle, onSubmitted }) => {
  const [rating,   setRating]   = useState(0);
  const [hovered,  setHovered]  = useState(0);
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const handleSubmit = async () => {
    if (!rating) { setError('Please select a star rating.'); return; }
    setLoading(true); setError('');
    try {
      await api.post(`/marketplace/${productId}/reviews`, {
        orderId, rating, title, body,
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
      ✅ Review submitted — thank you!
    </div>
  );

  return (
    <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        Review: <span className="font-normal text-[var(--text-muted)]">{productTitle}</span>
      </p>

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
        placeholder="Share your experience with this product…"
        rows={3}
        maxLength={1000}
        className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
      />
      <p className="text-xs text-[var(--text-muted)] text-right -mt-2">{body.length}/1000</p>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !rating}
        className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? 'Submitting…' : 'Submit Review'}
      </button>
    </div>
  );
};

export default ReviewForm;
