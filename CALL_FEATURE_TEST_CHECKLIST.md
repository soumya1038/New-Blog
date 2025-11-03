# WebRTC Call Feature - Test Checklist

## Pre-Testing Setup
- [ ] Backend server running on port 5000
- [ ] Frontend running on port 3000
- [ ] MongoDB connected
- [ ] Two test user accounts created
- [ ] Camera and microphone permissions granted in browser

## Test 1: Basic Audio Call
- [ ] User A can see phone icon in chat header
- [ ] Clicking phone icon starts call
- [ ] Call ring sound plays for User A
- [ ] User B receives incoming call modal
- [ ] Incoming call sound plays for User B
- [ ] User B can accept call
- [ ] Audio streams work bidirectionally
- [ ] Call timer starts after acceptance
- [ ] Mute button works for User A
- [ ] Mute button works for User B
- [ ] End call button works
- [ ] Call end sound plays
- [ ] Call log is created in database

## Test 2: Basic Video Call
- [ ] User A can see video icon in chat header
- [ ] Clicking video icon starts video call
- [ ] User B receives incoming video call modal
- [ ] User B can accept video call
- [ ] Local video shows in small window
- [ ] Remote video shows in main area
- [ ] Video toggle button works
- [ ] Can switch video on/off during call
- [ ] Audio still works when video is off
- [ ] Minimize button works
- [ ] Minimized call shows in bottom-right
- [ ] Can restore from minimized state

## Test 3: Call Rejection
- [ ] User A initiates call
- [ ] User B receives incoming call
- [ ] User B clicks reject button
- [ ] User A receives rejection notification
- [ ] Call log shows status as "rejected"
- [ ] No streams are established

## Test 4: Call History
- [ ] Make 3+ calls (mix of audio/video)
- [ ] Click "Call History" button
- [ ] Modal shows last 3 calls
- [ ] Each call shows correct type (audio/video icon)
- [ ] Each call shows correct status
- [ ] Completed calls show duration
- [ ] Missed/rejected calls show 0:00 duration
- [ ] Can click call back button
- [ ] Call back initiates new call

## Test 5: Global Incoming Call
- [ ] User A is on /chat page
- [ ] User B is on /home page
- [ ] User A calls User B
- [ ] User B sees incoming call modal on /home
- [ ] User B accepts call
- [ ] User B is redirected to /chat
- [ ] Call connects successfully
- [ ] Video/audio streams work

## Test 6: Missed Call
- [ ] User A calls User B
- [ ] User B doesn't answer (wait 30 seconds)
- [ ] User A ends call
- [ ] Call log shows status as "missed"
- [ ] Duration is 0

## Test 7: Error Handling
- [ ] Deny camera permission → See error message
- [ ] Deny microphone permission → See error message
- [ ] Camera in use by another app → See error message
- [ ] Call user who is offline → Appropriate handling
- [ ] Network disconnection during call → Graceful handling

## Test 8: Multiple Calls
- [ ] User A calls User B
- [ ] User B accepts
- [ ] User C tries to call User B
- [ ] User B sees new incoming call
- [ ] User B can reject new call while on existing call
- [ ] Existing call continues

## Test 9: UI/UX
- [ ] Call buttons are visible and accessible
- [ ] Icons are clear and intuitive
- [ ] Call timer displays correctly (MM:SS format)
- [ ] Video quality is acceptable
- [ ] Audio quality is clear
- [ ] No echo or feedback
- [ ] Controls are responsive
- [ ] Animations are smooth
- [ ] Modal overlays work correctly

## Test 10: Mobile Responsiveness (Optional)
- [ ] Call buttons visible on mobile
- [ ] Incoming call modal fits screen
- [ ] Active call screen works on mobile
- [ ] Controls are touch-friendly
- [ ] Video scales properly

## Performance Checks
- [ ] Call connects within 3 seconds
- [ ] No significant lag in audio
- [ ] Video framerate is smooth (>20fps)
- [ ] CPU usage is reasonable (<50%)
- [ ] Memory doesn't leak during long calls
- [ ] Browser doesn't freeze

## Browser Compatibility
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

## Bug Tracking
Found issues:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

## Notes
- Test with good internet connection first
- Then test with throttled connection
- Test with different camera/mic devices
- Check browser console for errors
- Monitor network tab for WebRTC traffic

## Sign-off
- [ ] All critical tests passed
- [ ] Known issues documented
- [ ] Ready for production

Tested by: ________________
Date: ________________
