import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBookmark,
  FaBoxOpen,
  FaFileAlt,
  FaNewspaper,
  FaShoppingBag,
  FaTimes,
  FaVideo,
} from 'react-icons/fa';
import { formatCompactCount } from '../hooks/useCurrentProfileSummary';
import { getSafeImageUrl } from '../utils/safeMediaUrls';

const TABS = [
  { id: 'products', label: 'Products', icon: FaShoppingBag },
  { id: 'articles', label: 'Articles', icon: FaFileAlt },
  { id: 'blogs', label: 'Blogs', icon: FaNewspaper },
  { id: 'shorts', label: 'Shorts', icon: FaVideo },
];

const SavedItemCard = ({ item, onOpen }) => {
  const safeImage = getSafeImageUrl(item.image);

  return (
    <Link
      to={item.path}
      onClick={onOpen}
      className="group flex gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 text-left text-[var(--text-primary)] shadow-sm transition hover:border-[var(--brand-primary)] hover:shadow-md"
    >
      {safeImage ? (
        <img src={safeImage} alt="" className="h-16 w-16 flex-shrink-0 rounded-xl object-cover bg-[var(--background-secondary)]" referrerPolicy="no-referrer" />
      ) : (
        <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-xl bg-[var(--background-secondary)] text-[var(--brand-primary)]">
          <FaBookmark />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="mb-1 inline-flex rounded-full bg-[var(--background-secondary)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[var(--brand-primary)]">
          {item.eyebrow}
        </span>
        <span className="block truncate text-sm font-black">{item.title}</span>
        <span className="mt-1 block truncate text-xs text-[var(--text-secondary)]">{item.subtitle}</span>
        {item.meta ? <span className="mt-1 block text-xs font-bold text-[var(--text-primary)]">{item.meta}</span> : null}
      </span>
    </Link>
  );
};

const SavedItemsModal = ({
  open,
  onClose,
  itemsByType = {},
  summary = {},
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const firstAvailable = TABS.find((tab) => (itemsByType[tab.id] || []).length > 0);
    setActiveTab(firstAvailable?.id || 'products');
  }, [itemsByType, open]);

  const activeItems = itemsByType[activeTab] || [];
  const total = Number(summary.total || 0);

  const tabs = useMemo(
    () => TABS.map((tab) => ({
      ...tab,
      count: (itemsByType[tab.id] || []).length,
    })),
    [itemsByType]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/45 p-0 backdrop-blur-md sm:items-center sm:p-4" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-items-title"
        className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-t-3xl border border-[var(--border-default)] bg-[var(--background-primary)] shadow-2xl sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand-primary)]">Saved library</p>
            <h2 id="saved-items-title" className="text-lg font-black text-[var(--text-primary)]">
              {formatCompactCount(total)} saved {total === 1 ? 'item' : 'items'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)]"
            aria-label="Close saved items"
          >
            <FaTimes />
          </button>
        </div>

        <div className="border-b border-[var(--border-default)] px-3 py-3">
          <div className="grid grid-cols-4 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-xs font-black transition ${
                    active
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                      : 'border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)]'
                  }`}
                >
                  <Icon />
                  <span className="truncate">{tab.label}</span>
                  <span className={active ? 'text-white/80' : 'text-[var(--text-muted)]'}>
                    {formatCompactCount(tab.count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading saved items">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="saved-items-skeleton rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3">
                  <span className="saved-items-skeleton__image h-16 w-16 rounded-xl" />
                  <span className="flex-1 space-y-2">
                    <i className="saved-items-skeleton__line block h-3 w-20 rounded-full" />
                    <i className="saved-items-skeleton__line block h-4 w-full rounded-full" />
                    <i className="saved-items-skeleton__line block h-3 w-2/3 rounded-full" />
                  </span>
                </div>
              ))}
            </div>
          ) : activeItems.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeItems.map((item) => (
                <SavedItemCard key={item.key} item={item} onOpen={onClose} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] px-5 py-8 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--background-secondary)] text-[var(--brand-primary)]">
                <FaBoxOpen />
              </span>
              <p className="mt-3 text-sm font-black text-[var(--text-primary)]">No saved {TABS.find((tab) => tab.id === activeTab)?.label.toLowerCase()} yet</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Items you save will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedItemsModal;
