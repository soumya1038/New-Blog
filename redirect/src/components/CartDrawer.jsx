import React, { useState, useEffect } from 'react';
import { Link }           from 'react-router-dom';
import { FaTimes, FaTrash, FaShoppingBag } from 'react-icons/fa';
import { HiMinus, HiPlus } from 'react-icons/hi';
import api                from '../services/api';

const CartDrawer = ({ open, onClose }) => {
  const [cart,    setCart]    = useState({ items: [], couponCode: '' });
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    try {
      const { data } = await api.get('/marketplace/cart');
      setCart(data.cart || { items: [], couponCode: '' });
    } catch {}
  };

  useEffect(() => { if (open) fetchCart(); }, [open]);

  const updateQty = async (productId, qty) => {
    setLoading(true);
    try {
      await api.patch('/marketplace/cart/update', { productId, qty });
      await fetchCart();
      window.dispatchEvent(new Event('cartUpdated'));
    } catch {}
    setLoading(false);
  };

  const remove = async (productId) => {
    setLoading(true);
    try {
      await api.delete(`/marketplace/cart/${productId}`);
      await fetchCart();
      window.dispatchEvent(new Event('cartUpdated'));
    } catch {}
    setLoading(false);
  };

  const subtotal = cart.items.reduce((sum, item) => {
    const price = item.productId?.price || item.priceSnapshot || 0;
    return sum + price * item.qty;
  }, 0);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col
          bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-color)]">
          <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FaShoppingBag className="text-violet-500" /> Cart
            <span className="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-full font-semibold">
              {cart.items.length}
            </span>
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]">
            <FaTimes size={16} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
              <span className="text-5xl">🛒</span>
              <p className="text-sm">Your cart is empty</p>
              <Link
                to="/marketplace"
                onClick={onClose}
                className="text-sm text-violet-600 hover:underline"
              >
                Browse Marketplace →
              </Link>
            </div>
          ) : (
            cart.items.map((item) => {
              const p     = item.productId || {};
              const price = p.price || item.priceSnapshot || 0;
              return (
                <div key={item._id || p._id} className="flex gap-3">
                  <img
                    src={p.thumbnail || item.thumbnailSnapshot || ''}
                    alt={p.title || item.titleSnapshot}
                    className="w-16 h-16 rounded-xl object-cover bg-[var(--bg-secondary)] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {p.title || item.titleSnapshot}
                    </p>
                    <p className="text-sm font-bold text-violet-600 mt-0.5">
                      ₹{price.toLocaleString('en-IN')}
                    </p>

                    {/* Qty controls — physical only */}
                    {p.type === 'physical' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          onClick={() => updateQty(p._id, item.qty - 1)}
                          disabled={loading || item.qty <= 1}
                          className="p-0.5 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] disabled:opacity-40"
                        >
                          <HiMinus size={12} />
                        </button>
                        <span className="text-sm w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateQty(p._id, item.qty + 1)}
                          disabled={loading}
                          className="p-0.5 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] disabled:opacity-40"
                        >
                          <HiPlus size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => remove(p._id)}
                    className="p-1.5 self-start text-[var(--text-muted)] hover:text-red-500 transition-colors"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <div className="px-4 py-4 border-t border-[var(--border-color)] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Subtotal</span>
              <span className="font-bold text-[var(--text-primary)]">
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>
            <Link
              to="/checkout"
              onClick={onClose}
              className="w-full block text-center py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors"
            >
              Proceed to Checkout →
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
