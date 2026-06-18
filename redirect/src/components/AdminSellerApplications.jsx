// ════════════════════════════════════════════════════════════════════════════
// FIX 4 — AdminSellerApplications.jsx
// A self-contained component to drop into AdminDashboard.js
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FaCheck, FaTimes, FaUser, FaStore, FaClock, FaHistory, FaShieldAlt } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';

const STATUS_STYLES = {
  pending:  'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  approved: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  rejected: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const CHECK_STYLES = {
  verified: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  format_valid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pending_setup: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  pending_provider: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  manual_review: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  not_started: 'bg-[var(--surface-elevated)] text-[var(--text-muted)]',
};

const formatCheckStatus = (status = 'not_started') => status
  .split('_')
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const AdminSellerApplications = () => {
  const { t } = useTranslation();
  const [applications, setApplications] = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('pending');
  const [expanded,     setExpanded]     = useState(null);
  const [actionLoading,setActionLoading]= useState(null);
  const [rejectNote,   setRejectNote]   = useState('');
  const [rejectModal,  setRejectModal]  = useState(null); // applicationId

  const fetchApplications = async (status = filter) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/seller/admin/seller-applications?status=${status}&limit=50`);
      setApplications(data.applications || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchApplications(filter); }, [filter]);

  const approve = async (id) => {
    setActionLoading(id + '_approve');
    try {
      const { data } = await api.put(`/seller/admin/seller-applications/${id}/approve`, { reviewNote: '' });
      setApplications(prev => prev.map(a => a._id === id ? { ...a, ...(data.application || {}), status: 'approved' } : a));
    } catch (e) {
      alert(e.response?.data?.message || 'Error approving application');
    }
    setActionLoading(null);
  };

  const reject = async (id) => {
    setActionLoading(id + '_reject');
    try {
      const { data } = await api.put(`/seller/admin/seller-applications/${id}/reject`, { reviewNote: rejectNote });
      setApplications(prev => prev.map(a => a._id === id ? { ...a, ...(data.application || {}), status: 'rejected' } : a));
      setRejectModal(null);
      setRejectNote('');
    } catch (e) {
      alert(e.response?.data?.message || 'Error rejecting application');
    }
    setActionLoading(null);
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Seller Applications
            {pendingCount > 0 && filter === 'pending' && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">{pendingCount} pending</span>
            )}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Review and approve seller badge requests</p>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5">
          {['pending', 'approved', 'rejected', 'withdrawn', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors
                ${filter === s
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--brand-primary)]/10'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Applications list ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full" />
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <FaStore size={40} className="mx-auto mb-3 opacity-25" />
          <p>No {filter} applications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <div
              key={app._id}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden"
            >
              {/* ── Summary row ─────────────────────────────────────────── */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors"
                onClick={() => setExpanded(expanded === app._id ? null : app._id)}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {app.userId?.profileImage
                    ? <img src={app.userId.profileImage} alt="" className="w-11 h-11 rounded-xl object-cover" />
                    : <div className="w-11 h-11 rounded-xl bg-[var(--surface-elevated)] flex items-center justify-center"><FaUser className="text-[var(--text-muted)]" /></div>
                  }
                  {app.userId?.isVerified && (
                    <MdVerified size={14} className="absolute -bottom-1 -right-1 text-blue-500 bg-white rounded-full" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--text-primary)]">{app.legalName}</span>
                    {app.businessName && <span className="text-xs text-[var(--text-muted)]">({app.businessName})</span>}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[app.status]}`}>
                      {app.status}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                      <FaHistory size={9} /> Attempt #{app.attemptNumber || 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-muted)] flex-wrap">
                    <span>@{app.userId?.username}</span>
                    <span>•</span>
                    <span>{app.businessType}</span>
                    <span>•</span>
                    <span>{app.city}{app.state ? `, ${app.state}` : ''}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><FaClock size={10} /> {new Date(app.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  {app.categories?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {app.categories.map(c => (
                        <span key={c} className="px-1.5 py-0.5 rounded-md text-[10px] bg-[var(--surface-elevated)] text-[var(--text-secondary)]">{c}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons (pending only) */}
                {app.status === 'pending' && (
                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => approve(app._id)}
                      disabled={actionLoading === app._id + '_approve'}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                    >
                      <FaCheck size={11} />
                      {actionLoading === app._id + '_approve' ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setRejectModal(app._id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                    >
                      <FaTimes size={11} /> Reject
                    </button>
                  </div>
                )}

                {app.status === 'approved' && (
                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Revoke seller badge from @${app.userId?.username}? This will pause all their products.`)) return;
                        try {
                          await api.patch(`/orders/admin/seller-revoke/${app.userId?._id}`);
                          setApplications(prev => prev.map(a => a._id === app._id ? { ...a, status: 'rejected' } : a));
                          alert('Seller badge revoked. All products paused.');
                        } catch (e) {
                          alert(e.response?.data?.message || 'Error revoking seller.');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                    >
                      Revoke Badge
                    </button>
                  </div>
                )}

                {/* Review note for reviewed apps */}
                {app.status !== 'pending' && app.reviewNote && (
                  <span className="text-xs text-[var(--text-muted)] italic max-w-[180px] truncate">{app.reviewNote}</span>
                )}
              </div>

              {/* ── Expanded details ───────────────────────────────────── */}
              {expanded === app._id && (
                <div className="px-5 pb-5 pt-0 border-t border-[var(--border-color)] grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[var(--surface-elevated)]">
                  {[
                    { label: 'Attempt',      value: `#${app.attemptNumber || 1}` },
                    { label: 'Verification', value: app.verificationProvider === 'razorpay' ? 'Razorpay-assisted' : 'Manual input' },
                    { label: 'Razorpay status', value: app.razorpayVerification?.status ? formatCheckStatus(app.razorpayVerification.status) : '-' },
                    { label: 'Phone',        value: app.phone },
                    { label: 'PAN',          value: app.maskedPan || 'Provided securely' },
                    { label: 'Country',      value: `${app.city}, ${app.state}, ${app.country}` },
                    { label: 'Payout',       value: app.payoutMethod?.type === 'upi' ? `UPI: ${app.payoutMethod.upiId}` : `Bank - ${app.payoutMethod?.bankAccountMasked || 'masked'} / IFSC: ${app.payoutMethod?.ifsc}` },
                    { label: 'Agreed',       value: app.agreedAt ? new Date(app.agreedAt).toLocaleString('en-IN') : '—' },
                    { label: 'Applied',      value: app.lastSubmittedAt ? new Date(app.lastSubmittedAt).toLocaleString('en-IN') : new Date(app.createdAt).toLocaleString('en-IN') },
                    { label: 'Reviewed by',  value: app.reviewedBy?.username || '—' },
                  ].map(field => (
                    <div key={field.label}>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{field.label}</p>
                      <p className="text-sm text-[var(--text-primary)] mt-0.5 break-all">{field.value || '—'}</p>
                    </div>
                  ))}
                  {app.bio && (
                    <div className="col-span-full">
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Store Bio</p>
                      <p className="text-sm text-[var(--text-secondary)]">{app.bio}</p>
                    </div>
                  )}
                  <div className="col-span-full">
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      <FaShieldAlt /> Verification checks
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['Phone', app.verification?.phone],
                        ['PAN', app.verification?.pan],
                        ['UPI', app.verification?.upi],
                        ['Bank', app.verification?.bank],
                        ['DigiLocker', app.verification?.digilocker],
                      ].map(([label, check]) => {
                        const status = check?.status || 'not_started';
                        return (
                          <span
                            key={label}
                            title={check?.note || ''}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${CHECK_STYLES[status] || CHECK_STYLES.not_started}`}
                          >
                            {label}: {formatCheckStatus(status)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {app.attemptHistory?.length > 0 && (
                    <div className="col-span-full">
                      <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        <FaHistory /> Previous attempts
                      </p>
                      <div className="space-y-2">
                        {app.attemptHistory.slice().reverse().map(attempt => (
                          <div key={`${app._id}-${attempt.attemptNumber}`} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-[var(--text-primary)]">Attempt #{attempt.attemptNumber}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[attempt.status] || STATUS_STYLES.rejected}`}>
                                {attempt.status}
                              </span>
                              <span className="text-[var(--text-muted)]">
                                Submitted {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('en-IN') : '-'}
                              </span>
                            </div>
                            {attempt.reviewNote && (
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">Reason: {attempt.reviewNote}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Reject modal ──────────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-[var(--text-primary)]">Reject Application</h3>
            <p className="text-sm text-[var(--text-muted)]">Optionally add a reason. The applicant will receive an email with this note.</p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              rows={3}
              placeholder="Reason for rejection (optional)"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectModal(null); setRejectNote(''); }}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => reject(rejectModal)}
                disabled={actionLoading === rejectModal + '_reject'}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {actionLoading === rejectModal + '_reject' ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSellerApplications;


// ════════════════════════════════════════════════════════════════════════════
// HOW TO ADD THIS TO AdminDashboard.js
// ════════════════════════════════════════════════════════════════════════════

// 1. Import it at the top of AdminDashboard.js:
// AdminDashboard integration has been applied in redirect/src/pages/AdminDashboard.js.

// 2. ADD this tab button alongside the existing tabs (after the 'shorts' tab button, ~line 499):
//             <button
//               onClick={() => setActiveTab('seller-applications')}
//               className={`px-3 py-2 font-semibold whitespace-nowrap text-sm md:text-base ${activeTab === 'seller-applications' ? 'border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
//             >
//               Sellers
//             </button>

// 3. ADD this section alongside the existing tab content blocks (after the last activeTab block):
//         {activeTab === 'seller-applications' && (
//           <AdminSellerApplications />
//         )}
