import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate }      from 'react-router-dom';
import { AuthContext }          from '../context/AuthContext';
import api                      from '../services/api';
import { FaChevronDown, FaChevronUp, FaCommentDots, FaDownload, FaRedo, FaStar, FaTrash, FaTruck, FaUndoAlt, FaCheckCircle, FaTimesCircle, FaBoxOpen, FaReceipt } from 'react-icons/fa';
import ReviewForm from '../components/ReviewForm';

const STATUS_STEPS  = ['paid', 'processing', 'shipped', 'delivered'];
const STATUS_LABELS = {
  pending_payment: 'Pending Payment',
  paid:            'Payment Confirmed',
  processing:      'Processing',
  shipped:         'Shipped',
  delivered:       'Delivered',
  completed:       'Delivered',
  failed:          'Payment Failed',
  refunded:        'Refunded',
  cancelled:       'Cancelled',
};

const OrderDetail = () => {
  const { id }    = useParams();
  const navigate   = useNavigate();
  const { user }  = useContext(AuthContext);
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [dlState, setDlState] = useState({});
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviewed, setReviewed] = useState({});
  const [reviewMode, setReviewMode] = useState(null);
  const [showDelivery, setShowDelivery] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [sellerFeedback, setSellerFeedback] = useState({
    rating: 0,
    arrivedOnTime: '',
    asDescribed: '',
    comments: '',
  });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(({ data }) => setOrder(data.order))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const downloadFile = async (productId) => {
    setDlState(s => ({ ...s, [productId]: 'loading' }));
    try {
      const { data } = await api.get(`/payments/orders/${id}/download/${productId}`);
      // Open signed URL in new tab — browser handles download
      window.open(data.url, '_blank', 'noopener,noreferrer');
      setDlState(s => ({ ...s, [productId]: 'done' }));
      // Re-fetch to update download count
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data.order);
    } catch (err) {
      alert(err.response?.data?.message || 'Download failed. Please try again.');
      setDlState(s => ({ ...s, [productId]: null }));
    }
  };

  const confirmDelivery = async () => {
    setCompleting(true);
    try {
      await api.patch(`/orders/${id}/complete`);
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data.order);
    } catch {}
    setCompleting(false);
  };

  const cancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? A refund will be initiated if payment was made.')) return;
    setCancelling(true);
    try {
      const { data } = await api.patch(`/orders/${id}/cancel`, {
        reason: 'Cancelled by buyer',
      });
      alert(data.message);
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data.order);
    } catch (e) {
      alert(e.response?.data?.message || 'Cancellation failed. Please contact support.');
    }
    setCancelling(false);
  };

  const deleteOrder = async () => {
    if (!window.confirm('Delete this cancelled order from your order history?')) return;
    setDeleting(true);
    try {
      await api.delete(`/orders/${id}`);
      navigate('/my-orders');
    } catch (e) {
      alert(e.response?.data?.message || 'Could not delete this order.');
      setDeleting(false);
    }
  };

  const buyAgain = async () => {
    try {
      await api.delete('/marketplace/cart');
      await Promise.all((order.items || []).map(item => {
        const productId = item.productId?._id || item.productId;
        if (!productId || item.type === 'external') return null;
        return api.post('/marketplace/cart/add', { productId, qty: item.qty || 1 });
      }).filter(Boolean));
      window.dispatchEvent(new Event('cartUpdated'));
      navigate('/checkout');
    } catch (e) {
      alert(e.response?.data?.message || 'Unable to add these items to your cart.');
    }
  };

  const submitSellerFeedback = () => {
    if (!sellerFeedback.rating || !sellerFeedback.arrivedOnTime || !sellerFeedback.asDescribed || !sellerFeedback.comments.trim()) {
      setFeedbackError('Please complete every seller feedback field.');
      return;
    }
    setFeedbackError('');
    setFeedbackSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[var(--text-muted)]">
        <FaTimesCircle size={48} className="text-red-400" />
        <p>Order not found.</p>
        <Link to="/marketplace" className="text-violet-600 hover:underline text-sm">Back to Marketplace</Link>
      </div>
    );
  }

  const buyerId  = order.buyerId?._id || order.buyerId;
  const isBuyer  = buyerId?.toString() === user?._id?.toString();
  const isSeller = order.items?.some(i => {
    const sid = i.sellerId?._id || i.sellerId;
    return sid?.toString() === user?._id?.toString();
  });
  const displayStatus = order.status === 'completed' ? 'delivered' : order.status;
  const stepIdx  = STATUS_STEPS.indexOf(displayStatus);
  const isFailed = ['failed', 'refunded', 'cancelled'].includes(order.status);
  const canReview = isBuyer && ['completed', 'delivered'].includes(order.status);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link to={isSeller ? '/seller/dashboard' : '/my-orders'} className="text-xs text-[var(--text-muted)] hover:text-violet-500">
              ← {isSeller ? 'Seller Dashboard' : 'My Orders'}
            </Link>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mt-0.5">Order {order.orderNumber}</h1>
            <p className="text-xs text-[var(--text-muted)]">Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <span className={`self-start sm:self-center px-3 py-1.5 rounded-full text-xs font-semibold
            ${displayStatus === 'shipped'          ? 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   : ''}
            ${'paid processing'.includes(displayStatus) ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' : ''}
            ${displayStatus === 'failed'           ? 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400'    : ''}
            ${displayStatus === 'refunded'         ? 'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400'   : ''}
            ${displayStatus === 'delivered'        ? 'bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400'   : ''}
          `}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>

        {isBuyer && (
          <div className="flex flex-wrap gap-2">
            {canReview && (
              <>
                <Link
                  to={`/help/article/resolve-an-order-delivery-or-return-problem?reference=${encodeURIComponent(order.orderNumber || order._id)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-color)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <FaUndoAlt size={13} /> Order help
                </Link>
                <button
                  type="button"
                  onClick={() => setReviewMode(mode => mode === 'product' ? null : 'product')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-900/20 dark:text-violet-300 text-sm font-medium transition-colors"
                >
                  <FaStar size={13} /> Review
                </button>
              </>
            )}
            <button
              type="button"
              onClick={buyAgain}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
            >
              <FaRedo size={13} /> Buy it again
            </button>
            {order.status === 'cancelled' && (
              <button
                type="button"
                onClick={deleteOrder}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/70 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-60"
              >
                <FaTrash size={13} /> {deleting ? 'Deleting...' : 'Delete order'}
              </button>
            )}
          </div>
        )}

        {/* ── Progress tracker ─────────────────────────────────────────────── */}
        {!isFailed && (
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            <div className="flex items-center">
              {STATUS_STEPS.map((s, i) => {
                const done   = stepIdx >= i;
                const active = stepIdx === i;
                return (
                  <React.Fragment key={s}>
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                        ${done   ? 'bg-violet-600 border-violet-600 text-white' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
                        {done ? <FaCheckCircle size={14} /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      <span className={`text-[10px] font-medium text-center max-w-[56px] leading-tight
                        ${active ? 'text-violet-600 dark:text-violet-400' : done ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                        {STATUS_LABELS[s]}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors ${stepIdx > i ? 'bg-violet-500' : 'bg-[var(--border-color)]'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Shipping info (if shipped) ────────────────────────────────────── */}
        {order.shipping?.trackingNumber && (
          <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/10">
            <h2 className="font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
              <FaTruck /> Shipping Details
            </h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Courier</p>
                <p className="font-medium text-[var(--text-primary)]">{order.shipping.courier}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Tracking Number</p>
                <p className="font-medium text-[var(--text-primary)] font-mono">{order.shipping.trackingNumber}</p>
              </div>
              {order.shipping.shippedAt && (
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Shipped on</p>
                  <p className="font-medium text-[var(--text-primary)]">{new Date(order.shipping.shippedAt).toLocaleDateString('en-IN')}</p>
                </div>
              )}
            </div>

            {/* Buyer: confirm delivery */}
            {isBuyer && order.status === 'shipped' && (
              <button
                onClick={confirmDelivery}
                disabled={completing}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                <FaCheckCircle size={13} />
                {completing ? 'Confirming...' : 'Confirm Delivery'}
              </button>
            )}
          </div>
        )}

        {/* ── Order items ───────────────────────────────────────────────────── */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <h2 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <FaBoxOpen className="text-violet-500" /> Items
          </h2>
          <div className="space-y-3">
            {order.items?.map((item, idx) => {
              const productPath = item.productId?.slug ? `/marketplace/${item.productId.slug}` : '/marketplace';
              return (
                <Link
                  key={idx}
                  to={productPath}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <img
                    src={item.thumbnail || item.productId?.thumbnail || ''}
                    alt={item.title}
                    className="w-14 h-14 rounded-xl object-cover bg-[var(--bg-secondary)] shrink-0 border border-[var(--border-color)]"
                  />
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate min-w-0">{item.title}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {canReview && (
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4">
            <div>
              <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FaCommentDots className="text-violet-500" /> How is your item?
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">Share a product review or seller feedback for this order.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReviewMode('product')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${reviewMode === 'product' ? 'bg-violet-600 text-white border-violet-600' : 'border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
              >
                  Write product review {reviewMode === 'product' ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
              </button>
              <button
                type="button"
                  onClick={() => setReviewMode(mode => mode === 'seller' ? null : 'seller')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${reviewMode === 'seller' ? 'bg-violet-600 text-white border-violet-600' : 'border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
              >
                  Leave seller feedback {reviewMode === 'seller' ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
              </button>
            </div>

            {reviewMode === 'product' && (
              <div className="space-y-4">
                {order.items?.map((item, idx) => {
                  const pid = item.productId?._id || item.productId;
                  if (reviewed[pid]) {
                    return (
                      <p key={idx} className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                        <FaCheckCircle size={12} /> Review submitted for {item.title}
                      </p>
                    );
                  }
                  return (
                    <ReviewForm
                      key={idx}
                      orderId={order._id}
                      productId={pid}
                      productTitle={item.title}
                      productImage={item.thumbnail || item.productId?.thumbnail || ''}
                      onSubmitted={() => setReviewed(r => ({ ...r, [pid]: true }))}
                    />
                  );
                })}
              </div>
            )}

            {reviewMode === 'seller' && (
              <div className="space-y-4 pt-3 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <img
                    src={order.items?.[0]?.thumbnail || order.items?.[0]?.productId?.thumbnail || ''}
                    alt={order.items?.[0]?.title || 'Order item'}
                    className="w-12 h-12 rounded-xl object-cover bg-[var(--bg-secondary)] border border-[var(--border-color)]"
                  />
                  <p className="min-w-0 text-sm font-semibold text-[var(--text-primary)]">
                    <span className="block">Leave seller feedback</span>
                    <span className="block font-normal text-[var(--text-muted)] truncate">{order.items?.[0]?.title}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSellerFeedback(f => ({ ...f, rating: star }))}
                      className="transition-transform hover:scale-110"
                    >
                      <FaStar size={24} className={sellerFeedback.rating >= star ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'} />
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-[var(--text-primary)]">Item arrived by estimated delivery date?</legend>
                    {['Yes', 'No'].map(value => (
                      <label key={value} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <input
                          type="radio"
                          name="arrivedOnTime"
                          value={value}
                          checked={sellerFeedback.arrivedOnTime === value}
                          onChange={e => setSellerFeedback(f => ({ ...f, arrivedOnTime: e.target.value }))}
                        />
                        {value}
                      </label>
                    ))}
                  </fieldset>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-[var(--text-primary)]">Item as described by seller?</legend>
                    {['Yes', 'No'].map(value => (
                      <label key={value} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <input
                          type="radio"
                          name="asDescribed"
                          value={value}
                          checked={sellerFeedback.asDescribed === value}
                          onChange={e => setSellerFeedback(f => ({ ...f, asDescribed: e.target.value }))}
                        />
                        {value}
                      </label>
                    ))}
                  </fieldset>
                </div>
                <textarea
                  value={sellerFeedback.comments}
                  onChange={e => setSellerFeedback(f => ({ ...f, comments: e.target.value }))}
                  placeholder="Comments"
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
                <p className="text-xs text-[var(--text-muted)] text-right -mt-3">{sellerFeedback.comments.length}/1000</p>
                {feedbackError && <p className="text-xs text-red-500">{feedbackError}</p>}
                {feedbackSubmitted && <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5"><FaCheckCircle size={12} /> Seller feedback submitted.</p>}
                <button
                  type="button"
                  onClick={submitSellerFeedback}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                >
                  Submit Seller Feedback
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Delivery address (buyer view) ─────────────────────────────────── */}
        {isBuyer && order.shipping?.addressLine1 && (
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            <button
              type="button"
              onClick={() => setShowDelivery(value => !value)}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <h2 className="font-bold text-[var(--text-primary)]">Delivery Address</h2>
              {showDelivery ? <FaChevronUp className="text-[var(--text-muted)]" /> : <FaChevronDown className="text-[var(--text-muted)]" />}
            </button>
            {showDelivery && (
              <p className="text-sm text-[var(--text-secondary)] mt-3">
                {order.shipping.name}<br />
                {order.shipping.addressLine1}{order.shipping.addressLine2 ? `, ${order.shipping.addressLine2}` : ''}<br />
                {order.shipping.city}, {order.shipping.state} - {order.shipping.pin}<br />
                {order.shipping.country}
              </p>
            )}
          </div>
        )}

        {/* ── Price breakdown ───────────────────────────────────────────────── */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={() => setShowPayment(value => !value)}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FaReceipt className="text-violet-500" /> Payment Summary
            </h2>
            {showPayment ? <FaChevronUp className="text-[var(--text-muted)]" /> : <FaChevronDown className="text-[var(--text-muted)]" />}
          </button>
          {showPayment && (
            <>
              <div className="space-y-2 text-sm mt-3">
                {[
                  { label: 'Subtotal', value: `Rs. ${(order.total + (order.couponDiscount || 0) - (order.shippingFee || 0)).toLocaleString('en-IN')}`, muted: true },
                  order.couponDiscount > 0 && { label: `Coupon (${order.couponCode})`, value: `-Rs. ${order.couponDiscount?.toLocaleString('en-IN')}`, green: true },
                  order.shippingFee > 0    && { label: 'Shipping', value: `Rs. ${order.shippingFee?.toLocaleString('en-IN')}`, muted: true },
                ].filter(Boolean).map((row, i) => (
                  <div key={i} className={`flex justify-between ${row.green ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-secondary)]'}`}>
                    <span>{row.label}</span><span>{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)] text-base">
                  <span>Total Paid</span>
                  <span>Rs. {order.total?.toLocaleString('en-IN')}</span>
                </div>
              </div>
              {isBuyer && ['pending_payment', 'paid', 'processing'].includes(order.status) && (
                <div className="pt-3 border-t border-[var(--border-color)] mt-3">
                  <button
                    onClick={cancelOrder}
                    disabled={cancelling}
                    className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    <FaTimesCircle size={13} />
                    {cancelling ? 'Cancelling...' : 'Cancel this order'}
                  </button>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Cancellation and refund available while order is being processed.
                  </p>
                </div>
              )}
              {order.payment?.razorpayPaymentId && (
                <p className="text-[10px] text-[var(--text-muted)] mt-2">
                  Payment ID: <span className="font-mono">{order.payment.razorpayPaymentId}</span>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
