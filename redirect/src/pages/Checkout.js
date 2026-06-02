import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext }   from '../context/AuthContext';
import api               from '../services/api';
import { CouponInput }   from '../components/CouponInput';
import RazorpayButton    from '../components/RazorpayButton';
import { FaShieldAlt }   from 'react-icons/fa';

const Checkout = () => {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();
  const [cart,     setCart]     = useState({ items: [] });
  const [loading,  setLoading]  = useState(true);
  const [coupon,   setCoupon]   = useState(null);
  const [error,    setError]    = useState('');
  const [address,  setAddress]  = useState({
    name: user?.name || '', phone: user?.phone || '',
    addressLine1: '', addressLine2: '', city: '', state: '', pin: '', country: 'India',
  });

  const hasPhysical = cart.items.some(i => i.productId?.type === 'physical');

  useEffect(() => {
    if (!user) return navigate('/login');
    api.get('/marketplace/cart')
      .then(({ data }) => setCart(data.cart || { items: [] }))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const subtotal    = cart.items.reduce((s, i) => s + (i.productId?.price || i.priceSnapshot || 0) * i.qty, 0);
  const shippingFee = hasPhysical ? cart.items.filter(i => i.productId?.type === 'physical').reduce((s, i) => s + (i.productId?.physical?.shippingFee || 0), 0) : 0;
  const discount    = coupon?.discount || 0;
  const freeShip    = coupon?.isFreeShipping;
  const finalShip   = freeShip ? 0 : shippingFee;
  const amountBeforePlatformFee = Math.max(0, subtotal - discount + finalShip);
  const platformFee = amountBeforePlatformFee > 0
    ? parseFloat(process.env.REACT_APP_PLATFORM_TRANSACTION_FEE || '0')
    : 0;
  const total       = Math.max(0, amountBeforePlatformFee + platformFee);

  const setAddr = (k, v) => setAddress(a => ({ ...a, [k]: v }));

  const cartItems = cart.items.map(i => ({
    productId: i.productId?._id || i.productId,
    qty:       i.qty,
  }));

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">Loading…</div>;
  if (!cart.items.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <span className="text-5xl">🛒</span>
      <p className="text-[var(--text-muted)]">Your cart is empty</p>
      <button onClick={() => navigate('/marketplace')} className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-medium">Browse Marketplace</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Checkout</h1>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Address + Coupon ──────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            {hasPhysical && (
              <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                <h2 className="font-bold text-[var(--text-primary)] mb-4">Delivery Address</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { k: 'name',         label: 'Full Name',       span: 1 },
                    { k: 'phone',        label: 'Phone',           span: 1 },
                    { k: 'addressLine1', label: 'Address Line 1',  span: 2 },
                    { k: 'addressLine2', label: 'Address Line 2 (optional)', span: 2 },
                    { k: 'city',         label: 'City',            span: 1 },
                    { k: 'state',        label: 'State',           span: 1 },
                    { k: 'pin',          label: 'PIN Code',        span: 1 },
                    { k: 'country',      label: 'Country',         span: 1 },
                  ].map(f => (
                    <div key={f.k} className={f.span === 2 ? 'col-span-2' : ''}>
                      <label className="block text-xs text-[var(--text-muted)] mb-1">{f.label}</label>
                      <input
                        value={address[f.k]}
                        onChange={e => setAddr(f.k, e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <h2 className="font-bold text-[var(--text-primary)] mb-3">Coupon Code</h2>
              <CouponInput
                cartTotal={subtotal}
                appliedCoupon={coupon}
                onApply={setCoupon}
                onRemove={() => setCoupon(null)}
              />
            </div>
          </div>

          {/* ── Right: Order summary + Pay ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <h2 className="font-bold text-[var(--text-primary)] mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4">
                {cart.items.map(item => (
                  <div key={item._id} className="flex gap-2 items-center">
                    <img
                      src={item.productId?.thumbnail || item.thumbnailSnapshot}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-[var(--bg-secondary)] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {item.productId?.title || item.titleSnapshot}
                      </p>
                      {item.qty > 1 && <p className="text-xs text-[var(--text-muted)]">×{item.qty}</p>}
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] shrink-0">
                      ₹{((item.productId?.price || item.priceSnapshot) * item.qty).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-[var(--border-color)] text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Coupon ({coupon.code})</span>
                    <span>-₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {hasPhysical && (
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Shipping</span>
                    <span>{freeShip ? <span className="text-green-500">Free</span> : `₹${shippingFee.toLocaleString('en-IN')}`}</span>
                  </div>
                )}
                {platformFee > 0 && (
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Platform fee</span>
                    <span>â‚¹{platformFee.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]">
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-sm">
                {error}
              </div>
            )}

            <RazorpayButton
              items={cartItems}
              shippingAddress={hasPhysical ? address : {}}
              couponCode={coupon?.code}
              onSuccess={(orderNumber, orderId) => {
                window.dispatchEvent(new Event('cartUpdated'));
                navigate(`/order/${orderId}/success`, { state: { orderNumber } });
              }}
              onFailure={(msg) => setError(msg)}
            />

            <p className="text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-1">
              <FaShieldAlt size={10} className="text-green-500" />
              Secured by Razorpay — 256-bit SSL encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
