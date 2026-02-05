import React, { useState } from 'react';
import { FaLock, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const PrivacySettings = ({ profile, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [settings, setSettings] = useState({
    profileVisibility: profile?.privacy?.profileVisibility || 'public',
    showEmail: profile?.privacy?.showEmail !== false,
    showPhone: profile?.privacy?.showPhone !== false,
    allowMessages: profile?.privacy?.allowMessages !== false
  });

  const handleSave = async () => {
    await onUpdate({ privacy: settings });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
      {/* Header - Always Visible */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <FaLock className="text-indigo-600 dark:text-indigo-400" size={16} />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Privacy Settings</h3>
        </div>
        <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition">
          {isExpanded ? <FaChevronUp size={16} /> : <FaChevronDown size={16} />}
        </button>
      </div>

      {/* Collapsible Content */}
      <div className={`overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
      }`}>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Profile Visibility</label>
          <select
            value={settings.profileVisibility}
            onChange={(e) => setSettings({ ...settings, profileVisibility: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="public">🌍 Public</option>
            <option value="friends">👥 Friends Only</option>
            <option value="private">🔒 Private</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Email</span>
            <input
              type="checkbox"
              checked={settings.showEmail}
              onChange={(e) => setSettings({ ...settings, showEmail: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Phone</span>
            <input
              type="checkbox"
              checked={settings.showPhone}
              onChange={(e) => setSettings({ ...settings, showPhone: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Allow Messages</span>
            <input
              type="checkbox"
              checked={settings.allowMessages}
              onChange={(e) => setSettings({ ...settings, allowMessages: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium active:scale-95"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default PrivacySettings;
