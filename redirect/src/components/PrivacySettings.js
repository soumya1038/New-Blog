import React, { useEffect, useState } from 'react';
import { FaLock, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const KNOWN_SOCIAL_PROVIDERS = [
  { key: 'google', label: 'Google', aliases: ['google.com', 'accounts.google.com', 'google'] },
  { key: 'facebook', label: 'Facebook', aliases: ['facebook.com', 'fb.com', 'facebook'] },
  { key: 'twitter', label: 'Twitter', aliases: ['twitter.com', 'x.com', 'twitter', 'x'] },
  { key: 'linkedin', label: 'LinkedIn', aliases: ['linkedin.com', 'linkedin'] },
  { key: 'github', label: 'GitHub', aliases: ['github.com', 'github'] },
];

const DEFAULT_PRIVACY = {
  profileVisibility: 'public',
  showEmail: true,
  showPhone: true,
  socialLinkVisibility: {},
  allowMessages: true,
};

const normalizeText = (value = '') => String(value || '').trim().toLowerCase();

const slugify = (value = '') =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const parseHostname = (rawUrl = '') => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';

  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  } catch (error) {
    try {
      return new URL(`https://${value}`).hostname.toLowerCase().replace(/^www\./, '');
    } catch (nestedError) {
      return '';
    }
  }
};

const findKnownProvider = (name = '', url = '') => {
  const lookup = `${normalizeText(name)} ${normalizeText(url)}`;
  return KNOWN_SOCIAL_PROVIDERS.find((provider) =>
    provider.aliases.some((alias) => lookup.includes(alias))
  );
};

const buildPrivacyOptionFromSocialEntry = (entry = {}) => {
  const name = String(entry?.name || '').trim();
  const url = String(entry?.url || '').trim();
  const knownProvider = findKnownProvider(name, url);
  if (knownProvider) {
    return { key: knownProvider.key, label: `${knownProvider.label} links` };
  }

  const host = parseHostname(url);
  if (host) {
    return { key: `domain:${host}`, label: `${host} links` };
  }

  const fallbackName = name || 'website';
  return {
    key: `name:${slugify(fallbackName) || 'website'}`,
    label: `${fallbackName} links`,
  };
};

const buildPrivacyOptions = (profile = {}) => {
  const optionsMap = new Map();
  const socialMedia = Array.isArray(profile?.socialMedia) ? profile.socialMedia : [];

  socialMedia.forEach((entry) => {
    const option = buildPrivacyOptionFromSocialEntry(entry);
    optionsMap.set(option.key, option);
  });

  const oauthProviders = profile?.oauthProviders || {};
  KNOWN_SOCIAL_PROVIDERS.forEach((provider) => {
    const isLinkedByOauth = Boolean(String(oauthProviders?.[provider.key]?.id || '').trim());
    if (!isLinkedByOauth) return;
    optionsMap.set(provider.key, { key: provider.key, label: `${provider.label} links` });
  });

  return Array.from(optionsMap.values());
};

const PrivacySettings = ({ profile, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_PRIVACY);
  const privacyOptions = buildPrivacyOptions(profile);

  useEffect(() => {
    const rawVisibilityMap = profile?.privacy?.socialLinkVisibility;
    const normalizedVisibilityMap =
      rawVisibilityMap && typeof rawVisibilityMap.get === 'function'
        ? Object.fromEntries(rawVisibilityMap.entries())
        : (rawVisibilityMap || {});

    setSettings({
      ...DEFAULT_PRIVACY,
      ...(profile?.privacy || {}),
      socialLinkVisibility: {
        ...DEFAULT_PRIVACY.socialLinkVisibility,
        ...normalizedVisibilityMap,
      },
    });
  }, [profile?.privacy]);

  const handleSave = async () => {
    await onUpdate({ privacy: settings });
  };

  const ToggleRow = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between gap-3 p-2.5 rounded-lg cursor-pointer transition bg-[var(--background-secondary)] hover:brightness-95 dark:hover:brightness-110">
      <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={`relative inline-flex h-6 w-11 min-w-[44px] shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-[var(--text-muted)]/45'
        }`}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );

  return (
    <div className="theme-panel rounded-2xl shadow-sm p-5 border border-[var(--border-default)]">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <FaLock className="text-[var(--brand-primary)]" size={16} />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Privacy Settings</h3>
        </div>
        <button className="text-[var(--text-secondary)] hover:opacity-80 transition">
          {isExpanded ? <FaChevronUp size={16} /> : <FaChevronDown size={16} />}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[32rem] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-2.5">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
              Profile Visibility
            </label>
            <select
              value={settings.profileVisibility}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, profileVisibility: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--background-secondary)] text-[var(--text-primary)]"
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <ToggleRow
            label="Show Email"
            checked={settings.showEmail}
            onChange={(next) => setSettings((prev) => ({ ...prev, showEmail: next }))}
          />

          <ToggleRow
            label="Show Phone"
            checked={settings.showPhone}
            onChange={(next) => setSettings((prev) => ({ ...prev, showPhone: next }))}
          />

          {privacyOptions.length > 0 ? (
            privacyOptions.map((option) => (
              <ToggleRow
                key={option.key}
                label={`Show ${option.label}`}
                checked={settings?.socialLinkVisibility?.[option.key] !== false}
                onChange={(next) =>
                  setSettings((prev) => ({
                    ...prev,
                    socialLinkVisibility: {
                      ...(prev?.socialLinkVisibility || {}),
                      [option.key]: next,
                    },
                  }))
                }
              />
            ))
          ) : (
            <p className="text-xs text-[var(--text-secondary)] px-1 py-2">
              No social links connected yet.
            </p>
          )}

          <ToggleRow
            label="Allow Messages"
            checked={settings.allowMessages}
            onChange={(next) => setSettings((prev) => ({ ...prev, allowMessages: next }))}
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-4 w-full theme-primary-button px-4 py-2 rounded-lg text-sm font-medium active:scale-95"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default PrivacySettings;
