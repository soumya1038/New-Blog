# Email Verification Setup Guide

## Gmail App Password Setup

To send verification emails, you need to create a Gmail App Password:

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification"
3. Follow the steps to enable it

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other" as the device and name it "Modern Blog"
4. Click "Generate"
5. Copy the 16-character password (remove spaces)

### Step 3: Update .env File
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

## How Email Verification Works

### Registration Flow:
1. User fills registration form with username, email, password
2. Account created with `isVerified: false`
3. Verification email sent to user's email
4. User cannot login until email is verified

### Verification Email Contains:
- Welcome message
- "Verify Email" button
- Verification link (valid for 24 hours)
- Styled HTML email

### Verification Flow:
1. User clicks link in email
2. Redirected to `/verify-email/:token`
3. Token validated on backend
4. `isVerified` set to `true`
5. User redirected to login page
6. User can now login

### Login Protection:
- Unverified users see: "Please verify your email before logging in"
- Verified users can login normally

## Testing Locally

If you don't want to set up Gmail:
1. Comment out email verification check in `authController.js`:
```javascript
// if (!user.isVerified) {
//   return res.status(403).json({ success: false, message: 'Please verify your email...' });
// }
```

2. Or manually verify users in database:
```javascript
db.users.updateOne(
  { username: "testuser" },
  { $set: { isVerified: true } }
)
```

## Alternative Email Services

You can also use:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **AWS SES** (62,000 emails/month free)

Just update the `sendEmail.js` transporter configuration.
