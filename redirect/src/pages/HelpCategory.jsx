import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import {
  getCategory,
  getCategoryArticles,
} from '../content/helpCenterContent';
import { HelpArticleRow } from './HelpCenter';
import './HelpCenter.css';

const HelpCategory = () => {
  const { categoryId } = useParams();
  const category = getCategory(categoryId);
  const articles = getCategoryArticles(categoryId);

  if (!category) return <Navigate to="/help" replace />;

  return (
    <main className="help-page">
      <section className="help-hero">
        <div className="help-shell py-10 sm:py-12">
          <nav className="help-breadcrumbs mb-5" aria-label="Breadcrumb">
            <Link to="/help">Help Center</Link>
            <FaChevronRight size={10} aria-hidden="true" />
            <span aria-current="page">{category.title}</span>
          </nav>
          <h1 className="m-0 text-3xl font-black leading-tight sm:text-4xl">
            {category.title}
          </h1>
          <p className="mb-0 mt-3 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            {category.summary}
          </p>
        </div>
      </section>

      <div className="help-shell py-10 sm:py-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="m-0 text-xl font-black">Guides</h2>
            <p className="mb-0 mt-1 text-sm text-[var(--text-secondary)]">
              {articles.length} verified article{articles.length === 1 ? '' : 's'}
            </p>
          </div>
          <Link
            to="/help"
            className="text-sm font-extrabold text-[var(--help-link-color)] no-underline"
          >
            Search all help
          </Link>
        </div>
        <div className="help-article-list">
          {articles.map((item) => (
            <HelpArticleRow key={item.slug} item={item} />
          ))}
        </div>
      </div>
    </main>
  );
};

export default HelpCategory;

