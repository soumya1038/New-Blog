const express = require('express');
const { createComment, getComments, deleteComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const trackActivity = require('../middleware/trackActivity');

const router = express.Router();

router.post('/:blogId', protect, trackActivity, createComment);
router.get('/:blogId', getComments);
router.delete('/:id', protect, trackActivity, deleteComment);

module.exports = router;
