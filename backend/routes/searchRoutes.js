const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { searchContent } = require('../controllers/searchController');

const router = express.Router();

router.get('/', optionalAuth, searchContent);

module.exports = router;
