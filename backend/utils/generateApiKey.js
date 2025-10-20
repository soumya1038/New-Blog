const crypto = require('crypto');

// Generate OpenAI-style API key
const generateApiKey = () => {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `sk-proj-${randomBytes}`;
};

module.exports = generateApiKey;
