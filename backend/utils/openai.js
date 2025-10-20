const Groq = require('groq-sdk');

if (!process.env.GROQ_API_KEY) {
  console.error('⚠️  GROQ_API_KEY not found in environment variables');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

module.exports = groq;
