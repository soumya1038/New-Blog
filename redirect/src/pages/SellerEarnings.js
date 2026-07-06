import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate }  from 'react-router-dom';
import { AuthContext }        from '../context/AuthContext';
import api                    from '../services/api';
import {
  FaWallet, FaArrowUp, FaClock, FaCheckCircle,
  FaChartLine, FaInfoCircle, FaUniversity, FaMobileAlt,
} from 'react-icons/fa';
import { MdStorefront } from 'react-icons/md';

const STATUS_CONFIG = {
  pending:    { label: 'On Hold',    color: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400'  },
  available:  { label: 'Available',  color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400'  },
  processing: { label: 'Processing', color: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   },
  paid_out:   { label: 'Paid Out',   color: 'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400'   },
  reversed:   { label: 'Reversed',   color: 'bg-red-100    text-red-600    dark:bg-red-900/30    dark:text-red-400'    },
};

const PAYOUT_STATUS = {
  queued:     { label: 'Queued',     color: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400'  },
  processing: { label: 'Processing', color: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   },
  processed:  { label: 'Completed',  color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400'  },
  failed:     { label: 'Failed',     color: 'bg-red-100    text-red-600    dark:bg-red-900/30    dark:text-red-400'    },
};

const SummaryCard = ({ label, value, sub, icon: Icon, color, highlight }) => (
  <div className={`p-5 rounded-2xl border ${highlight ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20' : 'border-[var(--border-color)] bg-[var(--bg-card)]'} flex items-start gap-4`}>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className={`text-2xl font-bold ${highlight ? 'text-violet-700 dark:text-violet-300' : 'text-[var(--text-primary)]'}`}>{value}</p>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  </div>
);

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

const SellerEarnings = () => {
  const { user }     = useContext(AuthContext);
  const navigate     = useNavigate();
  const [data,       setData]       = useState({ earnings: [], summary: null, total: 0 });
  const [payouts,    setPayouts]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('earnings');
  const [requesting, setRequesting] = useState(false);
  const [reqError,   setReqError]   = useState('');
  const [reqSuccess, setReqSuccess] = useState('');
  const [filter,     setFilter]     = useState('all');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!user.isSeller) { navigate('/become-seller'); return; }
    fetchAll();
  }, [user, navigate]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [earnRes, payoutRes] = await Promise.all([
        api.get('/seller/earnings?limit=50'),
        api.get('/seller/payouts'),
      ]);
      setData(earnRes.data);
      setPayouts(payoutRes.data.payouts || []);
    } catch {}
    setLoading(false);
  };

  const requestPayout = async () => {
    setRequesting(true); setReqError(''); setReqSuccess('');
    try {
      const { data: res } = await api.post('/seller/earnings/request-payout');
      setReqSuccess(res.message);
      await fetchAll();
    } catch (e) {
      setReqError(e.response?.data?.message || 'Request failed. Please try again.');
    }
    setRequesting(false);
  };

  const { summary, earnings } = data;
  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredEarnings = filter === 'all'
    ? earnings
    : earnings.filter(e => e.status === filter);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/seller/dashboard" className="text-xs text-[var(--text-muted)] hover:text-violet-500">← Seller Dashboard</Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-0.5 flex items-center gap-2">
              <FaWallet className="text-violet-500" /> Earnings & Payouts
            </h1>
            <Link
              to="/help/article/understand-seller-earnings-and-payouts"
              className="mt-1 inline-flex text-xs font-bold text-[var(--brand-primary)] no-underline"
            >
              Understand fees, holds, and payout states
            </Link>
          </div>

          {/* Payout button */}
          {summary?.available > 0 && (
            <button
              onClick={requestPayout}
              disabled={requesting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
            >
              <FaArrowUp size={13} />
              {requesting ? 'Requesting…' : `Withdraw ${fmt(summary.available)}`}
            </button>
          )}
        </div>

        {/* Success / Error */}
        {reqSuccess && (
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
            <FaCheckCircle /> {reqSuccess}
          </div>
        )}
        {reqError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {reqError}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Available Now"  value={fmt(summary?.available)}  sub="Ready to withdraw"   icon={FaWallet}    color="bg-violet-500" highlight />
          <SummaryCard label="On Hold"        value={fmt(summary?.pending)}    sub={`${summary?.holdDays || 7}-day hold`} icon={FaClock}     color="bg-amber-500"  />
          <SummaryCard label="Total Net"      value={fmt(summary?.totalNet)}   sub="All time"            icon={FaChartLine} color="bg-blue-500"   />
          <SummaryCard label="Paid Out"       value={fmt(summary?.paidOut)}    sub="Successfully transferred" icon={FaCheckCircle} color="bg-green-500" />
        </div>

        {/* Fee info card */}
        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3">
          <FaInfoCircle size={15} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--text-muted)] space-y-0.5">
            <p>
              <strong className="text-[var(--text-secondary)]">How earnings work:</strong> When a buyer pays, your earnings are held for
              <strong> {summary?.holdDays || 7} days</strong> after order completion to cover any disputes.
            </p>
            <p>
              Lekhon platform fee: <strong>{summary?.commissionRate || 0}%</strong> &nbsp;·&nbsp;
              Razorpay gateway fee: ~<strong>{summary?.gatewayFeeRate || 2.36}%</strong> &nbsp;·&nbsp;
              <strong>Minimum withdrawal: ₹10</strong>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border-color)] pb-0">
          {[
            { key: 'earnings', label: 'Earnings History' },
            { key: 'payouts',  label: `Payouts (${payouts.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors
                ${tab === t.key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── EARNINGS TAB ──────────────────────────────────────────────────── */}
        {tab === 'earnings' && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex gap-1.5 flex-wrap">
              {['all', 'pending', 'available', 'paid_out', 'reversed'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-colors
                    ${filter === s
                      ? 'bg-violet-600 text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-violet-100 dark:hover:bg-violet-900/30'}`}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>

            {filteredEarnings.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)]">
                <FaWallet size={40} className="mx-auto mb-3 opacity-20" />
                <p>No {filter === 'all' ? '' : filter.replace('_', ' ')} earnings yet</p>
              </div>
            ) : (
	              <ScrollableTable minWidth={780}>
	                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr>
                      {['Order', 'Gross', 'Fees', 'You Get', 'Status', 'Hold Until'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredEarnings.map(e => {
                      const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.pending;
                      const fees = (e.platformFee || 0) + (e.gatewayFee || 0);
                      return (
                        <tr key={e._id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                          <td className="px-4 py-3">
                            <Link to={`/order/${e.orderId?._id || e.orderId}`} className="font-mono text-xs text-violet-600 hover:underline">
                              {e.orderNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">{fmt(e.grossAmount)}</td>
                          <td className="px-4 py-3 text-red-500 dark:text-red-400">-{fmt(fees)}</td>
                          <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">{fmt(e.netAmount)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {e.holdUntil && e.status === 'pending'
                              ? new Date(e.holdUntil).toLocaleDateString('en-IN')
                              : e.status === 'available' ? '✅ Ready' : '—'
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
	                </table>
	              </ScrollableTable>
            )}
          </div>
        )}

        {/* ── PAYOUTS TAB ──────────────────────────────────────────────────── */}
        {tab === 'payouts' && (
          <div className="space-y-3">
            {payouts.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)]">
                <FaArrowUp size={40} className="mx-auto mb-3 opacity-20" />
                <p>No payouts yet</p>
                {summary?.available > 0 && (
                  <button onClick={requestPayout} disabled={requesting}
                    className="mt-3 px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
                    Request your first payout
                  </button>
                )}
              </div>
            ) : (
              payouts.map(p => {
                const cfg = PAYOUT_STATUS[p.status] || PAYOUT_STATUS.queued;
                const showFailure = p.status === 'failed' && p.failureReason;
                const queuedNote = p.status === 'queued'
                  ? (p.notes || 'Queued for admin processing.')
                  : '';

                return (
                  <div key={p._id} className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center gap-4 flex-wrap">
                    <div className={`p-3 rounded-xl shrink-0 ${p.method === 'upi' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                      {p.method === 'upi'
                        ? <FaMobileAlt size={18} className="text-purple-600 dark:text-purple-400" />
                        : <FaUniversity size={18} className="text-blue-600 dark:text-blue-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[var(--text-primary)]">{fmt(p.amount)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Via {p.method === 'upi' ? `UPI — ${p.payoutDetails?.upiId}` : `Bank — ${p.payoutDetails?.bankAccount} (${p.payoutDetails?.ifsc})`}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Requested {new Date(p.createdAt).toLocaleDateString('en-IN')}
                        {p.processedAt && ` · Processed ${new Date(p.processedAt).toLocaleDateString('en-IN')}`}
                      </p>
                      {queuedNote && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{queuedNote}</p>
                      )}
                      {showFailure && (
                        <p className="text-xs text-red-500 mt-0.5">Failed: {p.failureReason}</p>
                      )}
                    </div>
                    {p.razorpayPayoutId && p.razorpayPayoutId !== 'manual' && (
                      <span className="text-xs text-[var(--text-muted)] font-mono shrink-0 hidden sm:block">
                        Ref: {p.razorpayPayoutId}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerEarnings;
