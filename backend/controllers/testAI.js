// Quick test script to verify OpenAI connection
require('dotenv').config();
const OpenAI = require('openai');

const testOpenAI = async () => {
  console.log('Testing OpenAI connection...');
  console.log('API Key:', process.env.OPENAI_API_KEY ? 'Found' : 'NOT FOUND');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in .env file');
    return;
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello, AI is working!"' }
      ],
      max_tokens: 20
    });

    console.log('✅ OpenAI Response:', completion.choices[0].message.content);
    console.log('✅ Connection successful!');
  } catch (error) {
    console.error('❌ OpenAI Error:', error.message);
    if (error.status === 401) {
      console.error('❌ Invalid API key');
    } else if (error.status === 429) {
      console.error('❌ Rate limit exceeded or quota reached');
    }
  }
};

testOpenAI();
