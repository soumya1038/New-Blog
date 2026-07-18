import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaCheckCircle, FaExclamationCircle, FaFileContract, FaIdCard, FaPhoneAlt, FaRedo, FaShieldAlt, FaStore, FaUniversity } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';

const STEPS = [
  { id: 1, label: 'Basic Info',    icon: FaStore      },
  { id: 2, label: 'Identity',      icon: FaIdCard     },
  { id: 3, label: 'Payout',        icon: FaUniversity },
  { id: 4, label: 'Agreement',     icon: FaFileContract },
];

const CATEGORIES = ['Digital Products', 'Physical Products', 'Services', 'Art & Design', 'Education', 'Writing', 'Photography', 'Music', 'Other'];
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9._-]{1,64}$/;
const PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;

const BecomeASeller = () => {
  const { t }       = useTranslation();
  const { user }    = useContext(AuthContext);
  const navigate    = useNavigate();
  const [step,      setStep]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');
  const [existing,  setExisting]  = useState(null);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [identityMessage, setIdentityMessage] = useState('');
  const [identityStatus, setIdentityStatus] = useState('idle');
  const [identityLoading, setIdentityLoading] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

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
    verificationProvider: 'manual',
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

  const set = (k, v) => {
    if (['phone', 'city', 'state', 'country', 'panNumber'].includes(k)) {
      setIdentityStatus('idle');
      setIdentityMessage('');
    }
    if (['payoutType', 'upiId', 'bankAccount', 'ifsc', 'accountHolderName'].includes(k)) {
      setPayoutMessage('');
    }
    setForm(f => ({ ...f, [k]: v }));
  };

  const toggleCategory = (cat) => {
    const cats = form.categories.includes(cat)
      ? form.categories.filter(c => c !== cat)
      : [...form.categories, cat];
    set('categories', cats);
  };

  const cleanPhone = (value) => value.replace(/[\s()-]/g, '');

  const getPayoutValidationError = () => {
    if (form.payoutType === 'upi' && !form.upiId.trim()) return 'UPI ID is required.';
    if (form.payoutType === 'upi' && !UPI_REGEX.test(form.upiId.trim())) return 'Enter a valid UPI ID.';
    if (form.payoutType === 'bank' && !form.accountHolderName.trim()) return 'Account holder name is required.';
    if (form.payoutType === 'bank' && !form.bankAccount.trim()) return 'Bank account number is required.';
    if (form.payoutType === 'bank' && !/^\d{9,18}$/.test(form.bankAccount.replace(/\D/g, ''))) return 'Enter a valid bank account number.';
    if (form.payoutType === 'bank' && !form.ifsc.trim()) return 'IFSC code is required.';
    if (form.payoutType === 'bank' && !IFSC_REGEX.test(form.ifsc.trim().toUpperCase())) return 'Enter a valid IFSC code.';
    return null;
  };

  const getIdentityValidationError = () => {
    if (!form.phone.trim()) return 'Phone number is required.';
    if (!PHONE_REGEX.test(cleanPhone(form.phone))) return 'Enter a valid Indian phone number.';
    if (!form.city.trim()) return 'City is required.';
    if (!form.panNumber.trim()) return 'PAN number is required.';
    if (!PAN_REGEX.test(form.panNumber.trim().toUpperCase())) return 'Enter a valid PAN number.';
    return null;
  };

  const beginReapply = () => {
    setForm(f => ({
      ...f,
      legalName: existing.legalName || f.legalName,
      businessName: existing.businessName || '',
      businessType: existing.businessType || 'individual',
      categories: existing.categories || [],
      bio: existing.bio || '',
      phone: existing.phone || f.phone,
      city: existing.city || '',
      state: existing.state || '',
      country: existing.country || 'India',
      panNumber: '',
      verificationProvider: existing.verificationProvider || 'manual',
      payoutType: existing.payoutMethod?.type || 'upi',
      upiId: existing.payoutMethod?.upiId || '',
      bankAccount: '',
      ifsc: existing.payoutMethod?.ifsc || '',
      accountHolderName: existing.payoutMethod?.accountHolderName || '',
      agreedToTerms: false,
    }));
    setExisting(null);
    setSubmitted(false);
    setSubmissionMessage('');
    setIdentityMessage('');
    setIdentityStatus('idle');
    setConfirmWithdraw(false);
    setError('');
    setStep(1);
  };

  const verifyWithRazorpay = async () => {
    const err = getIdentityValidationError();
    if (err) {
      setError(err);
      return;
    }

    setError('');
    setIdentityLoading(true);
    setIdentityMessage('');

    try {
      set('verificationProvider', 'manual');
      setIdentityStatus('verified');
      setIdentityMessage('Identity pre-check complete. The admin team will verify your details during review.');
    } catch (e) {
      setIdentityStatus('idle');
      setIdentityMessage('');
      setError('Identity pre-check failed. Please try again.');
    }

    setIdentityLoading(false);
  };

  const verifyPayoutInputs = () => {
    setPayoutMessage('');
    const err = getPayoutValidationError();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setPayoutMessage(form.payoutType === 'upi'
      ? 'UPI ID format verified. Provider validation will run during review.'
      : 'Bank account and IFSC format verified. Provider validation will run during review.');
  };

  const withdrawApplication = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.patch('/seller/application/withdraw');
      setSubmitted(false);
      setExisting(data.application || null);
      setSubmissionMessage(data.message || 'Seller application withdrawn.');
      setConfirmWithdraw(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to withdraw your application.');
    }
    setLoading(false);
  };

  const validate = () => {
    if (step === 1) {
      if (!form.legalName.trim()) return 'Legal name is required.';
      if (!form.businessType)     return 'Business type is required.';
      if (form.categories.length === 0) return 'Select at least one product category.';
      if (!form.bio.trim())       return 'Please write a short bio about your store.';
    }
    if (step === 2) {
      const identityError = getIdentityValidationError();
      if (identityError) return identityError;
      if (identityStatus !== 'verified') {
        return 'Complete the identity pre-check to continue.';
      }
    }
    if (step === 3) {
      return getPayoutValidationError();
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
      const { data } = await api.post('/seller/apply', {
        legalName:    form.legalName,
        businessName: form.businessName,
        businessType: form.businessType,
        categories:   form.categories,
        bio:          form.bio,
        phone:        cleanPhone(form.phone),
        city:         form.city,
        state:        form.state,
        country:      form.country,
        panNumber:    form.panNumber.trim().toUpperCase(),
        verificationProvider: form.verificationProvider,
        payoutMethod: {
          type:              form.payoutType,
          upiId:             form.upiId.trim().toLowerCase(),
          bankAccount:       form.bankAccount,
          ifsc:              form.ifsc.trim().toUpperCase(),
          accountHolderName: form.accountHolderName,
        },
        agreedToTerms: form.agreedToTerms,
      });
      setSubmissionMessage(data.message || 'Your seller application is under review.');
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
          <MdVerified size={52} className="mx-auto text-blue-500" />
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Verification Required</h2>
          <p className="text-[var(--text-muted)] text-sm">
            You must have the <strong>Verified badge</strong> (blue) to apply as a seller.
            Get verified by the Team first, then come back here.
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
    const statusIconMap = {
      pending:  { Icon: FaShieldAlt, text: 'Your application is under review.', color: 'text-amber-500' },
      approved: { Icon: FaCheckCircle, text: 'Your seller application is approved!', color: 'text-green-500' },
      rejected: { Icon: FaExclamationCircle, text: 'Your application was not approved.', color: 'text-red-500' },
      withdrawn: { Icon: FaExclamationCircle, text: 'Your application was withdrawn.', color: 'text-amber-500' },
    };
    const s = statusIconMap[existing.status] || statusIconMap.pending;
    const StatusIcon = s.Icon;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4 p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <StatusIcon size={52} className={`${s.color} mx-auto`} />
          <h2 className={`text-xl font-bold ${s.color}`}>{s.text}</h2>
          {(existing.attemptNumber || 1) > 1 && (
            <p className="inline-flex items-center justify-center rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              Attempt #{existing.attemptNumber}
            </p>
          )}
          {existing.reviewNote && <p className="text-sm text-[var(--text-muted)]">Note: {existing.reviewNote}</p>}
          {existing.status === 'pending' && (
            <p className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
              Identity pre-check completed. The Team will verify your details before approval.
            </p>
          )}
          {existing.status === 'pending' && (
            <div className="space-y-3">
              {!confirmWithdraw ? (
                <button
                  onClick={() => setConfirmWithdraw(true)}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  Withdraw Application
                </button>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-left dark:border-red-900/60 dark:bg-red-900/20">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">Withdraw this application?</p>
                  <p className="mt-1 text-xs text-red-600/80 dark:text-red-200/80">You can apply again later when you are ready.</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setConfirmWithdraw(false)}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      Keep
                    </button>
                    <button
                      onClick={withdrawApplication}
                      disabled={loading}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {loading ? 'Withdrawing...' : 'Withdraw'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {['rejected', 'withdrawn'].includes(existing.status) && (
            <>
              <p className="text-sm text-[var(--text-muted)]">
                You can correct the details and submit a new attempt. The Team will see this as your next application attempt.
              </p>
              <button onClick={beginReapply} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 text-white font-medium">
                <FaRedo size={13} /> Apply Again
              </button>
            </>
          )}
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
          {submissionMessage && (
            <p className="rounded-xl bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
              {submissionMessage}
            </p>
          )}
          <p className="text-[var(--text-muted)] text-sm">
            Your seller application is under review. We'll notify you once it's processed (usually within 24–48 hours).
          </p>
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          {confirmWithdraw ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-left dark:border-red-900/60 dark:bg-red-900/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Withdraw this application?</p>
              <p className="mt-1 text-xs text-red-600/80 dark:text-red-200/80">You can apply again later when you are ready.</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setConfirmWithdraw(false)}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                >
                  Keep
                </button>
                <button
                  onClick={withdrawApplication}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {loading ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmWithdraw(true)}
              disabled={loading}
              className="w-full rounded-xl border border-red-200 px-6 py-2.5 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              Withdraw Application
            </button>
          )}
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
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">PAN Number * <span className="text-[var(--text-muted)] font-normal">(encrypted & secure)</span></label>
            <input className="w-full input-field" value={form.panNumber} onChange={e => set('panNumber', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
          </div>
          <div className="rounded-xl bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-muted)]">
            <div className="mb-2 flex items-center gap-2 font-semibold text-[var(--text-secondary)]">
              <FaShieldAlt /> Identity verification
            </div>
            <button
              type="button"
              onClick={verifyWithRazorpay}
              disabled={identityLoading}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                identityStatus === 'verified'
                  ? 'border-green-500 bg-green-600 text-white'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-violet-300'
              }`}
            >
              {identityLoading ? 'Checking identity details...' : identityStatus === 'verified' ? 'Identity Pre-check Complete' : 'Continue identity pre-check'}
            </button>
            {identityMessage && (
              <p className={`mt-2 text-xs font-medium ${identityStatus === 'verified' ? 'text-green-600 dark:text-green-300' : 'text-violet-600 dark:text-violet-300'}`}>
                {identityMessage}
              </p>
            )}
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
                  <span className="inline-flex items-center justify-center gap-2">
                    {t === 'upi' ? <FaPhoneAlt size={12} /> : <FaUniversity size={12} />}
                    {t === 'upi' ? 'UPI' : 'Bank Account'}
                  </span>
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
            <FaShieldAlt /> Your payout details are encrypted and never shared.
          </p>
          <button
            type="button"
            onClick={verifyPayoutInputs}
            className="w-full rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-violet-300 hover:bg-[var(--bg-secondary)]"
          >
            Verify payout details
          </button>
          {payoutMessage && (
            <p className="rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
              {payoutMessage}
            </p>
          )}
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <h3 className="font-bold text-[var(--text-primary)]">Terms & Agreement</h3>
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <Link
              to="/help/article/apply-to-become-seller"
              className="text-[var(--brand-primary)] no-underline"
            >
              Seller application guide
            </Link>
            <Link
              to="/policies"
              className="text-[var(--brand-primary)] no-underline"
            >
              Policy directory
            </Link>
          </div>
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
              I have read and agree to the seller rules displayed above. I understand that the dedicated Seller Terms document is still in formal review.
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
          <FaStore size={40} className="mx-auto text-violet-500" />
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
    </div>
  );
};

export default BecomeASeller;
