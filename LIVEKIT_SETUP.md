# LiveKit Setup Guide for Group Calls

## Step 1: Get LiveKit Credentials

1. Go to https://cloud.livekit.io
2. Sign up for a free account
3. Create a new project
4. Copy your credentials:
   - API Key
   - API Secret
   - WebSocket URL (wss://your-project.livekit.cloud)

## Step 2: Update Backend .env

Add these credentials to your `backend/.env` file:

```env
LIVEKIT_API_KEY=your_actual_api_key_here
LIVEKIT_API_SECRET=your_actual_api_secret_here
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
```

## Step 3: Features Enabled

✅ Backend API endpoint: `/api/livekit/token` (already configured)
✅ Frontend GroupCallRoom component (already configured)
✅ LiveKit packages installed (backend & frontend)

## Step 4: How to Use

### For Group Chats:
1. Open any group chat
2. Click the video call icon in the group header
3. Other members will see a "Join Call" button
4. Multiple users can join the same call

### Technical Details:
- Room name format: `group-{groupId}`
- Participant name: User's display name
- Supports: Audio, Video, Screen sharing
- Auto-cleanup when all users leave

## Step 5: Test the Setup

1. Update your .env with real LiveKit credentials
2. Restart the backend server: `npm run dev`
3. Open a group chat
4. Click the group call button
5. Join from multiple browsers/devices to test

## Free Tier Limits (LiveKit Cloud)

- 10,000 participant minutes/month
- Unlimited rooms
- Up to 100 concurrent participants
- Perfect for testing and small deployments

## Troubleshooting

If calls don't work:
1. Check browser console for errors
2. Verify .env credentials are correct
3. Ensure backend server restarted after .env changes
4. Check that ports 443 and 80 are not blocked
5. Test with HTTPS (required for camera/mic access)

## Security Notes

- Tokens expire after use
- Each user gets a unique token
- Room access is controlled by backend
- Only group members can join group calls
