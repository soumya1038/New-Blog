// Test script to verify Groq connection
require('dotenv').config();
const Groq = require('groq-sdk');

const testGroq = async () => {
  console.log('Testing Groq connection...');
  console.log('API Key:', process.env.GROQ_API_KEY ? 'Found ✅' : 'NOT FOUND ❌');
  
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY not found in .env file');
    return;
  }

  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    console.log('Sending test request to Groq...');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello, Groq is working perfectly!"' }
      ],
      max_tokens: 50
    });

    console.log('\n✅ Groq Response:', completion.choices[0].message.content);
    console.log('✅ Connection successful!');
    console.log('✅ Model:', completion.model);
    console.log('✅ Tokens used:', completion.usage.total_tokens);
  } catch (error) {
    console.error('\n❌ Groq Error:', error.message);
    if (error.status === 401) {
      console.error('❌ Invalid API key');
    } else if (error.status === 429) {
      console.error('❌ Rate limit exceeded');
    }
  }
};

testGroq();
