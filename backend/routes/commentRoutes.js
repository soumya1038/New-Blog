const express = require('express');
const { createComment, getComments, deleteComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/:blogId', protect, createComment);
router.get('/:blogId', getComments);
router.delete('/:id', protect, deleteComment);

module.exports = router;
