import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthContext }     from '../context/AuthContext';
import api                 from '../services/api';
import ProductCard         from '../components/ProductCard';
import CartDrawer          from '../components/CartDrawer';
import MarketplaceState    from '../components/MarketplaceState';
import { FaBoxOpen, FaCheck, FaChevronDown, FaChevronRight, FaClock, FaExternalLinkAlt, FaFilePdf, FaFilter, FaSearch, FaShoppingBag, FaShoppingCart, FaSpinner, FaTag, FaTimes, FaWrench } from 'react-icons/fa';
import { BarLoader } from 'react-spinners';

const TYPES = [
  { value: '',         label: 'All',      icon: FaShoppingBag },
  { value: 'digital',  label: 'Digital',  icon: FaFilePdf },
  { value: 'physical', label: 'Physical', icon: FaBoxOpen },
  { value: 'service',  label: 'Services', icon: FaWrench },
  { value: 'external', label: 'External', icon: FaExternalLinkAlt },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest'       },
  { value: 'popular',   label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc',label: 'Price: High to Low' },
  { value: 'rating',    label: 'Top Rated'    },
];

const SEARCH_DEBOUNCE_MS = 1500;
const SEARCH_MIN_CHARS = 2;
const MARKETPLACE_REQUEST_TIMEOUT_MS = 15000;
const PERSONALIZATION_KEY = 'lekhon-marketplace-personalization:v1';
const PERSONALIZATION_LIMITS = {
  searches: 12,
  products: 20,
};

const emptyPersonalization = {
  version: 1,
  recentSearches: [],
  recentProducts: [],
  recommendedProducts: [],
  categoryCounts: {},
  typeCounts: {},
};

const loadPersonalization = () => {
  try {
    const raw = window.localStorage.getItem(PERSONALIZATION_KEY);
    if (!raw) return emptyPersonalization;
    const parsed = JSON.parse(raw);
    return {
      ...emptyPersonalization,
      ...parsed,
      recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches.slice(0, PERSONALIZATION_LIMITS.searches) : [],
      recentProducts: Array.isArray(parsed.recentProducts) ? parsed.recentProducts.slice(0, PERSONALIZATION_LIMITS.products) : [],
      recommendedProducts: Array.isArray(parsed.recommendedProducts) ? parsed.recommendedProducts.slice(0, PERSONALIZATION_LIMITS.products) : [],
      categoryCounts: parsed.categoryCounts && typeof parsed.categoryCounts === 'object' ? parsed.categoryCounts : {},
      typeCounts: parsed.typeCounts && typeof parsed.typeCounts === 'object' ? parsed.typeCounts : {},
    };
  } catch {
    return emptyPersonalization;
  }
};

const savePersonalization = (value) => {
  try {
    window.localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(value));
  } catch {}
};

const addRecentSearch = (state, query) => {
  const value = String(query || '').trim();
  if (!value) return state;
  return {
    ...state,
    recentSearches: [
      { value, ts: Date.now() },
      ...state.recentSearches.filter(item => item.value.toLowerCase() !== value.toLowerCase()),
    ].slice(0, PERSONALIZATION_LIMITS.searches),
  };
};

const addProductSignal = (state, product) => {
  if (!product?._id) return state;
  const nextCategoryCounts = { ...state.categoryCounts };
  const nextTypeCounts = { ...state.typeCounts };
  (product.category || []).forEach(category => {
    nextCategoryCounts[category] = (nextCategoryCounts[category] || 0) + 1;
  });
  if (product.type) nextTypeCounts[product.type] = (nextTypeCounts[product.type] || 0) + 1;

  return {
    ...state,
    categoryCounts: nextCategoryCounts,
    typeCounts: nextTypeCounts,
    recentProducts: [
      {
        id: product._id,
        title: product.title,
        slug: product.slug,
        thumbnail: product.thumbnail,
        price: product.price,
        type: product.type,
        viewedAt: Date.now(),
      },
      ...state.recentProducts.filter(item => item.id !== product._id),
    ].slice(0, PERSONALIZATION_LIMITS.products),
  };
};

const mergePersonalization = (localState, incoming = {}) => {
  const productMap = new Map();
  [...(incoming.recentProducts || []), ...(localState.recentProducts || [])].forEach(item => {
    if (!item?.id) return;
    const existing = productMap.get(item.id);
    if (!existing || new Date(item.viewedAt || 0) > new Date(existing.viewedAt || 0)) {
      productMap.set(item.id, item);
    }
  });

  const mergeCounts = (a = {}, b = {}) => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return Object.fromEntries([...keys].map(key => [key, Math.max(a[key] || 0, b[key] || 0)]));
  };

  return {
    ...localState,
    recentProducts: [...productMap.values()]
      .sort((a, b) => new Date(b.viewedAt || 0) - new Date(a.viewedAt || 0))
      .slice(0, PERSONALIZATION_LIMITS.products),
    recommendedProducts: Array.isArray(incoming.recommendedProducts)
      ? incoming.recommendedProducts.slice(0, PERSONALIZATION_LIMITS.products)
      : localState.recommendedProducts || [],
    categoryCounts: mergeCounts(localState.categoryCounts, incoming.categoryCounts),
    typeCounts: mergeCounts(localState.typeCounts, incoming.typeCounts),
  };
};

const getMarketplaceErrorType = (error) => {
  const status = error?.response?.status;
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || status === 408 || status === 504 || message.includes('timeout')) {
    return 'timeout';
  }

  if (!error?.response || code === 'ERR_NETWORK' || message.includes('network')) {
    return 'network-error';
  }

  if (status >= 500) {
    return 'server-error';
  }

  return 'server-error';
};

const Marketplace = () => {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const suggestionsRequestRef = useRef(0);
  const searchBoxRef = useRef(null);
  const sortBoxRef = useRef(null);
  const typeRailRef = useRef(null);
  const typeRailDragRef = useRef({
    isDown: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
  });

  const [products,    setProducts]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [marketplaceError, setMarketplaceError] = useState(null);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [cartCount,   setCartCount]   = useState(0);
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [sortOpen,    setSortOpen]    = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const [personalization, setPersonalization] = useState(loadPersonalization);

  const [filters, setFilters] = useState({
    search:   searchParams.get('q')    || '',
    type:     searchParams.get('type') || '',
    minPrice: '',
    maxPrice: '',
    sort:     'createdAt',
    isFree:   false,
  });

  const visibleSuggestions = useMemo(() => {
    if (searchInput.trim()) return suggestions;
    return personalization.recentSearches.map(item => ({
      type: 'recent',
      label: item.value,
      value: item.value,
    }));
  }, [personalization.recentSearches, searchInput, suggestions]);

  const updatePersonalization = useCallback((updater) => {
    setPersonalization(prev => {
      const next = updater(prev);
      savePersonalization(next);
      return next;
    });
  }, []);

  const applySearchPreview = useCallback((query) => {
    setFilters(prev => {
      if (prev.search === query) return prev;
      return { ...prev, search: query };
    });
  }, []);

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

      const { data } = await api.get('/marketplace', {
        params,
        timeout: MARKETPLACE_REQUEST_TIMEOUT_MS,
      });
      setProducts(prev => reset || pg === 1 ? data.products : [...prev, ...data.products]);
      setTotal(data.total);
      setPage(pg);
      setMarketplaceError(null);
    } catch (error) {
      const type = getMarketplaceErrorType(error);
      setMarketplaceError({ type, message: error?.response?.data?.message || error?.message || '' });
      if (reset || pg === 1) {
        setProducts([]);
        setTotal(0);
        setPage(1);
      }
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchProducts(1, true); }, [fetchProducts]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filters.search) nextParams.set('q', filters.search);
    if (filters.type) nextParams.set('type', filters.type);
    setSearchParams(nextParams, { replace: true });
  }, [filters.search, filters.type, setSearchParams]);

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setSuggestionsOpen(false);
        setHighlightedSuggestion(-1);
      }
      if (sortBoxRef.current && !sortBoxRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, []);

  useEffect(() => {
    const query = searchInput.trim();
    setHighlightedSuggestion(-1);

    if (query.length < SEARCH_MIN_CHARS) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      if (!query) applySearchPreview('');
      return undefined;
    }

    const requestId = suggestionsRequestRef.current + 1;
    suggestionsRequestRef.current = requestId;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSuggestionsLoading(true);
      applySearchPreview(query);
      try {
        const { data } = await api.get('/marketplace/suggestions', {
          params: { q: query, limit: 8 },
          signal: controller.signal,
        });
        if (suggestionsRequestRef.current === requestId) {
          setSuggestions(data.suggestions || []);
          setSuggestionsOpen(true);
        }
      } catch (err) {
        if (!controller.signal.aborted && suggestionsRequestRef.current === requestId) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted && suggestionsRequestRef.current === requestId) {
          setSuggestionsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [applySearchPreview, searchInput]);

  // Cart count badge
  useEffect(() => {
    if (!user) return;
    api.get('/marketplace/cart')
      .then(({ data }) => setCartCount(data.cart?.items?.length || 0))
      .catch(() => {});
  }, [user, cartOpen]);

  useEffect(() => {
    if (!user) return;
    api.get('/marketplace/personalization')
      .then(({ data }) => {
        if (data.personalization) {
          updatePersonalization(prev => mergePersonalization(prev, data.personalization));
        }
      })
      .catch(() => {});
  }, [user, updatePersonalization]);

  const handleAddToCart = () => setCartCount(c => c + 1);

  const commitSearch = useCallback((value) => {
    const query = String(value || '').trim();
    setSearchInput(query);
    setSuggestionsOpen(false);
    setSuggestions([]);
    setHighlightedSuggestion(-1);
    setFilters(prev => {
      return { ...prev, search: query };
    });
    if (query) updatePersonalization(prev => addRecentSearch(prev, query));
  }, [updatePersonalization]);

  const setFilter = (k, v) => {
    setFilters(prev => {
      return { ...prev, [k]: v };
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSuggestions([]);
    setSuggestionsOpen(false);
    setHighlightedSuggestion(-1);
    setFilters({
      search: '', type: '', minPrice: '', maxPrice: '', sort: 'createdAt', isFree: false,
    });
    setSearchParams({}, { replace: true });
  };

  const handleSuggestionSelect = (suggestion) => {
    if (!suggestion) return;
    commitSearch(suggestion.value || suggestion.label);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown' && visibleSuggestions.length > 0) {
      event.preventDefault();
      setHighlightedSuggestion(index => Math.min(index + 1, visibleSuggestions.length - 1));
      setSuggestionsOpen(true);
      return;
    }
    if (event.key === 'ArrowUp' && visibleSuggestions.length > 0) {
      event.preventDefault();
      setHighlightedSuggestion(index => Math.max(index - 1, 0));
      setSuggestionsOpen(true);
      return;
    }
    if (event.key === 'Escape') {
      setSuggestionsOpen(false);
      setHighlightedSuggestion(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = highlightedSuggestion >= 0 ? visibleSuggestions[highlightedSuggestion] : null;
      handleSuggestionSelect(selected || { value: searchInput });
    }
  };

  const handleProductView = useCallback((product) => {
    updatePersonalization(prev => addProductSignal(prev, product));
  }, [updatePersonalization]);

  const handleTypeRailWheel = (event) => {
    const rail = typeRailRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    rail.scrollLeft += event.deltaY;
  };

  const handleTypeRailMouseDown = (event) => {
    const rail = typeRailRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth) return;
    typeRailDragRef.current = {
      isDown: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: rail.scrollLeft,
    };
  };

  const stopTypeRailDrag = () => {
    const wasMoved = typeRailDragRef.current.moved;
    typeRailDragRef.current.isDown = false;
    if (wasMoved) {
      window.setTimeout(() => {
        typeRailDragRef.current.moved = false;
      }, 0);
    }
  };

  const handleTypeRailMouseMove = (event) => {
    const rail = typeRailRef.current;
    const drag = typeRailDragRef.current;
    if (!rail || !drag.isDown) return;

    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4) drag.moved = true;
    rail.scrollLeft = drag.scrollLeft - distance;
    if (drag.moved) event.preventDefault();
  };

  const handleTypeFilterClick = (event, value) => {
    if (typeRailDragRef.current.moved) {
      event.preventDefault();
      return;
    }
    setFilter('type', value);
  };

  const hasActiveFilters = filters.type || filters.minPrice || filters.maxPrice || filters.isFree;
  const selectedSortOption = SORT_OPTIONS.find(option => option.value === filters.sort) || SORT_OPTIONS[0];
  const selectedTypeOption = TYPES.find(type => type.value === filters.type);
  const emptyStateType = marketplaceError?.type || (filters.search && !filters.type ? 'search' : filters.type || 'overall');
  const hasMarketplaceState = !loading && (Boolean(marketplaceError) || products.length === 0);
  const showPersonalizedSections = !hasMarketplaceState && !filters.search;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 md:flex-nowrap md:gap-3">
          <h1 className="order-1 mr-auto md:mr-0 text-lg font-bold text-[var(--text-primary)] shrink-0 flex items-center gap-2">
            <FaShoppingBag className="text-violet-500" /> Marketplace
          </h1>

          {user && (
            <Link
              to="/my-orders"
              title="My Orders"
              aria-label="My Orders"
              className="order-2 inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] px-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors sm:px-3 md:order-2 whitespace-nowrap"
            >
              <FaBoxOpen size={13} />
              <span className="hidden lg:inline">My Orders</span>
            </Link>
          )}

          {/* Search */}
          <div ref={searchBoxRef} className="order-5 relative w-full md:order-3 md:min-w-[220px] md:flex-1">
            <FaSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchInput}
              onChange={e => {
                setSearchInput(e.target.value);
                setSuggestionsOpen(true);
              }}
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search products, sellers..."
              className="w-full pl-9 pr-10 py-2 rounded-xl text-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => commitSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-red-500"
                aria-label="Clear search"
              >
                <FaTimes size={12} />
              </button>
            )}

            {suggestionsOpen && (searchInput.trim().length >= SEARCH_MIN_CHARS || visibleSuggestions.length > 0) && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[90] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl shadow-black/15 ring-1 ring-black/5 dark:shadow-black/60 dark:ring-white/10">
                <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{searchInput.trim() ? 'Related searches' : 'Recent searches'}</span>
                  {suggestionsLoading && (
                    <span className="inline-flex items-center gap-1">
                      <FaSpinner className="animate-spin" size={10} /> Searching
                    </span>
                  )}
                </div>

                {visibleSuggestions.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto py-1">
                    {visibleSuggestions.map((suggestion, index) => {
                      const isProduct = suggestion.type === 'product';
                      const isHighlighted = index === highlightedSuggestion;
                      return (
                        <button
                          key={`${suggestion.type}-${suggestion.value || suggestion.label}-${index}`}
                          type="button"
                          onMouseDown={event => event.preventDefault()}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                            isHighlighted
                              ? 'bg-violet-50 dark:bg-violet-900/40'
                              : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]'
                          }`}
                        >
                          {isProduct ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] shrink-0">
                              {suggestion.thumbnail ? (
                                <img src={suggestion.thumbnail} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full grid place-items-center text-[var(--text-muted)]">
                                  <FaShoppingBag size={14} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] grid place-items-center text-violet-500 shrink-0">
                              {suggestion.type === 'recent' ? <FaClock size={14} /> : <FaTag size={14} />}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{suggestion.label}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {isProduct
                                ? suggestion.isFree ? 'Free product' : `Rs. ${Number(suggestion.price || 0).toLocaleString('en-IN')}`
                                : suggestion.type === 'category' ? `${suggestion.count || 0} product matches` : 'Search suggestion'}
                            </p>
                          </div>
                          <FaChevronRight size={11} className="text-[var(--text-muted)] shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-sm text-[var(--text-muted)]">
                    {suggestionsLoading ? 'Looking for close matches...' : 'Press Enter to search this term.'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sort */}
          <div ref={sortBoxRef} className="order-4 relative hidden w-40 md:block lg:w-44">
            <button
              type="button"
              onClick={() => setSortOpen(open => !open)}
              className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:hover:border-violet-700"
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
            >
              <span className="truncate">{selectedSortOption.label}</span>
              <FaChevronDown size={11} className={`text-[var(--text-muted)] transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>

            {sortOpen && (
              <div
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-[95] w-full overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-1 shadow-2xl shadow-black/15 ring-1 ring-black/5 dark:shadow-black/60 dark:ring-white/10"
                role="listbox"
              >
                {SORT_OPTIONS.map(option => {
                  const isSelected = filters.sort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setFilter('sort', option.value);
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-violet-600 text-white'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && <FaCheck size={11} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setFilterOpen(f => !f)}
            aria-label="Open marketplace filters"
            className={`order-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors md:order-5 ${hasActiveFilters ? 'bg-violet-600 border-violet-600 text-white' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}
          >
            <FaFilter size={13} className="shrink-0" />
          </button>

          {/* Cart */}
          {user && (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
              className="order-4 relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors md:order-6"
            >
              <FaShoppingCart size={15} className="shrink-0" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── Type tabs ──────────────────────────────────────────────────────── */}
        <div
          ref={typeRailRef}
          onWheel={handleTypeRailWheel}
          onMouseDown={handleTypeRailMouseDown}
          onMouseMove={handleTypeRailMouseMove}
          onMouseUp={stopTypeRailDrag}
          onMouseLeave={stopTypeRailDrag}
          className="max-w-7xl mx-auto flex cursor-grab select-none gap-2 overflow-x-auto overscroll-x-contain px-3 pb-3 pr-8 scrollbar-hide touch-pan-x active:cursor-grabbing sm:px-4 sm:pr-4"
        >
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={(event) => handleTypeFilterClick(event, t.value)}
              className={`inline-flex shrink-0 items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-semibold leading-none transition-colors sm:px-4
                ${filters.type === t.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-violet-100 dark:hover:bg-violet-900/30'}`}
            >
              <span className="inline-flex items-center justify-center gap-1.5 leading-none">
                {t.icon && <t.icon size={11} className="shrink-0" />}
                {t.label}
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* ── Filter drawer ─────────────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="max-w-7xl mx-auto border-b border-[var(--border-color)] bg-[var(--bg-card)]/98 px-3 py-2 shadow-sm shadow-black/5 dark:shadow-black/20 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full md:hidden">
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Sort by</label>
              <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
                {SORT_OPTIONS.map(option => {
                  const isSelected = filters.sort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilter('sort', option.value)}
                      className={`min-h-8 rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                        isSelected
                          ? 'border-violet-600 bg-violet-600 text-white'
                          : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-violet-300 dark:hover:border-violet-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 transition-colors focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20">
              <span className="whitespace-nowrap text-[11px] font-medium text-[var(--text-muted)]">Min</span>
              <input
                type="number" min="0"
                value={filters.minPrice}
                onChange={e => setFilter('minPrice', e.target.value)}
                placeholder="0"
                aria-label="Min Price Rs."
                className="h-full w-14 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 transition-colors focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20">
              <span className="whitespace-nowrap text-[11px] font-medium text-[var(--text-muted)]">Max</span>
              <input
                type="number" min="0"
                value={filters.maxPrice}
                onChange={e => setFilter('maxPrice', e.target.value)}
                placeholder="Any"
                aria-label="Max Price Rs."
                className="h-full w-16 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-violet-300 dark:hover:border-violet-700">
              <input type="checkbox" checked={filters.isFree} onChange={e => setFilter('isFree', e.target.checked)} className="rounded accent-violet-600" />
              Free only
            </label>
            {hasActiveFilters && (
              <button onClick={handleClearFilters} className="inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
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
        {personalization.recommendedProducts.length > 0 && showPersonalizedSections && (
          <section className="mb-8">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">For you</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {personalization.recommendedProducts.slice(0, 5).map(product => (
                <ProductCard
                  key={`recommended-${product._id || product.id}`}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onProductView={handleProductView}
                />
              ))}
            </div>
          </section>
        )}

        {personalization.recentProducts.length > 0 && showPersonalizedSections && (
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Recently viewed</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {personalization.recentProducts
                .filter(item => item.slug && item.title)
                .slice(0, 8)
                .map(item => (
                  <Link
                    key={item.id}
                    to={`/marketplace/${item.slug}`}
                    className="shrink-0 w-56 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg transition-all overflow-hidden"
                  >
                    <div className="h-24 bg-[var(--bg-secondary)]">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-[var(--text-muted)]">
                          <FaShoppingBag size={18} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2 min-h-[2rem]">{item.title}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {item.isFree ? 'Free' : `Rs. ${Number(item.price || 0).toLocaleString('en-IN')}`}
                        </span>
                        {item.type && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] capitalize">
                            {item.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        )}

        {hasMarketplaceState ? (
          <MarketplaceState
            type={emptyStateType}
            query={filters.search}
            activeTypeLabel={selectedTypeOption?.label || ''}
            hasFilters={Boolean(hasActiveFilters)}
            onClearFilters={handleClearFilters}
            onRetry={() => fetchProducts(1, true)}
          />
        ) : (
          <>
            {total > 0 && (
              <p className="text-xs text-[var(--text-muted)] mb-4">
                {total.toLocaleString()} product{total !== 1 ? 's' : ''} found
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map(p => (
                <ProductCard key={p._id} product={p} onAddToCart={handleAddToCart} onProductView={handleProductView} />
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
                  {loading ? 'Loading...' : 'Load more'}
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
