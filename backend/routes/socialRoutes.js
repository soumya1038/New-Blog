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

const router = express.Router();

router.post('/follow/:userId', protect, toggleFollow);
router.get('/notifications', protect, getNotifications);
router.get('/notifications/unread-count', protect, getUnreadCount);
router.put('/notifications/:id/read', protect, markAsRead);
router.put('/notifications/read-all', protect, markAllAsRead);
router.delete('/notifications', protect, clearNotifications);
router.delete('/notifications/messages/:senderId', protect, deleteMessageNotifications);
router.delete('/notifications/:id', protect, deleteNotification);

module.exports = router;
