import React from 'react';
import { FiX, FiPhone, FiVideo, FiPhoneIncoming, FiPhoneOutgoing, FiPhoneMissed } from 'react-icons/fi';

const CallHistoryModal = ({ callLogs, currentUserId, onClose, onCallBack }) => {
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
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Call History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Call Logs */}
        <div className="flex-1 overflow-y-auto p-4">
          {callLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiPhone className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No call history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {callLogs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  onClick={() => onCallBack(log.type)}
                >
                  {/* Call Icon */}
                  <div className="flex-shrink-0">
                    {getCallIcon(log)}
                  </div>

                  {/* Call Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {getCallLabel(log)}
                      </span>
                      {log.type === 'video' ? (
                        <FiVideo className="w-4 h-4 text-gray-500" />
                      ) : (
                        <FiPhone className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatTimestamp(log.createdAt)}</span>
                      {log.status === 'completed' && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(log.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Call Back Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCallBack(log.type);
                    }}
                    className="flex-shrink-0 p-2 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
                  >
                    {log.type === 'video' ? (
                      <FiVideo className="w-4 h-4 text-white" />
                    ) : (
                      <FiPhone className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallHistoryModal;
