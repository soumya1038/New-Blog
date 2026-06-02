import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link }      from 'react-router-dom';
import { AuthContext }          from '../context/AuthContext';
import api                      from '../services/api';
import { FaDownload, FaTruck, FaCheckCircle, FaTimesCircle, FaBoxOpen, FaReceipt } from 'react-icons/fa';
import ReviewForm from '../components/ReviewForm';

const STATUS_STEPS  = ['paid', 'processing', 'shipped', 'delivered', 'completed'];
const STATUS_LABELS = {
  pending_payment: 'Pending Payment',
  paid:            'Payment Confirmed',
  processing:      'Processing',
  shipped:         'Shipped',
  delivered:       'Delivered',
  completed:       'Completed',
  failed:          'Payment Failed',
  refunded:        'Refunded',
  cancelled:       'Cancelled',
};

const OrderDetail = () => {
  const { id }    = useParams();
  const { user }  = useContext(AuthContext);
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [dlState, setDlState] = useState({});
  const [completing, setCompleting] = useState(false);
  const [reviewed, setReviewed] = useState({});

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
  const stepIdx  = STATUS_STEPS.indexOf(order.status);
  const isFailed = ['failed', 'refunded', 'cancelled'].includes(order.status);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link to={isSeller ? '/seller/dashboard' : '/profile'} className="text-xs text-[var(--text-muted)] hover:text-violet-500">
              ← {isSeller ? 'Seller Dashboard' : 'My Orders'}
            </Link>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mt-0.5">Order {order.orderNumber}</h1>
            <p className="text-xs text-[var(--text-muted)]">Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <span className={`self-start sm:self-center px-3 py-1.5 rounded-full text-xs font-semibold
            ${order.status === 'completed'        ? 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400'  : ''}
            ${order.status === 'shipped'           ? 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   : ''}
            ${'paid processing'.includes(order.status) ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' : ''}
            ${order.status === 'failed'            ? 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400'    : ''}
            ${order.status === 'refunded'          ? 'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400'   : ''}
            ${order.status === 'delivered'         ? 'bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400'   : ''}
          `}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>

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
                {completing ? 'Confirming…' : 'Confirm Delivery'}
              </button>
            )}
          </div>
        )}

        {/* ── Order items ───────────────────────────────────────────────────── */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <h2 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <FaBoxOpen className="text-violet-500" /> Items
          </h2>
          <div className="space-y-4">
            {order.items?.map((item, idx) => {
              const pid      = item.productId?._id || item.productId;
              const dl       = order.downloads?.find(d => (d.productId?._id || d.productId)?.toString() === pid?.toString());
              const maxDl    = item.productId?.digital?.maxDownloads || 5;
              const dlCount  = dl?.count || 0;
              const canDl    = isBuyer && item.type === 'digital' && ['paid', 'delivered', 'completed'].includes(order.status);
              const dlOver   = dlCount >= maxDl;

              return (
                <div key={idx} className="space-y-3">
                  <div className="flex gap-3 items-start">
                  <img
                    src={item.thumbnail || item.productId?.thumbnail || ''}
                    alt={item.title}
                    className="w-14 h-14 rounded-xl object-cover bg-[var(--bg-secondary)] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      ₹{item.price?.toLocaleString('en-IN')}
                      {item.qty > 1 ? ` × ${item.qty} = ₹${item.subtotal?.toLocaleString('en-IN')}` : ''}
                    </p>
                    <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium
                      ${item.type === 'digital'  ? 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   : ''}
                      ${item.type === 'physical' ? 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400'  : ''}
                      ${item.type === 'service'  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : ''}
                    `}>{item.type}</span>
                  </div>

                  {/* Download button (digital only) */}
                  {canDl && (
                    <div className="shrink-0 text-right">
                      <button
                        onClick={() => downloadFile(pid)}
                        disabled={dlState[pid] === 'loading' || dlOver}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors
                          ${dlOver
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed'
                            : 'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60'
                          }`}
                      >
                        <FaDownload size={10} />
                        {dlState[pid] === 'loading' ? 'Preparing…' : dlOver ? 'Limit reached' : 'Download'}
                      </button>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">{dlCount}/{maxDl} downloads used</p>
                    </div>
                  )}
                  </div>

                  {isBuyer &&
                   ['completed', 'delivered'].includes(order.status) &&
                   ['digital', 'service'].includes(item.type) &&
                   !reviewed[pid] && (
                    <ReviewForm
                      orderId={order._id}
                      productId={pid}
                      productTitle={item.title}
                      onSubmitted={() => setReviewed(r => ({ ...r, [pid]: true }))}
                    />
                  )}
                  {reviewed[pid] && (
                    <p className="text-xs text-green-600 dark:text-green-400 pt-2 border-t border-[var(--border-color)] flex items-center gap-1.5">
                      <FaCheckCircle size={12} /> Review submitted
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Delivery address (buyer view) ─────────────────────────────────── */}
        {isBuyer && order.shipping?.addressLine1 && (
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            <h2 className="font-bold text-[var(--text-primary)] mb-2">Delivery Address</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {order.shipping.name}<br />
              {order.shipping.addressLine1}{order.shipping.addressLine2 ? `, ${order.shipping.addressLine2}` : ''}<br />
              {order.shipping.city}, {order.shipping.state} — {order.shipping.pin}<br />
              {order.shipping.country}
            </p>
          </div>
        )}

        {/* ── Price breakdown ───────────────────────────────────────────────── */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <h2 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <FaReceipt className="text-violet-500" /> Payment Summary
          </h2>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Subtotal', value: `₹${(order.total + (order.couponDiscount || 0) - (order.shippingFee || 0)).toLocaleString('en-IN')}`, muted: true },
              order.couponDiscount > 0 && { label: `Coupon (${order.couponCode})`, value: `-₹${order.couponDiscount?.toLocaleString('en-IN')}`, green: true },
              order.shippingFee > 0    && { label: 'Shipping', value: `₹${order.shippingFee?.toLocaleString('en-IN')}`, muted: true },
            ].filter(Boolean).map((row, i) => (
              <div key={i} className={`flex justify-between ${row.green ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-secondary)]'}`}>
                <span>{row.label}</span><span>{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)] text-base">
              <span>Total Paid</span>
              <span>₹{order.total?.toLocaleString('en-IN')}</span>
            </div>
          </div>
          {order.payment?.razorpayPaymentId && (
            <p className="text-[10px] text-[var(--text-muted)] mt-2">
              Payment ID: <span className="font-mono">{order.payment.razorpayPaymentId}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
