import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { FaBoxOpen, FaCheckCircle, FaShoppingBag } from 'react-icons/fa';

export const OrderSuccess = () => {
  const { id } = useParams();
  const location = useLocation();
  const orderNumber = location.state?.orderNumber || 'Your order';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-5 p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tag-bg)] text-[var(--brand-primary)]">
          <FaCheckCircle size={30} />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Order Confirmed</h1>
        <p className="text-[var(--text-muted)] text-sm">
          <strong className="text-[var(--text-primary)]">{orderNumber}</strong> has been placed successfully.
          A confirmation email is on its way.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link
            to={`/order/${id}`}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors"
          >
            <FaBoxOpen size={14} /> Track / View Order
          </Link>
          <Link
            to="/marketplace"
            className="py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
          <FaShoppingBag size={11} />
          Thank you for shopping with Lekhon Marketplace.
        </p>
      </div>
    </div>
  );
};

export default OrderSuccess;
