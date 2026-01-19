const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const trackActivity = require('../middleware/trackActivity');
const {
  sendMessage,
  getConversations,
  getMessages,
  deleteMessage,
  getUnreadCount,
  searchUsers,
  deleteConversation,
  clearChat,
  blockUser,
  unblockUser,
  getBlockedUsers,
  muteUser,
  unmuteUser,
  getMutedUsers,
  markMessagesAsRead,
  addReaction,
  removeReaction,
  updateLastSeen,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  getGroupMessages,
  sendGroupMessage
} = require('../controllers/messageController');

router.post('/', protect, trackActivity, sendMessage);
router.get('/conversations', protect, trackActivity, getConversations);
router.get('/unread-count', protect, trackActivity, getUnreadCount);
router.get('/search-users', protect, trackActivity, searchUsers);
router.get('/blocked-users', protect, trackActivity, getBlockedUsers);
router.get('/muted-users', protect, trackActivity, getMutedUsers);
router.get('/:userId', protect, trackActivity, getMessages);
router.delete('/:id', protect, trackActivity, deleteMessage);
router.delete('/conversation/:userId', protect, trackActivity, deleteConversation);
router.delete('/clear/:userId', protect, trackActivity, clearChat);
router.post('/block/:userId', protect, trackActivity, blockUser);
router.post('/unblock/:userId', protect, trackActivity, unblockUser);
router.post('/mute/:userId', protect, trackActivity, muteUser);
router.post('/unmute/:userId', protect, trackActivity, unmuteUser);
router.put('/mark-read/:userId', protect, trackActivity, markMessagesAsRead);
router.post('/reaction/:messageId', protect, trackActivity, addReaction);
router.delete('/reaction/:messageId', protect, trackActivity, removeReaction);
router.put('/last-seen', protect, trackActivity, updateLastSeen);
router.post('/pin/:messageId', protect, trackActivity, pinMessage);
router.post('/unpin/:messageId', protect, trackActivity, unpinMessage);
router.get('/pinned/:userId', protect, trackActivity, getPinnedMessages);
router.get('/group/:groupId', protect, trackActivity, getGroupMessages);
router.post('/group', protect, trackActivity, sendGroupMessage);

module.exports = router;
