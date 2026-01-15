# Implementation Guide: YouTube Shorts Scrolling

## Overview

This guide walks through implementing smooth, YouTube Shorts-style vertical scrolling using CSS scroll-snap and IntersectionObserver.

**Time to implement:** 30 minutes  
**Difficulty:** Easy  
**Breaking changes:** None

---

## Step 1: Update Container (5 min)

### Location
`frontend/src/pages/ShortBlogsViewer.jsx` - Line ~850

### Change
```jsx
// BEFORE
<div 
  ref={containerRef}
  className={`fixed inset-0 bg-black overflow-x-hidden ${
    isDesktop ? 'overflow-y-auto' : 'overflow-y-auto snap-y snap-mandatory'
  }`}
  style={{ 
    scrollBehavior: 'auto',
    WebkitOverflowScrolling: 'touch',
    ...(isDesktop ? {} : { scrollSnapType: 'y mandatory' })
  }}
>

// AFTER
<div 
  ref={containerRef}
  className="fixed inset-0 bg-black overflow-x-hidden overflow-y-auto snap-y snap-mandatory"
  style={{ 
    scrollSnapType: 'y mandatory',
    WebkitOverflowScrolling: 'touch'
  }}
>
```

### Why
- Unifies mobile and desktop behavior
- Enables CSS scroll-snap on all devices
- Removes conditional styling

---

## Step 2: Update Item Containers (5 min)

### Location
`frontend/src/pages/ShortBlogsViewer.jsx` - Line ~870

### Change
```jsx
// BEFORE
<div
  key={blog._id}
  className={`relative w-full flex items-center justify-center ${
    isDesktop ? 'min-h-screen' : 'h-screen snap-start snap-always'
  }`}
>

// AFTER
<div
  key={blog._id}
  data-index={index}
  className="relative w-full h-screen flex items-center justify-center snap-start snap-always"
>
```

### Why
- Adds snap points to each item
- Adds data-index for observer tracking
- Consistent height across devices

---

## Step 3: Remove Old Scroll Logic (5 min)

### Location
`frontend/src/pages/ShortBlogsViewer.jsx` - Top of component

### Remove
```jsx
// DELETE THESE
const scrollTimeoutRef = useRef(null);
const isScrollingRef = useRef(false);
```

### Add
```jsx
// ADD THIS
const observerRef = useRef(null);
```

### Location
`frontend/src/pages/ShortBlogsViewer.jsx` - Line ~150

### Remove
```jsx
// DELETE THIS ENTIRE useEffect (80+ lines)
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  let lastScrollTop = 0;
  let scrollVelocity = 0;
  let velocityCheckInterval;

  const handleScroll = () => {
    // ... 70 lines of scroll logic
  };

  container.addEventListener('scroll', handleScroll, { passive: true });
  return () => {
    container.removeEventListener('scroll', handleScroll);
    clearTimeout(scrollTimeoutRef.current);
    clearInterval(velocityCheckInterval);
  };
}, [blogs, currentIndex, navigate]);
```

---

## Step 4: Add IntersectionObserver (10 min)

### Location
`frontend/src/pages/ShortBlogsViewer.jsx` - Replace deleted useEffect

### Add
```jsx
// IntersectionObserver for tracking visible short
useEffect(() => {
  const container = containerRef.current;
  if (!container || blogs.length === 0) return;

  observerRef.current = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const index = parseInt(entry.target.dataset.index, 10);
          if (index !== currentIndex) {
            setCurrentIndex(index);
            navigate(`/shorts/${blogs[index]._id}`, { replace: true });
          }
        }
      });
    },
    { root: container, threshold: 0.5 }
  );

  Array.from(container.children).forEach((child) => {
    observerRef.current.observe(child);
  });

  return () => observerRef.current?.disconnect();
}, [blogs, navigate]);
```

### Why
- Tracks which short is visible
- Updates index when 50%+ visible
- Passive observation (no performance impact)

---

## Step 5: Simplify Navigation Functions (5 min)

### Location
`frontend/src/pages/ShortBlogsViewer.jsx` - Line ~600

### Change
```jsx
// BEFORE
const handleNext = () => {
  if (currentIndex < blogs.length - 1 && containerRef.current && !isScrollingRef.current) {
    isScrollingRef.current = true;
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    navigate(`/shorts/${blogs[nextIndex]._id}`, { replace: true });
    containerRef.current.scrollTo({
      top: nextIndex * window.innerHeight,
      behavior: 'smooth'
    });
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 300);
  }
};

const handlePrev = () => {
  if (currentIndex > 0 && containerRef.current && !isScrollingRef.current) {
    isScrollingRef.current = true;
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    navigate(`/shorts/${blogs[prevIndex]._id}`, { replace: true });
    containerRef.current.scrollTo({
      top: prevIndex * window.innerHeight,
      behavior: 'smooth'
    });
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 300);
  }
};

// AFTER
const handleNext = () => {
  if (currentIndex < blogs.length - 1 && containerRef.current) {
    const target = containerRef.current.children[currentIndex + 1];
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const handlePrev = () => {
  if (currentIndex > 0 && containerRef.current) {
    const target = containerRef.current.children[currentIndex - 1];
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
```

### Why
- Uses native scrollIntoView API
- Respects scroll-snap points
- No manual index management
- No scroll locks or timeouts

---

## Step 6: Update Direct Navigation (5 min)

### Location
`frontend/src/pages/ShortBlogsViewer.jsx` - Line ~120

### Change
```jsx
// BEFORE
useEffect(() => {
  if (id && blogs.length > 0) {
    const index = blogs.findIndex(blog => blog._id === id);
    if (index !== -1) {
      setCurrentIndex(index);
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: index * window.innerHeight,
          behavior: 'auto'
        });
      }
    }
  }
}, [id, blogs]);

// AFTER
useEffect(() => {
  if (id && blogs.length > 0) {
    const index = blogs.findIndex(blog => blog._id === id);
    if (index !== -1 && containerRef.current) {
      setCurrentIndex(index);
      const target = containerRef.current.children[index];
      target?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }
}, [id, blogs]);
```

### Why
- Consistent with other navigation
- Works with scroll-snap
- Simpler logic

---

## Step 7: Remove Touch Handlers (2 min)

### Location
`frontend/src/pages/ShortBlogsViewer.jsx` - Line ~400

### Remove
```jsx
// DELETE THESE EMPTY FUNCTIONS
const handleTouchStart = (e) => {
  // Let native scroll handle touch - remove custom touch handlers
};

const handleTouchMove = (e) => {
  // Let native scroll handle touch - remove custom touch handlers
};

const handleTouchEnd = () => {
  // Let native scroll handle touch - remove custom touch handlers
};
```

### Location
`frontend/src/pages/ShortBlogsViewer.jsx` - Line ~900

### Remove
```jsx
// DELETE THESE PROPS
onTouchStart={!isDesktop ? handleTouchStart : undefined}
onTouchMove={!isDesktop ? handleTouchMove : undefined}
onTouchEnd={!isDesktop ? handleTouchEnd : undefined}
```

### Why
- Native scroll handles touch perfectly
- Removes unnecessary code
- Prevents potential conflicts

---

## Step 8: Test (10 min)

### Desktop Testing
```bash
npm run dev
# Navigate to http://localhost:3000/shorts
```

**Test:**
- [ ] Scroll with mouse wheel → Should advance one short at a time
- [ ] Scroll with trackpad → Should feel smooth and natural
- [ ] Click up/down arrows → Should navigate smoothly
- [ ] Use keyboard arrows (if implemented) → Should work

### Mobile Testing
```bash
npm run dev -- --host
# Navigate to http://YOUR_IP:3000/shorts on mobile
```

**Test:**
- [ ] Swipe up/down → Should snap to next/previous short
- [ ] Fast swipe → Should still snap to single item
- [ ] Slow drag → Should snap to nearest item
- [ ] Momentum scroll → Should feel natural

### Edge Cases
- [ ] First short (can't go up)
- [ ] Last short (can't go down)
- [ ] Direct URL (e.g., /shorts/abc123)
- [ ] Browser back button
- [ ] Refresh page

---

## Troubleshooting

### Issue: Scroll doesn't snap
**Check:**
```jsx
// Verify container has snap classes
className="snap-y snap-mandatory"

// Verify items have snap points
className="snap-start snap-always"
```

### Issue: Observer not firing
**Check:**
```jsx
// Verify data-index is set
<div data-index={index}>

// Verify observer is created
console.log('Observer:', observerRef.current);
```

### Issue: Scroll feels too aggressive
**Try:**
```jsx
// Change snap type to proximity
style={{ scrollSnapType: 'y proximity' }}
```

### Issue: Multiple items visible
**Check:**
```jsx
// Verify items are full height
className="h-screen"

// Check viewport height
console.log('Height:', window.innerHeight);
```

---

## Rollback Plan

If issues arise, revert these files:
```bash
git checkout HEAD -- frontend/src/pages/ShortBlogsViewer.jsx
```

Or manually restore:
1. Add back `scrollTimeoutRef` and `isScrollingRef`
2. Restore old scroll handler useEffect
3. Restore old navigation functions
4. Remove `observerRef` and observer useEffect

---

## Performance Verification

### Before Deployment
```bash
# Run Lighthouse audit
npm run build
npx serve -s build
# Open Chrome DevTools > Lighthouse > Run audit
```

**Target Metrics:**
- Performance: 90+
- Scroll FPS: 60
- JS execution: <1ms per transition

### After Deployment
Monitor:
- User scroll behavior (analytics)
- Error rates (Sentry)
- Performance metrics (Web Vitals)

---

## Success Criteria

✅ Smooth scrolling on all devices  
✅ Consistent snap behavior  
✅ No scroll jank or stuttering  
✅ URL updates correctly  
✅ Navigation arrows work  
✅ Direct links work  
✅ Performance improved  

---

## Next Steps

After successful deployment:

1. **Monitor** - Watch analytics for scroll engagement
2. **Gather feedback** - Ask users about scroll feel
3. **Optimize** - Fine-tune snap threshold if needed
4. **Enhance** - Add keyboard navigation, preloading, etc.

---

## Support

Questions? Check:
- `SHORTS_SCROLLING_IMPROVEMENTS.md` - Full documentation
- `SHORTS_SCROLLING_QUICK_REF.md` - Quick reference
- `SHORTS_SCROLLING_COMPARISON.md` - Before/after comparison

Or contact the development team.
