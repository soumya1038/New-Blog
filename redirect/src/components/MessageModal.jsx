import React, { useState } from 'react';
import { FiSend, FiX } from 'react-icons/fi';
import api from '../services/api';

const MessageModal = ({ open, onClose, receiver }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!content.trim()) {
      setError('Message cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/messages', { receiverId: receiver._id, content });
      setContent('');
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setError('');
    onClose(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img
              src={receiver?.profileImage || `https://ui-avatars.com/api/?name=${receiver?.name}&background=0D8ABC&color=fff`}
              alt={receiver?.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Send Message</h3>
              <p className="text-sm text-gray-500">to {receiver?.name}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <textarea
            autoFocus
            rows={4}
            placeholder="Type your message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <p className="text-xs text-gray-500 mt-2">{content.length}/1000 characters</p>
        </div>

        <div className="p-6 pt-0 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiX className="inline mr-2" />
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !content.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend className="inline mr-2" />
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
