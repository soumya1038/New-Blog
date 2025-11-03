const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
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

router.post('/', protect, sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/unread-count', protect, getUnreadCount);
router.get('/search-users', protect, searchUsers);
router.get('/blocked-users', protect, getBlockedUsers);
router.get('/muted-users', protect, getMutedUsers);
router.get('/:userId', protect, getMessages);
router.delete('/:id', protect, deleteMessage);
router.delete('/conversation/:userId', protect, deleteConversation);
router.delete('/clear/:userId', protect, clearChat);
router.post('/block/:userId', protect, blockUser);
router.post('/unblock/:userId', protect, unblockUser);
router.post('/mute/:userId', protect, muteUser);
router.post('/unmute/:userId', protect, unmuteUser);
router.put('/mark-read/:userId', protect, markMessagesAsRead);
router.post('/reaction/:messageId', protect, addReaction);
router.delete('/reaction/:messageId', protect, removeReaction);
router.put('/last-seen', protect, updateLastSeen);
router.post('/pin/:messageId', protect, pinMessage);
router.post('/unpin/:messageId', protect, unpinMessage);
router.get('/pinned/:userId', protect, getPinnedMessages);
router.get('/group/:groupId', protect, getGroupMessages);
router.post('/group', protect, sendGroupMessage);

module.exports = router;
