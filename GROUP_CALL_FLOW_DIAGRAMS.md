# 🎨 Group Call System - Visual Flow Diagrams

## 📊 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              GroupCallContext (Global State)              │  │
│  │  • currentCall                                            │  │
│  │  • invitation                                             │  │
│  │  • isMinimized                                            │  │
│  │  • activeCallsByGroup                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ▲                                     │
│                            │                                     │
│  ┌─────────────────────────┼─────────────────────────────────┐ │
│  │                         │                                  │ │
│  │  ┌──────────────┐  ┌───┴────────┐  ┌─────────────────┐  │ │
│  │  │ Invitation   │  │ Call Room  │  │ Minimized Call  │  │ │
│  │  │    Modal     │  │            │  │                 │  │ │
│  │  └──────────────┘  └────────────┘  └─────────────────┘  │ │
│  │                                                           │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │         Active Call Banner (in chat)             │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ Socket.IO + LiveKit
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                      Backend (Node.js)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Socket Event Handlers                    │  │
│  │  • groupcall:start                                        │  │
│  │  • groupcall:join                                         │  │
│  │  • groupcall:leave                                        │  │
│  │  • groupcall:invitation                                   │  │
│  │  • groupcall:user-joined                                  │  │
│  │  • groupcall:user-left                                    │  │
│  │  • groupcall:ended                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ▲                                     │
│                            │                                     │
│  ┌─────────────────────────┼─────────────────────────────────┐ │
│  │                         │                                  │ │
│  │  ┌──────────────┐  ┌───┴────────┐  ┌─────────────────┐  │ │
│  │  │   MongoDB    │  │  LiveKit   │  │  Token Service  │  │ │
│  │  │  (GroupCall) │  │   Client   │  │                 │  │ │
│  │  └──────────────┘  └────────────┘  └─────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ WebRTC
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    LiveKit Cloud (SFU)                         │
│  • Manages WebRTC connections                                  │
│  • Routes audio/video streams                                  │
│  • Handles participant tracking                                │
│  • Provides active speaker detection                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Call Lifecycle Flow

### 1. Starting a Call

```
User A (Initiator)                Backend                    User B (Receiver)
      │                              │                              │
      │ Click "Start Call"           │                              │
      ├─────────────────────────────>│                              │
      │                              │                              │
      │                              │ Validate: No active call     │
      │                              │ Create GroupCall record      │
      │                              │                              │
      │                              ├─────────────────────────────>│
      │                              │  groupcall:invitation        │
      │                              │                              │
      │<─────────────────────────────┤                              │
      │  LiveKit Token               │                              │
      │                              │                              │
      │ Join LiveKit Room            │                              │
      │                              │                              │
      │                              │                              │ Invitation Modal
      │                              │                              │ Appears
      │                              │                              │
```

### 2. Accepting Invitation

```
User B                           Backend                    User A
  │                                 │                          │
  │ Click "Accept"                  │                          │
  │ (Already in call? Leave first)  │                          │
  ├────────────────────────────────>│                          │
  │  Request Token                  │                          │
  │                                 │                          │
  │<────────────────────────────────┤                          │
  │  LiveKit Token                  │                          │
  │                                 │                          │
  │ Join LiveKit Room               │                          │
  │                                 │                          │
  ├────────────────────────────────>│                          │
  │  groupcall:join                 │                          │
  │                                 │                          │
  │                                 ├─────────────────────────>│
  │                                 │  groupcall:user-joined   │
  │                                 │                          │
  │                                 │                          │ Update UI
  │                                 │                          │ Show User B
```

### 3. Call in Progress

```
All Participants              LiveKit Cloud              Backend
      │                            │                        │
      │ Audio/Video Streams        │                        │
      ├───────────────────────────>│                        │
      │                            │                        │
      │<───────────────────────────┤                        │
      │ Receive Other Streams      │                        │
      │                            │                        │
      │ Active Speaker Events      │                        │
      │<───────────────────────────┤                        │
      │                            │                        │
      │ Toggle Mic/Camera          │                        │
      ├───────────────────────────>│                        │
      │                            │                        │
      │                            │ Track Participants     │
      │                            ├───────────────────────>│
      │                            │                        │
```

### 4. Leaving Call

```
User B                           Backend                    Remaining Users
  │                                 │                          │
  │ Click "Leave"                   │                          │
  ├────────────────────────────────>│                          │
  │  groupcall:leave                │                          │
  │                                 │                          │
  │                                 │ Update participant       │
  │                                 │ leftAt timestamp         │
  │                                 │                          │
  │                                 ├─────────────────────────>│
  │                                 │  groupcall:user-left     │
  │                                 │                          │
  │                                 │ Check LiveKit room       │
  │                                 │ participant count        │
  │                                 │                          │
  │                                 │ If empty:                │
  │                                 │  • End call              │
  │                                 │  • Create history msg    │
  │                                 │  • Notify all members    │
```

---

## 🎯 State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    GroupCallContext                          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  invitation  │    │ currentCall  │    │ isMinimized  │
│              │    │              │    │              │
│ • groupId    │    │ • groupId    │    │ true/false   │
│ • groupName  │    │ • roomName   │    │              │
│ • roomName   │    │ • token      │    │              │
│ • callType   │    │ • wsUrl      │    │              │
│ • initiator  │    │ • callType   │    │              │
│ • hasActive  │    │ • startTime  │    │              │
│   Call       │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Invitation   │    │  Call Room   │    │  Minimized   │
│   Modal      │    │              │    │    Call      │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 🔀 Call Switching Flow

```
User in Group A Call          Context                User receives Group B invitation
        │                        │                              │
        │                        │<─────────────────────────────┤
        │                        │  New invitation received     │
        │                        │                              │
        │                        │ Set hasActiveCall = true     │
        │                        │                              │
        │                        ├─────────────────────────────>│
        │                        │  Show invitation with        │
        │                        │  warning badge               │
        │                        │                              │
        │                        │<─────────────────────────────┤
        │                        │  User clicks Accept          │
        │                        │                              │
        │<───────────────────────┤                              │
        │  Leave Group A call    │                              │
        │  • Stop media tracks   │                              │
        │  • Emit leave event    │                              │
        │  • Clean up resources  │                              │
        │                        │                              │
        │                        ├─────────────────────────────>│
        │                        │  Join Group B call           │
        │                        │  • Get new token             │
        │                        │  • Join LiveKit room         │
        │                        │  • Update state              │
```

---

## 📱 Minimize/Maximize Flow

```
Full Call Room                Context                Minimized Call
      │                         │                          │
      │ Click Minimize          │                          │
      ├────────────────────────>│                          │
      │                         │                          │
      │                         │ Set isMinimized = true   │
      │                         │                          │
      │                         ├─────────────────────────>│
      │                         │  Render minimized        │
      │                         │  • Show video preview    │
      │                         │  • Show controls         │
      │                         │  • Enable dragging       │
      │                         │                          │
      │                         │<─────────────────────────┤
      │                         │  Click Maximize          │
      │                         │                          │
      │                         │ Set isMinimized = false  │
      │                         │                          │
      │<────────────────────────┤                          │
      │  Render full room       │                          │
      │  • Show all participants│                          │
      │  • Show full controls   │                          │
```

---

## 🎨 Component Hierarchy

```
App.js
└── GroupCallProvider
    ├── GlobalGroupCallListener
    │   └── GroupCallInvitationModal
    │       ├── Timer (30s countdown)
    │       ├── Warning Badge (if hasActiveCall)
    │       └── Accept/Decline Buttons
    │
    ├── MinimizedGroupCall (if isMinimized && currentCall)
    │   └── LiveKitRoom
    │       ├── Video Preview
    │       ├── Participant Count
    │       ├── Quick Controls
    │       │   ├── Mic Toggle
    │       │   ├── Camera Toggle
    │       │   └── Rotate Camera
    │       └── Drag Handle
    │
    └── ChatNew (or your chat component)
        ├── ActiveGroupCallBanner (if activeCall)
        │   ├── Call Type Icon
        │   ├── Participant Avatars
        │   ├── Participant Count
        │   └── Join Button
        │
        └── GroupCallRoom (if currentCall && !isMinimized)
            └── LiveKitRoom
                ├── Header
                │   ├── Participant Count
                │   └── Minimize Button
                ├── VideoConference
                │   └── Participant Tiles
                │       └── Active Speaker Border
                └── Control Bar
                    ├── Mic Toggle
                    ├── Camera Toggle
                    ├── Rotate Camera
                    ├── Screen Share
                    └── Leave Button
```

---

## 🔄 Real-time Updates Flow

```
LiveKit Room                Backend                 All Group Members
      │                        │                          │
      │ User joins             │                          │
      ├───────────────────────>│                          │
      │                        │                          │
      │                        │ Emit user-joined         │
      │                        ├─────────────────────────>│
      │                        │                          │
      │                        │                          │ Update UI
      │                        │                          │ Add avatar
      │                        │                          │ Increment count
      │                        │                          │
      │ User leaves            │                          │
      ├───────────────────────>│                          │
      │                        │                          │
      │                        │ Emit user-left           │
      │                        ├─────────────────────────>│
      │                        │                          │
      │                        │                          │ Update UI
      │                        │                          │ Remove avatar
      │                        │                          │ Decrement count
      │                        │                          │
      │ Last user leaves       │                          │
      ├───────────────────────>│                          │
      │                        │                          │
      │                        │ End call                 │
      │                        │ Create history message   │
      │                        │                          │
      │                        │ Emit call-ended          │
      │                        ├─────────────────────────>│
      │                        │                          │
      │                        │                          │ Close call UI
      │                        │                          │ Show history msg
```

---

## 📊 Data Flow Summary

```
┌──────────────┐
│ User Action  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Context    │ ◄─── Global State Management
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Socket.IO   │ ◄─── Real-time Communication
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Backend    │ ◄─── Business Logic & Validation
└──────┬───────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌──────────┐  ┌──────────┐
│ MongoDB  │  │ LiveKit  │ ◄─── Data Persistence & Media
└──────────┘  └──────────┘
       │             │
       └─────┬───────┘
             │
             ▼
       ┌──────────┐
       │   UI     │ ◄─── User Interface Update
       └──────────┘
```

---

## 🎯 Key Takeaways

1. **Centralized State**: GroupCallContext manages all call state
2. **Real-time Sync**: Socket.IO keeps all clients in sync
3. **Media Handling**: LiveKit manages WebRTC connections
4. **Clean Separation**: UI components are decoupled from business logic
5. **Scalable**: Can handle multiple concurrent calls across groups

---

**This visual guide helps understand the complete system architecture and data flow!** 🎨
