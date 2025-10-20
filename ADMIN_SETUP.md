# Admin Setup Guide

## How to Create the First Admin User

Since admin users need to be created manually in the database, follow these steps:

### Method 1: Using MongoDB Compass (GUI)

1. Open MongoDB Compass and connect to your database
2. Navigate to your database (e.g., `modern-blog`)
3. Open the `users` collection
4. Find the user you want to make admin
5. Click "Edit Document"
6. Add/modify the `role` field to `"admin"`:
   ```json
   {
     "role": "admin"
   }
   ```
7. Click "Update"

### Method 2: Using MongoDB Shell

1. Open MongoDB shell:
   ```bash
   mongosh
   ```

2. Switch to your database:
   ```bash
   use modern-blog
   ```

3. Update a user to admin:
   ```bash
   db.users.updateOne(
     { username: "your-username" },
     { $set: { role: "admin" } }
   )
   ```

### Method 3: Using Node.js Script

Create a file `makeAdmin.js` in the backend folder:

```javascript
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const username = process.argv[2];
    if (!username) {
      console.log('Usage: node makeAdmin.js <username>');
      process.exit(1);
    }

    const user = await User.findOneAndUpdate(
      { username },
      { role: 'admin' },
      { new: true }
    );

    if (user) {
      console.log(`✅ ${username} is now an admin!`);
    } else {
      console.log(`❌ User ${username} not found`);
    }
    process.exit(0);
  });
```

Run it:
```bash
node makeAdmin.js your-username
```

## Admin Features

Once logged in as admin, you can:

### Dashboard Overview
- View total users, blogs, comments
- See active users today
- View blogs per day chart (last 7 days)
- View user registrations chart (last 7 days)

### User Management
- View all users with their stats
- Suspend users for a specific number of days
- Unsuspend users (set days to 0)
- Delete users (removes all their blogs and comments)
- Cannot delete or suspend other admin users

### Blog Management
- View all blogs (including drafts)
- Delete any blog post
- See blog statistics (likes, status, creation date)

## Suspension System

When suspending a user:
1. Click the suspend icon (🚫) next to the user
2. Enter the number of days (e.g., 7, 30, 90)
3. User will be unable to login until the suspension expires
4. To unsuspend, enter 0 days

Suspended users will see a message: "Account suspended until [date]"

## Security Notes

- Admin role is required for all `/api/admin/*` endpoints
- Regular users cannot access admin routes
- Admin users cannot be suspended or deleted by other admins
- All admin actions are immediate and cannot be undone (except unsuspend)
