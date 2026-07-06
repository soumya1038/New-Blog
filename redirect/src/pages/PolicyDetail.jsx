import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  FaChevronRight,
  FaExclamationTriangle,
  FaFileContract,
} from 'react-icons/fa';
import { getPolicyDocument } from '../content/policyContent';
import './HelpCenter.css';

const sectionId = (heading = '') =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const PolicyDetail = () => {
  const { slug } = useParams();
  const policy = getPolicyDocument(slug);

  if (!policy) return <Navigate to="/policies" replace />;
  if (policy.href) return <Navigate to={policy.href} replace />;

  return (
    <main className="help-page">
      <section className="help-hero">
        <div className="help-shell py-9 sm:py-12">
          <nav className="help-breadcrumbs mb-5" aria-label="Breadcrumb">
            <Link to="/policies">Policies</Link>
            <FaChevronRight size={10} aria-hidden="true" />
            <span aria-current="page">{policy.title}</span>
          </nav>
          <div className="mb-4 flex items-center gap-3 text-[var(--help-link-color)]">
            <FaFileContract aria-hidden="true" />
            <span className="text-sm font-extrabold">{policy.publicLabel}</span>
          </div>
          <h1 className="m-0 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
            {policy.title}
          </h1>
          <p className="mb-0 mt-3 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
            {policy.summary}
          </p>
          <div className="help-meta mt-5">
            <span>Publication state: {policy.publicLabel}</span>
            <span>Effective: {policy.effectiveDate}</span>
            <span>Reviewed: {policy.lastReviewed}</span>
            <span>Owners: {policy.owners.join(', ')}</span>
          </div>
        </div>
      </section>

      <div className="help-shell py-10 sm:py-12">
        <div className="help-callout help-callout--warning mb-9">
          <FaExclamationTriangle className="mr-2 inline" aria-hidden="true" />
          {policy.notice}
        </div>

        <div className="help-article-layout">
          <article className="help-article-body">
            {policy.sections.map((section) => (
              <section key={section.heading} id={sectionId(section.heading)}>
                <h2>{section.heading}</h2>
                {(section.paragraphs || []).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.unresolved ? (
                  <div className="help-callout help-callout--warning">
                    <strong>Decision required: </strong>
                    {section.unresolved}
                  </div>
                ) : null}
              </section>
            ))}
          </article>

          <aside className="help-toc" aria-label="Policy contents">
            <div className="help-policy-gate" aria-label="Publication gate">
              <p className="mb-2 mt-0 text-xs font-black uppercase text-[var(--text-muted)]">
                Publication gate
              </p>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>{policy.status}</dd>
                </div>
                <div>
                  <dt>Effective date</dt>
                  <dd>{policy.effectiveDate}</dd>
                </div>
                <div>
                  <dt>Approvals needed</dt>
                  <dd>{policy.approvalRequirements.join(', ')}</dd>
                </div>
                <div>
                  <dt>Blocking decisions</dt>
                  <dd>{policy.blockingDecisionIds.join(', ') || 'None'}</dd>
                </div>
              </dl>
            </div>
            <p className="mb-2 mt-0 text-xs font-black uppercase text-[var(--text-muted)]">
              In this draft
            </p>
            {policy.sections.map((section) => (
              <a key={section.heading} href={`#${sectionId(section.heading)}`}>
                {section.heading}
              </a>
            ))}
            <div className="mt-5 border-t border-[var(--border-default)] pt-4">
              <Link
                to="/contact"
                className="text-sm font-extrabold text-[var(--help-link-color)] no-underline"
              >
                Ask a policy question
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default PolicyDetail;
