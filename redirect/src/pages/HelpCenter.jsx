import React, { useDeferredValue, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FaArrowRight,
  FaBookOpen,
  FaCode,
  FaComments,
  FaCompass,
  FaMobileAlt,
  FaPenNib,
  FaRobot,
  FaSearch,
  FaShieldAlt,
  FaShoppingCart,
  FaStore,
  FaTimes,
  FaUserCircle,
} from 'react-icons/fa';
import {
  helpArticles,
  helpCategories,
  searchHelpArticles,
} from '../content/helpCenterContent';
import './HelpCenter.css';

const iconMap = {
  compass: FaCompass,
  account: FaUserCircle,
  shield: FaShieldAlt,
  write: FaPenNib,
  community: FaComments,
  ai: FaRobot,
  cart: FaShoppingCart,
  store: FaStore,
  mobile: FaMobileAlt,
  code: FaCode,
};

const SearchBox = ({ value, onChange, autoFocus = false }) => (
  <div className="help-search">
    <FaSearch aria-hidden="true" />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search sign-in, publishing, orders, selling, Android..."
      aria-label="Search the Lekhon Help Center"
      autoFocus={autoFocus}
    />
    {value ? (
      <button
        type="button"
        className="help-search__clear"
        onClick={() => onChange('')}
        aria-label="Clear search"
        title="Clear search"
      >
        <FaTimes />
      </button>
    ) : null}
  </div>
);

export const HelpArticleRow = ({ item }) => {
  const category = helpCategories.find((entry) => entry.id === item.category);
  return (
    <Link className="help-article-row" to={`/help/article/${item.slug}`}>
      <div>
        <h3 className="m-0 text-base font-extrabold text-[var(--text-primary)]">
          {item.title}
        </h3>
        <p className="mb-0 mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          {item.summary}
        </p>
        <div className="help-meta mt-2">
          <span>{category?.title}</span>
          <span>{item.platforms.join(' + ')}</span>
        </div>
      </div>
      <FaArrowRight aria-hidden="true" className="text-[var(--help-link-color)]" />
    </Link>
  );
};

const HelpCenter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () => searchHelpArticles(deferredQuery),
    [deferredQuery]
  );
  const featured = useMemo(
    () => helpArticles.filter((item) => item.featured).slice(0, 8),
    []
  );

  const updateQuery = (nextQuery) => {
    setQuery(nextQuery);
    const next = new URLSearchParams(searchParams);
    if (nextQuery.trim()) next.set('q', nextQuery);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const searching = Boolean(deferredQuery.trim());

  return (
    <main className="help-page">
      <section className="help-hero">
        <div className="help-shell py-12 sm:py-16">
          <div className="mb-4 flex items-center gap-3 text-[var(--help-link-color)]">
            <FaBookOpen aria-hidden="true" />
            <span className="text-sm font-extrabold">Lekhon Help Center</span>
          </div>
          <h1 className="m-0 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
            Find the right answer and get back to what you were doing.
          </h1>
          <p className="mb-7 mt-3 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            Search verified guidance for the website, Android app, publishing,
            community, marketplace, sellers, account safety, and policies.
          </p>
          <SearchBox value={query} onChange={updateQuery} />
        </div>
      </section>

      <div className="help-shell py-10 sm:py-12">
        {searching ? (
          <section aria-live="polite">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="m-0 text-2xl font-black">Search results</h2>
                <p className="mb-0 mt-1 text-sm text-[var(--text-secondary)]">
                  {results.length
                    ? `${results.length} result${results.length === 1 ? '' : 's'} for "${deferredQuery}"`
                    : `No verified guide matches "${deferredQuery}"`}
                </p>
              </div>
              <Link
                to="/contact"
                className="text-sm font-extrabold text-[var(--help-link-color)] no-underline"
              >
                Contact support
              </Link>
            </div>
            {results.length ? (
              <div className="help-article-list">
                {results.map((item) => (
                  <HelpArticleRow key={item.slug} item={item} />
                ))}
              </div>
            ) : (
              <div className="border-y border-[var(--border-default)] py-10">
                <p className="m-0 max-w-2xl leading-7 text-[var(--text-secondary)]">
                  Try a shorter phrase, an exact error message, or a related
                  term such as "refund," "Google sign-in," "draft," "payout,"
                  or "Android permission."
                </p>
              </div>
            )}
          </section>
        ) : (
          <>
            <section aria-labelledby="help-categories-title">
              <div className="mb-5">
                <h2 id="help-categories-title" className="m-0 text-2xl font-black">
                  Browse by topic
                </h2>
                <p className="mb-0 mt-1 text-sm text-[var(--text-secondary)]">
                  Choose the part of Lekhon you are working with.
                </p>
              </div>
              <div className="help-grid">
                {helpCategories.map((category) => {
                  const Icon = iconMap[category.icon] || FaBookOpen;
                  const count = helpArticles.filter(
                    (item) => item.category === category.id
                  ).length;
                  return (
                    <Link
                      key={category.id}
                      className="help-category"
                      to={`/help/category/${category.id}`}
                    >
                      <span className="help-category__icon">
                        <Icon aria-hidden="true" />
                      </span>
                      <h3 className="m-0 text-lg font-black">{category.title}</h3>
                      <p className="mb-0 mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {category.summary}
                      </p>
                      <p className="mb-0 mt-3 text-xs font-extrabold text-[var(--text-muted)]">
                        {count} verified guide{count === 1 ? '' : 's'}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="pt-12" aria-labelledby="popular-help-title">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 id="popular-help-title" className="m-0 text-2xl font-black">
                    Common tasks
                  </h2>
                  <p className="mb-0 mt-1 text-sm text-[var(--text-secondary)]">
                    Start with the workflows users need most often.
                  </p>
                </div>
              </div>
              <div className="help-article-list">
                {featured.map((item) => (
                  <HelpArticleRow key={item.slug} item={item} />
                ))}
              </div>
            </section>

            <section className="pt-12" aria-label="More support options">
              <div className="help-action-band">
                <Link to="/safety">
                  <FaShieldAlt
                    className="mb-3 text-xl text-[var(--help-link-color)]"
                    aria-hidden="true"
                  />
                  <h3 className="m-0 text-base font-black">Safety Center</h3>
                  <p className="mb-0 mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Block, preserve evidence, and report abuse or fraud.
                  </p>
                </Link>
                <Link to="/policies">
                  <FaBookOpen
                    className="mb-3 text-xl text-[var(--help-link-color)]"
                    aria-hidden="true"
                  />
                  <h3 className="m-0 text-base font-black">Policies</h3>
                  <p className="mb-0 mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Read published rules and see which policy documents are in review.
                  </p>
                </Link>
                <Link to="/contact">
                  <FaComments
                    className="mb-3 text-xl text-[var(--help-link-color)]"
                    aria-hidden="true"
                  />
                  <h3 className="m-0 text-base font-black">Contact support</h3>
                  <p className="mb-0 mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Send account, product, payment, or technical details.
                  </p>
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default HelpCenter;

