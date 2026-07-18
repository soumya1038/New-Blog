import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate }    from 'react-router-dom';
import { AuthContext }          from '../context/AuthContext';
import api                      from '../services/api';
import { getSafeHttpUrl, getSafeImageUrl } from '../utils/safeMediaUrls';
import { FaBoxOpen, FaDownload, FaImage, FaRedo, FaSearch, FaStar, FaTag, FaTrash, FaTruck, FaUndoAlt } from 'react-icons/fa';

const STATUS_CONFIG = {
  pending_payment: { label: 'Pending Payment', color: 'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400'   },
  paid:            { label: 'Confirmed',        color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  processing:      { label: 'Processing',       color: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   },
  shipped:         { label: 'Shipped',          color: 'bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400'   },
  delivered:       { label: 'Delivered',        color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400'  },
  completed:       { label: 'Delivered',        color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400'  },
  failed:          { label: 'Failed',           color: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400'    },
  refunded:        { label: 'Refunded',         color: 'bg-gray-100   text-gray-500   dark:bg-gray-800      dark:text-gray-400'   },
};

const TABS = [
  { key: 'all',       label: 'All Orders'  },
  { key: 'paid',      label: 'Active'      },
  { key: 'completed', label: 'Delivered'   },
  { key: 'failed',    label: 'Failed'      },
];

const MyOrders = () => {
  const { user }    = useContext(AuthContext);
  const navigate    = useNavigate();
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('all');
  const [search,   setSearch]   = useState('');
  const [dlState,  setDlState]  = useState({});
  const [orderAction, setOrderAction] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/orders')
      .then(({ data }) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const filtered = orders.filter(o => {
    const matchTab = tab === 'all' || o.status === tab ||
      (tab === 'paid' && ['paid', 'processing', 'shipped', 'delivered'].includes(o.status));
    const matchSearch = !search ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.items?.some(i => i.title?.toLowerCase().includes(search.toLowerCase()));
    return matchTab && matchSearch;
  });

  const downloadFile = async (orderId, productId) => {
    const key = `${orderId}_${productId}`;
    setDlState(s => ({ ...s, [key]: 'loading' }));
    try {
      const { data } = await api.get(`/payments/orders/${orderId}/download/${productId}`);
      const safeDownloadUrl = getSafeHttpUrl(data?.url);
      if (!safeDownloadUrl) {
        throw new Error('Download link was rejected. Please try again.');
      }
      window.open(safeDownloadUrl, '_blank', 'noopener,noreferrer');
      setDlState(s => ({ ...s, [key]: 'done' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Download failed. Please try again.');
      setDlState(s => ({ ...s, [key]: null }));
    }
  };

  const deleteOrder = async (order) => {
    if (!window.confirm('Delete this failed order?')) return;
    setOrderAction(order._id);
    try {
      await api.delete(`/orders/${order._id}`);
      setOrders(list => list.filter(o => o._id !== order._id));
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete this order.');
    }
    setOrderAction('');
  };

  const retryPayment = async (order) => {
    setOrderAction(order._id);
    try {
      await api.delete(`/orders/${order._id}`);
      await api.delete('/marketplace/cart');
      await Promise.all((order.items || []).map(item => {
        const productId = item.productId?._id || item.productId;
        if (!productId || item.type === 'external') return null;
        return api.post('/marketplace/cart/add', { productId, qty: item.qty || 1 });
      }).filter(Boolean));
      setOrders(list => list.filter(o => o._id !== order._id));
      window.dispatchEvent(new Event('cartUpdated'));
      navigate('/checkout');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not retry this payment.');
    }
    setOrderAction('');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="lekhon-orders-page min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="lekhon-orders-shell max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FaBoxOpen className="text-violet-500" /> My Orders
          </h1>
          <Link to="/marketplace" className="text-sm text-violet-600 hover:underline">
            Browse Marketplace →
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <FaSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order number or product name…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-colors
                ${tab === t.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-violet-100 dark:hover:bg-violet-900/30'}`}>
              {t.label}
              {t.key === 'all' && ` (${orders.length})`}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-[var(--text-muted)]">
            <FaBoxOpen size={48} className="opacity-20" />
            <p className="text-lg font-medium">
              {search ? 'No orders match your search' : 'No orders yet'}
            </p>
            {!search && (
              <Link to="/marketplace" className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
                Start Shopping
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.paid;
              const hasDigital = order.items?.some(i => i.type === 'digital');
              const canDownload = hasDigital && ['paid', 'delivered', 'completed'].includes(order.status);
              const isDelivered = ['delivered', 'completed'].includes(order.status);
              const needsPaymentAction = ['failed', 'pending_payment'].includes(order.status);

              return (
                <div key={order._id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden hover:border-violet-300 dark:hover:border-violet-700 transition-colors">

                  {/* Order header */}
                  <div className="px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{order.orderNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="font-bold text-[var(--text-primary)]">Rs. {order.total?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-[var(--border-color)]">
                    {order.items?.map((item, idx) => {
                      const pid    = item.productId?._id || item.productId;
                      const dl     = order.downloads?.find(d => (d.productId?._id || d.productId)?.toString() === pid?.toString());
                      const maxDl  = item.productId?.digital?.maxDownloads || 5;
                      const dlKey  = `${order._id}_${pid}`;
                      const dlOver = (dl?.count || 0) >= maxDl;
                      const safeThumbnail = getSafeImageUrl(item.thumbnail);

                      return (
                        <div key={idx} className="flex items-center gap-3 px-4 py-3">
                          {/* Thumbnail */}
                          <Link to={`/order/${order._id}`} className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--bg-secondary)] shrink-0 border border-[var(--border-color)]">
                            {safeThumbnail
                              ? <img src={safeThumbnail} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><FaImage size={18} /></div>
                            }
                          </Link>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Link to={`/order/${order._id}`} className="block text-sm font-medium text-[var(--text-primary)] hover:text-violet-600 truncate">
                              {item.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                                ${item.type === 'digital'  ? 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   : ''}
                                ${item.type === 'physical' ? 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400'  : ''}
                                ${item.type === 'service'  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : ''}
                              `}>{item.type}</span>
                              <span className="text-xs text-[var(--text-muted)]">
                                ₹{item.price?.toLocaleString('en-IN')}
                                {item.qty > 1 && ` × ${item.qty}`}
                              </span>
                            </div>
                          </div>

                          {/* Download button (digital only) */}
                          {item.type === 'digital' && canDownload && (
                            <button
                              onClick={() => downloadFile(order._id, pid)}
                              disabled={dlState[dlKey] === 'loading' || dlOver}
                              title={dlOver ? `Limit of ${maxDl} downloads reached` : 'Download file'}
                              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors
                                ${dlOver
                                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed'
                                  : 'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60'}`}
                            >
                              <FaDownload size={10} />
                              {dlState[dlKey] === 'loading'
                                ? 'Getting link...'
                                : dlOver
                                ? `Limit reached`
                                : `Download${dl?.count ? ` (${dl.count}/${maxDl})` : ''}`
                              }
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2 flex-wrap">
                    {order.shipping?.trackingNumber && (
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                        <FaTruck size={12} /> {order.shipping.courier} - <span className="font-mono">{order.shipping.trackingNumber}</span>
                      </p>
                    )}
                    {order.couponCode && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                        <FaTag size={12} /> {order.couponCode} - Rs. {order.couponDiscount?.toLocaleString('en-IN')}
                      </p>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                      {needsPaymentAction ? (
                        <>
                          <button
                            type="button"
                            onClick={() => retryPayment(order)}
                            disabled={orderAction === order._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-medium"
                          >
                            <FaRedo size={10} /> {orderAction === order._id ? 'Retrying...' : 'Retry Payment'}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteOrder(order)}
                            disabled={orderAction === order._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60 font-medium"
                          >
                            <FaTrash size={10} /> Delete
                          </button>
                        </>
                      ) : isDelivered ? (
                        <>
                          <Link
                            to={`/help/article/resolve-an-order-delivery-or-return-problem?reference=${encodeURIComponent(order.orderNumber || order._id)}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] font-medium"
                          >
                            <FaUndoAlt size={10} /> Order help
                          </Link>
                          <Link
                            to={`/order/${order._id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium"
                          >
                            <FaStar size={10} /> Review
                          </Link>
                        </>
                      ) : (
                        <Link
                          to={`/order/${order._id}`}
                          className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
                        >
                          Order Details
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
