# CRITICAL FIXES - Step by Step

## Fix 1: Make Global Popup Work ✅

**File:** `frontend/src/pages/ChatNew.jsx`
**Line:** 529-570

**REMOVE THIS ENTIRE BLOCK:**
```javascript
socket.current.on('groupcall:invitation', (data) => {
  console.log('📨 Received groupcall:invitation:', data);
  // ... entire handler ...
});
```

**WHY:** ChatNew consumes the event, preventing GlobalGroupCallListener from receiving it.
**RESULT:** GlobalGroupCallListener will now receive all invitations globally.

---

## Fix 2: Add Message Button ✅

**File:** `frontend/src/components/GroupCallRoom.jsx`
**Location:** After Camera Button (around line 80)

**ADD:**
```javascript
{/* Message Button */}
<button
  onClick={() => setShowMore(!showMore)}
  className="p-2 rounded-xl bg-gray-700 hover:bg-gray-600 shadow-lg transition-all duration-200 transform hover:scale-110"
  title="Chat"
>
  <FiMessageSquare className="w-5 h-5 text-white" />
</button>
```

---

## Fix 3: Fix Minimize (Keep Connection) ✅

**File:** `frontend/src/components/GroupCallRoom.jsx`
**Line:** 195-210 (isMinimized return block)

**REPLACE:**
```javascript
if (isMinimized) {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 rounded-lg shadow-2xl p-4 z-[70] w-72 cursor-move">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <FiUsers className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">{callType === 'audio' ? 'Audio' : 'Video'} Call</p>
            <p className="text-gray-400 text-xs">In progress</p>
          </div>
        </div>
        <button 
          onClick={() => setIsMinimized(false)} 
          className="text-white hover:text-gray-300 text-sm px-3 py-1 bg-blue-600 rounded"
        >
          Open
        </button>
      </div>
      <button
        onClick={handleLeave}
        className="w-full py-2 rounded bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
      >
        Leave Call
      </button>
    </div>
  );
}
```

**WITH:**
```javascript
// Don't return early - render LiveKitRoom but hide it
const containerClass = isMinimized 
  ? "fixed bottom-4 right-4 w-72 z-[70]" 
  : "fixed inset-0 z-[60]";
```

**AND WRAP THE MAIN RETURN:**
```javascript
return (
  <>
    {isMinimized && (
      <div className="fixed bottom-4 right-4 bg-gray-900 rounded-lg shadow-2xl p-4 z-[70] w-72">
        {/* minimized UI */}
      </div>
    )}
    
    <div className={isMinimized ? "hidden" : "fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-[60] flex flex-col"}>
      <LiveKitRoom ...>
        {/* full UI */}
      </LiveKitRoom>
    </div>
  </>
);
```

---

## Fix 4: Make Draggable ✅

**File:** `frontend/src/components/GroupCallRoom.jsx`
**Add at top of component:**

```javascript
const [position, setPosition] = useState({ x: window.innerWidth - 300, y: window.innerHeight - 200 });
const [dragging, setDragging] = useState(false);
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

const handleMouseDown = (e) => {
  setDragging(true);
  setDragOffset({
    x: e.clientX - position.x,
    y: e.clientY - position.y
  });
};

useEffect(() => {
  if (!dragging) return;
  
  const handleMouseMove = (e) => {
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };
  
  const handleMouseUp = () => setDragging(false);
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [dragging, dragOffset]);
```

**Update minimized div:**
```javascript
<div 
  className="fixed bg-gray-900 rounded-lg shadow-2xl p-4 z-[70] w-72 cursor-move"
  style={{ left: `${position.x}px`, top: `${position.y}px` }}
  onMouseDown={handleMouseDown}
>
```

---

## Summary:
1. Remove groupcall:invitation listener from ChatNew ✅
2. Add message button to GroupCallRoom ✅  
3. Keep LiveKitRoom connected when minimized ✅
4. Make minimized window draggable ✅

All fixes are minimal and focused on the core issues.
