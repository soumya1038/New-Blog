import React, { useEffect, useState } from 'react';
import { FaChevronDown, FaChevronUp, FaLock } from 'react-icons/fa';

const DEFAULT_PRIVACY = {
  profileVisibility: 'public',
  showEmail: true,
  showPhone: true,
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
    <label className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={`relative inline-flex h-6 w-11 min-w-[44px] shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        aria-label={label}
        aria-pressed={checked}
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <FaLock className="text-indigo-600 dark:text-indigo-400" size={16} />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Privacy Settings</h3>
        </div>
        <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition">
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
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              Profile Visibility
            </label>
            <select
              value={settings.profileVisibility}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, profileVisibility: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
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
            label="Allow Messages"
            checked={settings.allowMessages}
            onChange={(next) => setSettings((prev) => ({ ...prev, allowMessages: next }))}
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium active:scale-95"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default PrivacySettings;
