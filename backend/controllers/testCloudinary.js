// Test Cloudinary connection
require('dotenv').config();
const cloudinary = require('../utils/cloudinary');

const testCloudinary = async () => {
  console.log('Testing Cloudinary configuration...\n');
  
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Found ✅' : 'Missing ❌');
  console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Found ✅' : 'Missing ❌');
  
  try {
    // Test connection by getting account details
    const result = await cloudinary.api.ping();
    console.log('\n✅ Cloudinary connection successful!');
    console.log('Status:', result.status);
  } catch (error) {
    console.error('\n❌ Cloudinary connection failed!');
    console.error('Error:', error.message);
  }
};

testCloudinary();
