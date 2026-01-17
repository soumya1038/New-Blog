# 📦 Dependency Analysis

## ❌ Unused/Duplicate Dependencies

### 1. **Multiple UI Libraries** (ISSUE)
- `@mui/material` + `@mui/icons-material` (Material-UI)
- `rsuite` (Another UI library)
- **Problem**: Using Tailwind CSS primarily, MUI/rsuite barely used
- **Action**: Can remove if not critical

### 2. **Duplicate Icon Libraries**
- `@mui/icons-material`
- `react-icons` ✅ (Keep - widely used)
- **Action**: Remove MUI icons if using react-icons

### 3. **Markdown Editors**
- `easymde`
- `react-simplemde-editor`
- **Problem**: Both are SimpleMDE wrappers
- **Action**: Keep only one

### 4. **Emotion (CSS-in-JS)**
- `@emotion/react`
- `@emotion/styled`
- **Problem**: Required by MUI, but you use Tailwind
- **Action**: Remove if removing MUI

---

## ✅ Keep These (Essential)

- `react`, `react-dom` - Core
- `react-router-dom` - Routing
- `axios` - API calls
- `socket.io-client` - Real-time
- `react-icons` - Icons
- `tailwindcss` - Styling
- `react-hot-toast` - Notifications
- `i18next` - Translations
- `recharts` - Charts (admin)
- `fabric` - Image editor
- `crypto-js` - Encryption
- `date-fns` - Date formatting

---

## 🎯 Recommended Actions

### Option 1: Aggressive (Remove ~800KB)
```bash
npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled rsuite easymde
```
**Impact**: -800KB bundle size
**Risk**: Check if AdminDashboard uses MUI charts

### Option 2: Conservative (Remove ~400KB)
```bash
npm uninstall rsuite easymde @mui/icons-material
```
**Impact**: -400KB bundle size
**Risk**: Low

### Option 3: Minimal (Remove ~200KB)
```bash
npm uninstall rsuite easymde
```
**Impact**: -200KB bundle size
**Risk**: None

---

## 📊 Bundle Size Impact

**Current**: ~2.5MB (before Phase 1)
**After Phase 1**: ~800KB
**After removing deps**: ~600KB (Option 1) or ~700KB (Option 2)

---

## ⚠️ Before Removing

1. Search codebase for usage:
```bash
# Check MUI usage
grep -r "@mui" frontend/src

# Check rsuite usage
grep -r "rsuite" frontend/src

# Check easymde usage
grep -r "easymde" frontend/src
```

2. Test thoroughly after removal

---

## 💡 Recommendation

**Start with Option 3** (safest):
- Remove `rsuite` (not used)
- Remove `easymde` (keep react-simplemde-editor)

Then test and consider Option 2 or 1.
