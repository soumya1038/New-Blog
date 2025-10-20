// Test registration endpoint
require('dotenv').config();
const axios = require('axios');

const testRegister = async () => {
  console.log('Testing registration endpoint...\n');

  const testUser = {
    username: `testuser${Date.now()}`,
    password: 'test123456',
    rememberMe: false
  };

  console.log('Attempting to register:', testUser.username);

  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', testUser);
    console.log('\n✅ Registration successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('\n❌ Registration failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    console.log('Full error:', error.message);
  }
};

testRegister();
