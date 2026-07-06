import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FaCheckCircle,
  FaChevronRight,
  FaClock,
  FaExclamationTriangle,
  FaLayerGroup,
  FaLifeRing,
  FaThumbsDown,
  FaThumbsUp,
} from 'react-icons/fa';
import {
  getArticle,
  getCategory,
  getCategoryArticles,
} from '../content/helpCenterContent';
import { HelpArticleRow } from './HelpCenter';
import './HelpCenter.css';

const sectionId = (heading = '') =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const addReference = (target, reference) => {
  if (!reference || !/^\/(contact|report|appeals)(\?|$)/.test(target)) return target;
  const separator = target.includes('?') ? '&' : '?';
  return `${target}${separator}reference=${encodeURIComponent(reference)}`;
};

const asWords = (values = []) => values.filter(Boolean).join(', ');

const countOverlap = (left = [], right = []) => {
  const rightValues = new Set(right.map((value) => String(value).toLowerCase()));
  return left.filter((value) => rightValues.has(String(value).toLowerCase())).length;
};

const getRelatedArticles = (item) =>
  getCategoryArticles(item.category)
    .filter((entry) => entry.slug !== item.slug)
    .map((entry) => ({
      entry,
      score:
        countOverlap(item.keywords, entry.keywords) * 4 +
        countOverlap(item.audiences, entry.audiences) * 2 +
        countOverlap(item.platforms, entry.platforms) +
        (entry.featured ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, 3)
    .map(({ entry }) => entry);

const supportCategoryByHelpCategory = {
  'account-access': 'Account and sign-in',
  'privacy-security': 'Account and sign-in',
  'marketplace-buyers': 'Marketplace order or payment',
  selling: 'Seller account or payout',
  android: 'Android app',
  developers: 'Technical issue or bug',
};

const includesAny = (values = [], terms = []) => {
  const text = values.join(' ').toLowerCase();
  return terms.some((term) => text.includes(term));
};

const getEscalationActions = (item) => {
  const category = supportCategoryByHelpCategory[item.category] || 'Technical issue or bug';
  const encodedCategory = encodeURIComponent(category);
  const textParts = [
    item.title,
    item.summary,
    item.category,
    ...(item.keywords || []),
    ...(item.audiences || []),
  ];
  const actions = [
    {
      label: 'Contact support',
      helpText: 'Send details when the guide does not resolve the issue.',
      to: `/contact?category=${encodedCategory}`,
      icon: FaLifeRing,
    },
  ];

  if (
    includesAny(textParts, [
      'abuse',
      'fraud',
      'harassment',
      'threat',
      'unsafe',
      'report',
      'impersonation',
      'phishing',
    ])
  ) {
    actions.push({
      label: 'Report a safety issue',
      helpText: 'Use this for abuse, fraud, threats, impersonation, or unsafe content.',
      to: '/report',
      icon: FaExclamationTriangle,
    });
  }

  if (
    includesAny(textParts, [
      'appeal',
      'suspension',
      'rejected',
      'revocation',
      'enforcement',
      'removed',
    ])
  ) {
    actions.push({
      label: 'Appeal a decision',
      helpText: 'Ask for review of an account, content, seller, or marketplace decision.',
      to: '/appeals',
      icon: FaCheckCircle,
    });
  }

  return actions;
};

const feedbackKey = (slug) => `lekhon-help-feedback:${slug}`;

const HelpArticleFeedback = ({ slug }) => {
  const [selected, setSelected] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(feedbackKey(slug)) || 'null');
      setSelected(stored?.value || '');
    } catch {
      setSelected('');
    }
  }, [slug]);

  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(false), 3200);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const saveFeedback = (value) => {
    setSelected(value);
    setSaved(true);
    try {
      localStorage.setItem(
        feedbackKey(slug),
        JSON.stringify({
          value,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      // Feedback is helpful but should never block reading the guide.
    }
  };

  return (
    <section className="help-feedback" aria-labelledby="help-feedback-title">
      <div>
        <h2 id="help-feedback-title">Was this guide helpful?</h2>
        <p>
          Your answer is saved on this device. Lekhon will connect this to
          review analytics only after the privacy and consent flow is approved.
        </p>
      </div>
      <div className="help-feedback__actions" role="group" aria-label="Rate this Help guide">
        <button
          type="button"
          className={selected === 'helpful' ? 'is-selected' : ''}
          aria-pressed={selected === 'helpful'}
          onClick={() => saveFeedback('helpful')}
        >
          <FaThumbsUp aria-hidden="true" />
          Helpful
        </button>
        <button
          type="button"
          className={selected === 'notHelpful' ? 'is-selected' : ''}
          aria-pressed={selected === 'notHelpful'}
          onClick={() => saveFeedback('notHelpful')}
        >
          <FaThumbsDown aria-hidden="true" />
          Not helpful
        </button>
      </div>
      {saved ? (
        <p className="help-feedback__saved" role="status">
          <FaCheckCircle aria-hidden="true" />
          Thanks. Your feedback was saved on this device.
        </p>
      ) : null}
    </section>
  );
};

const HelpEscalationPanel = ({ item, sourceReference }) => {
  const actions = getEscalationActions(item);

  return (
    <section className="help-escalation" aria-labelledby="help-escalation-title">
      <div>
        <p className="help-eyebrow">Need a human review?</p>
        <h2 id="help-escalation-title">Choose the next safe action</h2>
        <p>
          Keep passwords, one-time codes, API keys, and full payment details out
          of support messages and screenshots.
        </p>
      </div>
      <div className="help-escalation__actions">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.to} to={addReference(action.to, sourceReference)}>
              <Icon aria-hidden="true" />
              <span>
                <strong>{action.label}</strong>
                <small>{action.helpText}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const HelpArticle = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const item = getArticle(slug);
  const sourceReference = searchParams.get('reference') || '';
  const related = useMemo(() => (item ? getRelatedArticles(item) : []), [item]);

  if (!item) return <Navigate to="/help" replace />;

  const category = getCategory(item.category);

  return (
    <main className="help-page">
      <section className="help-hero">
        <div className="help-shell py-9 sm:py-12">
          <nav className="help-breadcrumbs mb-5" aria-label="Breadcrumb">
            <Link to="/help">Help Center</Link>
            <FaChevronRight size={10} aria-hidden="true" />
            <Link to={`/help/category/${category?.id}`}>{category?.title}</Link>
            <FaChevronRight size={10} aria-hidden="true" />
            <span aria-current="page">{item.title}</span>
          </nav>
          <h1 className="m-0 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
            {item.title}
          </h1>
          <p className="mb-0 mt-3 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
            {item.summary}
          </p>
          <div className="help-meta mt-5">
            <span className="inline-flex items-center gap-2">
              <FaLayerGroup aria-hidden="true" /> {item.platforms.join(' + ')}
            </span>
            <span className="inline-flex items-center gap-2">
              <FaClock aria-hidden="true" /> Reviewed {item.lastReviewed}
            </span>
          </div>
        </div>
      </section>

      <div className="help-shell py-10 sm:py-12">
        <div className="help-article-layout">
          <article className="help-article-body">
            {item.sections.map((section) => {
              const id = sectionId(section.heading);
              return (
                <section key={id} id={id}>
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
                  {section.steps ? (
                    <ol>
                      {section.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : null}
                  {section.flow ? (
                    <div className="help-flow" aria-label={`${section.heading} workflow`}>
                      {section.flow.map((step, index) => (
                        <React.Fragment key={step}>
                          <div className="help-flow__step">
                            <span>{index + 1}</span>
                            <strong>{step}</strong>
                          </div>
                          {index < section.flow.length - 1 ? (
                            <FaChevronRight className="help-flow__arrow" aria-hidden="true" />
                          ) : null}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : null}
                  {section.actions ? (
                    <div className="help-article-actions" aria-label={`${section.heading} actions`}>
                      {section.actions.map((action) => (
                        <Link key={`${action.to}-${action.label}`} to={addReference(action.to, sourceReference)}>
                          {action.label}
                          <FaChevronRight aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  {section.note ? (
                    <div className="help-callout">
                      <strong>Note: </strong>
                      {section.note}
                    </div>
                  ) : null}
                  {section.warning ? (
                    <div className="help-callout help-callout--warning">
                      <strong>Important: </strong>
                      {section.warning}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </article>

          <aside className="help-toc" aria-label="On this page">
            <div className="help-article-facts" aria-label="Guide details">
              <dl>
                <div>
                  <dt>Topic</dt>
                  <dd>{category?.title}</dd>
                </div>
                <div>
                  <dt>Applies to</dt>
                  <dd>{asWords(item.platforms)}</dd>
                </div>
                <div>
                  <dt>Useful for</dt>
                  <dd>{asWords(item.audiences)}</dd>
                </div>
                <div>
                  <dt>Reviewed</dt>
                  <dd>{item.lastReviewed}</dd>
                </div>
              </dl>
            </div>
            <p className="mb-2 mt-0 text-xs font-black uppercase text-[var(--text-muted)]">
              On this page
            </p>
            {item.sections.map((section) => (
              <a key={section.heading} href={`#${sectionId(section.heading)}`}>
                {section.heading}
              </a>
            ))}
            <div className="mt-5 border-t border-[var(--border-default)] pt-4">
              <Link
                to="/contact"
                className="text-sm font-extrabold text-[var(--help-link-color)] no-underline"
              >
                Still need help?
              </Link>
            </div>
          </aside>
        </div>

        <HelpEscalationPanel item={item} sourceReference={sourceReference} />

        <HelpArticleFeedback slug={item.slug} />

        {related.length ? (
          <section className="pt-12" aria-labelledby="related-guides-title">
            <h2 id="related-guides-title" className="m-0 text-xl font-black">
              Related guides
            </h2>
            <div className="help-article-list mt-3">
              {related.map((entry) => (
                <HelpArticleRow key={entry.slug} item={entry} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default HelpArticle;
