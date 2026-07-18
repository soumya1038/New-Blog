const express = require('express');
const {
  toggleFollow,
  followOnly,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  deleteMessageNotifications,
  deleteNotification
} = require('../controllers/socialController');
const { protect } = require('../middleware/auth');
const trackActivity = require('../middleware/trackActivity');

const router = express.Router();

router.post('/follow-only/:userId', protect, trackActivity, followOnly);
router.post('/follow/:userId', protect, trackActivity, toggleFollow);
router.get('/notifications', protect, trackActivity, getNotifications);
router.get('/notifications/unread-count', protect, trackActivity, getUnreadCount);
router.put('/notifications/read-all', protect, trackActivity, markAllAsRead);
router.put('/notifications/:id/read', protect, trackActivity, markAsRead);
router.delete('/notifications', protect, trackActivity, clearNotifications);
router.delete('/notifications/messages/:senderId', protect, trackActivity, deleteMessageNotifications);
router.delete('/notifications/:id', protect, trackActivity, deleteNotification);

module.exports = router;
