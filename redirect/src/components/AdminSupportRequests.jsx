import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  FaCheck,
  FaComments,
  FaExclamationTriangle,
  FaBell,
  FaClock,
  FaFlag,
  FaInbox,
  FaSyncAlt,
  FaUserShield,
} from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const typeConfig = {
  support: { label: 'Support', icon: FaComments },
  report: { label: 'Report', icon: FaFlag },
  appeal: { label: 'Appeal', icon: FaExclamationTriangle },
};

const statusOptions = [
  'open',
  'reviewing',
  'waiting_for_user',
  'resolved',
  'closed',
];

const priorityOptions = ['normal', 'high', 'urgent'];

const formatEventDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatEventChanges = (event) => {
  const changes = event?.changes || {};
  const labels = [];
  if (changes.status) labels.push(`status ${changes.status.from} -> ${changes.status.to}`);
  if (changes.priority) labels.push(`priority ${changes.priority.from} -> ${changes.priority.to}`);
  if (changes.assignedTo) labels.push(changes.assignedTo.to ? 'assigned' : 'unassigned');
  if (changes.adminNotes) labels.push('notes updated');
  return labels.join(', ') || 'request updated';
};

const AdminSupportRequests = ({ runAdminProtectedAction, adminStepUpConfig = () => ({}) }) => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const runProtectedAction = runAdminProtectedAction || (async ({ request }) => request({}));
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ type: '', status: 'open', priority: '' });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');

  const selected = requests.find((request) => request._id === selectedId) || null;
  const refreshedAt = metrics?.generatedAt
    ? new Date(metrics.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const metricCards = metrics
    ? [
        {
          label: 'Active',
          value: metrics.activeTotal,
          sub: 'Open or reviewing',
          icon: FaInbox,
          tone: 'text-blue-600',
        },
        {
          label: 'Urgent',
          value: metrics.urgentActive,
          sub: `${metrics.highOrUrgentActive || 0} high or urgent`,
          icon: FaBell,
          tone: metrics.urgentActive ? 'text-red-600' : 'text-[var(--text-muted)]',
        },
        {
          label: 'Stale',
          value: metrics.staleActive,
          sub: `Older than ${metrics.staleAfterHours || 72}h`,
          icon: FaClock,
          tone: metrics.staleActive ? 'text-amber-600' : 'text-[var(--text-muted)]',
        },
        {
          label: 'Unassigned',
          value: metrics.unassignedActive,
          sub: `${metrics.createdLast24h || 0} new in 24h`,
          icon: FaUserShield,
          tone: metrics.unassignedActive ? 'text-violet-600' : 'text-[var(--text-muted)]',
        },
      ]
    : [];
  const hasQueueAlert = Boolean(metrics?.urgentActive || metrics?.staleActive);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const [requestsResult, metricsResult] = await Promise.allSettled([
        api.get(`/support/admin/requests?${params.toString()}`),
        api.get('/support/admin/metrics'),
      ]);

      if (requestsResult.status === 'rejected') throw requestsResult.reason;

      const data = requestsResult.value.data;
      setRequests(data.requests || []);
      setSelectedId((current) =>
        (data.requests || []).some((request) => request._id === current)
          ? current
          : data.requests?.[0]?._id || ''
      );

      if (metricsResult.status === 'fulfilled') {
        setMetrics(metricsResult.value.data.metrics || null);
        setMetricsError('');
      } else {
        setMetrics(null);
        setMetricsError(
          metricsResult.reason?.response?.data?.message || 'Queue metrics unavailable.'
        );
      }
    } catch (requestError) {
      setRequests([]);
      setError(
        requestError.response?.data?.message || 'Unable to load support requests.'
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const updateRequest = async (updates) => {
    if (!selected || !isAdmin) return;
    setSaving(true);
    setError('');
    await runProtectedAction({
      title: 'Verify support update',
      description: 'Confirm your password before updating this support request.',
      onStepUp: () => setSaving(false),
      request: async (tokens) => {
        setSaving(true);
        const { data } = await api.patch(
          `/support/admin/requests/${selected._id}`,
          updates,
          adminStepUpConfig(tokens)
        );
        setRequests((current) =>
          current.map((request) =>
            request._id === selected._id ? data.request : request
          )
        );
        await loadRequests();
        setSaving(false);
      },
      onFailure: (requestError) => {
        setError(
          requestError.response?.data?.message || 'Unable to update the request.'
        );
        setSaving(false);
      },
    });
  };

  return (
    <div className="space-y-5">
      {metrics ? (
        <section className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-lg">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="m-0 text-base font-black text-[var(--text-primary)]">Support operations</h3>
              <p className="m-0 text-xs text-[var(--text-muted)]">Refreshed {refreshedAt || 'just now'}</p>
            </div>
            {hasQueueAlert ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <FaExclamationTriangle /> Review urgent or stale requests
              </span>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map(({ label, value, sub, icon: Icon, tone }) => (
              <article key={label} className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-xs font-bold uppercase text-[var(--text-muted)]">{label}</p>
                    <p className="m-0 mt-1 text-2xl font-black text-[var(--text-primary)]">{value || 0}</p>
                  </div>
                  <Icon className={tone} />
                </div>
                <p className="m-0 mt-2 text-xs text-[var(--text-muted)]">{sub}</p>
              </article>
            ))}
          </div>
          {metrics.oldestActive ? (
            <p className="m-0 mt-3 text-xs text-[var(--text-muted)]">
              Oldest active: {metrics.oldestActive.referenceNumber} ({metrics.oldestActive.priority})
            </p>
          ) : null}
        </section>
      ) : metricsError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{metricsError}</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <section className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-lg">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] p-4">
          <div>
            <h2 className="m-0 text-xl font-bold text-[var(--text-primary)]">
              Support, reports, and appeals
            </h2>
            <p className="mb-0 mt-1 text-xs text-[var(--text-muted)]">
              Co-admins can review. Only admins can change status or internal notes.
            </p>
          </div>
          <button
            type="button"
            onClick={loadRequests}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)]"
            aria-label="Refresh requests"
            title="Refresh requests"
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
          </button>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-[var(--border-default)] p-3">
          <select
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({ ...current, type: event.target.value }))
            }
            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">All types</option>
            <option value="support">Support</option>
            <option value="report">Reports</option>
            <option value="appeal">Appeals</option>
          </select>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value }))
            }
            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(event) =>
              setFilters((current) => ({ ...current, priority: event.target.value }))
            }
            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">All priorities</option>
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="max-h-[640px] overflow-y-auto">
          {loading ? (
            <p className="p-8 text-center text-sm text-[var(--text-muted)]">
              Loading requests...
            </p>
          ) : requests.length ? (
            requests.map((request) => {
              const config = typeConfig[request.type] || typeConfig.support;
              const Icon = config.icon;
              const active = request._id === selectedId;
              return (
                <button
                  key={request._id}
                  type="button"
                  onClick={() => setSelectedId(request._id)}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 border-b border-[var(--border-default)] p-4 text-left ${
                    active
                      ? 'bg-[var(--background-secondary)]'
                      : 'bg-transparent hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  <span className="mt-0.5 text-[var(--brand-primary)]">
                    <Icon />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
                      {request.subject}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                      {request.referenceNumber} - {request.category}
                    </span>
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      request.priority === 'urgent'
                        ? 'text-red-600'
                        : request.priority === 'high'
                          ? 'text-amber-600'
                          : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {request.priority}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="p-8 text-center text-sm text-[var(--text-muted)]">
              No requests match the current filters.
            </p>
          )}
        </div>
      </section>

      <aside className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-lg">
        {selected ? (
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--background-secondary)] px-2 py-1 text-xs font-bold capitalize text-[var(--text-secondary)]">
                  {selected.type}
                </span>
                <span className="text-xs font-bold uppercase text-[var(--text-muted)]">
                  {selected.referenceNumber}
                </span>
              </div>
              <h3 className="mb-0 mt-3 text-lg font-black text-[var(--text-primary)]">
                {selected.subject}
              </h3>
              <p className="mb-0 mt-1 text-sm text-[var(--text-secondary)]">
                {selected.email}
                {selected.username ? ` - @${selected.username}` : ''}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-black uppercase text-[var(--text-muted)]">
                Category
              </p>
              <p className="m-0 text-sm text-[var(--text-primary)]">
                {selected.category}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-black uppercase text-[var(--text-muted)]">
                Details
              </p>
              <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                {selected.description}
              </p>
            </div>

            {selected.reference ? (
              <div>
                <p className="mb-1 text-xs font-black uppercase text-[var(--text-muted)]">
                  User reference
                </p>
                <p className="m-0 break-words text-sm text-[var(--text-secondary)]">
                  {selected.reference}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs font-bold text-[var(--text-muted)]">
                Status
                <select
                  value={selected.status}
                  onChange={(event) => updateRequest({ status: event.target.value })}
                  disabled={!isAdmin || saving}
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold text-[var(--text-muted)]">
                Priority
                <select
                  value={selected.priority}
                  onChange={(event) => updateRequest({ priority: event.target.value })}
                  disabled={!isAdmin || saving}
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-1 text-xs font-bold text-[var(--text-muted)]">
              Internal notes
              <textarea
                defaultValue={selected.adminNotes || ''}
                key={`${selected._id}-${selected.updatedAt}`}
                id="support-admin-notes"
                disabled={!isAdmin}
                className="min-h-32 resize-y rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-3 text-sm text-[var(--text-primary)] disabled:opacity-60"
              />
            </label>

            {isAdmin ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const notes = document.getElementById('support-admin-notes')?.value || '';
                    updateRequest({ adminNotes: notes, assignToMe: true });
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-black disabled:opacity-60"
                >
                  <FaCheck />
                  {saving ? 'Saving...' : 'Save notes and assign'}
                </button>
              </div>
            ) : null}

            {selected.assignedTo ? (
              <p className="m-0 text-xs text-[var(--text-muted)]">
                Assigned to @{selected.assignedTo.username || selected.assignedTo.name || 'admin'}
              </p>
            ) : null}

            {Array.isArray(selected.adminEvents) && selected.adminEvents.length ? (
              <div>
                <p className="mb-2 text-xs font-black uppercase text-[var(--text-muted)]">
                  Admin history
                </p>
                <div className="space-y-2">
                  {[...selected.adminEvents].reverse().slice(0, 6).map((event, index) => (
                    <div
                      key={`${event.createdAt || 'event'}-${index}`}
                      className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-3"
                    >
                      <p className="m-0 flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                        <FaClock className="text-[var(--text-muted)]" />
                        @{event.adminUsername || 'admin'} - {formatEventDate(event.createdAt)}
                      </p>
                      <p className="m-0 mt-1 text-xs text-[var(--text-muted)]">
                        {formatEventChanges(event)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="m-0 text-sm text-[var(--text-muted)]">
            Select a request to review its details.
          </p>
        )}
      </aside>
      </div>
    </div>
  );
};

export default AdminSupportRequests;




