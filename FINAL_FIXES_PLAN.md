# Final Fixes Required

## Issue 1: Global Popup Not Opening ❌
**Problem:** GlobalGroupCallListener doesn't show invitation on other routes
**Root Cause:** ChatNew listens to same event on /chat route, consuming it first
**Solution:** Make ChatNew NOT listen to groupcall:invitation, let only GlobalGroupCallListener handle it globally, then ChatNew can check if invitation exists

## Issue 2: Message Button Not Visible ❌
**Problem:** Can't see message/chat button during group call
**Solution:** Add message button to CustomControls in GroupCallRoom

## Issue 3: Minimize Stops Audio/Video ❌
**Problem:** When minimizing, audio and video stop
**Solution:** Don't disconnect from LiveKitRoom, just hide the UI

## Issue 4: Draggable Minimized Window ❌
**Problem:** Minimized window is fixed, can't drag
**Solution:** Make minimized window draggable and globally visible

---

## Implementation Plan:

### Fix 1: Remove groupcall:invitation listener from ChatNew
- ChatNew should NOT listen to this event
- Only GlobalGroupCallListener should handle it
- When user clicks join, navigate to /chat with state

### Fix 2: Add Message Button
- Add FiMessageSquare button to CustomControls
- Toggle a chat panel overlay

### Fix 3: Fix Minimize
- Change isMinimized to just hide VideoConference, not disconnect
- Keep LiveKitRoom connected

### Fix 4: Make Draggable
- Use onMouseDown/onMouseMove for drag
- Position: fixed with top/left state
- Show globally (not just in /chat)
