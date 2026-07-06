import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext }   from '../context/AuthContext';
import api               from '../services/api';
import { CouponInput }   from '../components/CouponInput';
import RazorpayButton    from '../components/RazorpayButton';
import { FaCheck, FaChevronDown, FaChevronUp, FaMapMarkerAlt, FaPlus, FaShieldAlt, FaShoppingBag, FaTrash } from 'react-icons/fa';
import { HiMinus, HiPlus } from 'react-icons/hi';

const FREE_SHIPPING_THRESHOLD = 1000;
const CART_QTY_SYNC_DELAY_MS = 2000;
const ORDER_CONFIRM_ANIMATION_MS = 10000;

const CheckoutConfirmationOverlay = () => (
  <div className="checkout-confirm-overlay" role="status" aria-live="polite" aria-label="Order placed">
    <div className="checkout-confirm-card">
      <div className="checkout-confirm-capsule" aria-hidden="true">
        <span className="checkout-confirm-default">Confirming Order</span>
        <span className="checkout-confirm-success">
          Order Placed
          <FaCheck size={8} />
        </span>
        <span className="checkout-confirm-box" />
        <span className="checkout-confirm-truck">
          <img src="/image/lekhon_url.png" alt="" className="checkout-confirm-truck__logo" />
          <span className="checkout-confirm-truck__back" />
          <span className="checkout-confirm-truck__front">
            <span className="checkout-confirm-truck__window" />
          </span>
          <span className="checkout-confirm-truck__light checkout-confirm-truck__light--top" />
          <span className="checkout-confirm-truck__light checkout-confirm-truck__light--bottom" />
        </span>
        <span className="checkout-confirm-lines" />
      </div>
    </div>
  </div>
);

const getCartItemProductId = (item) => {
  const product = item.productId;
  return String((product && typeof product === 'object' ? product._id : product) || '');
};

const Checkout = () => {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();
  const [cart,     setCart]     = useState({ items: [] });
  const [loading,  setLoading]  = useState(true);
  const [coupon,   setCoupon]   = useState(null);
  const [error,    setError]    = useState('');
  const [cartUpdating, setCartUpdating] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [address,  setAddress]  = useState({
    name: user?.name || '', phone: user?.phone || '',
    addressLine1: '', addressLine2: '', city: '', state: '', pin: '', country: 'India',
  });
  const [deliveryOpen, setDeliveryOpen] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const qtyTimersRef = useRef({});
  const confirmationTimerRef = useRef(null);

  const hasPhysical = cart.items.some(i => i.productId?.type === 'physical');
  const addressStorageKey = user?._id ? `lekhon_checkout_addresses_${user._id}` : '';

  useEffect(() => {
    if (!user) {
      setLoginPromptOpen(true);
      setLoading(false);
      return;
    }
    fetchCart()
      .finally(() => setLoading(false));
  }, [user, navigate]);

  useEffect(() => {
    if (!addressStorageKey) return;
    try {
      const parsed = JSON.parse(localStorage.getItem(addressStorageKey) || '[]');
      const nextAddresses = Array.isArray(parsed) ? parsed : [];
      setSavedAddresses(nextAddresses);
      if (nextAddresses.length > 0) {
        selectSavedAddress(nextAddresses[0], false);
        setShowAddressForm(false);
      } else {
        setSelectedAddressId('new');
        setShowAddressForm(true);
      }
    } catch {
      setSavedAddresses([]);
      setSelectedAddressId('new');
      setShowAddressForm(true);
    }
  }, [addressStorageKey]);

  useEffect(() => () => {
    Object.values(qtyTimersRef.current).forEach(clearTimeout);
    clearTimeout(confirmationTimerRef.current);
  }, []);

  const fetchCart = async () => {
    const { data } = await api.get('/marketplace/cart');
    setCart(data.cart || { items: [] });
  };

  const subtotal    = cart.items.reduce((s, i) => s + (i.productId?.price || i.priceSnapshot || 0) * i.qty, 0);
  const shippingFee = hasPhysical ? cart.items.filter(i => i.productId?.type === 'physical').reduce((s, i) => s + (i.productId?.physical?.shippingFee || 0), 0) : 0;
  const discount    = coupon?.discount || 0;
  const thresholdFreeShip = hasPhysical && subtotal >= FREE_SHIPPING_THRESHOLD;
  const freeShip    = coupon?.isFreeShipping || thresholdFreeShip;
  const finalShip   = freeShip ? 0 : shippingFee;
  const remainingForFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const amountBeforePlatformFee = Math.max(0, subtotal - discount + finalShip);
  const platformFee = amountBeforePlatformFee > 0
    ? parseFloat(process.env.REACT_APP_PLATFORM_TRANSACTION_FEE || '0')
    : 0;
  const total       = Math.max(0, amountBeforePlatformFee + platformFee);

  const setAddr = (k, v) => setAddress(a => ({ ...a, [k]: v }));

  function blankAddress() {
    return {
      name: user?.name || '',
      phone: user?.phone || '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pin: '',
      country: 'India',
    };
  }

  function normalizeSavedAddress(saved) {
    return {
      name: saved?.name || '',
      phone: saved?.phone || '',
      addressLine1: saved?.addressLine1 || '',
      addressLine2: saved?.addressLine2 || '',
      city: saved?.city || '',
      state: saved?.state || '',
      pin: saved?.pin || '',
      country: saved?.country || 'India',
    };
  }

  function selectSavedAddress(saved, closeForm = true) {
    setSelectedAddressId(saved.id);
    setAddress(normalizeSavedAddress(saved));
    if (closeForm) setShowAddressForm(false);
  }

  function startNewAddress() {
    setSelectedAddressId('new');
    setAddress(blankAddress());
    setShowAddressForm(true);
    setDeliveryOpen(true);
  }

  const addressComplete = !hasPhysical || ['name', 'phone', 'addressLine1', 'city', 'state', 'pin', 'country']
    .every(key => String(address[key] || '').trim());

  const persistAddresses = (addresses) => {
    setSavedAddresses(addresses);
    if (addressStorageKey) localStorage.setItem(addressStorageKey, JSON.stringify(addresses));
  };

  const saveCurrentAddress = () => {
    if (!addressComplete) {
      setError('Please complete the delivery address before saving it.');
      return;
    }
    setError('');
    const normalized = {
      id: Date.now().toString(),
      label: `${address.name || 'Saved address'} - ${address.city || address.pin}`,
      ...address,
    };
    const next = [
      normalized,
      ...savedAddresses.filter(saved => (
        saved.addressLine1 !== address.addressLine1 ||
        saved.pin !== address.pin ||
        saved.phone !== address.phone
      )),
    ].slice(0, 5);
    persistAddresses(next);
    setSelectedAddressId(normalized.id);
    setShowAddressForm(false);
  };

  const syncQty = async (productId, qty) => {
    if (!productId) return;
    setCartUpdating(productId);
    setError('');
    try {
      await api.patch('/marketplace/cart/update', { productId, qty });
      await fetchCart();
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update cart quantity.');
      await fetchCart();
    } finally {
      setCartUpdating('');
    }
  };

  const updateQty = (item, nextQty) => {
    const productId = getCartItemProductId(item);
    if (!productId) return;
    const normalizedQty = Math.max(parseInt(nextQty, 10) || 1, 1);
    setCoupon(null);
    setError('');
    setCart(current => ({
      ...current,
      items: current.items.map(cartItem => (
        getCartItemProductId(cartItem) === productId ? { ...cartItem, qty: normalizedQty } : cartItem
      )),
    }));

    clearTimeout(qtyTimersRef.current[productId]);
    qtyTimersRef.current[productId] = setTimeout(() => {
      syncQty(productId, normalizedQty);
    }, CART_QTY_SYNC_DELAY_MS);
  };

  const removeItem = async (item) => {
    const productId = getCartItemProductId(item);
    if (!productId) return;
    clearTimeout(qtyTimersRef.current[productId]);
    setCartUpdating(productId);
    setError('');
    try {
      await api.delete(`/marketplace/cart/${productId}`);
      setCoupon(null);
      await fetchCart();
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to remove item from cart.');
    }
    setCartUpdating('');
  };

  const cartItems = cart.items.map(i => ({
    productId: getCartItemProductId(i),
    qty:       i.qty,
  }));

  const handlePaymentSuccess = (orderNumber, orderId) => {
    clearTimeout(confirmationTimerRef.current);
    window.dispatchEvent(new Event('cartUpdated'));
    setConfirmingOrder({ orderNumber, orderId });
    confirmationTimerRef.current = setTimeout(() => {
      navigate(orderId ? `/order/${orderId}/success` : '/my-orders', { state: { orderNumber } });
    }, ORDER_CONFIRM_ANIMATION_MS);
  };

  if (!user && loginPromptOpen) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center shadow-2xl">
        <FaShoppingBag size={42} className="mx-auto text-violet-500" />
        <h1 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Login to proceed further</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Your cart is saved on this device. Log in to complete checkout securely.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="flex-1 rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
          >
            Back to cart
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">Loading...</div>;
  if (!cart.items.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <FaShoppingBag size={48} className="text-[var(--text-muted)] opacity-40" />
      <p className="text-[var(--text-muted)]">Your cart is empty</p>
      <button onClick={() => navigate('/marketplace')} className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-medium">Browse Marketplace</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h1 className="m-0 text-2xl font-bold text-[var(--text-primary)]">Checkout</h1>
          <Link
            to="/help/article/checkout-and-payment"
            className="text-xs font-bold text-[var(--brand-primary)] no-underline"
          >
            Payment and checkout help
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Address + Coupon ──────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            {hasPhysical && (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDeliveryOpen(open => !open)}
                  className="w-full flex items-center justify-between gap-3 p-5 text-left"
                >
                  <span>
                    <span className="block font-bold text-[var(--text-primary)]">Delivery Address</span>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      {addressComplete ? `${address.city || 'Address selected'}${address.pin ? ` - ${address.pin}` : ''}` : 'Choose or add an address'}
                    </span>
                  </span>
                  {deliveryOpen ? <FaChevronUp className="text-[var(--text-muted)]" /> : <FaChevronDown className="text-[var(--text-muted)]" />}
                </button>

                {deliveryOpen && (
                  <div className="px-5 pb-5 space-y-4">
                    {savedAddresses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Saved Addresses</p>
                        {savedAddresses.map(saved => (
                          <label
                            key={saved.id}
                            className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                              selectedAddressId === saved.id
                                ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20'
                                : 'border-[var(--border-color)] hover:border-violet-300 hover:bg-[var(--bg-secondary)]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="checkoutAddress"
                              checked={selectedAddressId === saved.id}
                              onChange={() => selectSavedAddress(saved)}
                              className="mt-1 accent-violet-600"
                            />
                            <span className="flex items-start gap-2 text-sm text-[var(--text-primary)] min-w-0">
                              <FaMapMarkerAlt className="mt-0.5 text-violet-500 shrink-0" />
                              <span className="min-w-0">
                                <span className="block font-medium truncate">{saved.label}</span>
                                <span className="block text-xs text-[var(--text-muted)] truncate">
                                  {saved.addressLine1}, {saved.city} - {saved.pin}
                                </span>
                              </span>
                            </span>
                          </label>
                        ))}
                        <button
                          type="button"
                          onClick={startNewAddress}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <FaPlus size={11} /> Add new address
                        </button>
                      </div>
                    )}

                    {(showAddressForm || savedAddresses.length === 0) && (
                      <div className="space-y-4">
                        {savedAddresses.length === 0 && (
                          <p className="text-xs text-[var(--text-muted)]">No saved addresses yet. Add one to continue.</p>
                        )}
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
                        <button
                          type="button"
                          onClick={saveCurrentAddress}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-color)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <FaMapMarkerAlt size={12} /> Save Address
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <h2 className="font-bold text-[var(--text-primary)] mb-3">Coupon Code</h2>
              <CouponInput
                cartTotal={subtotal}
                cartItems={cartItems}
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
                {cart.items.map(item => {
                  const product = item.productId || {};
                  const productId = getCartItemProductId(item);
                  const price = product.price || item.priceSnapshot || 0;
                  const isPhysical = product.type === 'physical';
                  const minQty = Math.max(parseInt(product.physical?.minimumOrderQuantity, 10) || 1, 1);
                  const maxQty = product.physical?.stock ?? 99;
                  const updating = cartUpdating === productId;
                  return (
                    <div key={item._id || productId} className="flex gap-2 items-center">
                      <img
                        src={product.thumbnail || item.thumbnailSnapshot || ''}
                        alt={product.title || item.titleSnapshot || "Cart item"}
                        className="w-10 h-10 rounded-lg object-cover bg-[var(--bg-secondary)] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {product.title || item.titleSnapshot}
                        </p>
                        {isPhysical ? (
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              type="button"
                              onClick={() => updateQty(item, item.qty - 1)}
                              disabled={updating || item.qty <= minQty}
                              className="p-0.5 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] disabled:opacity-40"
                              title="Decrease quantity"
                            >
                              <HiMinus size={12} />
                            </button>
                            <span className="text-xs w-5 text-center text-[var(--text-secondary)]">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(item, item.qty + 1)}
                              disabled={updating || item.qty >= maxQty}
                              className="p-0.5 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] disabled:opacity-40"
                              title="Increase quantity"
                            >
                              <HiPlus size={12} />
                            </button>
                            {minQty > 1 && <span className="text-[10px] text-[var(--text-muted)]">Min {minQty}</span>}
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">Qty {item.qty}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block text-xs font-semibold text-[var(--text-primary)]">
                          Rs. {(price * item.qty).toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          disabled={updating}
                          className="mt-1 inline-flex text-[var(--text-muted)] hover:text-red-500 disabled:opacity-40"
                          title="Remove item"
                        >
                          <FaTrash size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 pt-3 border-t border-[var(--border-color)] text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Coupon ({coupon.code})</span>
                    <span>-Rs. {discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {hasPhysical && (
                  <>
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Shipping</span>
                      <span>{freeShip ? <span className="text-green-500">Free</span> : `Rs. ${shippingFee.toLocaleString('en-IN')}`}</span>
                    </div>
                    {!freeShip && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Add Rs. {remainingForFreeShipping.toLocaleString('en-IN')} more out of Rs. {FREE_SHIPPING_THRESHOLD.toLocaleString('en-IN')} to be eligible for free shipping.
                      </p>
                    )}
                  </>
                )}
                {platformFee > 0 && (
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Platform fee</span>
                    <span>Rs. {platformFee.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]">
                  <span>Total</span>
                  <span>Rs. {total.toLocaleString('en-IN')}</span>
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
              disabled={!addressComplete || Boolean(confirmingOrder)}
              onSuccess={handlePaymentSuccess}
              onFailure={(msg) => setError(msg)}
            />
            {!addressComplete && (
              <p className="text-center text-xs text-red-500">
                Complete the delivery address to continue.
              </p>
            )}

            <p className="text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-1">
              <FaShieldAlt size={10} className="text-green-500" />
              Secured by Razorpay - 256-bit SSL encryption
            </p>
          </div>
        </div>
      </div>
      {confirmingOrder && <CheckoutConfirmationOverlay />}
    </div>
  );
};

export default Checkout;
