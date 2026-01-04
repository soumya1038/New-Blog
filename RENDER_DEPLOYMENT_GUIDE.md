# Render Deployment - SPA Routing Fix

## Issue: Page Not Found on Route Reload

When deployed to Render, navigating to a route and reloading shows "Page Not Found". This is because the SPA routing needs proper configuration.

## Root Cause
Your frontend is a React SPA but Render needs to be told to redirect all routes to `index.html` for client-side routing.

## Current Configuration
Your `render.yaml` has:
```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

This is correct but may need clarification.

## Solution for Render

### 1. Update render.yaml (Already Applied)
✅ The file has been updated with:
- SPA routing rewrite rules
- Proper cache headers
- Clear comments

### 2. Build & Deploy Steps

**In Render Dashboard:**

1. **Connect Repository**
   - Connect your GitHub repo to Render
   - Select branch (main/master)

2. **Deploy**
   - Push changes to your repo
   - Render will auto-detect `render.yaml`
   - Backend and Frontend will deploy automatically

3. **Verify Deployment**
   ```
   Frontend: https://your-frontend.onrender.com
   Backend: https://your-backend.onrender.com
   ```

### 3. Test After Deployment

1. Visit your frontend URL
2. Navigate to any page (e.g., `/blog/my-post`)
3. **Hard reload** the page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
4. Page should load correctly (not 404)

### 4. If Still Getting 404

**Step 1: Check Frontend Build**
```bash
cd frontend
npm run build
# Verify build/index.html exists
ls -la build/
```

**Step 2: Clear Render Cache**
- In Render Dashboard → Select frontend service
- Go to "Settings"
- Scroll down → "Clear build cache"
- Re-deploy

**Step 3: Check Environment Variables**
- Ensure `REACT_APP_API_URL` is correctly set in Render
- Should point to your backend URL (e.g., `https://your-backend.onrender.com`)

### 5. Frontend Environment Configuration

Create/Update `frontend/.env.production`:
```env
REACT_APP_API_URL=https://your-backend.onrender.com
```

The `frontend/public/index.html` should reference this:
```html
<!-- In public/index.html body -->
<noscript>You need to enable JavaScript to run this app.</noscript>
<div id="root"></div>
```

### 6. React Router Configuration

Make sure your `src/index.js` or `src/main.jsx` uses `BrowserRouter`:

```jsx
import { BrowserRouter } from 'react-router-dom';

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

**NOT** HashRouter (which uses `#` for routes):
```jsx
// ❌ WRONG - uses hash-based routing
import { HashRouter } from 'react-router-dom';
```

## Render.yaml Key Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `env: static` | static | Serves frontend as static files |
| `buildCommand` | `npm install --legacy-peer-deps && npm run build` | Installs deps and builds React app |
| `staticPublishPath` | `build` | Tells Render where built files are |
| `routes` | `/* → /index.html` | **Critical for SPA** |
| `headers` | Cache-Control | Prevents old index.html from being cached |

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Still getting 404 on reload | Clear Render build cache and redeploy |
| Routes work on navigation but not on reload | Check `routes` config in render.yaml |
| Styles/images missing | Check `staticPublishPath: build` |
| API calls failing | Verify `REACT_APP_API_URL` env var |
| Infinite loops or blank page | Ensure BrowserRouter is used, not HashRouter |

## Deploy Commands

```bash
# Test build locally
cd frontend
npm run build

# Verify build folder structure
ls -la build/
# Should see: index.html, static/, favicon.ico, etc.

# Push to trigger Render deploy
git add .
git commit -m "Fix SPA routing for Render"
git push origin main
```

Then check Render dashboard for deployment progress.

## Success Indicators

✅ Homepage loads: `https://your-frontend.onrender.com`
✅ Navigate to any page
✅ **Reload page** → Page still loads (not 404)
✅ Check Network tab → Routes show `index.html` with status 200
✅ Check Console → No errors

---

**Need Help?** 
- Check Render Logs: Dashboard → Your Service → "Logs"
- Verify Backend URL: Should be running on Render with API endpoints
- Test locally first: `npm run build && serve -s build`
