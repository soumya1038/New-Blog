// ════════════════════════════════════════════════════════════════════
// CouponInput.jsx
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { FaTag, FaTimes } from 'react-icons/fa';
import api from '../services/api';

export const CouponInput = ({ cartTotal, onApply, onRemove, appliedCoupon }) => {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/coupons/validate', {
        code:      code.trim(),
        cartTotal,
      });
      onApply({ code: data.coupon.code, discount: data.discount, isFreeShipping: data.isFreeShipping });
      setCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid coupon');
    }
    setLoading(false);
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium">
          <FaTag size={12} />
          <span>{appliedCoupon.code}</span>
          {appliedCoupon.discount > 0 && (
            <span className="text-green-600 dark:text-green-300">
              -₹{appliedCoupon.discount.toLocaleString('en-IN')}
            </span>
          )}
          {appliedCoupon.isFreeShipping && (
            <span className="text-green-600 dark:text-green-300">Free Shipping</span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-green-600 dark:text-green-400 hover:text-red-500 transition-colors"
        >
          <FaTimes size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <FaTag size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
            placeholder="Enter coupon code"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500 uppercase"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
    </div>
  );
};
