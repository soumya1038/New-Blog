import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaCheckCircle, FaStore, FaIdCard, FaUniversity, FaFileContract } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';

const STEPS = [
  { id: 1, label: 'Basic Info',    icon: FaStore      },
  { id: 2, label: 'Identity',      icon: FaIdCard     },
  { id: 3, label: 'Payout',        icon: FaUniversity },
  { id: 4, label: 'Agreement',     icon: FaFileContract },
];

const CATEGORIES = ['Digital Products', 'Physical Products', 'Services', 'Art & Design', 'Education', 'Writing', 'Photography', 'Music', 'Other'];

const BecomeASeller = () => {
  const { t }       = useTranslation();
  const { user }    = useContext(AuthContext);
  const navigate    = useNavigate();
  const [step,      setStep]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');
  const [existing,  setExisting]  = useState(null);

  const [form, setForm] = useState({
    legalName:    user?.name || '',
    businessName: '',
    businessType: 'individual',
    categories:   [],
    bio:          '',
    phone:        user?.phone || '',
    city:         '',
    state:        '',
    country:      'India',
    panNumber:    '',
    payoutType:   'upi',
    upiId:        '',
    bankAccount:  '',
    ifsc:         '',
    accountHolderName: '',
    agreedToTerms: false,
  });

  useEffect(() => {
    if (!user) return navigate('/login');
    if (!user.isVerified) return; // show not-verified message
    api.get('/seller/application/status').then(({ data }) => {
      if (data.application) setExisting(data.application);
    }).catch(() => {});
  }, [user, navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCategory = (cat) => {
    const cats = form.categories.includes(cat)
      ? form.categories.filter(c => c !== cat)
      : [...form.categories, cat];
    set('categories', cats);
  };

  const validate = () => {
    if (step === 1) {
      if (!form.legalName.trim()) return 'Legal name is required.';
      if (!form.businessType)     return 'Business type is required.';
      if (!form.bio.trim())       return 'Please write a short bio about your store.';
    }
    if (step === 2) {
      if (!form.phone.trim())     return 'Phone number is required.';
      if (!form.city.trim())      return 'City is required.';
    }
    if (step === 3) {
      if (form.payoutType === 'upi' && !form.upiId.trim())        return 'UPI ID is required.';
      if (form.payoutType === 'bank' && !form.bankAccount.trim()) return 'Bank account number is required.';
      if (form.payoutType === 'bank' && !form.ifsc.trim())        return 'IFSC code is required.';
    }
    if (step === 4 && !form.agreedToTerms) return 'You must agree to the Seller Terms & Conditions.';
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/seller/apply', {
        legalName:    form.legalName,
        businessName: form.businessName,
        businessType: form.businessType,
        categories:   form.categories,
        bio:          form.bio,
        phone:        form.phone,
        city:         form.city,
        state:        form.state,
        country:      form.country,
        panNumber:    form.panNumber,
        payoutMethod: {
          type:              form.payoutType,
          upiId:             form.upiId,
          bankAccount:       form.bankAccount,
          ifsc:              form.ifsc,
          accountHolderName: form.accountHolderName,
        },
        agreedToTerms: form.agreedToTerms,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // ── Not verified ───────────────────────────────────────────────────────────
  if (user && !user.isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4 p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <span className="text-5xl">🔵</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Verification Required</h2>
          <p className="text-[var(--text-muted)] text-sm">
            You must have the <strong>Verified badge</strong> (blue) to apply as a seller.
            Get verified by an admin first, then come back here.
          </p>
          <button onClick={() => navigate('/profile')} className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-medium">
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  // ── Already applied / approved ─────────────────────────────────────────────
  if (existing) {
    const statusMap = {
      pending:  { emoji: '⏳', text: 'Your application is under review.', color: 'text-amber-500' },
      approved: { emoji: '🎉', text: 'Your seller application is approved!', color: 'text-green-500' },
      rejected: { emoji: '❌', text: 'Your application was not approved.', color: 'text-red-500' },
    };
    const s = statusMap[existing.status];
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4 p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <span className="text-5xl">{s.emoji}</span>
          <h2 className={`text-xl font-bold ${s.color}`}>{s.text}</h2>
          {existing.reviewNote && <p className="text-sm text-[var(--text-muted)]">Note: {existing.reviewNote}</p>}
          {existing.status === 'approved' && (
            <button onClick={() => navigate('/seller/dashboard')} className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-medium">
              Go to Seller Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Submitted ──────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4 p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <FaCheckCircle size={52} className="text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Application Submitted!</h2>
          <p className="text-[var(--text-muted)] text-sm">
            Your seller application is under review. We'll notify you once it's processed (usually within 24–48 hours).
          </p>
          <button onClick={() => navigate('/home')} className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-medium">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Step progress bar ──────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => {
        const Icon    = s.icon;
        const active  = step === s.id;
        const done    = step > s.id;
        return (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
              ${done   ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : ''}
              ${active ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : ''}
              ${!done && !active ? 'text-[var(--text-muted)]' : ''}`}
            >
              {done ? <FaCheckCircle size={12} /> : <Icon size={12} />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-6 rounded-full ${step > s.id ? 'bg-green-400' : 'bg-[var(--border-color)]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Form fields per step ───────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="space-y-4">
          <h3 className="font-bold text-[var(--text-primary)]">Basic Information</h3>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Legal / Full Name *</label>
            <input className="w-full input-field" value={form.legalName} onChange={e => set('legalName', e.target.value)} placeholder="As on your PAN / ID" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Business / Store Name</label>
            <input className="w-full input-field" value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Optional — shown on your store page" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Business Type *</label>
            <select className="w-full input-field" value={form.businessType} onChange={e => set('businessType', e.target.value)}>
              <option value="individual">Individual</option>
              <option value="company">Company / Business</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">What will you sell? *</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${form.categories.includes(cat)
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-violet-400'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Store Bio *</label>
            <textarea
              className="w-full input-field resize-none"
              rows={3}
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              placeholder="Tell buyers about yourself and what you create..."
              maxLength={500}
            />
            <p className="text-xs text-[var(--text-muted)] text-right mt-0.5">{form.bio.length}/500</p>
          </div>
        </div>
      );

      case 2: return (
        <div className="space-y-4">
          <h3 className="font-bold text-[var(--text-primary)]">Contact & Identity</h3>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Phone Number *</label>
            <input className="w-full input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">City *</label>
              <input className="w-full input-field" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">State</label>
              <input className="w-full input-field" value={form.state} onChange={e => set('state', e.target.value)} placeholder="Maharashtra" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Country</label>
            <input className="w-full input-field" value={form.country} onChange={e => set('country', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">PAN Number <span className="text-[var(--text-muted)] font-normal">(encrypted & secure)</span></label>
            <input className="w-full input-field" value={form.panNumber} onChange={e => set('panNumber', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
          </div>
        </div>
      );

      case 3: return (
        <div className="space-y-4">
          <h3 className="font-bold text-[var(--text-primary)]">Payout Setup</h3>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Payout Method *</label>
            <div className="flex gap-3">
              {['upi', 'bank'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('payoutType', t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors
                    ${form.payoutType === t
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-violet-400'}`}
                >
                  {t === 'upi' ? '📲 UPI' : '🏦 Bank Account'}
                </button>
              ))}
            </div>
          </div>
          {form.payoutType === 'upi' ? (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">UPI ID *</label>
              <input className="w-full input-field" value={form.upiId} onChange={e => set('upiId', e.target.value)} placeholder="yourname@upi" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Account Holder Name *</label>
                <input className="w-full input-field" value={form.accountHolderName} onChange={e => set('accountHolderName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Account Number *</label>
                <input className="w-full input-field" value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} placeholder="Encrypted & secure" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">IFSC Code *</label>
                <input className="w-full input-field" value={form.ifsc} onChange={e => set('ifsc', e.target.value.toUpperCase())} placeholder="SBIN0001234" />
              </div>
            </>
          )}
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            🔒 Your payout details are encrypted with AES-256 and never shared.
          </p>
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <h3 className="font-bold text-[var(--text-primary)]">Terms & Agreement</h3>
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)] space-y-2 max-h-48 overflow-y-auto">
            <p><strong>Seller Terms & Conditions</strong></p>
            <p>By becoming a seller on Lekhon, you agree to:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>List only original, legally owned products or services.</li>
              <li>Accurately describe your products and their condition.</li>
              <li>Fulfill orders promptly and communicate with buyers.</li>
              <li>Not engage in fraudulent activities or misrepresentation.</li>
              <li>Accept Lekhon's commission policy (currently 0%).</li>
              <li>Comply with applicable Indian and international laws.</li>
              <li>Allow Lekhon to mediate disputes between buyers and sellers.</li>
            </ul>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.agreedToTerms}
              onChange={e => set('agreedToTerms', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-violet-600"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              I have read and agree to the <strong>Seller Terms & Conditions</strong> and <strong>Commission Policy</strong>.
            </span>
          </label>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl">🛍️</span>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-2">Become a Seller</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Start selling to the Lekhon community in a few easy steps.
          </p>
        </div>

        <StepBar />

        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6">
          {renderStep()}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <button
                onClick={() => { setStep(s => s - 1); setError(''); }}
                className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-secondary)]"
              >
                ← Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                onClick={next}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Submitting…' : 'Submit Application ✓'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Shared input style via Tailwind utility — add to global CSS or index.css */}
      <style>{`
        .input-field {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: box-shadow 0.15s;
        }
        .input-field:focus { box-shadow: 0 0 0 2px #7c3aed55; }
      `}</style>
    </div>
  );
};

export default BecomeASeller;
