# Quick Reference: YouTube Shorts Scrolling

## Implementation Summary

### Core Pattern
```jsx
// 1. Container with CSS scroll-snap
<div className="overflow-y-auto snap-y snap-mandatory">
  
  // 2. Items with snap points
  {items.map((item, index) => (
    <div 
      key={item.id}
      data-index={index}
      className="h-screen snap-start"
    >
      {/* Content */}
    </div>
  ))}
</div>

// 3. IntersectionObserver for tracking
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const index = parseInt(entry.target.dataset.index, 10);
          setCurrentIndex(index);
        }
      });
    },
    { threshold: 0.5 }
  );
  
  // Observe all items
  container.querySelectorAll('[data-index]').forEach(el => observer.observe(el));
  
  return () => observer.disconnect();
}, [items]);
```

---

## Essential CSS Classes

```css
/* Container */
.snap-y { scroll-snap-type: y mandatory; }
.snap-mandatory { scroll-snap-stop: always; }
.overflow-y-auto { overflow-y: auto; }

/* Items */
.snap-start { scroll-snap-align: start; }
.snap-always { scroll-snap-stop: always; }
.h-screen { height: 100vh; }
```

---

## Common Patterns

### Programmatic Navigation
```jsx
const scrollToIndex = (index) => {
  const target = containerRef.current?.children[index];
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
```

### Direct URL Navigation
```jsx
useEffect(() => {
  if (itemId && items.length > 0) {
    const index = items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const target = containerRef.current?.children[index];
      target?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }
}, [itemId, items]);
```

### Keyboard Support
```jsx
useEffect(() => {
  const handleKey = (e) => {
    if (e.key === 'ArrowDown') scrollToIndex(currentIndex + 1);
    if (e.key === 'ArrowUp') scrollToIndex(currentIndex - 1);
  };
  window.addEventListener('keydown', handleKey);
  return () => window.removeEventListener('keydown', handleKey);
}, [currentIndex]);
```

---

## Do's and Don'ts

### ✅ DO
- Use CSS scroll-snap for all scroll behavior
- Use IntersectionObserver for tracking
- Use passive event listeners if needed
- Let browser handle momentum
- Test on real devices

### ❌ DON'T
- Add scroll event listeners for snapping
- Calculate scroll positions manually
- Use setTimeout for scroll delays
- Mix CSS snap with JS scroll control
- Block touch events

---

## Debugging Tips

### Check if snap is working
```jsx
// Add to container
onScroll={(e) => console.log('Scroll:', e.target.scrollTop)}
```

### Verify observer is firing
```jsx
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    console.log('Visible:', entry.target.dataset.index, entry.intersectionRatio);
  });
}, { threshold: 0.5 });
```

### Test snap alignment
```css
/* Temporarily add borders */
.snap-start { border: 2px solid red; }
```

---

## Performance Checklist

- [ ] No scroll event listeners (except for non-snap features)
- [ ] IntersectionObserver uses passive observation
- [ ] No state updates during scroll
- [ ] CSS handles all snap behavior
- [ ] Smooth 60 FPS on mobile

---

## Browser Support Fallback

```jsx
// Check for scroll-snap support
const supportsScrollSnap = CSS.supports('scroll-snap-type', 'y mandatory');

if (!supportsScrollSnap) {
  // Fallback: Use manual scroll handling
  // (Only for <4% of users)
}
```

---

## Testing Commands

```bash
# Test on mobile device
npm run dev -- --host

# Check performance
# Chrome DevTools > Performance > Record scroll

# Verify snap points
# Chrome DevTools > Elements > Computed > scroll-snap-*
```

---

## Key Metrics

| Metric | Target |
|--------|--------|
| Scroll FPS | 60 |
| JS execution per scroll | <1ms |
| State updates per transition | 1 |
| Snap delay | 0ms (instant) |

---

## Resources

- [MDN: CSS Scroll Snap](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Scroll_Snap)
- [MDN: IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Can I Use: Scroll Snap](https://caniuse.com/css-snappoints)
