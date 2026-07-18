const crypto = require('crypto');

// Generate Lekhon API key
const generateApiKey = () => {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `lk_live_${randomBytes}`;
};

module.exports = generateApiKey;
