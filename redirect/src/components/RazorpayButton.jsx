import React, { useEffect, useRef, useState } from 'react';
import { FaChevronRight, FaLock } from 'react-icons/fa';
import api from '../services/api';

const SLIDE_KNOB_SIZE = 48;
const SLIDE_TRACK_PADDING = 5;
const SLIDE_COMPLETE_THRESHOLD = 0.86;

const RazorpayButton = ({
  items,
  shippingAddress,
  couponCode,
  onSuccess,
  onFailure,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [slideState, setSlideState] = useState({ progress: 0, offset: 0 });
  const sliderRef = useRef(null);
  const slideProgressRef = useRef(0);
  const activePointerRef = useRef(null);

  useEffect(() => {
    slideProgressRef.current = slideState.progress;
  }, [slideState.progress]);

  useEffect(() => {
    if (!loading) {
      activePointerRef.current = null;
      setSliding(false);
      setSlideState({ progress: 0, offset: 0 });
    }
  }, [loading]);

  const loadScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePay = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const loaded = await loadScript();
      if (!loaded) {
        onFailure && onFailure('Failed to load payment gateway. Check your internet connection.');
        setLoading(false);
        return;
      }

      const { data } = await api.post('/payments/create-order', {
        items: items.map(i => ({ productId: i.productId || i._id, qty: i.qty || 1 })),
        shippingAddress: shippingAddress || {},
        couponCode: couponCode || '',
        currency: 'INR',
      });

      if (data.free) {
        onSuccess && onSuccess(data.orderNumber, data.orderId);
        setLoading(false);
        return;
      }

      const options = {
        key: data.keyId || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'Lekhon Marketplace',
        description: 'Order Payment',
        order_id: data.razorpayOrderId,
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/payments/verify', {
              orderId: data.orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
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
          name: shippingAddress?.name || '',
          email: '',
          contact: shippingAddress?.phone || '',
        },
        theme: { color: '#c9a227' },
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

  const loadingClassName = 'w-full flex items-center justify-center py-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] font-semibold text-sm shadow-sm cursor-wait';

  const updateSlideFromPointer = (clientX) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const maxOffset = Math.max(rect.width - SLIDE_KNOB_SIZE - SLIDE_TRACK_PADDING * 2, 1);
    const nextOffset = Math.min(
      Math.max(clientX - rect.left - SLIDE_TRACK_PADDING - SLIDE_KNOB_SIZE / 2, 0),
      maxOffset
    );
    setSlideState({
      offset: nextOffset,
      progress: nextOffset / maxOffset,
    });
  };

  const startSlide = (event) => {
    if (disabled || loading || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const currentKnobRight = rect.left + SLIDE_TRACK_PADDING + slideState.offset + SLIDE_KNOB_SIZE + 10;
    if (event.clientX > currentKnobRight) return;

    event.preventDefault();
    activePointerRef.current = event.pointerId;
    setSliding(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateSlideFromPointer(event.clientX);
  };

  const moveSlide = (event) => {
    if (activePointerRef.current !== event.pointerId) return;
    updateSlideFromPointer(event.clientX);
  };

  const finishSlide = (event) => {
    if (activePointerRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    activePointerRef.current = null;
    setSliding(false);

    if (slideProgressRef.current >= SLIDE_COMPLETE_THRESHOLD) {
      setSlideState((current) => ({ ...current, progress: 1 }));
      handlePay();
      return;
    }

    setSlideState({ progress: 0, offset: 0 });
  };

  const cancelSlide = (event) => {
    if (activePointerRef.current === event.pointerId) {
      activePointerRef.current = null;
      setSliding(false);
      setSlideState({ progress: 0, offset: 0 });
    }
  };

  const confirmWithKeyboard = (event) => {
    if (disabled || loading) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setSlideState({ progress: 1, offset: 0 });
    handlePay();
  };

  if (loading) return (
    <button
      disabled
      className={loadingClassName}
      aria-busy={loading}
    >
      Complete the payment in Razorpay
    </button>
  );

  return (
    <div
      ref={sliderRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Slide to pay securely with Razorpay"
      className={`lekhon-slide-pay ${sliding ? 'lekhon-slide-pay--sliding' : ''} ${disabled ? 'lekhon-slide-pay--disabled' : ''}`}
      style={{
        '--slide-offset': `${slideState.offset}px`,
        '--slide-progress': `${slideState.progress}`,
      }}
      onPointerDown={startSlide}
      onPointerMove={moveSlide}
      onPointerUp={finishSlide}
      onPointerCancel={cancelSlide}
      onKeyDown={confirmWithKeyboard}
    >
      <span className="lekhon-slide-pay__fill" />
      <span className="lekhon-slide-pay__text">
        {slideState.progress >= 0.72 ? 'Release to pay' : 'Slide to pay with Razorpay'}
      </span>
      <span className="lekhon-slide-pay__knob">
        <FaLock size={14} />
        <FaChevronRight size={12} />
      </span>
    </div>
  );
};

export default RazorpayButton;
