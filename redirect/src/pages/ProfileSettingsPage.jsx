import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaBell,
  FaChevronRight,
  FaCog,
  FaEnvelope,
  FaGlobe,
  FaInfoCircle,
  FaKey,
  FaLifeRing,
  FaLock,
  FaMoon,
  FaPalette,
  FaShieldAlt,
  FaSun,
  FaUserEdit,
  FaUserLock,
} from 'react-icons/fa';
import { ScaleLoader } from 'react-spinners';
import LanguageSelector from '../components/LanguageSelector';
import PrivacySettings from '../components/PrivacySettings';
import EmailNotificationSettings from '../components/EmailNotificationSettings';
import { useTheme } from '../context/ThemeContext';
import useCurrentProfileSummary from '../hooks/useCurrentProfileSummary';

const sectionTitleClass = 'px-1 pt-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)]';
const pulseClass = 'lekhon-target-pulse';

const getHighlightClass = (isActive) => (isActive ? pulseClass : '');

const SettingsRow = ({ icon: Icon, label, value, onClick, to, tone = 'default', targetId, highlightTarget }) => {
  const rowClass = `flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-3 ${getHighlightClass(highlightTarget === targetId)}`;
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          tone === 'danger'
            ? 'bg-red-500/10 text-red-500'
            : 'bg-[var(--background-secondary)] text-[var(--brand-primary)]'
        }`}>
          <Icon />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-[var(--text-primary)]">{label}</span>
          {value ? <span className="block truncate text-xs text-[var(--text-secondary)]">{value}</span> : null}
        </span>
      </span>
      <FaChevronRight className="shrink-0 text-[var(--text-muted)]" size={12} />
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        data-profile-settings-target={targetId}
        className={rowClass}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-profile-settings-target={targetId}
      className={`${rowClass} w-full text-left`}
    >
      {content}
    </button>
  );
};

const SettingsGroup = ({ title, children, targetId, highlightTarget }) => (
  <section
    data-profile-settings-target={targetId}
    className={`space-y-2 rounded-2xl ${getHighlightClass(highlightTarget === targetId)}`}
  >
    <h2 className={sectionTitleClass}>{title}</h2>
    <div className="space-y-2">{children}</div>
  </section>
);

const EditProfilePanel = ({ profile, onSave, saving, highlightTarget }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    bio: '',
  });

  useEffect(() => {
    setForm({
      fullName: profile?.fullName || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      dateOfBirth: profile?.dateOfBirth ? String(profile.dateOfBirth).split('T')[0] : '',
      bio: profile?.bio || '',
    });
  }, [profile]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
      data-profile-settings-target="edit"
      className={`rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-sm ${getHighlightClass(highlightTarget === 'edit')}`}
    >
      <div className="mb-4">
        <h2 className="text-base font-black text-[var(--text-primary)]">{t('Edit profile')}</h2>
        <p className="text-xs text-[var(--text-secondary)]">{t('Update the profile details readers see first.')}</p>
      </div>
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[var(--text-secondary)]">
          {t('Full name')}
          <input
            value={form.fullName}
            onChange={(event) => setField('fullName', event.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </label>
        <label className="block text-xs font-bold text-[var(--text-secondary)]">
          {t('Email')}
          <span
            data-profile-settings-target="email-phone"
            className={`mt-1 block rounded-xl ${getHighlightClass(highlightTarget === 'email-phone')}`}
          >
            <input
              type="email"
              value={form.email}
              onChange={(event) => setField('email', event.target.value)}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </span>
        </label>
        <label className="block text-xs font-bold text-[var(--text-secondary)]">
          {t('Phone')}
          <span
            data-profile-settings-target="email-phone"
            className={`mt-1 block rounded-xl ${getHighlightClass(highlightTarget === 'email-phone')}`}
          >
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => setField('phone', event.target.value)}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </span>
        </label>
        <label className="block text-xs font-bold text-[var(--text-secondary)]">
          {t('Birthday')}
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(event) => setField('dateOfBirth', event.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </label>
        <label className="block text-xs font-bold text-[var(--text-secondary)]">
          {t('Bio')}
          <textarea
            value={form.bio}
            onChange={(event) => setField('bio', event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60"
      >
        {saving ? t('Saving...') : t('Save changes')}
      </button>
    </form>
  );
};

const ProfileSettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDark, toggleTheme } = useTheme();
  const {
    profile,
    displayUser,
    twoFactorStatus,
    loading,
    error,
    updateProfile,
  } = useCurrentProfileSummary();
  const [saving, setSaving] = useState(false);
  const [highlightTarget, setHighlightTarget] = useState('');
  const activeSection = searchParams.get('section') || '';
  const activeTarget = searchParams.get('target') || '';
  const activePulse = searchParams.get('pulse') || '';

  const privacyLabel = useMemo(
    () => profile?.privacy?.profileVisibility || 'public',
    [profile?.privacy?.profileVisibility]
  );

  const openSection = (section, target = '') => {
    const nextParams = {};
    if (section) nextParams.section = section;
    if (target) {
      nextParams.target = target;
      nextParams.pulse = String(Date.now());
    }
    setSearchParams(nextParams);
  };

  const pulseCurrentTarget = (target) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('target', target);
      nextParams.set('pulse', String(Date.now()));
      return nextParams;
    });
  };

  useEffect(() => {
    if (loading || !activeTarget) return undefined;

    const requiredSection = {
      edit: 'edit',
      'email-phone': 'edit',
      privacy: 'privacy',
      notifications: 'privacy',
    }[activeTarget];

    if (requiredSection && activeSection !== requiredSection) {
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.set('section', requiredSection);
        return nextParams;
      });
      return undefined;
    }

    const startedAt = Date.now();
    let retryTimeoutId;
    let clearHighlightTimeoutId;

    const focusTarget = () => {
      const targetElement = document.querySelector(`[data-profile-settings-target="${activeTarget}"]`);
      if (!targetElement) {
        if (Date.now() - startedAt < 2400) {
          retryTimeoutId = window.setTimeout(focusTarget, 120);
        }
        return;
      }

      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightTarget('');
      window.requestAnimationFrame(() => setHighlightTarget(activeTarget));
      clearHighlightTimeoutId = window.setTimeout(() => setHighlightTarget(''), 2600);
    };

    const timeoutId = window.setTimeout(focusTarget, 120);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(retryTimeoutId);
      window.clearTimeout(clearHighlightTimeoutId);
    };
  }, [activeSection, activePulse, activeTarget, loading, setSearchParams]);

  const handleSaveProfile = async (form) => {
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success(t('Profile updated'));
      openSection('');
    } catch (err) {
      toast.error(err.response?.data?.message || t('Unable to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsUpdate = async (updates, message) => {
    try {
      await updateProfile(updates);
      toast.success(message);
    } catch (err) {
      toast.error(err.response?.data?.message || t('Unable to save settings'));
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen theme-page-bg flex items-center justify-center">
        <ScaleLoader color="var(--brand-primary)" />
      </div>
    );
  }

  return (
    <main className="min-h-screen theme-page-bg px-4 py-4">
      <div className="mx-auto max-w-md space-y-4 md:max-w-5xl">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm"
            aria-label={t('Back')}
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-base font-black text-[var(--text-primary)]">{t('Settings')}</h1>
          <Link
            to="/profile"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm"
            aria-label={t('Profile overview')}
          >
            <FaUserEdit />
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-500">
            {error}
          </div>
        ) : null}

        <div className="space-y-4 md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start md:gap-5 md:space-y-0">
          <div className="space-y-4">
            <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{t('Account')}</p>
              <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">
                {displayUser?.fullName || displayUser?.username || t('Your profile')}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">@{displayUser?.username || 'writer'}</p>
            </section>

            {activeSection === 'edit' ? (
              <EditProfilePanel profile={profile} onSave={handleSaveProfile} saving={saving} highlightTarget={highlightTarget} />
            ) : null}

            {activeSection === 'privacy' ? (
              <div className="space-y-3">
                <div
                  data-profile-settings-target="privacy"
                  className={`rounded-2xl ${getHighlightClass(highlightTarget === 'privacy')}`}
                >
                  <PrivacySettings
                    profile={profile}
                    onUpdate={(updates) => handleSettingsUpdate(updates, t('Privacy settings updated'))}
                  />
                </div>
                <div
                  data-profile-settings-target="notifications"
                  className={`rounded-2xl ${getHighlightClass(highlightTarget === 'notifications')}`}
                >
                  <EmailNotificationSettings
                    profile={profile}
                    onUpdate={(updates) => handleSettingsUpdate(updates, t('Email settings updated'))}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <SettingsGroup title={t('Account')} targetId="account" highlightTarget={highlightTarget}>
              <SettingsRow icon={FaUserEdit} label={t('Edit Profile')} value={profile?.fullName || t('Name, bio, photo')} onClick={() => openSection('edit', 'edit')} targetId="account-edit" highlightTarget={highlightTarget} />
              <SettingsRow icon={FaKey} label={t('Change Password')} value={t('Advanced security')} to="/profile/manage?target=password" targetId="change-password" highlightTarget={highlightTarget} />
              <SettingsRow icon={FaEnvelope} label={t('Email & Phone')} value={profile?.email || profile?.phone || t('Add contact details')} onClick={() => openSection('edit', 'email-phone')} targetId="email-phone-row" highlightTarget={highlightTarget} />
            </SettingsGroup>

            <SettingsGroup title={t('Preferences')} targetId="preferences" highlightTarget={highlightTarget}>
              <div
                data-profile-settings-target="language"
                className={`rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-3 ${getHighlightClass(highlightTarget === 'language')}`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--background-secondary)] text-[var(--brand-primary)]">
                    <FaGlobe />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-[var(--text-primary)]">{t('Language')}</span>
                    <span className="block text-xs text-[var(--text-secondary)]">{t('Choose app language')}</span>
                  </span>
                </div>
                <LanguageSelector />
              </div>
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  pulseCurrentTarget('theme');
                }}
                data-profile-settings-target="theme"
                className={`flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-3 text-left ${getHighlightClass(highlightTarget === 'theme')}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--background-secondary)] text-[var(--brand-primary)]">
                    {isDark ? <FaSun /> : <FaMoon />}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-[var(--text-primary)]">{t('Theme')}</span>
                    <span className="block text-xs text-[var(--text-secondary)]">{isDark ? t('Dark') : t('Light')}</span>
                  </span>
                </span>
                <span className="text-xs font-black uppercase tracking-[0.08em] text-[var(--brand-primary)]">
                  {t('Switch')}
                </span>
              </button>
              <SettingsRow icon={FaPalette} label={t('Content Preferences')} value={t('Advanced tools')} to="/profile/manage?target=developer" targetId="content-preferences" highlightTarget={highlightTarget} />
            </SettingsGroup>

            <SettingsGroup title={t('Privacy & Security')} targetId="security" highlightTarget={highlightTarget}>
              <SettingsRow icon={FaLock} label={t('Privacy')} value={privacyLabel} onClick={() => openSection('privacy', 'privacy')} targetId="privacy-row" highlightTarget={highlightTarget} />
              <SettingsRow icon={FaUserLock} label={t('Blocked Users')} value={t('Manage in chat')} to="/chat" targetId="blocked-users" highlightTarget={highlightTarget} />
              <SettingsRow icon={FaShieldAlt} label={t('2FA')} value={twoFactorStatus?.enabled ? t('On') : t('Off')} to="/profile/manage?target=two-factor" targetId="two-factor-row" highlightTarget={highlightTarget} />
              <SettingsRow icon={FaCog} label={t('Advanced profile tools')} value={t('Full settings')} to="/profile/manage?target=security" targetId="advanced-tools" highlightTarget={highlightTarget} />
            </SettingsGroup>

            <SettingsGroup title={t('Support')}>
              <SettingsRow icon={FaLifeRing} label={t('Help Center')} value={t('Guides and account help')} to="/help" />
              <SettingsRow icon={FaInfoCircle} label={t('About Lekhon')} value={t('Version and product info')} to="/about" />
              <SettingsRow icon={FaBell} label={t('Notifications')} value={t('Alerts and activity')} to="/notifications" />
            </SettingsGroup>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProfileSettingsPage;
