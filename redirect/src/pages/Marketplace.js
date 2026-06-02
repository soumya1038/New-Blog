import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation }  from 'react-i18next';
import { AuthContext }     from '../context/AuthContext';
import api                 from '../services/api';
import ProductCard         from '../components/ProductCard';
import CartDrawer          from '../components/CartDrawer';
import { FaSearch, FaShoppingCart, FaFilter, FaTimes } from 'react-icons/fa';
import { BarLoader } from 'react-spinners';

const TYPES = [
  { value: '',         label: 'All' },
  { value: 'digital',  label: '💾 Digital'  },
  { value: 'physical', label: '📦 Physical' },
  { value: 'service',  label: '🛠 Services' },
  { value: 'external', label: '🔗 External' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest'       },
  { value: 'popular',   label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc',label: 'Price: High → Low' },
  { value: 'rating',    label: 'Top Rated'    },
];

const Marketplace = () => {
  const { t }   = useTranslation();
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const [products,    setProducts]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [cartCount,   setCartCount]   = useState(0);
  const [filterOpen,  setFilterOpen]  = useState(false);

  const [filters, setFilters] = useState({
    search:   searchParams.get('q')    || '',
    type:     searchParams.get('type') || '',
    minPrice: '',
    maxPrice: '',
    sort:     'createdAt',
    isFree:   false,
  });

  const fetchProducts = useCallback(async (pg = 1, reset = false) => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = filters.sort === 'price_asc'
        ? ['price', 'asc']
        : filters.sort === 'price_desc'
        ? ['price', 'desc']
        : [filters.sort, 'desc'];

      const params = {
        page:  pg,
        limit: 20,
        sort:  sortField,
        order: sortOrder,
        ...(filters.type     && { type:     filters.type }),
        ...(filters.search   && { search:   filters.search }),
        ...(filters.minPrice && { minPrice: filters.minPrice }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
        ...(filters.isFree   && { isFree:   'true' }),
      };

      const { data } = await api.get('/marketplace', { params });
      setProducts(prev => reset || pg === 1 ? data.products : [...prev, ...data.products]);
      setTotal(data.total);
      setPage(pg);
    } catch {}
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchProducts(1, true); }, [fetchProducts]);

  // Cart count badge
  useEffect(() => {
    if (!user) return;
    api.get('/marketplace/cart')
      .then(({ data }) => setCartCount(data.cart?.items?.length || 0))
      .catch(() => {});
  }, [user, cartOpen]);

  const handleAddToCart = () => setCartCount(c => c + 1);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const clearFilters = () => setFilters({
    search: '', type: '', minPrice: '', maxPrice: '', sort: 'createdAt', isFree: false,
  });

  const hasActiveFilters = filters.type || filters.minPrice || filters.maxPrice || filters.isFree;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold text-[var(--text-primary)] shrink-0">🛍️ Marketplace</h1>

          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchProducts(1, true)}
              placeholder="Search products, sellers…"
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Sort */}
          <select
            value={filters.sort}
            onChange={e => setFilter('sort', e.target.value)}
            className="py-2 px-3 rounded-xl text-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none hidden sm:block"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setFilterOpen(f => !f)}
            className={`p-2.5 rounded-xl border transition-colors ${hasActiveFilters ? 'bg-violet-600 border-violet-600 text-white' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}
          >
            <FaFilter size={13} />
          </button>

          {/* Cart */}
          {user && (
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors"
            >
              <FaShoppingCart size={15} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── Type tabs ──────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1.5 pb-2.5 overflow-x-auto scrollbar-hide">
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter('type', t.value)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors
                ${filters.type === t.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-violet-100 dark:hover:bg-violet-900/30'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter drawer ─────────────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="max-w-7xl mx-auto px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Min Price (₹)</label>
              <input
                type="number" min="0"
                value={filters.minPrice}
                onChange={e => setFilter('minPrice', e.target.value)}
                placeholder="0"
                className="w-28 px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Max Price (₹)</label>
              <input
                type="number" min="0"
                value={filters.maxPrice}
                onChange={e => setFilter('maxPrice', e.target.value)}
                placeholder="Any"
                className="w-28 px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={filters.isFree} onChange={e => setFilter('isFree', e.target.checked)} className="rounded" />
              Free only
            </label>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                <FaTimes size={10} /> Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading bar */}
      {loading && <BarLoader width="100%" color="#7c3aed" />}

      {/* ── Product grid ──────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-[var(--text-muted)]">
            <span className="text-5xl">🔍</span>
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Try different filters or search terms</p>
            <button onClick={clearFilters} className="mt-2 text-sm text-violet-600 hover:underline">Clear all filters</button>
          </div>
        ) : (
          <>
            {total > 0 && (
              <p className="text-xs text-[var(--text-muted)] mb-4">
                {total.toLocaleString()} product{total !== 1 ? 's' : ''} found
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map(p => (
                <ProductCard key={p._id} product={p} onAddToCart={handleAddToCart} />
              ))}
            </div>

            {/* Load more */}
            {products.length < total && (
              <div className="text-center mt-8">
                <button
                  onClick={() => fetchProducts(page + 1)}
                  disabled={loading}
                  className="px-8 py-3 rounded-xl border border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default Marketplace;
