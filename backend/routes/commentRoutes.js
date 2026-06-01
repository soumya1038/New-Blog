const express = require('express');
const { createComment, getComments, getReplies, likeComment, dislikeComment, heartComment, pinComment, deleteComment } = require('../controllers/commentController');
const { protect, optionalAuth } = require('../middleware/auth');
const trackActivity = require('../middleware/trackActivity');
const { createCommentLimiter, commentSpamGuard } = require('../middleware/commentProtection');

const router = express.Router();

router.post('/:blogId', protect, createCommentLimiter, commentSpamGuard, trackActivity, createComment);
router.get('/:blogId', optionalAuth, getComments);
router.get('/:commentId/replies', optionalAuth, getReplies);
router.post('/:id/like', protect, trackActivity, likeComment);
router.post('/:id/dislike', protect, trackActivity, dislikeComment);
router.post('/:id/heart', protect, trackActivity, heartComment);
router.post('/:id/pin', protect, trackActivity, pinComment);
router.put('/:id', protect, trackActivity, require('../controllers/commentController').editComment);
router.delete('/:id', protect, trackActivity, deleteComment);

module.exports = router;
