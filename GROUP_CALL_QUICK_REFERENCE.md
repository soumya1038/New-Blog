# Group Call Feature - Quick Reference Card

## 📁 Files Created

```
frontend/src/components/
├── GroupCallInvitationModal.jsx    ✅ Created
├── ActiveGroupCallBanner.jsx       ✅ Created
├── MinimizedGroupCall.jsx          ✅ Created
└── GroupCallRoom.jsx               ✅ Enhanced

frontend/src/utils/
└── soundManager.js                 ✅ Updated

Documentation/
├── GROUP_CALL_COMPLETE.md          ✅ Summary
├── GROUP_CALL_INTEGRATION_GUIDE.md ✅ Step-by-step
├── EXACT_CODE_CHANGES.md           ✅ Copy-paste code
└── GROUP_CALL_FLOW_DIAGRAM.md      ✅ Visual flow
```

## 🎯 Integration Checklist

- [ ] 1. Add 4 imports to ChatNew.jsx
- [ ] 2. Add 4 state variables
- [ ] 3. Add 4 socket listeners
- [ ] 4. Add 6 handler functions
- [ ] 5. Replace chat header buttons
- [ ] 6. Add active call banner
- [ ] 7. Add 3 components at end
- [ ] 8. Add 4 cleanup lines

**Time: ~15 minutes**

## 🔑 Key Components

| Component | Purpose | Z-Index |
|-----------|---------|---------|
| GroupCallInvitationModal | 30s timer popup | 70 |
| ActiveGroupCallBanner | In-chat banner | - |
| GroupCallRoom | Full-screen call | 60 |
| MinimizedGroupCall | Draggable window | 9999 |

## 🎵 Sounds

| Event | Sound File |
|-------|------------|
| Join | start-record.mp3 |
| Leave | success complite publish notification.mp3 |
| Incoming | NB-ring-notification.mp3 |

## 🔌 Socket Events

### Emit (Client → Server)
- `groupcall:start` - Start call
- `groupcall:join` - Join call
- `groupcall:leave` - Leave call

### Listen (Server → Client)
- `groupcall:invitation` - Receive invitation
- `groupcall:ended` - Call ended
- `groupcall:user-joined` - User joined
- `groupcall:user-left` - User left

## 🎨 UI Elements

### Group Chat Header
```
[Avatar] Group Name          [🎤] [📹] [⋮]
         3 members online
```

### Active Call Banner
```
🟢 Video call in progress
[👤][👤][👤] +2  👥 5        [Join]
```

### Full Screen Call
```
┌─────────────────────────────────┐
│ 👥 3 participants    [Minimize] │
├─────────────────────────────────┤
│ [User A] [User B] [User C]      │
│  Video    Video    Avatar       │
│  🟢                              │
├─────────────────────────────────┤
│ [🎤] [📹] [🔄] [🖥️] [📞 End]    │
└─────────────────────────────────┘
```

### Minimized Window
```
┌──────────────┐
│ ┌──────────┐ │
│ │ Video    │ │
│ │ ┌──────┐ │ │
│ │ │ Own  │ │ │
│ │ └──────┘ │ │
│ └──────────┘ │
│ Group Call   │
│ 👥 3         │
│ [🎤][📹][🔄] │
└──────────────┘
```

## 🎮 Controls

| Button | Action | Visibility |
|--------|--------|------------|
| 🎤 | Toggle mic | Always |
| 📹 | Toggle camera | Video calls |
| 🔄 | Rotate camera | Multiple cameras + camera on |
| 🖥️ | Screen share | Always |
| 📞 | End call | Always |
| ⬇️ | Minimize | Full screen only |

## 🔄 State Flow

```
Idle → Invitation → Accepted → In Call → Minimized → Ended
  ↓        ↓           ↓          ↓          ↓         ↓
 null   invitation  callRoom   callRoom  minimized   null
                                  ↓
                               Banner (if rejected)
```

## 📊 Participant Count

- Updates in real-time
- Shows in header
- Shows in banner
- Shows in minimized
- Decreases when users leave
- Call ends when count = 0

## 🎭 Speaking Indicator

- Green glowing border
- Real-time audio detection
- Handled by LiveKit
- Automatic, no manual code

## 💾 State Persistence

```javascript
localStorage: active_group_call_state
{
  type: 'group',
  roomName, participantName, groupId,
  token, wsUrl, callType, timestamp
}
```

## 🚀 Quick Test

1. Open group chat
2. Click video button
3. Check invitation on other device
4. Accept call
5. Toggle controls
6. Minimize
7. Navigate pages
8. End call
9. Check history

## 📱 Responsive

- Mobile-friendly controls
- Touch-optimized
- Adaptive layouts
- Smaller buttons on mobile
- Proper spacing

## 🌙 Dark Mode

- Full dark mode support
- Proper contrast
- Readable text
- Themed buttons

## ⚡ Performance

- Lazy loading
- Efficient re-renders
- Clean state management
- Proper cleanup
- No memory leaks

## 🐛 Debugging

```javascript
// Check state
console.log('Group call state:', activeGroupCall);
console.log('Invitation:', groupCallInvitation);
console.log('Room visible:', showGroupCallRoom);
console.log('Minimized:', isGroupCallMinimized);

// Check localStorage
console.log('Saved state:', getCallState('group'));

// Check socket
console.log('Socket connected:', socket.current?.connected);
```

## 📞 Support Flow

```
Issue → Check console logs
      → Verify socket connection
      → Check LiveKit token
      → Verify state values
      → Check component rendering
```

## ✅ Testing Checklist

- [ ] Start audio call
- [ ] Start video call
- [ ] Receive invitation
- [ ] Accept invitation
- [ ] Reject invitation
- [ ] Join from banner
- [ ] Toggle mic
- [ ] Toggle camera
- [ ] Rotate camera
- [ ] Share screen
- [ ] Minimize call
- [ ] Drag window
- [ ] Navigate pages
- [ ] Open from minimized
- [ ] End from minimized
- [ ] Multiple users
- [ ] Speaking indicator
- [ ] Join sound
- [ ] Leave sound
- [ ] All users leave
- [ ] History message

## 🎉 Ready!

All components created ✅
All features implemented ✅
Documentation complete ✅
Integration guide ready ✅

**Just follow EXACT_CODE_CHANGES.md and you're done!**
