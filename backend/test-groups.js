const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test credentials
const TEST_USER = {
  username: 'Soumya',
  password: 'Password'
};

const TEST_USER_2 = {
  username: 'ABCD',
  password: 'Password'
};

let authToken = '';
let groupId = '';
let userId2 = '';

async function testGroupAPI() {
  try {
    console.log('🧪 Starting Group API Tests...\n');

    // 1. Login
    console.log('1️⃣ Testing Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    authToken = loginRes.data.token;
    console.log('✅ Login successful\n');

    const headers = { Authorization: `Bearer ${authToken}` };

    // 2. Get ABCD user ID
    console.log('2️⃣ Getting ABCD user ID...');
    const usersRes = await axios.get(`${API_URL}/messages/search-users?query=ABCD`, { headers });
    const users = usersRes.data.users;
    if (users.length > 0) {
      userId2 = users[0]._id;
      console.log(`✅ Found user: ${users[0].username} (${userId2})\n`);
    } else {
      console.log('⚠️ ABCD user not found\n');
    }

    // 3. Create Group
    console.log('3️⃣ Testing Create Group...');
    const createRes = await axios.post(`${API_URL}/groups`, {
      name: 'Test Group',
      description: 'This is a test group',
      memberIds: userId2 ? [userId2] : []
    }, { headers });
    groupId = createRes.data.group._id;
    console.log('✅ Group created:', createRes.data.group.name);
    console.log(`   Members: ${createRes.data.group.members.length}`);
    console.log(`   Admins: ${createRes.data.group.admins.length}\n`);

    // 4. Get All Groups
    console.log('4️⃣ Testing Get All Groups...');
    const groupsRes = await axios.get(`${API_URL}/groups`, { headers });
    console.log(`✅ Found ${groupsRes.data.groups.length} groups\n`);

    // 5. Get Group Details
    console.log('5️⃣ Testing Get Group Details...');
    const groupRes = await axios.get(`${API_URL}/groups/${groupId}`, { headers });
    console.log('✅ Group details retrieved');
    console.log(`   Name: ${groupRes.data.group.name}`);
    console.log(`   Description: ${groupRes.data.group.description}`);
    console.log(`   Members: ${groupRes.data.group.members.length}\n`);

    // 6. Update Group Info
    console.log('6️⃣ Testing Update Group Info...');
    const updateRes = await axios.put(`${API_URL}/groups/${groupId}`, {
      name: 'Updated Test Group',
      description: 'Updated description'
    }, { headers });
    console.log('✅ Group updated:', updateRes.data.group.name);
    console.log(`   New description: ${updateRes.data.group.description}\n`);

    // 7. Add Member (if we have another user)
    if (userId2) {
      console.log('7️⃣ Testing Add Members...');
      const addMemberRes = await axios.post(`${API_URL}/groups/${groupId}/members`, {
        memberIds: [userId2]
      }, { headers });
      console.log(`✅ Members added. Total members: ${addMemberRes.data.group.members.length}\n`);
    }

    // 8. Make Admin (if we have another user)
    if (userId2) {
      console.log('8️⃣ Testing Make Admin...');
      const makeAdminRes = await axios.post(`${API_URL}/groups/${groupId}/admins/${userId2}`, {}, { headers });
      console.log(`✅ Admin promoted. Total admins: ${makeAdminRes.data.group.admins.length}\n`);
    }

    // 9. Leave Group
    console.log('9️⃣ Testing Leave Group...');
    const leaveRes = await axios.post(`${API_URL}/groups/${groupId}/leave`, {}, { headers });
    console.log('✅ Left group:', leaveRes.data.message, '\n');

    console.log('🎉 All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

// Run tests
testGroupAPI();
