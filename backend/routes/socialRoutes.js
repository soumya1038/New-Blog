const express = require('express');
const {
  toggleFollow,
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

router.post('/follow/:userId', protect, trackActivity, toggleFollow);
router.get('/notifications', protect, trackActivity, getNotifications);
router.get('/notifications/unread-count', protect, trackActivity, getUnreadCount);
router.put('/notifications/:id/read', protect, trackActivity, markAsRead);
router.put('/notifications/read-all', protect, trackActivity, markAllAsRead);
router.delete('/notifications', protect, trackActivity, clearNotifications);
router.delete('/notifications/messages/:senderId', protect, trackActivity, deleteMessageNotifications);
router.delete('/notifications/:id', protect, trackActivity, deleteNotification);

module.exports = router;
