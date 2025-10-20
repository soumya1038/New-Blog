# Message Notifications Feature

## Overview
Messages now create notifications when the user is not in the chat, with a distinct notification sound.

## Implementation Details

### Backend Changes

1. **Notification Model** (`backend/models/Notification.js`)
   - Added `'message'` to the type enum
   - Supports message notifications alongside like, comment, and follow

2. **Chat Socket** (`backend/socket/chatSocket.js`)
   - Creates notification when receiver is offline
   - Notification includes sender name and message preview (first 50 chars)
   - Only creates notification if receiver is not online

### Frontend Changes

1. **Sound Notifications** (`frontend/src/utils/soundNotifications.js`)
   - Added `playMessageNotificationSound()` - triple beep pattern
   - Distinct from chat sounds (single/double beep)
   - Frequencies: 650Hz → 750Hz → 850Hz

2. **App.js** (`frontend/src/App.js`)
   - Global socket listener for `message:receive` event
   - Plays notification sound when user is NOT on `/chat` route
   - Works across all pages

3. **Notifications Page** (`frontend/src/pages/Notifications.js`)
   - Added message icon (purple message circle)
   - Click notification → navigates to chat with sender
   - Marks notification as read on click

## User Experience

### Scenario 1: User browsing blog
- New message arrives → Triple beep sound plays
- Notification appears in notification route (auto-refreshes)
- Badge count increases in navbar
- Click notification → Opens chat with sender
- Notification auto-deleted when chat opens

### Scenario 2: User in chat with different person
- Message from another user → Triple beep sound plays
- Can check notifications to see who messaged
- Notification persists until user opens chat with sender

### Scenario 3: User in chat with sender
- Message arrives → Handled by chat page
- Notification created but immediately deleted
- Chat sounds play (soft beep for active chat)

## Sound Patterns

- **Send message**: Short beep (800Hz, 0.1s)
- **Receive in active chat**: Soft beep (700Hz, 0.08s)
- **Receive in other chat**: Double beep (600Hz → 800Hz)
- **Notification**: Triple beep (650Hz → 750Hz → 850Hz) ✨ NEW

## Technical Notes

- Notifications ALWAYS created for every message
- Auto-deleted when user opens chat with sender
- Socket connection required for real-time sound
- Custom event newNotification triggers UI refresh
- Works with existing mute/block functionality

## Testing Steps

1. Open two browser windows (User A and User B)
2. User A: Stay on home page or any page except /chat
3. User B: Send message to User A from chat
4. User A: Should hear triple beep sound
5. User A: Navigate to /notifications - should see message notification
6. User A: Click notification - opens chat with User B
7. Notification should disappear from list
