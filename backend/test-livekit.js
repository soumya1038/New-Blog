require('dotenv').config();
const { AccessToken } = require('livekit-server-sdk');

console.log('Testing LiveKit Configuration...\n');

console.log('LIVEKIT_API_KEY:', process.env.LIVEKIT_API_KEY ? '✓ Set' : '✗ Missing');
console.log('LIVEKIT_API_SECRET:', process.env.LIVEKIT_API_SECRET ? '✓ Set' : '✗ Missing');
console.log('LIVEKIT_WS_URL:', process.env.LIVEKIT_WS_URL || '✗ Missing');

if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_WS_URL) {
  console.error('\n❌ LiveKit credentials are missing in .env file!');
  process.exit(1);
}

(async () => {
  try {
    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: 'test-user',
        name: 'Test User',
      }
    );

    token.addGrant({
      room: 'test-room',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();
    console.log('\n✅ Token generated successfully!');
    console.log('Token preview:', jwt.substring(0, 50) + '...');
    console.log('\n✅ LiveKit configuration is valid!');
  } catch (error) {
    console.error('\n❌ Failed to generate token:', error.message);
    process.exit(1);
  }
})();
