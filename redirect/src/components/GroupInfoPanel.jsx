import React, { useState, useEffect } from 'react';
import { FiX, FiUserPlus, FiUserMinus, FiLogOut, FiShield, FiEdit2, FiCamera, FiCheck, FiLink, FiCopy, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import ConfirmModal from './ConfirmModal';

const GroupInfoPanel = ({ group: initialGroup, currentUserId, onClose, onUpdate, onLeave }) => {
  const [group, setGroup] = useState(initialGroup);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempName, setTempName] = useState(group.name);
  const [tempDescription, setTempDescription] = useState(group.description || '');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [showAssignAdmin, setShowAssignAdmin] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    setGroup(initialGroup);
    setTempName(initialGroup.name);
    setTempDescription(initialGroup.description || '');
  }, [initialGroup]);

  const isAdmin = group.admins?.some(admin => 
    (typeof admin === 'string' ? admin : admin._id) === currentUserId
  );
  
  const isCoAdmin = group.coAdmins?.some(admin => 
    (typeof admin === 'string' ? admin : admin._id) === currentUserId
  );
  
  const canManage = isAdmin || isCoAdmin;

  const getUserDisplayName = (user) => {
    return user?.fullName || user?.name || user?.username || 'Unknown';
  };

  const getUserAvatar = (user) => {
    const displayName = getUserDisplayName(user);
    return user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;
  };

  const isUserAdmin = (userId) => {
    return group.admins?.some(admin => 
      (typeof admin === 'string' ? admin : admin._id) === userId
    );
  };
  
  const isUserCoAdmin = (userId) => {
    return group.coAdmins?.some(admin => 
      (typeof admin === 'string' ? admin : admin._id) === userId
    );
  };

  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data } = await api.get(`/messages/search-users?query=${query}`);
      const memberIds = group.members.map(m => typeof m === 'string' ? m : m._id);
      setSearchResults(data.users.filter(u => !memberIds.includes(u._id)));
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleAddMember = async (userId) => {
    setLoading(true);
    try {
      const { data } = await api.post(`/groups/${group._id}/members`, { memberIds: [userId] });
      setGroup(data.group);
      onUpdate(data.group);
      setShowAddMember(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (userId, userName) => {
    setConfirmModal({
      title: 'Remove Member',
      message: `Remove ${userName} from the group?`,
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const { data } = await api.delete(`/groups/${group._id}/members/${userId}`);
          setGroup(data.group);
          onUpdate(data.group);
        } catch (error) {
          alert(error.response?.data?.message || 'Failed to remove member');
        } finally {
          setLoading(false);
          setConfirmModal(null);
        }
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  const handleToggleCoAdmin = (userId, userName) => {
    const isCurrentlyCoAdmin = isUserCoAdmin(userId);
    const action = isCurrentlyCoAdmin ? 'Remove co-admin rights' : 'Make co-admin';
    
    setConfirmModal({
      title: action,
      message: `${action} for ${userName}?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          if (isCurrentlyCoAdmin) {
            const { data } = await api.delete(`/groups/${group._id}/co-admins/${userId}`);
            setGroup(data.group);
            onUpdate(data.group);
          } else {
            const { data } = await api.post(`/groups/${group._id}/co-admins/${userId}`);
            setGroup(data.group);
            onUpdate(data.group);
          }
        } catch (error) {
          alert(error.response?.data?.message || 'Failed to update co-admin status');
        } finally {
          setLoading(false);
          setConfirmModal(null);
        }
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  const handleLeaveGroup = () => {
    setConfirmModal({
      title: 'Leave Group',
      message: 'Leave this group? You will need to be re-added by an admin.',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        
        // Check if current user is the only admin
        if (isAdmin && group.admins.length === 1 && group.members.length > 1) {
          // Show assign admin modal
          setShowAssignAdmin(true);
        } else {
          // Proceed with leaving
          await executeLeaveGroup();
        }
      },
      onCancel: () => setConfirmModal(null)
    });
  };
  
  const executeLeaveGroup = async (newAdminId = null) => {
    setLoading(true);
    try {
      if (newAdminId) {
        // First make the selected member a co-admin, then leave
        await api.post(`/groups/${group._id}/co-admins/${newAdminId}`);
      }
      await api.post(`/groups/${group._id}/leave`);
      onLeave();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to leave group');
    } finally {
      setLoading(false);
      setShowAssignAdmin(false);
      setSelectedNewAdmin(null);
    }
  };
  
  const handleAssignAdminAndLeave = () => {
    if (!selectedNewAdmin) {
      alert('Please select a member to make admin');
      return;
    }
    executeLeaveGroup(selectedNewAdmin);
  };
  
  const handleUpdateName = async () => {
    if (!tempName.trim() || tempName === group.name) {
      setEditingName(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await api.put(`/groups/${group._id}`, { name: tempName.trim() });
      setGroup(data.group);
      onUpdate(data.group);
      setEditingName(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateDescription = async () => {
    if (tempDescription === (group.description || '')) {
      setEditingDescription(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await api.put(`/groups/${group._id}`, { description: tempDescription });
      setGroup(data.group);
      onUpdate(data.group);
      setEditingDescription(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update description');
    } finally {
      setLoading(false);
    }
  };
  
  const handleIconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }
    
    setUploadingIcon(true);
    try {
      const formData = new FormData();
      formData.append('icon', file);
      
      const { data } = await api.post(`/groups/${group._id}/icon`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const updatedGroup = { ...group, icon: data.icon };
      setGroup(updatedGroup);
      onUpdate(updatedGroup);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to upload icon');
    } finally {
      setUploadingIcon(false);
    }
  };
  
  const getInviteLink = () => {
    return `${window.location.origin}/join-group/${group.inviteCode}`;
  };
  
  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(getInviteLink());
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };
  
  const handleRegenerateInvite = async () => {
    setConfirmModal({
      title: 'Regenerate Invite Link',
      message: 'This will invalidate the old link. Continue?',
      onConfirm: async () => {
        setLoading(true);
        try {
          const { data } = await api.post(`/groups/${group._id}/regenerate-invite`);
          const updatedGroup = { ...group, inviteCode: data.inviteCode };
          setGroup(updatedGroup);
          onUpdate(updatedGroup);
        } catch (error) {
          alert(error.response?.data?.message || 'Failed to regenerate invite link');
        } finally {
          setLoading(false);
          setConfirmModal(null);
        }
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Group Info</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <FiX className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Group Details */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              <img
                src={group.icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=0D8ABC&color=fff`}
                alt={group.name}
                className="w-20 h-20 rounded-full object-cover"
              />
              {canManage && (
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    disabled={uploadingIcon}
                    className="hidden"
                  />
                  {uploadingIcon ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiCamera className="w-4 h-4" />
                  )}
                </label>
              )}
            </div>
            
            {/* Group Name */}
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-lg font-semibold text-center"
                  maxLength={50}
                  autoFocus
                />
                <button onClick={handleUpdateName} disabled={loading} className="p-1 bg-green-600 text-white rounded hover:bg-green-700">
                  <FiCheck className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditingName(false); setTempName(group.name); }} className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xl font-semibold text-gray-900">{group.name}</h4>
                {canManage && (
                  <button onClick={() => setEditingName(true)} className="p-1 text-gray-500 hover:text-blue-600">
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            
            {/* Description */}
            {editingDescription ? (
              <div className="w-full mb-2">
                <textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                  maxLength={200}
                  rows={3}
                  placeholder="Add description..."
                  autoFocus
                />
                <div className="flex justify-center gap-2 mt-2">
                  <button onClick={handleUpdateDescription} disabled={loading} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                    Save
                  </button>
                  <button onClick={() => { setEditingDescription(false); setTempDescription(group.description || ''); }} className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                {group.description ? (
                  <p className="text-sm text-gray-600 text-center">{group.description}</p>
                ) : canManage ? (
                  <p className="text-sm text-gray-400 text-center italic">No description</p>
                ) : null}
                {canManage && (
                  <button onClick={() => setEditingDescription(true)} className="p-1 text-gray-500 hover:text-blue-600">
                    <FiEdit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-3 mt-2">
              <p className="text-xs text-gray-500">{group.members?.length || 0} members</p>
              {canManage && (
                <button
                  onClick={() => setShowInviteLink(!showInviteLink)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <FiLink className="w-3 h-3" />
                  Invite Link
                </button>
              )}
            </div>
            
            {/* Invite Link Section */}
            {showInviteLink && canManage && (
              <div className="w-full mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={getInviteLink()}
                    readOnly
                    className="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded"
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Copy link"
                  >
                    {copiedInvite ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={handleRegenerateInvite}
                      className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      title="Regenerate link"
                    >
                      <FiRefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-600">Share this link to invite members</p>
              </div>
            )}
          </div>

          {/* Add Member Button */}
          {canManage && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <FiUserPlus className="w-4 h-4" />
              <span>Add Members</span>
            </button>
          )}

          {/* Add Member Search */}
          {showAddMember && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map(user => (
                    <div key={user._id} className="flex items-center justify-between p-2 hover:bg-white rounded">
                      <div className="flex items-center gap-2">
                        <img src={getUserAvatar(user)} alt={getUserDisplayName(user)} className="w-8 h-8 rounded-full" />
                        <span className="text-sm font-medium">{getUserDisplayName(user)}</span>
                      </div>
                      <button
                        onClick={() => handleAddMember(user._id)}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members List */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">Members</h5>
            <div className="space-y-2">
              {group.members.map(member => {
                const memberId = typeof member === 'string' ? member : member._id;
                const memberIsAdmin = isUserAdmin(memberId);
                const isCurrentUser = memberId === currentUserId;

                return (
                  <div key={memberId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <img
                        src={getUserAvatar(member)}
                        alt={getUserDisplayName(member)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {getUserDisplayName(member)}
                          {isCurrentUser && ' (You)'}
                        </p>
                        {memberIsAdmin && (
                          <p className="text-xs text-blue-600 flex items-center gap-1">
                            <FiShield className="w-3 h-3" /> Admin
                          </p>
                        )}
                        {!memberIsAdmin && isUserCoAdmin(memberId) && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <FiShield className="w-3 h-3" /> Co-Admin
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {canManage && !isCurrentUser && !memberIsAdmin && (
                      <div className="flex gap-1">
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleCoAdmin(memberId, getUserDisplayName(member))}
                            disabled={loading}
                            className="p-2 hover:bg-gray-200 rounded-full"
                            title={isUserCoAdmin(memberId) ? 'Remove co-admin' : 'Make co-admin'}
                          >
                            <FiShield className={`w-4 h-4 ${isUserCoAdmin(memberId) ? 'text-green-600' : 'text-gray-400'}`} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(memberId, getUserDisplayName(member))}
                          disabled={loading}
                          className="p-2 hover:bg-red-100 rounded-full"
                          title="Remove member"
                        >
                          <FiUserMinus className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLeaveGroup}
            disabled={loading}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
          >
            <FiLogOut className="w-4 h-4" />
            <span>Leave Group</span>
          </button>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          danger={confirmModal.danger}
        />
      )}
      
      {/* Assign Admin Modal */}
      {showAssignAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assign New Admin</h3>
              <p className="text-sm text-gray-600 mt-1">Select a member to become the new admin before you leave</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {group.members
                  .filter(member => {
                    const memberId = typeof member === 'string' ? member : member._id;
                    return memberId !== currentUserId;
                  })
                  .map(member => {
                    const memberId = typeof member === 'string' ? member : member._id;
                    const memberIsCoAdmin = isUserCoAdmin(memberId);
                    
                    return (
                      <label
                        key={memberId}
                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          selectedNewAdmin === memberId
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="newAdmin"
                          value={memberId}
                          checked={selectedNewAdmin === memberId}
                          onChange={() => setSelectedNewAdmin(memberId)}
                          className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <img
                          src={getUserAvatar(member)}
                          alt={getUserDisplayName(member)}
                          className="w-10 h-10 rounded-full object-cover ml-3"
                        />
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">{getUserDisplayName(member)}</p>
                          {memberIsCoAdmin && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <FiShield className="w-3 h-3" /> Co-Admin
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => {
                  setShowAssignAdmin(false);
                  setSelectedNewAdmin(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignAdminAndLeave}
                disabled={!selectedNewAdmin || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Leaving...' : 'Assign & Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInfoPanel;
