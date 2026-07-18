const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getIceServers, getCallHistory, createCallLog, updateCallLog, deleteCallLog } = require('../controllers/callController');

// Get ICE server configuration for WebRTC
router.get('/ice-servers', protect, getIceServers);

// Get call history with specific user
router.get('/history/:userId', protect, getCallHistory);

// Create call log
router.post('/log', protect, createCallLog);

// Update call log
router.put('/log/:callLogId', protect, updateCallLog);

// Delete call log
router.delete('/log/:callLogId', protect, deleteCallLog);

module.exports = router;
