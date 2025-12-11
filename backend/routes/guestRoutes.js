const express = require('express');
const { trackGuestActivity } = require('../middleware/guestTracking');

const router = express.Router();

// Track guest activity
router.post('/track', trackGuestActivity, (req, res) => {
  res.json({ success: true });
});

module.exports = router;