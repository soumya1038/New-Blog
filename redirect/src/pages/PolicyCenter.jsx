import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaBookOpen, FaExclamationTriangle } from 'react-icons/fa';
import { policyDocuments } from '../content/policyContent';
import './HelpCenter.css';

const PolicyCenter = () => (
  <main className="help-page">
    <section className="help-hero">
      <div className="help-shell py-10 sm:py-14">
        <div className="mb-4 flex items-center gap-3 text-[var(--help-link-color)]">
          <FaBookOpen aria-hidden="true" />
          <span className="text-sm font-extrabold">Rules and policies</span>
        </div>
        <h1 className="m-0 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
          Understand the rules that govern Lekhon.
        </h1>
        <p className="mb-0 mt-3 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
          Published policies apply as stated on their pages. Documents marked
          in review are listed for transparency and are not presented as final
          binding text.
        </p>
      </div>
    </section>

    <div className="help-shell py-10 sm:py-12">
      <div className="help-callout help-callout--warning mb-6">
        <strong>Policy program in progress: </strong>
        Lekhon's current Privacy Policy and Terms of Service are published.
        Marketplace, seller, AI, community, copyright, refund, and API policies
        require product and specialist review before final publication.
      </div>

      <section aria-labelledby="policy-list-title">
        <h2 id="policy-list-title" className="m-0 text-2xl font-black">
          Policy directory
        </h2>
        <div className="mt-4 border-t border-[var(--border-default)]">
          {policyDocuments.map((entry) => (
            <div
              className={`help-policy-row ${entry.isBinding ? 'is-published' : 'is-draft'}`}
              key={entry.slug}
            >
              <div>
                <h3 className="m-0 text-base font-black">{entry.title}</h3>
                <p className="mb-0 mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {entry.summary}
                </p>
                <div className="help-policy-row__meta">
                  <span className={`help-status ${entry.isBinding ? 'help-status--published' : 'help-status--draft'}`}>
                    {entry.publicLabel}
                  </span>
                  <span>Effective: {entry.effectiveDate}</span>
                  {!entry.isBinding && entry.blockingDecisionIds.length ? (
                    <span>{entry.blockingDecisionIds.length} approval blocker{entry.blockingDecisionIds.length === 1 ? '' : 's'}</span>
                  ) : null}
                </div>
              </div>
              {entry.href || entry.sections.length ? (
                <Link
                  to={entry.href || `/policies/${entry.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--help-link-color)] no-underline"
                >
                  {entry.actionLabel} <FaArrowRight aria-hidden="true" />
                </Link>
              ) : (
                <span className="help-status">{entry.status}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-[var(--border-default)] pt-8">
        <div className="flex gap-3">
          <FaExclamationTriangle
            className="mt-1 shrink-0 text-[var(--help-link-color)]"
            aria-hidden="true"
          />
          <div>
            <h2 className="m-0 text-lg font-black">Need a rule explained?</h2>
            <p className="mb-0 mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Contact support with the feature, transaction, or policy section
              involved. Support cannot create a private exception to published
              rules, but can help explain the available workflow.
            </p>
            <Link
              to="/contact"
              className="mt-3 inline-flex text-sm font-extrabold text-[var(--help-link-color)] no-underline"
            >
              Contact support
            </Link>
          </div>
        </div>
      </section>
    </div>
  </main>
);

export default PolicyCenter;
