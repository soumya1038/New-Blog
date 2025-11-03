import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FaHeart, FaComment, FaUserPlus, FaArrowLeft } from 'react-icons/fa';
import { FiMessageCircle } from 'react-icons/fi';
import soundManager from '../utils/soundManager';

const Notifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    const handleNewNotification = () => {
      fetchNotifications();
    };
    
    window.addEventListener('newNotification', handleNewNotification);
    
    return () => {
      window.removeEventListener('newNotification', handleNewNotification);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/social/notifications');
      const prevCount = notifications.length;
      setNotifications(data.notifications);
      
      // Play sound if new notification received
      if (data.notifications.length > prevCount) {
        soundManager.play('notification');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/social/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      window.dispatchEvent(new CustomEvent('newNotification'));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/social/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      window.dispatchEvent(new CustomEvent('newNotification'));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const clearAll = async () => {
    try {
      await api.delete('/social/notifications');
      setNotifications([]);
      window.dispatchEvent(new CustomEvent('newNotification'));
      setShowModal(false);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <FaHeart className="text-red-500" />;
      case 'comment': return <FaComment className="text-blue-500" />;
      case 'follow': return <FaUserPlus className="text-green-500" />;
      case 'message': return <FiMessageCircle className="text-purple-500" />;
      default: return null;
    }
  };

  const handleNotificationClick = async (notification, e) => {
    if (e.target.tagName === 'A') return;
    
    try {
      await api.delete(`/social/notifications/${notification._id}`);
      setNotifications(notifications.filter(n => n._id !== notification._id));
      window.dispatchEvent(new CustomEvent('newNotification'));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
    
    if (notification.type === 'message') {
      navigate('/chat', { state: { selectedUser: notification.sender } });
    } else if (notification.type === 'like' || notification.type === 'comment') {
      if (notification.blog) {
        navigate(`/blog/${notification.blog}`);
      }
    } else if (notification.type === 'follow') {
      navigate(`/user/${notification.sender._id}`);
    }
  };

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('Clear All Notifications?')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('This action cannot be undone. All notifications will be permanently deleted.')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={clearAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                {t('Clear all')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 font-semibold"
        >
          <FaArrowLeft /> {t('Back')}
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">{t('Notifications')}</h1>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={markAllAsRead} className="flex-1 sm:flex-none text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                {t('Mark all read')}
              </button>
              <button onClick={() => setShowModal(true)} className="flex-1 sm:flex-none text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm px-3 py-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                {t('Clear all')}
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {notifications.map(notification => (
              <div
                key={notification._id}
                className={`p-3 rounded-lg border transition-all cursor-pointer relative ${
                  notification.isRead 
                    ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600' 
                    : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                }`}
                onClick={(e) => handleNotificationClick(notification, e)}
              >
                {!notification.isRead && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                )}
                <div className="flex items-center gap-3">
                  <div className="text-lg flex-shrink-0">{getIcon(notification.type)}</div>
                  <img
                    src={notification.sender?.profileImage || 'https://via.placeholder.com/30'}
                    alt={notification.sender?.username}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-semibold">{notification.sender?.username}</span>
                      {' '}{(() => {
                        const msg = notification.message.replace(`${notification.sender?.username} `, '');
                        if (msg.includes('liked your post')) return t('liked your post') + msg.substring(msg.indexOf('"'));
                        if (msg.includes('commented on your post')) return t('commented on your post') + msg.substring(msg.indexOf('"'));
                        if (msg.includes('started following you')) return t('started following you');
                        if (msg.includes('sent you a message')) return t('sent you a message') + (msg.includes(': ') ? msg.substring(msg.indexOf(':')) : '');
                        return msg;
                      })()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {notifications.length === 0 && (
            <div className="text-center text-gray-600 dark:text-gray-400 py-12">
              <p className="text-xl">{t('No notifications yet')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default Notifications;
