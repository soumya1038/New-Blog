import React from 'react';
import {
  FaBoxOpen,
  FaBookmark,
  FaClock,
  FaExternalLinkAlt,
  FaFilePdf,
  FaRedoAlt,
  FaSearch,
  FaServer,
  FaShoppingBag,
  FaTimes,
  FaWifi,
  FaWrench,
} from 'react-icons/fa';

const STATE_COPY = {
  overall: {
    icon: FaShoppingBag,
    eyebrow: 'Marketplace',
    title: 'Nothing is listed here yet',
    body: 'New products will appear here as sellers publish them.',
    tone: 'text-violet-500',
  },
  search: {
    icon: FaSearch,
    eyebrow: 'Search result',
    title: 'No matching products found',
    body: 'Try a shorter keyword, a different spelling, or clear the filters.',
    tone: 'text-violet-500',
  },
  physical: {
    icon: FaBoxOpen,
    eyebrow: 'Physical products',
    title: 'No physical products found',
    body: 'Try widening the price range or browsing all marketplace items.',
    tone: 'text-amber-500',
  },
  digital: {
    icon: FaFilePdf,
    eyebrow: 'Digital products',
    title: 'No digital products found',
    body: 'Templates, downloads, and files will show here when available.',
    tone: 'text-sky-500',
  },
  service: {
    icon: FaWrench,
    eyebrow: 'Services',
    title: 'No services found',
    body: 'Try another keyword or clear the current service filter.',
    tone: 'text-emerald-500',
  },
  external: {
    icon: FaExternalLinkAlt,
    eyebrow: 'External products',
    title: 'No external products found',
    body: 'Affiliate or external listings will appear here when sellers add them.',
    tone: 'text-fuchsia-500',
  },
  saved: {
    icon: FaBookmark,
    eyebrow: 'Saved products',
    title: 'No saved products yet',
    body: 'Tap the heart on product cards or product details to keep products here.',
    tone: 'text-violet-500',
  },
  'server-error': {
    icon: FaServer,
    eyebrow: 'Server issue',
    title: 'Marketplace could not load',
    body: 'Something went wrong on the server side. Retry the request in a moment.',
    tone: 'text-red-500',
  },
  timeout: {
    icon: FaClock,
    eyebrow: 'Request timeout',
    title: 'This is taking longer than expected',
    body: 'The marketplace request timed out before the server responded.',
    tone: 'text-amber-500',
  },
  'network-error': {
    icon: FaWifi,
    eyebrow: 'Network issue',
    title: 'You seem to be offline',
    body: 'Check your connection and retry loading the marketplace.',
    tone: 'text-sky-500',
  },
};

const isFailureState = (type) => ['server-error', 'timeout', 'network-error'].includes(type);

const FloatingBits = ({ color = 'var(--brand-primary)' }) => (
  <>
    <circle cx="38" cy="44" r="4" fill={color} opacity="0.25">
      <animate attributeName="cy" values="44;34;44" dur="3s" repeatCount="indefinite" />
    </circle>
    <circle cx="170" cy="52" r="5" fill="#D9A56A" opacity="0.35">
      <animate attributeName="cy" values="52;42;52" dur="3.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="184" cy="126" r="3" fill={color} opacity="0.22">
      <animate attributeName="cy" values="126;116;126" dur="3.4s" repeatCount="indefinite" />
    </circle>
  </>
);

const MarketplaceArt = ({ type }) => {
  if (type === 'physical') {
    return (
      <svg viewBox="0 0 220 180" role="img" aria-label="Animated empty physical products illustration" className="w-full h-full">
        <FloatingBits color="#D9A56A" />
        <path d="M42 132h136" stroke="var(--border-color)" strokeWidth="10" strokeLinecap="round" opacity="0.85" />
        <g>
          <animateTransform attributeName="transform" type="translate" values="-14 0;14 0;-14 0" dur="4s" repeatCount="indefinite" />
          <rect x="74" y="74" width="72" height="52" rx="8" fill="#D9A56A" />
          <path d="M74 82l36 19 36-19M110 101v25" fill="none" stroke="#6f4318" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
          <rect x="92" y="64" width="36" height="18" rx="4" fill="#f5d7ad" />
        </g>
        <circle cx="78" cy="145" r="6" fill="var(--text-muted)" opacity="0.45" />
        <circle cx="142" cy="145" r="6" fill="var(--text-muted)" opacity="0.45" />
      </svg>
    );
  }

  if (type === 'digital') {
    return (
      <svg viewBox="0 0 220 180" role="img" aria-label="Animated empty digital products illustration" className="w-full h-full">
        <FloatingBits color="#38bdf8" />
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 5;0 -5;0 5" dur="3.6s" repeatCount="indefinite" />
          <path d="M70 138h88c14 0 25-10 25-23 0-12-9-22-21-23-4-20-21-35-42-35-18 0-34 11-40 28-17 1-31 13-31 28 0 14 10 25 21 25z" fill="#e0f2fe" opacity="0.95" />
          <rect x="88" y="66" width="52" height="68" rx="8" fill="white" stroke="#38bdf8" strokeWidth="4" />
          <path d="M126 66v18h14" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <path d="M98 96h30M98 108h24M98 120h18" stroke="#64748b" strokeWidth="4" strokeLinecap="round" opacity="0.65" />
        </g>
        <path d="M112 32v18M102 42l10 10 10-10" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <animateTransform attributeName="transform" type="translate" values="0 0;0 10;0 0" dur="2.2s" repeatCount="indefinite" />
        </path>
      </svg>
    );
  }

  if (type === 'service') {
    return (
      <svg viewBox="0 0 220 180" role="img" aria-label="Animated empty services illustration" className="w-full h-full">
        <FloatingBits color="#10b981" />
        <rect x="62" y="56" width="96" height="88" rx="12" fill="#ecfdf5" stroke="#10b981" strokeWidth="4" />
        <path d="M62 80h96M86 48v20M134 48v20" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-8 118 112;8 118 112;-8 118 112" dur="3s" repeatCount="indefinite" />
          <path d="M94 126l42-42 14 14-42 42H94v-14z" fill="#D9A56A" />
          <path d="M132 88l14 14" stroke="#6f4318" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
        </g>
        <circle cx="86" cy="104" r="5" fill="#10b981" opacity="0.35" />
        <circle cx="110" cy="104" r="5" fill="#10b981" opacity="0.35" />
      </svg>
    );
  }

  if (type === 'external') {
    return (
      <svg viewBox="0 0 220 180" role="img" aria-label="Animated empty external products illustration" className="w-full h-full">
        <FloatingBits color="#d946ef" />
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0;8 -4;0 0" dur="3.4s" repeatCount="indefinite" />
          <rect x="48" y="76" width="58" height="54" rx="10" fill="#fae8ff" stroke="#d946ef" strokeWidth="4" />
          <rect x="116" y="52" width="58" height="54" rx="10" fill="#fff7ed" stroke="#D9A56A" strokeWidth="4" />
          <path d="M94 92c16-20 30-28 44-24" fill="none" stroke="#d946ef" strokeWidth="5" strokeLinecap="round" strokeDasharray="9 8">
            <animate attributeName="stroke-dashoffset" values="0;-34" dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M146 70h18v18M164 70l-30 30" stroke="#D9A56A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    );
  }

  if (type === 'server-error') {
    return (
      <svg viewBox="0 0 220 180" role="img" aria-label="Animated server error illustration" className="w-full h-full">
        <FloatingBits color="#ef4444" />
        <rect x="64" y="50" width="92" height="86" rx="12" fill="#fee2e2" stroke="#ef4444" strokeWidth="4" />
        {[68, 92, 116].map((y, index) => (
          <g key={y}>
            <rect x="78" y={y} width="64" height="12" rx="5" fill="white" opacity="0.95" />
            <circle cx="132" cy={y + 6} r="3" fill={index === 1 ? '#ef4444' : '#D9A56A'}>
              <animate attributeName="opacity" values="1;0.25;1" dur={`${1.2 + index * 0.3}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
        <path d="M84 146l52-104" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" opacity="0.75">
          <animate attributeName="opacity" values="0.35;0.85;0.35" dur="1.6s" repeatCount="indefinite" />
        </path>
      </svg>
    );
  }

  if (type === 'timeout') {
    return (
      <svg viewBox="0 0 220 180" role="img" aria-label="Animated request timeout illustration" className="w-full h-full">
        <FloatingBits color="#D9A56A" />
        <circle cx="110" cy="92" r="46" fill="#fff7ed" stroke="#D9A56A" strokeWidth="5" />
        <path d="M110 65v30l22 14" stroke="#92400e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <animateTransform attributeName="transform" type="rotate" values="0 110 92;360 110 92" dur="4s" repeatCount="indefinite" />
        </path>
        <circle cx="110" cy="92" r="6" fill="#D9A56A" />
        <circle cx="110" cy="46" r="5" fill="#D9A56A">
          <animateTransform attributeName="transform" type="rotate" values="0 110 92;360 110 92" dur="2.8s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }

  if (type === 'network-error') {
    return (
      <svg viewBox="0 0 220 180" role="img" aria-label="Animated network error illustration" className="w-full h-full">
        <FloatingBits color="#38bdf8" />
        <path d="M64 84c26-22 66-22 92 0" fill="none" stroke="#38bdf8" strokeWidth="8" strokeLinecap="round" opacity="0.25">
          <animate attributeName="opacity" values="0.18;0.55;0.18" dur="2s" repeatCount="indefinite" />
        </path>
        <path d="M82 104c16-14 40-14 56 0" fill="none" stroke="#38bdf8" strokeWidth="8" strokeLinecap="round" opacity="0.45">
          <animate attributeName="opacity" values="0.55;0.18;0.55" dur="2s" repeatCount="indefinite" />
        </path>
        <path d="M101 124c6-5 12-5 18 0" fill="none" stroke="#38bdf8" strokeWidth="8" strokeLinecap="round" />
        <path d="M78 136l64-88" stroke="#ef4444" strokeWidth="7" strokeLinecap="round">
          <animate attributeName="opacity" values="0.35;0.95;0.35" dur="1.5s" repeatCount="indefinite" />
        </path>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 180" role="img" aria-label="Animated empty marketplace illustration" className="w-full h-full">
      <FloatingBits />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 4;0 -4;0 4" dur="3.6s" repeatCount="indefinite" />
        <rect x="54" y="60" width="112" height="76" rx="12" fill="#f5f3ff" stroke="var(--brand-primary)" strokeWidth="4" />
        <path d="M72 86h76M72 112h76" stroke="var(--brand-primary)" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
        <rect x="82" y="74" width="28" height="24" rx="6" fill="#D9A56A" />
        <rect x="118" y="100" width="28" height="24" rx="6" fill="#a78bfa" />
        <path d="M54 60l18-24h76l18 24" fill="#ede9fe" stroke="var(--brand-primary)" strokeWidth="4" strokeLinejoin="round" />
      </g>
      <path d="M80 148h60" stroke="var(--text-muted)" strokeWidth="8" strokeLinecap="round" opacity="0.18" />
    </svg>
  );
};

const MarketplaceState = ({
  type = 'overall',
  query = '',
  activeTypeLabel = '',
  hasFilters = false,
  onClearFilters,
  onRetry,
}) => {
  const copy = STATE_COPY[type] || STATE_COPY.overall;
  const Icon = copy.icon;
  const failure = isFailureState(type);
  const searched = query.trim();
  const title = searched && !failure ? `No results for "${searched}"` : copy.title;
  const body = searched && !failure
    ? `No ${activeTypeLabel ? activeTypeLabel.toLowerCase() : 'products'} matched this search. Try a different phrase or clear the filters.`
    : copy.body;

  return (
    <section className="mx-auto max-w-3xl py-14 sm:py-20">
      <div className="grid gap-6 p-5 sm:grid-cols-[220px_1fr] sm:items-center sm:p-7">
        <div className="mx-auto h-44 w-56 max-w-full">
          <MarketplaceArt type={type} />
        </div>
        <div className="text-center sm:text-left">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold shadow-sm shadow-black/5 dark:shadow-black/20 ${copy.tone}`}>
            <Icon size={12} />
            {copy.eyebrow}
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>

          <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row sm:items-start sm:justify-start">
            {failure && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                <FaRedoAlt size={12} />
                Retry
              </button>
            )}
            {!failure && (hasFilters || searched) && (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                <FaTimes size={12} />
                Clear filters
              </button>
            )}
            {!failure && !hasFilters && !searched && (
              <LinkLikeButton onClick={onRetry} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const LinkLikeButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)]"
  >
    <FaRedoAlt size={12} />
    Refresh
  </button>
);

export default MarketplaceState;
