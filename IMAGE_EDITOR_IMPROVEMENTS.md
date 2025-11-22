# Image Editor Improvements Summary

## Issues Identified

### 1. Shape Center Snap Not Working
**Problem**: Only circle shows center axis highlight when dragging. Other shapes (rect, arrow, line) don't trigger the highlight.

**Root Cause**: The center snap logic is only in the first `shapeDragging` block, but there's a duplicate block later that doesn't have the snap logic.

**Solution**: Remove the duplicate `shapeDragging` block at the end of `moveInteraction` function (around line 700).

### 2. Circle Needs 8 Resize Handles
**Problem**: Circle only has 4 handles (N, S, E, W), making diagonal resizing impossible.

**Solution**: Add 4 corner handles (NW, NE, SW, SE) to circle resize in:
- `drawCanvas` function (drawing handles)
- `startInteraction` function (detecting handle clicks)
- `moveInteraction` function (resizing logic)

### 3. Editor Doesn't Close When Switching Chats
**Problem**: On medium/large devices, users can switch chats while editor is open, causing confusion.

**Solution**: Add a confirmation dialog when user tries to switch chats with unsaved edits:
- Track if editor has unsaved changes
- Show modal: "Save as draft?" with options: Save, Discard, Cancel
- Close editor only after user choice

### 4. Background Filter Scrolls Away
**Problem**: The background overlay/filter scrolls with content, revealing the background image.

**Solution**: Make the background overlay fixed position:
```css
position: fixed;
inset: 0;
```

## Implementation Priority

1. **Fix shape center snap** (Quick fix - remove duplicate code)
2. **Add 8 handles to circle** (Medium complexity)
3. **Background filter fix** (Quick CSS fix)
4. **Editor close confirmation** (Requires parent component changes)

## Files to Modify

1. `BlogImageEditor.jsx` - All fixes except #4
2. Parent component (ChatWindow or similar) - For fix #4

## Next Steps

Would you like me to:
1. Fix issues one at a time (your preferred approach)
2. Create a separate component for the confirmation dialog
3. Start with the quick fixes first (#1 and #3)
