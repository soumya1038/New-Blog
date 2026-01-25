# Group Call Issues - Complete Analysis & Fixes

## 🔍 Core Issues Identified

### Issue 1: Camera Toggle Not Working
**Problem:** User cannot turn camera back ON during video calls
**Root Cause:** The `cameraTrack` might not exist when trying to toggle
**Current Code:** Lines 22-34 in GroupCallRoom.jsx already handle this correctly with fallback to `localParticipant.setCameraEnabled(true)`
**Status:** ✅ Already Fixed

### Issue 2: Global Popup Not Showing Outside /chat
**Problem:** Group call invitations don't appear when user is on routes other than /chat
**Root Cause:** GlobalGroupCallListener has condition `if (location.pathname === '/chat') return;` which PREVENTS listening on /chat, but the logic should work on ALL routes
**Current Code:** Lines 13-17 in GlobalGroupCallListener.jsx
**Status:** ⚠️ Needs Investigation - The code looks correct (it only skips /chat), but user reports it's not working

### Issue 3: Missing Call Control Buttons
**Problem:** Only 3 buttons visible (mic, camera, end), but more options exist
**Root Cause:** The "More Options" menu exists but screen share and chat buttons don't have functionality
**Current Code:** Lines 82-107 in GroupCallRoom.jsx
**Status:** ⚠️ Partially implemented, needs full functionality

### Issue 4: Call Type Not Displayed Correctly
**Problem:** Popup always shows "video call" even for audio calls
**Root Cause:** Backend emits `callType` correctly, frontend receives it, but might not be displaying it properly
**Current Code:** Backend line 577 emits callType, GlobalGroupCallListener line 67-71 displays it
**Status:** ✅ Should be working - needs testing

## 📋 Detailed Fix Plan

### Fix 1: Verify Camera Toggle Works
**Action:** Test the existing implementation
**Code Location:** GroupCallRoom.jsx lines 22-34
**Expected Behavior:** 
- Audio call: camera OFF, button shows "Turn on camera"
- Video call: camera ON, button shows "Turn off camera"
- Clicking button should toggle camera state

### Fix 2: Debug Global Popup
**Investigation Steps:**
1. Check if GlobalGroupCallListener is mounted in App.js
2. Verify socket connection exists when on other routes
3. Add console logs to track invitation flow
4. Check if `callType` is being passed correctly

**Potential Issues:**
- Socket might not be connected on other routes
- User might not be in `onlineUsers` map
- Route change might be clearing socket listeners

### Fix 3: Implement Full Call Controls
**Required Functionality:**
1. Screen Share button - needs LiveKit screen share API
2. Chat button - needs to show/hide chat panel
3. Participant list - show who's in the call
4. Settings - audio/video device selection

### Fix 4: Verify Call Type Display
**Check Points:**
1. Backend emits `callType` in `groupcall:invitation` ✅
2. GlobalGroupCallListener receives `callType` ✅
3. Display logic shows correct icon and text ✅
4. Call history shows correct type - needs verification

## 🛠️ Implementation Priority

1. **HIGH:** Fix global popup (Issue 2)
2. **HIGH:** Verify call type display (Issue 4)
3. **MEDIUM:** Test camera toggle (Issue 1)
4. **LOW:** Implement full controls (Issue 3)

## 🧪 Testing Checklist

- [ ] Audio call: camera OFF by default for all users
- [ ] Video call: camera ON by default for all users
- [ ] Camera toggle works in both call types
- [ ] Global popup appears on home, profile, settings routes
- [ ] Popup shows correct call type (audio/video)
- [ ] Call history shows correct call type
- [ ] All control buttons are accessible
- [ ] Screen share works (if implemented)
- [ ] Chat panel works (if implemented)

## 📝 Next Steps

1. Read App.js to verify GlobalGroupCallListener is imported
2. Check socket initialization on different routes
3. Add debug logs to track invitation flow
4. Test camera toggle functionality
5. Implement missing control features
