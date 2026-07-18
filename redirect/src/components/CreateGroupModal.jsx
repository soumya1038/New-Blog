import React, { useState, useEffect } from 'react';
import { FiX, FiUsers, FiCheck } from 'react-icons/fi';
import api from '../services/api';
import { getSafeImageUrl } from '../utils/safeMediaUrls';

const getUserAvatar = (user) => {
  const displayName = user?.fullName || user?.name || user?.username || 'User';
  return getSafeImageUrl(user?.profileImage)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;
};

const CreateGroupModal = ({ onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    searchUsers('');
  }, []);

  const searchUsers = async (query) => {
    try {
      const { data } = await api.get(`/messages/search-users?query=${query}`);
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.size === 0) {
      alert('Please enter group name and select at least one member');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/groups', {
        name: groupName,
        description,
        memberIds: Array.from(selectedMembers)
      });
      onGroupCreated(data.group);
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
      <div className="theme-modal-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
            <FiUsers className="text-blue-600" />
            Create Group
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--surface-elevated)] rounded-full text-[var(--text-secondary)]">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Group Name *</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              maxLength={50}
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional group description"
              maxLength={200}
              rows={2}
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Add Members ({selectedMembers.size} selected)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Search users..."
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {users.map(user => (
                <label
                  key={user._id}
                  className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedMembers.has(user._id) ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' : 'hover:bg-[var(--surface-elevated)] border-2 border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(user._id)}
                    onChange={() => toggleMember(user._id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <img
                    src={getUserAvatar(user)}
                    alt={user.username}
                    className="w-8 h-8 rounded-full ml-3"
                    referrerPolicy="no-referrer"
                  />
                  <span className="ml-3 font-medium text-[var(--text-primary)]">{user.fullName || user.username}</span>
                  {selectedMembers.has(user._id) && (
                    <FiCheck className="ml-auto text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-default)] flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 theme-soft-button rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !groupName.trim() || selectedMembers.size === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
