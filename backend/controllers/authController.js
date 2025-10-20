const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordChangedSuccess } = require('../utils/mailService');
const { validateEmail } = require('../utils/emailValidator');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// Register user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password, rememberMe } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    if (email) {
      // Validate email domain
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(400).json({ success: false, message: emailValidation.message });
      }

      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }

    // Email should already be verified at this point
    // Check if verification code was used
    const verifiedEmail = global.verificationCodes?.[email];
    if (verifiedEmail) {
      delete global.verificationCodes[email]; // Clean up
    }
    
    const user = await User.create({ 
      username, 
      email, 
      password,
      isVerified: true // Email already verified in the form
    });

    // Send welcome email
    if (email) {
      try {
        await sendWelcomeEmail(email, username);
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      rememberMe
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user is suspended and auto-reactivate if suspension expired
    if (user.suspendedUntil && new Date() >= user.suspendedUntil) {
      user.suspendedUntil = null;
      user.isActive = true;
      await user.save();
    }

    // Check if user is still suspended
    if (!user.isActive || (user.suspendedUntil && new Date() < user.suspendedUntil)) {
      const suspendedMessage = user.suspendedUntil 
        ? `Account suspended until ${user.suspendedUntil.toLocaleDateString()}`
        : 'Account has been suspended';
      return res.status(403).json({ success: false, message: suspendedMessage });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role
      },
      rememberMe
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send verification code
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Validate email domain
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in temporary collection or cache (for now, we'll use a simple approach)
    // In production, use Redis or a temporary collection
    global.verificationCodes = global.verificationCodes || {};
    global.verificationCodes[email] = {
      code: verificationCode,
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
    };

    // Send verification email using MailerSend
    await sendVerificationEmail(email, 'User', verificationCode);

    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Verification email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification email' });
  }
};

// Send password reset code
exports.sendPasswordResetCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    global.passwordResetCodes = global.passwordResetCodes || {};
    global.passwordResetCodes[email] = {
      code: resetCode,
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
    };

    const { sendPasswordResetEmail } = require('../utils/mailService');
    await sendPasswordResetEmail(email, user.username, resetCode);

    res.json({ success: true, message: 'Password reset code sent to your email' });
  } catch (error) {
    console.error('Password reset email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send password reset email' });
  }
};

// Reset password with code
exports.resetPasswordWithCode = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required' });
    }

    const storedData = global.passwordResetCodes?.[email];
    
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'No reset code found for this email' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.passwordResetCodes[email];
      return res.status(400).json({ success: false, message: 'Reset code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid reset code' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    delete global.passwordResetCodes[email];

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify code
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required' });
    }

    const storedData = global.verificationCodes?.[email];
    
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'No verification code found for this email' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.verificationCodes[email];
      return res.status(400).json({ success: false, message: 'Verification code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Code is valid
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify email (old token-based method - keep for backward compatibility)
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Forgot Password - Step 1: Request verification code
exports.requestForgotPassword = async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ success: false, message: 'Username and email are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Invalid username or email' });
    }

    if (user.email !== email) {
      return res.status(404).json({ success: false, message: 'Invalid username or email' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    global.forgotPasswordCodes = global.forgotPasswordCodes || {};
    global.forgotPasswordCodes[email] = {
      code: verificationCode,
      username,
      expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes
      verified: false
    };

    const { sendPasswordResetEmail } = require('../utils/mailService');
    await sendPasswordResetEmail(email, user.username, verificationCode);

    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
};

// Forgot Password - Step 2: Verify code
exports.verifyForgotPasswordCode = async (req, res) => {
  try {
    const { username, email, code } = req.body;

    if (!username || !email || !code) {
      return res.status(400).json({ success: false, message: 'Username, email and code are required' });
    }

    const storedData = global.forgotPasswordCodes?.[email];
    
    if (!storedData || storedData.username !== username) {
      return res.status(400).json({ success: false, message: 'Invalid verification request' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.forgotPasswordCodes[email];
      return res.status(400).json({ success: false, message: 'Verification code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    storedData.verified = true;
    res.json({ success: true, message: 'Verification successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Forgot Password - Step 3: Request password change (send 2nd code)
exports.requestForgotPasswordChange = async (req, res) => {
  try {
    const { username, email, newPassword } = req.body;

    if (!username || !email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Username, email and new password are required' });
    }

    const storedData = global.forgotPasswordCodes?.[email];
    
    if (!storedData || !storedData.verified || storedData.username !== username) {
      return res.status(400).json({ success: false, message: 'Please verify your email first' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.forgotPasswordCodes[email];
      return res.status(400).json({ success: false, message: 'Session expired. Please start again' });
    }

    const confirmCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    global.forgotPasswordChangeCodes = global.forgotPasswordChangeCodes || {};
    global.forgotPasswordChangeCodes[email] = {
      code: confirmCode,
      username,
      newPassword,
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
    };

    const user = await User.findOne({ username, email });
    const { sendPasswordChangeConfirmation } = require('../utils/mailService');
    await sendPasswordChangeConfirmation(email, user.username, confirmCode);

    res.json({ success: true, message: 'Confirmation code sent to your email' });
  } catch (error) {
    console.error('Password change request error:', error);
    res.status(500).json({ success: false, message: 'Failed to send confirmation code' });
  }
};

// Forgot Password - Step 4: Confirm and change password
exports.confirmForgotPasswordChange = async (req, res) => {
  try {
    const { username, email, code } = req.body;

    if (!username || !email || !code) {
      return res.status(400).json({ success: false, message: 'Username, email and code are required' });
    }

    const storedData = global.forgotPasswordChangeCodes?.[email];
    
    if (!storedData || storedData.username !== username) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation request' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.forgotPasswordChangeCodes[email];
      return res.status(400).json({ success: false, message: 'Confirmation code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code' });
    }

    const user = await User.findOne({ username, email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = storedData.newPassword;
    await user.save();

    delete global.forgotPasswordCodes[email];
    delete global.forgotPasswordChangeCodes[email];

    // Send success email
    try {
      await sendPasswordChangedSuccess(email, username);
    } catch (error) {
      console.error('Failed to send success email:', error);
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
