const express = require('express');
const { createComment, getComments, getReplies, likeComment, heartComment, pinComment, deleteComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const trackActivity = require('../middleware/trackActivity');

const router = express.Router();

router.post('/:blogId', protect, trackActivity, createComment);
router.get('/:blogId', getComments);
router.get('/:commentId/replies', getReplies);
router.post('/:id/like', protect, trackActivity, likeComment);
router.post('/:id/heart', protect, trackActivity, heartComment);
router.post('/:id/pin', protect, trackActivity, pinComment);
router.put('/:id', protect, trackActivity, require('../controllers/commentController').editComment);
router.delete('/:id', protect, trackActivity, deleteComment);

module.exports = router;
