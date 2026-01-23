const dotenv = require('dotenv');
dotenv.config();

console.log('\n🔍 LiveKit Configuration Check\n');
console.log('================================\n');

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const wsUrl = process.env.LIVEKIT_WS_URL;

let allConfigured = true;

// Check API Key
if (!apiKey || apiKey === 'your_livekit_api_key') {
  console.log('❌ LIVEKIT_API_KEY: Not configured');
  allConfigured = false;
} else {
  console.log('✅ LIVEKIT_API_KEY: Configured');
}

// Check API Secret
if (!apiSecret || apiSecret === 'your_livekit_api_secret') {
  console.log('❌ LIVEKIT_API_SECRET: Not configured');
  allConfigured = false;
} else {
  console.log('✅ LIVEKIT_API_SECRET: Configured');
}

// Check WebSocket URL
if (!wsUrl || wsUrl === 'wss://your-project.livekit.cloud') {
  console.log('❌ LIVEKIT_WS_URL: Not configured');
  allConfigured = false;
} else {
  console.log('✅ LIVEKIT_WS_URL: Configured');
}

console.log('\n================================\n');

if (allConfigured) {
  console.log('✅ All LiveKit credentials are configured!');
  console.log('🚀 You can now use group video calls.\n');
  console.log('To test:');
  console.log('1. Start the backend: npm run dev');
  console.log('2. Open a group chat in the frontend');
  console.log('3. Click the video call button\n');
} else {
  console.log('⚠️  LiveKit is not fully configured.');
  console.log('📖 Please follow the instructions in LIVEKIT_SETUP.md\n');
  console.log('Quick steps:');
  console.log('1. Go to https://cloud.livekit.io');
  console.log('2. Sign up and create a project');
  console.log('3. Copy your credentials to backend/.env');
  console.log('4. Restart the backend server\n');
}
