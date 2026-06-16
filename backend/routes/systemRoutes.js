const express = require('express');
const axios = require('axios');

const router = express.Router();

router.get('/bg-remover/warmup', async (req, res) => {
  const provider = String(process.env.BACKGROUND_REMOVAL_PROVIDER || 'removebg').toLowerCase();
  const timeout = Number(process.env.REMOVE_BG_TIMEOUT_MS || process.env.BG_REMOVER_TIMEOUT_MS) || 45000;

  if (provider === 'removebg') {
    const apiKey = process.env.REMOVE_BG_API_KEY;
    const accountUrl = process.env.REMOVE_BG_ACCOUNT_URL || 'https://api.remove.bg/v1.0/account';

    if (!apiKey) {
      return res.json({ success: false, status: 'not_configured' });
    }

    try {
      await axios.get(accountUrl, {
        headers: { 'X-Api-Key': apiKey },
        timeout,
      });
      return res.json({ success: true, status: 'warm', provider });
    } catch (error) {
      return res.json({ success: false, status: 'cold_or_unavailable', provider });
    }
  }

  const serviceUrl = String(process.env.BG_REMOVER_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.BG_REMOVER_API_KEY;

  if (!serviceUrl || !apiKey) {
    return res.json({ success: false, status: 'not_configured' });
  }

  try {
    await axios.get(`${serviceUrl}/health`, {
      headers: { 'x-api-key': apiKey },
      timeout,
    });
    return res.json({ success: true, status: 'warm', provider });
  } catch (error) {
    return res.json({ success: false, status: 'cold_or_unavailable', provider });
  }
});

module.exports = router;
