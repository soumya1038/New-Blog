const express = require('express');
const axios = require('axios');
const router = express.Router();

// Zoho OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        code,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: process.env.ZOHO_REDIRECT_URI,
        grant_type: 'authorization_code'
      }
    });

    const { access_token, refresh_token } = response.data;

    res.send(`
      <h1>Zoho OAuth Success!</h1>
      <p>Copy this refresh token to your .env file:</p>
      <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px;">
ZOHO_REFRESH_TOKEN=${refresh_token}
      </pre>
      <p>Access Token (expires in 1 hour): ${access_token}</p>
    `);
  } catch (error) {
    console.error('Zoho OAuth error:', error.response?.data || error.message);
    res.status(500).send('OAuth failed: ' + (error.response?.data?.error || error.message));
  }
});

module.exports = router;
