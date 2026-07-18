import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTimes, FaTrash, FaShoppingBag } from 'react-icons/fa';
import { HiMinus, HiPlus } from 'react-icons/hi';
import api                from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { getGuestCart, removeGuestCartItem, updateGuestCartItem } from '../utils/guestCart';
import { getSafeImageUrl } from '../utils/safeMediaUrls';

const FREE_SHIPPING_THRESHOLD = 1000;
const CART_QTY_SYNC_DELAY_MS = 2000;

const getCartProductId = (item) => {
  const product = item.productId;
  return String((product && typeof product === 'object' ? product._id : product) || '');
};

const CartDrawer = ({ open, onClose }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cart,    setCart]    = useState({ items: [], couponCode: '' });
  const [loading, setLoading] = useState(false);
  const [syncingQty, setSyncingQty] = useState({});
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const qtyTimersRef = useRef({});

  const fetchCart = async () => {
    if (!user) {
      setCart(getGuestCart());
      return;
    }
    try {
      const { data } = await api.get('/marketplace/cart');
      setCart(data.cart || { items: [], couponCode: '' });
    } catch {}
  };

  useEffect(() => { if (open) fetchCart(); }, [open, user]);

  useEffect(() => () => {
    Object.values(qtyTimersRef.current).forEach(clearTimeout);
  }, []);

  const syncQty = async (productId, qty) => {
    setSyncingQty(current => ({ ...current, [productId]: true }));
    try {
      if (user) {
        await api.patch('/marketplace/cart/update', { productId, qty });
        await fetchCart();
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        setCart(updateGuestCartItem(productId, qty));
      }
    } catch {
      await fetchCart();
    } finally {
      setSyncingQty(current => ({ ...current, [productId]: false }));
    }
  };

  const updateQty = (productId, qty) => {
    const normalizedQty = Math.max(parseInt(qty, 10) || 1, 1);
    setCart(current => ({
      ...current,
      items: current.items.map(item => (
        getCartProductId(item) === String(productId) ? { ...item, qty: normalizedQty } : item
      )),
    }));

    clearTimeout(qtyTimersRef.current[productId]);
    qtyTimersRef.current[productId] = setTimeout(() => {
      syncQty(productId, normalizedQty);
    }, CART_QTY_SYNC_DELAY_MS);
  };

  const remove = async (productId) => {
    clearTimeout(qtyTimersRef.current[productId]);
    setLoading(true);
    try {
      if (user) {
        await api.delete(`/marketplace/cart/${productId}`);
        await fetchCart();
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        setCart(removeGuestCartItem(productId));
      }
    } catch {}
    setLoading(false);
  };

  const proceedToCheckout = () => {
    if (!user) {
      setLoginPromptOpen(true);
      return;
    }
    onClose();
    navigate('/checkout');
  };

  const subtotal = cart.items.reduce((sum, item) => {
    const price = item.productId?.price || item.priceSnapshot || 0;
    return sum + price * item.qty;
  }, 0);
  const hasPhysical = cart.items.some(item => item.productId?.type === 'physical');
  const remainingForFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);

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
          bg-white dark:bg-gray-950 border-l border-[var(--border-color)] shadow-2xl
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
              <FaShoppingBag size={44} className="opacity-30" />
              <p className="text-sm">Your cart is empty</p>
              <Link
                to="/marketplace"
                onClick={onClose}
                className="text-sm text-violet-600 hover:underline"
              >
                Browse Marketplace
              </Link>
            </div>
          ) : (
            cart.items.map((item) => {
              const p     = item.productId || {};
              const price = p.price || item.priceSnapshot || 0;
              const productId = p._id || getCartProductId(item);
              const minQty = Math.max(parseInt(p.physical?.minimumOrderQuantity, 10) || 1, 1);
              const maxQty = p.physical?.stock ?? 99;
              const itemTotal = price * item.qty;
              const qtySyncing = Boolean(syncingQty[productId]);
              const safeThumbnail = getSafeImageUrl(p.thumbnail || item.thumbnailSnapshot);
              return (
                <div key={item._id || p._id} className="flex gap-3">
                  <img
                    src={safeThumbnail || '/image/lekhon_url.png'}
                    alt={p.title || item.titleSnapshot}
                    className="w-16 h-16 rounded-xl object-cover bg-[var(--bg-secondary)] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {p.title || item.titleSnapshot}
                    </p>
                    <p className="text-sm font-bold text-violet-600 mt-0.5">
                      Rs. {price.toLocaleString('en-IN')}
                    </p>

                    {/* Qty controls - physical only */}
                    {p.type === 'physical' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          onClick={() => updateQty(productId, item.qty - 1)}
                          disabled={qtySyncing || item.qty <= minQty}
                          className="p-0.5 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] disabled:opacity-40"
                        >
                          <HiMinus size={12} />
                        </button>
                        <span className="text-sm w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateQty(productId, item.qty + 1)}
                          disabled={qtySyncing || item.qty >= maxQty}
                          className="p-0.5 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] disabled:opacity-40"
                        >
                          <HiPlus size={12} />
                        </button>
                        {minQty > 1 && <span className="text-[10px] text-[var(--text-muted)]">Min {minQty}</span>}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      Rs. {itemTotal.toLocaleString('en-IN')}
                    </p>
                    <button
                      onClick={() => remove(productId)}
                      disabled={loading}
                      className="mt-1 inline-flex p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
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
                Rs. {subtotal.toLocaleString('en-IN')}
              </span>
            </div>
            {hasPhysical && (
              <p className={`text-xs ${remainingForFreeShipping > 0 ? 'text-[var(--text-muted)]' : 'text-green-600 dark:text-green-400'}`}>
                {remainingForFreeShipping > 0
                  ? `Add Rs. ${remainingForFreeShipping.toLocaleString('en-IN')} more out of Rs. ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-IN')} to be eligible for free shipping.`
                  : 'Eligible for free shipping.'}
              </p>
            )}
            <button
              type="button"
              onClick={proceedToCheckout}
              className="w-full block text-center py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
      {loginPromptOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-center shadow-2xl">
            <FaShoppingBag size={34} className="mx-auto text-violet-500" />
            <h3 className="mt-3 text-lg font-bold text-[var(--text-primary)]">Login to proceed further</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Your cart is saved on this device. Log in to place the order securely.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setLoginPromptOpen(false)}
                className="flex-1 rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              >
                Continue shopping
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginPromptOpen(false);
                  onClose();
                  navigate('/login');
                }}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CartDrawer;
