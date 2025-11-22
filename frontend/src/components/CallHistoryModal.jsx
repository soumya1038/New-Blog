import React from 'react';
import { FiX, FiPhone, FiVideo, FiPhoneIncoming, FiPhoneOutgoing, FiPhoneMissed, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';

const CallHistoryModal = ({ callLogs, onClose, onCallBack, getUserDisplayName, getUserAvatar, currentUserId, onDeleteLog }) => {
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleDeleteLog = async (logId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/calls/log/${logId}`);
      if (onDeleteLog) onDeleteLog(logId);
    } catch (error) {
      console.error('Failed to delete call log:', error);
    }
  };

  const getCallIcon = (log) => {
    const isIncoming = log.receiver._id === currentUserId;
    const isMissed = log.status === 'missed';
    const isRejected = log.status === 'rejected';

    if (isMissed || isRejected) {
      return <FiPhoneMissed className="w-5 h-5 text-red-500" />;
    }
    if (isIncoming) {
      return <FiPhoneIncoming className="w-5 h-5 text-green-500" />;
    }
    return <FiPhoneOutgoing className="w-5 h-5 text-blue-500" />;
  };

  const getCallLabel = (log) => {
    const isIncoming = log.receiver._id === currentUserId;
    const isMissed = log.status === 'missed';
    const isRejected = log.status === 'rejected';

    if (isMissed) return 'Missed';
    if (isRejected) return 'Rejected';
    if (isIncoming) return 'Incoming';
    return 'Outgoing';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Call History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Call Logs */}
        <div className="flex-1 overflow-y-auto p-4">
          {callLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FiPhone className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p>No call history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {callLogs.map((log) => {
                const otherUser = log.caller._id === currentUserId ? log.receiver : log.caller;
                return (
                <div
                  key={log._id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {/* User Avatar */}
                  <img
                    src={getUserAvatar(otherUser)}
                    alt={getUserDisplayName(otherUser)}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />

                  {/* Call Icon */}
                  <div className="flex-shrink-0">
                    {getCallIcon(log)}
                  </div>

                  {/* Call Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getUserDisplayName(otherUser)}
                      </span>
                      {log.type === 'video' ? (
                        <FiVideo className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <FiPhone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{getCallLabel(log)}</span>
                      <span>•</span>
                      <span>{formatTimestamp(log.createdAt)}</span>
                      {log.status === 'completed' && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(log.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCallBack(log);
                      }}
                      className="flex-shrink-0 p-2 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
                    >
                      {log.type === 'video' ? (
                        <FiVideo className="w-4 h-4 text-white" />
                      ) : (
                        <FiPhone className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteLog(log._id, e)}
                      className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                      title="Delete"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallHistoryModal;
