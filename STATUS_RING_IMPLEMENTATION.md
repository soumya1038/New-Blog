# Status Ring Implementation

## Overview
Users with active status posts now display a green ring around their avatar images (similar to WhatsApp/Instagram stories).

## Changes Made

### Backend Changes

#### 1. `backend/controllers/blogController.js`
- **getBlogs()**: 
  - Populate `statuses` field from User model
  - Add `hasActiveStatus` boolean to author object
  - Check if user has any status where `expiresAt > currentTime`
  - Remove `statuses` array from response for privacy

- **getBlog()**:
  - Populate `statuses` field from User model
  - Add `hasActiveStatus` boolean to author object
  - Remove `statuses` array from response

### Frontend Changes

#### 1. `frontend/src/components/Avatar.js`
- Added `showStatusRing` prop (default: false)
- When `showStatusRing={true}` and `user.hasActiveStatus === true`:
  - Apply green ring: `ring-2 ring-green-500 ring-offset-2`
- Ring applies to all avatar types (profile image, Gravatar, initials)

#### 2. `frontend/src/pages/Home.js`
- Updated all Avatar components in blog cards
- Added `showStatusRing={true}` prop to display status ring

#### 3. `frontend/src/pages/BlogDetail.js`
- Updated author Avatar component
- Added `showStatusRing={true}` prop to display status ring

## How It Works

1. **Backend**: When fetching blogs, check each author's `statuses` array
2. **Check Expiry**: Filter statuses where `expiresAt > now`
3. **Set Flag**: If any active status exists, set `hasActiveStatus = true`
4. **Frontend**: Avatar component checks `user.hasActiveStatus` and `showStatusRing` prop
5. **Display**: Green ring appears around avatar when both conditions are true

## Visual Effect
- **Ring Color**: Green (#10B981 - Tailwind green-500)
- **Ring Width**: 2px
- **Ring Offset**: 2px (white space between avatar and ring)
- **Automatic Expiry**: Ring disappears when status expires

## Usage Example

```jsx
// Show status ring
<Avatar user={blog.author} size="sm" showStatusRing={true} />

// No status ring (default)
<Avatar user={blog.author} size="sm" />
```

## Status Expiry
- Status posts have `expiresAt` field in User model
- Backend automatically checks expiry on each request
- No manual cleanup needed - ring disappears when status expires
