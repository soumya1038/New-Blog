import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Link, useNavigate }  from 'react-router-dom';
import { AuthContext }        from '../context/AuthContext';
import api                    from '../services/api';
import StarRating             from '../components/StarRating';
import {
  FaPlus, FaStore, FaBoxOpen, FaChartLine, FaTag, FaCog,
  FaEdit, FaArchive, FaCheck, FaTruck, FaEye, FaToggleOn, FaToggleOff, FaTrash,
  FaWallet, FaRupeeSign, FaSearch, FaTimes, FaQuestionCircle,
} from 'react-icons/fa';
import { MdStorefront } from 'react-icons/md';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: FaChartLine  },
  { id: 'products',  label: 'Products',  icon: FaBoxOpen    },
  { id: 'price-changes', label: 'Price Changes', icon: FaRupeeSign },
  { id: 'orders',    label: 'Orders',    icon: FaStore      },
  { id: 'earnings',  label: 'Earnings',  icon: FaWallet,  link: '/seller/earnings' },
  { id: 'coupons',   label: 'Coupons',   icon: FaTag        },
  { id: 'settings',  label: 'Store',     icon: FaCog        },
];

const STATUS_COLOR = {
  active:   'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  draft:    'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',
  paused:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
};

const ORDER_STATUS_COLOR = {
  paid:       'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  processing: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  shipped:    'bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400',
  delivered:  'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  completed:  'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
};

const COUPON_STATUS_COLOR = {
  active:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  used_up:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  expired:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  off:       'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const PRICE_REQUEST_STATUS_COLOR = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  expired:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const getCouponStatus = (coupon) => {
  if (coupon.effectiveStatus) {
    return {
      status: coupon.effectiveStatus,
      label: coupon.statusLabel || coupon.effectiveStatus.replace('_', ' '),
      className: COUPON_STATUS_COLOR[coupon.effectiveStatus] || COUPON_STATUS_COLOR.off,
    };
  }

  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = new Date(coupon.validUntil);
  const usedUp = coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit;

  if (now > validUntil) return { status: 'expired', label: 'Expired', className: COUPON_STATUS_COLOR.expired };
  if (usedUp) return { status: 'used_up', label: 'Used up', className: COUPON_STATUS_COLOR.used_up };
  if (!coupon.isActive) return { status: 'off', label: 'Off', className: COUPON_STATUS_COLOR.off };
  if (now < validFrom) return { status: 'scheduled', label: 'Scheduled', className: COUPON_STATUS_COLOR.scheduled };
  return { status: 'active', label: 'Active', className: COUPON_STATUS_COLOR.active };
};

const tableScrollStyle = {
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
};

const ScrollableTable = ({ children, minWidth = 760 }) => (
  <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden">
    <div className="overflow-x-auto" style={tableScrollStyle}>
      <div style={{ minWidth }}>
        {children}
      </div>
    </div>
  </div>
);

const SellerDashboard = () => {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();
  const [tab,      setTab]      = useState('overview');
  const [stats,    setStats]    = useState(null);
  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [coupons,  setCoupons]  = useState([]);
  const [priceRequests, setPriceRequests] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading,  setLoading]  = useState(true);

  // Ship modal state
  const [shipModal, setShipModal] = useState({ open: false, orderId: null });
  const [shipForm,  setShipForm]  = useState({ trackingNumber: '', courier: '' });
  const [restockModal, setRestockModal] = useState({ open: false, product: null, qty: '10' });
  const [priceRequestModal, setPriceRequestModal] = useState({ open: false, product: null });
  const [priceRequestForm, setPriceRequestForm] = useState({ requestedPrice: '', reason: '' });
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productPickerQuery, setProductPickerQuery] = useState('');
  const [priceSubmitting, setPriceSubmitting] = useState(false);

  // Coupon create form
  const [couponForm, setCouponForm] = useState({
    code: '', discountType: 'percentage', discountValue: '',
    minOrderValue: '', usageLimit: '', validUntil: '', perUserLimit: 1,
  });

  useEffect(() => {
    if (!user) return navigate('/login');
    if (!user.isSeller) return navigate('/become-seller');
  }, [user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, productsRes, ordersRes, couponsRes, storeRes, priceRequestsRes] = await Promise.allSettled([
        api.get('/seller/dashboard/stats'),
        api.get('/marketplace/seller/products?limit=50'),
        api.get('/orders/seller/orders?limit=50'),
        api.get('/coupons/seller'),
        api.get('/seller/store/settings'),
        api.get('/price-changes/seller?limit=50'),
      ]);
      if (statsRes.status    === 'fulfilled') setStats(statsRes.value.data.stats);
      if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data.products || []);
      if (ordersRes.status   === 'fulfilled') setOrders(ordersRes.value.data.orders || []);
      if (couponsRes.status  === 'fulfilled') setCoupons(couponsRes.value.data.coupons || []);
      if (storeRes.status    === 'fulfilled') setSettings(storeRes.value.data.settings || {});
      if (priceRequestsRes.status === 'fulfilled') setPriceRequests(priceRequestsRes.value.data.requests || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getProductImage = (product) => product?.thumbnail || product?.images?.[0] || '';

  const publishedProducts = useMemo(
    () => products.filter(product => product.status === 'active'),
    [products]
  );

  const filteredPickerProducts = useMemo(() => {
    const query = productPickerQuery.trim().toLowerCase();
    if (!query) return publishedProducts;

    return publishedProducts.filter(product => [
      product.title,
      product.type,
      product.slug,
      product.status,
      ...(product.category || []),
      ...(product.tags || []),
    ].some(value => String(value || '').toLowerCase().includes(query)));
  }, [publishedProducts, productPickerQuery]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const changeProductStatus = async (id, status) => {
    await api.put(`/marketplace/seller/products/${id}`, { status });
    setProducts(p => p.map(pr => pr._id === id ? { ...pr, status } : pr));
  };

  const archiveProduct = async (id) => {
    if (!window.confirm('Delete this product? Its marketplace listing and saved image references will be removed.')) return;
    await api.delete(`/marketplace/seller/products/${id}`);
    setProducts(p => p.filter(pr => pr._id !== id));
  };

  const markShipped = async () => {
    if (!shipForm.trackingNumber || !shipForm.courier) return alert('Both fields are required.');
    try {
      await api.patch(`/orders/seller/orders/${shipModal.orderId}/ship`, shipForm);
      setOrders(o => o.map(ord => ord._id === shipModal.orderId ? { ...ord, status: 'shipped', shipping: { ...ord.shipping, ...shipForm } } : ord));
      setShipModal({ open: false, orderId: null });
      setShipForm({ trackingNumber: '', courier: '' });
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
  };

  const restockProduct = async () => {
    const qty = parseInt(restockModal.qty, 10);
    if (!restockModal.product || !Number.isFinite(qty) || qty <= 0) return;
    try {
      await api.post('/orders/seller/restock', { productId: restockModal.product._id, addStock: qty });
      setRestockModal({ open: false, product: null, qty: '10' });
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Unable to restock product.');
    }
  };

  const createCoupon = async () => {
    try {
      const { data } = await api.post('/coupons', couponForm);
      setCoupons(c => [data.coupon, ...c]);
      setCouponForm({ code: '', discountType: 'percentage', discountValue: '', minOrderValue: '', usageLimit: '', validUntil: '', perUserLimit: 1 });
    } catch (e) { alert(e.response?.data?.message || 'Error creating coupon'); }
  };

  const toggleCoupon = async (id) => {
    try {
      const { data } = await api.patch(`/coupons/${id}/toggle`);
      setCoupons(c => c.map(cp => cp._id === id ? data.coupon : cp));
    } catch (e) {
      alert(e.response?.data?.message || 'Unable to update coupon status.');
    }
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    await api.delete(`/coupons/${id}`);
    setCoupons(c => c.filter(cp => cp._id !== id));
  };

  const openPriceRequest = (product) => {
    setProductPickerOpen(false);
    setPriceRequestModal({ open: true, product });
    setPriceRequestForm({
      requestedPrice: product?.price ? String(product.price) : '',
      reason: '',
    });
  };

  const submitPriceRequest = async () => {
    const product = priceRequestModal.product;
    const requestedPrice = Number(priceRequestForm.requestedPrice);
    const currentPrice = Number(product?.price || 0);
    const reason = priceRequestForm.reason.trim();

    if (!product) return;
    if (!Number.isFinite(requestedPrice) || requestedPrice <= currentPrice) {
      return alert('Requested price must be higher than the current price.');
    }
    if (!reason) {
      return alert('Please explain why this price needs to increase.');
    }

    setPriceSubmitting(true);
    try {
      const { data } = await api.post('/price-changes/seller', {
        productId: product._id,
        requestedPrice,
        reason,
      });
      setPriceRequests(requests => [data.request, ...requests.filter(req => req._id !== data.request._id)]);
      setPriceRequestModal({ open: false, product: null });
      setPriceRequestForm({ requestedPrice: '', reason: '' });
      setTab('price-changes');
    } catch (e) {
      alert(e.response?.data?.message || 'Unable to submit price-change token.');
    }
    setPriceSubmitting(false);
  };

  const cancelPriceRequest = async (id) => {
    if (!window.confirm('Cancel this pending price-change token?')) return;
    try {
      const { data } = await api.patch(`/price-changes/seller/${id}/cancel`);
      setPriceRequests(requests => requests.map(req => req._id === id ? data.request : req));
    } catch (e) {
      alert(e.response?.data?.message || 'Unable to cancel price-change token.');
    }
  };

  // ── Stat card ─────────────────────────────────────────────────────────────────
  const StatCard = ({ label, value, sub, icon: Icon, color }) => (
    <div className={`p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-start gap-4`}>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value ?? '—'}</p>
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* ── Top header ───────────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <MdStorefront size={22} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="font-bold text-[var(--text-primary)]">Seller Dashboard</h1>
              <p className="text-xs text-[var(--text-muted)]">{settings.storeName || user?.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              to="/help/article/manage-your-seller-dashboard"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <FaQuestionCircle size={12} /> Help
            </Link>
            <Link
              to={`/store/${user?.username}`}
              state={{ fromSellerDashboard: true }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <FaEye size={11} /> View Store
            </Link>
            <Link
              to="/seller/add-product"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
            >
              <FaPlus size={11} /> Add Product
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-card)] px-4">
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(t => {
            const Icon = t.icon;
            if (t.link) {
              return (
                <Link
                  key={t.id}
                  to={t.link}
                  className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] shrink-0 transition-colors"
                >
                  <Icon size={12} /> {t.label}
                </Link>
              );
            }
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors shrink-0
                  ${tab === t.id
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                <Icon size={12} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ══ OVERVIEW ══════════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Revenue"   value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`} icon={FaChartLine} color="bg-violet-500" />
              <StatCard label="Total Orders"    value={stats?.totalOrders    || 0} sub={`${stats?.pendingOrders || 0} pending`} icon={FaBoxOpen} color="bg-blue-500" />
              <StatCard label="Active Products" value={stats?.activeProducts || 0} sub={`${stats?.totalProducts || 0} total`}   icon={FaStore}   color="bg-green-500" />
              <StatCard label="Revenue (30d)"   value={`₹${Object.values(stats?.revenueByDay || {}).reduce((a, b) => a + b, 0).toLocaleString('en-IN')}`} icon={FaTag} color="bg-amber-500" />
            </div>

            {/* Recent orders */}
            <div>
              <h2 className="font-bold text-[var(--text-primary)] mb-3">Recent Orders</h2>
              <ScrollableTable minWidth={680}>
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr>
                      {['Order', 'Buyer', 'Items', 'Total', 'Status', 'Action'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {orders.slice(0, 5).map(ord => (
                      <tr key={ord._id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{ord.orderNumber}</td>
                        <td className="px-4 py-3 text-[var(--text-primary)]">{ord.buyerId?.name || ord.buyerId?.username || '—'}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{ord.items?.length || 0}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">₹{ord.total?.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ORDER_STATUS_COLOR[ord.status] || 'bg-gray-100 text-gray-600'}`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/order/${ord._id}`} className="text-xs text-violet-600 hover:underline">View</Link>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">No orders yet</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollableTable>
            </div>
          </div>
        )}

        {/* ══ PRODUCTS ══════════════════════════════════════════════════════════ */}
        {tab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-[var(--text-primary)]">My Products ({products.length})</h2>
              <Link to="/seller/add-product" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors">
                <FaPlus size={10} /> Add Product
              </Link>
            </div>

            <ScrollableTable minWidth={920}>
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)]">
                  <tr>
                    {['Product', 'Type', 'Price', 'Stock', 'Sales', 'Rating', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {products.map(p => (
                    <tr key={p._id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={getProductImage(p)} alt="" className="w-9 h-9 rounded-lg object-cover bg-[var(--bg-secondary)] shrink-0" />
                          <p className="text-[var(--text-primary)] font-medium truncate max-w-[160px]">{p.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] capitalize text-xs">{p.type}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        {p.isFree ? <span className="text-green-500">Free</span> : `₹${p.price?.toLocaleString('en-IN')}`}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {p.type === 'physical' ? (p.physical?.stock ?? 0) : '�'}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{p.stats?.sales || 0}</td>
                      <td className="px-4 py-3">
                        {p.reviewCount > 0
                          ? <StarRating value={p.averageRating} size={11} count={p.reviewCount} />
                          : <span className="text-xs text-[var(--text-muted)]">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-600'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/marketplace/${p.slug}`} title="View" className="text-[var(--text-muted)] hover:text-violet-500"><FaEye size={13} /></Link>
                          <Link to={`/seller/edit-product/${p._id}`} title="Edit" className="text-[var(--text-muted)] hover:text-blue-500"><FaEdit size={13} /></Link>
                          <button onClick={() => openPriceRequest(p)} title="Request price increase" className="text-[var(--text-muted)] hover:text-amber-500"><FaRupeeSign size={12} /></button>
                          {p.status === 'active'
                            ? <button onClick={() => changeProductStatus(p._id, 'paused')}  title="Pause"  className="text-[var(--text-muted)] hover:text-yellow-500"><FaToggleOn  size={14} /></button>
                            : p.status === 'paused' || p.status === 'draft'
                            ? <button onClick={() => changeProductStatus(p._id, 'active')}  title="Activate" className="text-[var(--text-muted)] hover:text-green-500"><FaToggleOff size={14} /></button>
                            : null
                          }
                          <button onClick={() => archiveProduct(p._id)} title="Delete" className="text-[var(--text-muted)] hover:text-red-500"><FaTrash size={12} /></button>
                          {p.type === 'physical' && (
                            <button
                              onClick={async () => {
                                setRestockModal({ open: true, product: p, qty: '10' });
                              }}
                              title="Restock"
                              className="text-[var(--text-muted)] hover:text-green-500 text-xs"
                            >
                              +Stock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">No products yet. <Link to="/seller/add-product" className="text-violet-600 hover:underline">Add your first product →</Link></td></tr>
                  )}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        )}

        {/* ══ ORDERS ════════════════════════════════════════════════════════════ */}
        {tab === 'price-changes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-bold text-[var(--text-primary)]">Price Change Tokens</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Request admin approval before increasing any product price.
                </p>
              </div>
              <button
                onClick={() => {
                  setProductPickerQuery('');
                  setProductPickerOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
              >
                Choose Product
              </button>
            </div>

            <ScrollableTable minWidth={900}>
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)]">
                  <tr>
                    {['Token', 'Product', 'Old Price', 'Requested', 'Status', 'Date', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {priceRequests.map(req => {
                    const productTitle = req.productId?.title || req.snapshot?.productTitle || 'Product';
                    const statusClass = PRICE_REQUEST_STATUS_COLOR[req.status] || PRICE_REQUEST_STATUS_COLOR.expired;
                    return (
                      <tr key={req._id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{req.requestToken}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[220px]">
                            <img
                              src={req.productId?.thumbnail || req.snapshot?.thumbnail || ''}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover bg-[var(--bg-secondary)] shrink-0"
                            />
                            <span className="font-medium text-[var(--text-primary)] truncate max-w-[220px]">{productTitle}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">Rs. {Number(req.oldPrice || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">Rs. {Number(req.requestedPrice || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusClass}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{new Date(req.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3">
                          {req.status === 'pending' ? (
                            <button
                              onClick={() => cancelPriceRequest(req._id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Cancel
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">{req.adminNote || 'No action'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {priceRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">
                        No price-change tokens yet. Choose a product to request a price increase.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            <h2 className="font-bold text-[var(--text-primary)]">Orders ({orders.length})</h2>
            <ScrollableTable minWidth={760}>
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)]">
                  <tr>
                    {['Order #', 'Buyer', 'Total', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {orders.map(ord => (
                    <tr key={ord._id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{ord.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {ord.buyerId?.profileImage && <img src={ord.buyerId.profileImage} alt="" className="w-6 h-6 rounded-full object-cover" />}
                          <span className="text-[var(--text-primary)]">{ord.buyerId?.name || ord.buyerId?.username || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">₹{ord.total?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ORDER_STATUS_COLOR[ord.status] || 'bg-gray-100 text-gray-600'}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{new Date(ord.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/order/${ord._id}`} className="text-xs text-violet-600 hover:underline">View</Link>
                          {ord.status === 'paid' && ord.items?.some(i => i.type === 'physical') && (
                            <button
                              onClick={() => setShipModal({ open: true, orderId: ord._id })}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              <FaTruck size={10} /> Ship
                            </button>
                          )}
                          {ord.status === 'paid' && ord.items?.some(i => i.type === 'service') && (
                            <button
                              onClick={() => api.patch(`/orders/seller/orders/${ord._id}/deliver`).then(load)}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                            >
                              <FaCheck size={10} /> Deliver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--text-muted)]">No orders received yet.</td></tr>
                  )}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        )}

        {/* ══ COUPONS ═══════════════════════════════════════════════════════════ */}
        {tab === 'coupons' && (
          <div className="space-y-6">
            {/* Create form */}
            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <h2 className="font-bold text-[var(--text-primary)] mb-4">Create Coupon</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'code',          label: 'Code',             placeholder: 'SUMMER30',    span: 1 },
                  { key: 'discountValue', label: 'Discount Value',   placeholder: '20',          span: 1 },
                  { key: 'minOrderValue', label: 'Min Order (₹)',    placeholder: '0',           span: 1 },
                  { key: 'usageLimit',    label: 'Usage Limit',      placeholder: 'Unlimited',   span: 1 },
                  { key: 'perUserLimit',  label: 'Per User Limit',   placeholder: '1',           span: 1 },
                  { key: 'validUntil',    label: 'Valid Until',      type: 'date',               span: 1 },
                ].map(f => (
                  <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      value={couponForm[f.key]}
                      placeholder={f.placeholder}
                      onChange={e => setCouponForm(c => ({ ...c, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Discount Type</label>
                  <select
                    value={couponForm.discountType}
                    onChange={e => setCouponForm(c => ({ ...c, discountType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
              </div>
              <button
                onClick={createCoupon}
                className="mt-4 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
              >
                <FaPlus className="inline mr-1.5" size={10} /> Create Coupon
              </button>
            </div>

            {/* Coupon list */}
            <ScrollableTable minWidth={820}>
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)]">
                  <tr>
                    {['Code', 'Type', 'Value', 'Used', 'Expires', 'Active', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {coupons.map(cp => {
                    const couponStatus = getCouponStatus(cp);
                    return (
                    <tr key={cp._id} className={`hover:bg-[var(--bg-secondary)] transition-colors ${couponStatus.status !== 'active' ? 'opacity-70' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-violet-600 dark:text-violet-400">{cp.code}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] capitalize text-xs">{cp.discountType.replace('_', ' ')}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        {cp.discountType === 'percentage' ? `${cp.discountValue}%` : cp.discountType === 'flat' ? `₹${cp.discountValue}` : 'Free ship'}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{cp.usedCount}{cp.usageLimit ? `/${cp.usageLimit}` : ''}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{new Date(cp.validUntil).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${couponStatus.className}`}>
                          {couponStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleCoupon(cp._id)} title="Toggle" className="text-[var(--text-muted)] hover:text-violet-500">
                            {cp.isActive ? <FaToggleOn size={16} /> : <FaToggleOff size={16} />}
                          </button>
                          <button onClick={() => deleteCoupon(cp._id)} title="Delete" className="text-[var(--text-muted)] hover:text-red-500">
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {coupons.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--text-muted)]">No coupons created yet.</td></tr>
                  )}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        )}

        {/* ══ STORE SETTINGS ════════════════════════════════════════════════════ */}
        {tab === 'settings' && (
          <div className="max-w-xl space-y-5">
            <h2 className="font-bold text-[var(--text-primary)]">Store Settings</h2>
            {[
              { key: 'storeName', label: 'Store Name',    placeholder: 'My Awesome Store' },
              { key: 'bio',       label: 'Store Bio',     placeholder: 'Tell buyers about your store…', multiline: true },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{f.label}</label>
                {f.multiline
                  ? <textarea rows={3} value={settings[f.key] || ''} onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                  : <input   value={settings[f.key] || ''} onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500" />
                }
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Social Links</label>
              {['instagram', 'twitter', 'website', 'youtube'].map(k => (
                <div key={k} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[var(--text-muted)] w-20 capitalize">{k}</span>
                  <input
                    value={settings.socialLinks?.[k] || ''}
                    onChange={e => setSettings(s => ({ ...s, socialLinks: { ...(s.socialLinks || {}), [k]: e.target.value } }))}
                    placeholder={`https://${k}.com/yourname`}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => api.put('/seller/store/settings', settings).then(() => alert('Store settings saved!'))}
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
            >
              Save Settings
            </button>
          </div>
        )}
      </div>

      {/* ── Ship Modal ─────────────────────────────────────────────────────────── */}
      {shipModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-[var(--text-primary)]">Mark as Shipped</h3>
            {[
              { key: 'courier',        label: 'Courier Name',     placeholder: 'DTDC, Delhivery…' },
              { key: 'trackingNumber', label: 'Tracking Number',  placeholder: 'TRK1234567890' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-[var(--text-muted)] mb-1">{f.label}</label>
                <input
                  value={shipForm[f.key]}
                  onChange={e => setShipForm(s => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShipModal({ open: false, orderId: null })} className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] text-sm">Cancel</button>
              <button onClick={markShipped} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors">
                <FaTruck className="inline mr-1.5" size={11} /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {productPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-5 py-4">
	              <div>
	                <h3 className="font-bold text-[var(--text-primary)]">Choose Product</h3>
	                <p className="text-xs text-[var(--text-muted)]">{publishedProducts.length} published products available</p>
	              </div>
              <button
                onClick={() => setProductPickerOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Close product picker"
              >
                <FaTimes size={12} />
              </button>
            </div>

            <div className="border-b border-[var(--border-color)] p-4">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3">
                <FaSearch size={12} className="text-[var(--text-muted)]" />
                <input
                  value={productPickerQuery}
                  onChange={e => setProductPickerQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-transparent py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {filteredPickerProducts.map(product => {
                const hasPendingRequest = priceRequests.some(req => {
                  const requestProductId = req.productId?._id || req.productId;
                  return String(requestProductId) === String(product._id) && req.status === 'pending';
                });

                return (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => !hasPendingRequest && openPriceRequest(product)}
                    disabled={hasPendingRequest}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <img
                      src={getProductImage(product)}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl bg-[var(--bg-secondary)] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{product.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                        <span className="capitalize">{product.type}</span>
                        <span>Rs. {Number(product.price || 0).toLocaleString('en-IN')}</span>
                        <span className="capitalize">{product.status}</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      hasPendingRequest
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                    }`}>
                      {hasPendingRequest ? 'Pending' : 'Select'}
                    </span>
                  </button>
                );
              })}

	              {publishedProducts.length === 0 && (
	                <div className="px-4 py-10 text-center">
	                  <p className="text-sm font-semibold text-[var(--text-primary)]">No published products yet</p>
	                  <p className="mt-1 text-xs text-[var(--text-muted)]">Only published products can request a price change.</p>
	                  <Link to="/seller/add-product" className="mt-2 inline-flex text-sm font-semibold text-violet-600 hover:underline">
	                    Add product
	                  </Link>
	                </div>
	              )}

	              {publishedProducts.length > 0 && filteredPickerProducts.length === 0 && (
	                <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
	                  No products match "{productPickerQuery}"
	                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {priceRequestModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 w-full max-w-md space-y-4">
            <div>
              <h3 className="font-bold text-[var(--text-primary)]">Request Price Increase</h3>
              <p className="text-sm text-[var(--text-muted)] truncate">{priceRequestModal.product?.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)]">Current price</p>
                <p className="font-bold text-[var(--text-primary)]">Rs. {Number(priceRequestModal.product?.price || 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Requested price</label>
                <input
                  type="number"
                  min={Number(priceRequestModal.product?.price || 0) + 1}
                  value={priceRequestForm.requestedPrice}
                  onChange={e => setPriceRequestForm(s => ({ ...s, requestedPrice: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Reason for admin review</label>
              <textarea
                rows={4}
                maxLength={1000}
                value={priceRequestForm.reason}
                onChange={e => setPriceRequestForm(s => ({ ...s, reason: e.target.value }))}
                placeholder="Explain cost changes, supplier update, margin correction, or any other reason."
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
              <p className="text-[10px] text-[var(--text-muted)] text-right">{priceRequestForm.reason.length}/1000</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setPriceRequestModal({ open: false, product: null })}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitPriceRequest}
                disabled={priceSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {priceSubmitting ? 'Submitting...' : 'Submit Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {restockModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-[var(--text-primary)]">Restock Product</h3>
            <p className="text-sm text-[var(--text-muted)] truncate">{restockModal.product?.title}</p>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Quantity to add</label>
              <input
                type="number"
                min="1"
                value={restockModal.qty}
                onChange={e => setRestockModal(s => ({ ...s, qty: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setRestockModal({ open: false, product: null, qty: '10' })}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] text-sm"
              >
                Cancel
              </button>
              <button
                onClick={restockProduct}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors"
              >
                Add Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
