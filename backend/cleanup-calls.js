const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const GroupCall = require('./models/GroupCall');
    
    // End all active calls
    const result = await GroupCall.updateMany(
      { status: 'active' },
      { 
        status: 'ended',
        endedAt: new Date(),
        duration: 0
      }
    );
    
    console.log(`✅ Ended ${result.modifiedCount} active calls`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
