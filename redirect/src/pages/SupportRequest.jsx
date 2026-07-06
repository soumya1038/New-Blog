import React, { useContext, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FaCheckCircle, FaPaperPlane } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './HelpCenter.css';

const modeConfig = {
  contact: {
    title: 'Contact Lekhon support',
    summary: 'Send an account, technical, publishing, marketplace, seller, or Android question.',
    type: 'support',
    button: 'Send request',
  },
  report: {
    title: 'Report abuse, unsafe content, or marketplace fraud',
    summary: 'Provide the exact account, content, message, product, review, or order involved.',
    type: 'report',
    button: 'Submit report',
  },
  appeal: {
    title: 'Submit an appeal',
    summary: 'Request review of a warning, suspension, content removal, seller decision, or other enforcement action.',
    type: 'appeal',
    button: 'Submit appeal',
  },
};

const categoriesByMode = {
  contact: [
    'Account and sign-in',
    'Publishing',
    'Messages or calls',
    'Marketplace order or payment',
    'Seller account or payout',
    'Android app',
    'Privacy request',
    'Other',
  ],
  report: [
    'Harassment or threat',
    'Hate or abusive content',
    'Impersonation',
    'Spam or scam',
    'Unsafe message or group',
    'Product or seller fraud',
    'Review abuse',
    'Copyright or intellectual property',
    'Child safety concern',
    'Other illegal or unsafe activity',
  ],
  appeal: [
    'Account warning',
    'Account suspension',
    'Content removal',
    'Seller application rejection',
    'Seller status revocation',
    'Product action',
    'Other enforcement action',
  ],
};

const getMode = (pathname) => {
  if (pathname === '/report') return 'report';
  if (pathname === '/appeals') return 'appeal';
  return 'contact';
};

const SupportRequest = () => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const mode = getMode(pathname);
  const config = modeConfig[mode];
  const { user } = useContext(AuthContext);
  const initialCategory = searchParams.get('category');
  const allowedCategories = categoriesByMode[mode];
  const [form, setForm] = useState({
    category: allowedCategories.includes(initialCategory)
      ? initialCategory
      : allowedCategories[0],
    email: user?.email || '',
    subject: '',
    description: '',
    reference: searchParams.get('reference') || '',
  });
  const [state, setState] = useState({ status: 'idle', message: '', referenceNumber: '' });

  const descriptionHint = useMemo(() => {
    if (mode === 'report') {
      return 'Explain what happened, where it happened, who was involved, and why it may violate safety or marketplace rules.';
    }
    if (mode === 'appeal') {
      return 'Explain the decision, why you believe it should be reviewed, and any new context or evidence.';
    }
    return 'Describe the problem, what you expected, what happened, and the steps already tried.';
  }, [mode]);

  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setState({ status: 'submitting', message: '', referenceNumber: '' });
    try {
      const { data } = await api.post('/support/requests', {
        type: config.type,
        category: form.category,
        email: form.email,
        subject: form.subject,
        description: form.description,
        reference: form.reference,
        sourcePath: pathname,
      });
      setState({
        status: 'success',
        message: data.message || 'Your request was submitted.',
        referenceNumber: data.referenceNumber || '',
      });
    } catch (error) {
      setState({
        status: 'error',
        message:
          error.response?.data?.message ||
          'The request could not be submitted. Please try again.',
        referenceNumber: '',
      });
    }
  };

  if (state.status === 'success') {
    return (
      <main className="help-page">
        <div className="help-shell py-16 sm:py-20">
          <div className="max-w-2xl border-y border-[var(--border-default)] py-10">
            <FaCheckCircle className="mb-5 text-4xl text-emerald-600" aria-hidden="true" />
            <h1 className="m-0 text-3xl font-black">Request received</h1>
            <p className="mb-0 mt-3 leading-7 text-[var(--text-secondary)]">
              {state.message}
            </p>
            {state.referenceNumber ? (
              <p className="mb-0 mt-4 font-black">
                Reference: {state.referenceNumber}
              </p>
            ) : null}
            <div className="mt-7 flex flex-wrap gap-5">
              <Link
                to="/help"
                className="font-extrabold text-[var(--help-link-color)] no-underline"
              >
                Return to Help Center
              </Link>
              <button
                type="button"
                onClick={() =>
                  setState({ status: 'idle', message: '', referenceNumber: '' })
                }
                className="border-0 bg-transparent p-0 font-extrabold text-[var(--text-secondary)]"
              >
                Submit another
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="help-page">
      <section className="help-hero">
        <div className="help-shell py-10 sm:py-14">
          <h1 className="m-0 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
            {config.title}
          </h1>
          <p className="mb-0 mt-3 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
            {config.summary}
          </p>
        </div>
      </section>

      <div className="help-shell py-10 sm:py-12">
        <form className="help-form" onSubmit={submit}>
          <label>
            Category
            <select
              value={form.category}
              onChange={(event) => update('category', event.target.value)}
            >
              {categoriesByMode[mode].map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            Email for a response
            <input
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              maxLength={254}
              required
              autoComplete="email"
            />
          </label>

          <label>
            Subject
            <input
              type="text"
              value={form.subject}
              onChange={(event) => update('subject', event.target.value)}
              maxLength={160}
              required
            />
          </label>

          <label>
            Details
            <span className="text-xs font-normal leading-5 text-[var(--text-muted)]">
              {descriptionHint}
            </span>
            <textarea
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              minLength={20}
              maxLength={5000}
              required
            />
          </label>

          <label>
            Relevant URL, username, content ID, product, order, or decision reference
            <input
              type="text"
              value={form.reference}
              onChange={(event) => update('reference', event.target.value)}
              maxLength={500}
              placeholder="Optional but strongly recommended"
            />
          </label>

          {state.status === 'error' ? (
            <div className="help-callout help-callout--warning" role="alert">
              {state.message}
            </div>
          ) : null}

          <button
            type="submit"
            className="help-primary-button"
            disabled={state.status === 'submitting'}
          >
            <FaPaperPlane aria-hidden="true" />
            {state.status === 'submitting' ? 'Sending...' : config.button}
          </button>
        </form>

        <p className="mt-8 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Do not include passwords, one-time codes, full payment credentials,
          private API keys, or unnecessary sensitive personal information.
          Immediate physical danger should be reported to local emergency services.
        </p>
      </div>
    </main>
  );
};

export default SupportRequest;
