import React, { useEffect, useState } from 'react';
import { FaLock, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const DEFAULT_PRIVACY = {
  profileVisibility: 'public',
  showEmail: true,
  showPhone: true,
  showSocialLinks: true,
  allowMessages: true,
};

const PrivacySettings = ({ profile, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_PRIVACY);

  useEffect(() => {
    setSettings({
      ...DEFAULT_PRIVACY,
      ...(profile?.privacy || {}),
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

          <ToggleRow
            label="Show Social Media Links"
            checked={settings.showSocialLinks}
            onChange={(next) => setSettings((prev) => ({ ...prev, showSocialLinks: next }))}
          />

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
