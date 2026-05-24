import React, { useEffect, useState } from 'react';
import { FaChevronDown, FaChevronUp, FaEnvelopeOpenText } from 'react-icons/fa';

const DEFAULT_EMAIL_SETTINGS = {
  newFollower: true,
  newMessage: true,
  missedCall: true,
  newComment: true,
  newReaction: true,
  contentPublished: true,
};

const EmailNotificationSettings = ({ profile, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_EMAIL_SETTINGS);

  useEffect(() => {
    setSettings({
      ...DEFAULT_EMAIL_SETTINGS,
      ...(profile?.emailNotifications || {}),
      contentPublished: true,
    });
  }, [profile?.emailNotifications]);

  const toggleSetting = (key) => {
    if (key === 'contentPublished') return;
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    await onUpdate({
      emailNotifications: {
        ...settings,
        contentPublished: true,
      },
    });
  };

  const ToggleRow = ({ label, settingKey, description, locked = false }) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5">
      <div className="min-w-0 pr-2">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => toggleSetting(settingKey)}
        disabled={locked}
        className={`relative inline-flex h-6 w-11 min-w-[44px] shrink-0 items-center rounded-full p-0.5 transition-colors ${
          settings[settingKey] ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
        } ${locked ? 'opacity-70 cursor-not-allowed' : ''}`}
        aria-label={label}
        aria-pressed={settings[settingKey]}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            settings[settingKey] ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <FaEnvelopeOpenText className="text-indigo-600 dark:text-indigo-400" size={16} />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Email Notifications</h3>
        </div>
        <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
          {isExpanded ? <FaChevronUp size={16} /> : <FaChevronDown size={16} />}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[40rem] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-2.5">
          <ToggleRow
            label="New follower email"
            settingKey="newFollower"
            description="Receive an email when someone follows you."
          />
          <ToggleRow
            label="New message email"
            settingKey="newMessage"
            description="Receive an email for direct messages."
          />
          <ToggleRow
            label="Missed call email"
            settingKey="missedCall"
            description="Receive an email when you miss a call."
          />
          <ToggleRow
            label="New comment email"
            settingKey="newComment"
            description="Receive an email when someone comments on your content."
          />
          <ToggleRow
            label="New reaction email"
            settingKey="newReaction"
            description="Receive an email when someone reacts to your content."
          />
          <ToggleRow
            label="Content published email"
            settingKey="contentPublished"
            description="System-managed and always enabled."
            locked
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium active:scale-95"
        >
          Save Email Preferences
        </button>
      </div>
    </div>
  );
};

export default EmailNotificationSettings;
