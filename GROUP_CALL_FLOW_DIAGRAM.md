# Group Call Feature - Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GROUP CALL FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  User A clicks   │
│  Audio/Video     │
│  button in       │
│  group header    │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  Socket Event: groupcall:start                                      │
│  { groupId, roomName, callType }                                    │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ├──────────────────────────────────────────────────────────┐
         │                                                           │
         ▼                                                           ▼
┌─────────────────────┐                                  ┌──────────────────────┐
│  User A              │                                  │  Other Members       │
│  (Initiator)         │                                  │  (B, C, D...)        │
├─────────────────────┤                                  ├──────────────────────┤
│ • GroupCallRoom     │                                  │ • Invitation Modal   │
│   opens immediately │                                  │   appears            │
│ • Camera on/off     │                                  │ • 30s timer starts   │
│   based on type     │                                  │ • Sound plays        │
│ • Join sound plays  │                                  │ • Shows initiator    │
└─────────────────────┘                                  └──────────┬───────────┘
                                                                     │
                                                    ┌────────────────┴────────────────┐
                                                    │                                  │
                                                    ▼                                  ▼
                                          ┌──────────────────┐            ┌──────────────────┐
                                          │  User B Accepts  │            │  User C Rejects  │
                                          └────────┬─────────┘            └────────┬─────────┘
                                                   │                                │
                                                   ▼                                ▼
                                          ┌──────────────────┐            ┌──────────────────┐
                                          │ • Redirected to  │            │ • Modal closes   │
                                          │   /chat          │            │ • Banner appears │
                                          │ • GroupCallRoom  │            │   (if in group)  │
                                          │   opens          │            │ • Can join later │
                                          │ • Join sound     │            └──────────────────┘
                                          └──────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      DURING CALL                                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  GroupCallRoom (Full Screen)                                         │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Header: [👥 3 participants]          [Minimize Button]        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   User A    │  │   User B    │  │   User C    │                 │
│  │  [Video]    │  │  [Video]    │  │  [Avatar]   │                 │
│  │  🟢 Speaking│  │             │  │  (cam off)  │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                       │
│  Controls: [🎤] [📹] [🔄] [🖥️] [📞 End]                              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks Minimize
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  MinimizedGroupCall (Draggable)                                      │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐                                          │
│  │  ┌──────────────────┐  │  ← Main video (active speaker)          │
│  │  │                  │  │                                          │
│  │  │   User B Video   │  │                                          │
│  │  │                  │  │                                          │
│  │  │  ┌────────┐      │  │  ← Small square (own video)             │
│  │  │  │ User A │      │  │                                          │
│  │  │  └────────┘      │  │                                          │
│  │  └──────────────────┘  │                                          │
│  │                        │                                          │
│  │  Group Call  👥 3      │                                          │
│  │  [🎤] [📹] [🔄] [▼]    │                                          │
│  └────────────────────────┘                                          │
│                                                                       │
│  • Draggable anywhere                                                │
│  • Visible on all pages                                              │
│  • Audio/video still connected                                       │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      CALL ENDING                                     │
└─────────────────────────────────────────────────────────────────────┘

User clicks End Call
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  Socket Event: groupcall:leave                                      │
│  { groupId, roomName }                                              │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  Leave sound plays                                                  │
│  User exits call                                                    │
│  Participant count decreases                                        │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  All participants left?                                             │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ├─── YES ──────────────────────────────────────────────────┐
         │                                                           │
         ▼                                                           │
┌────────────────────────────────────────────────────────────────────┤
│  • Call ends                                                        │
│  • History message created                                          │
│  • Shows: Call type, Duration, Participants                         │
│  • Displayed as message from initiator                              │
│  • Socket Event: groupcall:ended                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    ACTIVE CALL BANNER                                │
└─────────────────────────────────────────────────────────────────────┘

When user rejects or is not in call:

┌──────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  🟢 Video call in progress                                      │ │
│  │  [👤][👤][👤] +2    👥 5                          [Join]        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  • Shows in group chat header                                        │
│  • Live participant count                                            │
│  • First 3 avatars + remaining count                                 │
│  • Click Join to enter call                                          │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    COMPONENT HIERARCHY                               │
└─────────────────────────────────────────────────────────────────────┘

ChatNew.jsx
├── GroupCallInvitationModal (z-index: 70)
│   ├── Timer (30s countdown)
│   ├── Initiator info
│   ├── Group name
│   ├── Call type indicator
│   └── Accept/Reject buttons
│
├── ActiveGroupCallBanner (in chat header)
│   ├── Participant avatars
│   ├── Participant count
│   ├── Call type indicator
│   └── Join button
│
├── GroupCallRoom (z-index: 60, full screen)
│   ├── Header
│   │   ├── Participant count
│   │   └── Minimize button
│   ├── LiveKitRoom
│   │   ├── VideoConference
│   │   │   └── Participant cards (auto-layout)
│   │   └── RoomAudioRenderer
│   └── CustomControls
│       ├── Mic toggle
│       ├── Camera toggle
│       ├── Rotate camera (conditional)
│       ├── Screen share
│       └── End call
│
└── MinimizedGroupCall (z-index: 9999, draggable)
    ├── LiveKitRoom
    │   ├── Main video (active speaker)
    │   └── Small video (own)
    ├── Participant count
    ├── Quick controls
    │   ├── Mic
    │   ├── Camera
    │   └── Rotate (conditional)
    └── Dropdown menu
        ├── Open
        └── End

┌─────────────────────────────────────────────────────────────────────┐
│                    SOCKET EVENTS FLOW                                │
└─────────────────────────────────────────────────────────────────────┘

Client → Server:
  • groupcall:start → Initiates call, broadcasts to all members
  • groupcall:join → User joins, updates participant count
  • groupcall:leave → User leaves, updates count, ends if all left

Server → Client:
  • groupcall:invitation → Sent to all members except initiator
  • groupcall:started → Confirms call started
  • groupcall:ended → Call ended, cleanup
  • groupcall:user-joined → Someone joined, play sound
  • groupcall:user-left → Someone left, play sound

┌─────────────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                                  │
└─────────────────────────────────────────────────────────────────────┘

groupCallInvitation: {
  groupId, groupName, roomName, callType, initiator, joinedUsers
}

activeGroupCall: {
  groupId, roomName, callType, participantCount, participants
}

showGroupCallRoom: boolean (full screen visible)
isGroupCallMinimized: boolean (minimized window visible)

localStorage (callStateManager):
  active_group_call_state: {
    type: 'group',
    roomName, participantName, groupId, token, wsUrl, callType
  }
```

This visual diagram shows the complete flow from start to finish!
