const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getCallHistory, createCallLog, updateCallLog } = require('../controllers/callController');

// Get call history with specific user
router.get('/history/:userId', protect, getCallHistory);

// Create call log
router.post('/log', protect, createCallLog);

// Update call log
router.put('/log/:callLogId', protect, updateCallLog);

module.exports = router;
