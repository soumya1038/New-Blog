const Groq = require('groq-sdk');

if (!process.env.GROQ_API_KEY) {
  console.error('⚠️  GROQ_API_KEY not found in environment variables');
}

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: toPositiveInt(process.env.AI_PROVIDER_TIMEOUT_MS, 30000),
  maxRetries: toPositiveInt(process.env.AI_PROVIDER_MAX_RETRIES, 1)
});

module.exports = groq;
