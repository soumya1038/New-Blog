import React, { useState } from 'react';
import { FaLock } from 'react-icons/fa';
import api from '../services/api';

// Usage:
// <RazorpayButton
//   items={cartItems}
//   shippingAddress={address}
//   couponCode={coupon?.code}
//   onSuccess={(orderNumber, orderId) => navigate(`/order/${orderId}/success`)}
//   onFailure={(msg) => setError(msg)}
// />
const RazorpayButton = ({
  items,
  shippingAddress,
  couponCode,
  onSuccess,
  onFailure,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);

  const loadScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script   = document.createElement('script');
      script.src     = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload  = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePay = async () => {
    setLoading(true);
    try {
      const loaded = await loadScript();
      if (!loaded) {
        onFailure && onFailure('Failed to load payment gateway. Check your internet connection.');
        setLoading(false);
        return;
      }

      // 1. Create order on backend
      const { data } = await api.post('/payments/create-order', {
        items:           items.map(i => ({ productId: i.productId || i._id, qty: i.qty || 1 })),
        shippingAddress: shippingAddress || {},
        couponCode:      couponCode || '',
        currency:        'INR',
      });

      // 2. Free order — skip Razorpay
      if (data.free) {
        onSuccess && onSuccess(data.orderNumber, data.orderId);
        setLoading(false);
        return;
      }

      // 3. Open Razorpay modal
      const options = {
        key:         data.keyId || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount:      data.amount,
        currency:    data.currency || 'INR',
        name:        'Lekhon Marketplace',
        description: 'Order Payment',
        order_id:    data.razorpayOrderId,
        handler: async (response) => {
          try {
            // 4. Verify payment on backend
            const verifyRes = await api.post('/payments/verify', {
              orderId:            data.orderId,
              razorpay_order_id:  response.razorpay_order_id,
              razorpay_payment_id:response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              onSuccess && onSuccess(verifyRes.data.orderNumber, verifyRes.data.orderId);
            } else {
              onFailure && onFailure('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            onFailure && onFailure(err.response?.data?.message || 'Verification error');
          }
          setLoading(false);
        },
        prefill: {
          name:  shippingAddress?.name  || '',
          email: '',
          contact: shippingAddress?.phone || '',
        },
        theme:   { color: '#7c3aed' },
        modal: {
          ondismiss: () => {
            onFailure && onFailure('Payment cancelled.');
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        onFailure && onFailure(resp.error?.description || 'Payment failed');
        setLoading(false);
      });
      rzp.open();

    } catch (err) {
      onFailure && onFailure(err.response?.data?.message || 'Could not initiate payment');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading || disabled}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Processing…
        </>
      ) : (
        <>
          <FaLock size={13} />
          Pay Securely with Razorpay
        </>
      )}
    </button>
  );
};

export default RazorpayButton;
