# 🌈 AvatarWithStatus Component

## Rainbow Animated Status Ring

Replace green status ring with beautiful rainbow gradient that animates from bottom-left to top-right.

## Usage

```jsx
import AvatarWithStatus from '../components/AvatarWithStatus';

// Without status (normal avatar)
<AvatarWithStatus user={user} size="md" />

// With status (rainbow ring)
<AvatarWithStatus user={user} size="md" hasStatus={true} />

// Check if user has active status
<AvatarWithStatus 
  user={user} 
  size="lg" 
  hasStatus={user.statuses?.length > 0} 
/>
```

## Sizes
- `sm` - Small (40px)
- `md` - Medium (56px) - Default
- `lg` - Large (112px)
- `xl` - Extra Large (144px)

## Features
- ✅ Rainbow gradient (red → yellow → green → blue → purple)
- ✅ Smooth 3-second rotation animation
- ✅ Wave effect from bottom-left to top-right
- ✅ Works with all avatar types (image, Gravatar, initials)
- ✅ Responsive sizing

## Replace Old Status Indicators

### Before (Green Ring):
```jsx
<div className="ring-4 ring-green-500">
  <Avatar user={user} />
</div>
```

### After (Rainbow Ring):
```jsx
<AvatarWithStatus user={user} hasStatus={true} />
```

## Example in Chat List:
```jsx
{users.map(user => (
  <div key={user._id} className="flex items-center gap-3">
    <AvatarWithStatus 
      user={user} 
      size="md"
      hasStatus={user.statuses?.some(s => new Date(s.expiresAt) > new Date())}
    />
    <span>{user.username}</span>
  </div>
))}
```

## Animation Details
- **Duration:** 3 seconds per rotation
- **Direction:** Clockwise
- **Gradient:** 5-color rainbow (red, yellow, green, blue, purple)
- **Effect:** Creates wave appearance from bottom-left to top-right
