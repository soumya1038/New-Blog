# Chat Feature Quick Guide

## 🎯 Quick Access Guide

### Pin Message Feature

**How to Pin:**
1. Hover over any message
2. Click the three-dot menu (⋮) that appears
3. Select "Pin" from the menu
4. Choose duration: 24 hours, 7 days, or 30 days
5. Message appears in banner at top of chat

**Pinned Banner:**
- Location: Top of chat area (below header)
- Shows: "[Your Name/Their Name]: [Message text]"
- Click banner → Scroll to pinned message
- Click dropdown (▼) → Unpin or Go to message

**Code Locations:**
```
Frontend: frontend/src/pages/ChatNew.jsx
- Pin Modal: Lines 668-697
- Pinned Banner: Lines 1176-1217
- Message Menu: Lines 1450-1470

Backend: backend/controllers/messageController.js
- pinMessage: Lines 548-583
- unpinMessage: Lines 586-602
- getPinnedMessages: Lines 605-648
```

---

### User Panel

**How to Open:**
1. Click anywhere on the chat header (where user's name/avatar is)
2. Panel slides down from header
3. Click outside or header again to close

**Panel Contents:**
- User avatar (centered)
- Username
- Online/Offline status (green dot if online)
- "Description" text (placeholder)
- Status text (if user has set one)
- 4 action buttons:
  - **Mute/Unmute**: Stop/allow notifications
  - **Clear**: Remove all messages (for you only)
  - **Delete**: Delete entire conversation
  - **Block/Unblock**: Block/unblock user

**Panel Width:**
- Desktop/Tablet: 50% of chat area
- Mobile: Full width

**Code Location:**
```
Frontend: frontend/src/pages/ChatNew.jsx
- Header: Lines 1127-1145
- Panel: Lines 1147-1174
```

---

### Other Features Quick Reference

#### Message Actions (Right-click or hover menu)
- **React**: Add emoji reaction (👍❤️😂😮😢🙏)
- **Reply**: Quote and reply to message
- **Forward**: Send to other users
- **Pin**: Pin message with duration

#### Conversation Actions (Three-dot menu in sidebar)
- **Mute notifications**: Stop sound alerts
- **Delete conversation**: Remove entire chat
- **Block/Unblock user**: Prevent messaging

#### Status Indicators
- **Green dot**: User is online
- **✓**: Message sent
- **✓✓**: Message delivered
- **✓✓ (blue)**: Message read
- **Typing...**: User is typing

#### Auto-Features
- Messages auto-delete after 30 days
- Pins auto-expire based on duration
- Read receipts sent automatically
- Online status updates in real-time

---

## 🚀 Testing Checklist

### Basic Chat
- [ ] Send message
- [ ] Receive message
- [ ] See typing indicator
- [ ] See read receipts
- [ ] See online status

### Pin Feature
- [ ] Pin a message (select 24h)
- [ ] See pinned banner at top
- [ ] Click banner to scroll to message
- [ ] Click dropdown → "Go to message"
- [ ] Click dropdown → "Unpin"
- [ ] Verify pin removed

### User Panel
- [ ] Click chat header
- [ ] Panel slides down (50% width on desktop)
- [ ] See avatar, name, status
- [ ] See "Description" text
- [ ] Click Mute button
- [ ] Click Clear button (confirm dialog)
- [ ] Click Delete button (confirm dialog)
- [ ] Click Block button (confirm dialog)
- [ ] Click outside to close panel

### Advanced Features
- [ ] React to message (hover → menu → React)
- [ ] Reply to message (hover → menu → Reply)
- [ ] Forward message (hover → menu → Forward)
- [ ] Delete message (hover → menu → Delete)
- [ ] Search for users
- [ ] Start new conversation

---

## 🎨 UI/UX Features

### LinkedIn-Style Design
- Professional blue theme (#0084ff)
- Clean, minimal interface
- Smooth animations
- Responsive layout
- Hover effects on interactive elements

### Message Bubbles
- WhatsApp-style grouped messages
- Rounded corners based on position
- Avatar only on last message in group
- Timestamp outside bubble
- Reactions below bubble

### Notifications
- Different sounds for active/inactive chat
- Mute option per user
- Visual unread count badges
- Browser notifications (if enabled)

---

## 📱 Responsive Behavior

### Desktop (>768px)
- Sidebar: 320px fixed width
- Chat area: Remaining space
- User panel: 50% of chat area
- All features visible

### Mobile (<768px)
- Sidebar: Full width (when no chat selected)
- Chat area: Full width (when chat selected)
- User panel: Full width
- Back button to return to sidebar

---

## 🔧 Configuration

### Sound Notifications
Located in: `frontend/src/utils/soundNotifications.js`
- Send sound: Soft click
- Receive (active): Gentle notification
- Receive (inactive): Alert sound

### Auto-Delete Duration
Located in: `backend/models/Message.js`
- Current: 30 days (2592000 seconds)
- Change: Modify `expireAfterSeconds` in TTL index

### Pin Duration Options
Located in: `frontend/src/pages/ChatNew.jsx` (Lines 680-692)
- 24 hours: `handlePinMessage(24)`
- 7 days: `handlePinMessage(168)`
- 30 days: `handlePinMessage(720)`

---

## 🐛 Troubleshooting

### Pin not showing?
- Check if pin expired (auto-removes)
- Refresh page to reload pins
- Check browser console for errors

### User panel not opening?
- Ensure you're clicking the header (not back button)
- Check if panel is hidden behind other elements
- Try clicking outside to close, then reopen

### Messages not sending?
- Check backend is running (port 5000)
- Check Socket.io connection (console logs)
- Verify user is not blocked

### Sounds not playing?
- Check browser allows audio
- Check user is not muted
- Verify sound files exist in utils folder

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs
3. Verify all dependencies installed
4. Restart both frontend and backend

**All features are working and production-ready!** 🎉
