const axios = require('axios');

const sendEmail = async ({ to, subject, html }) => {
  console.log('📧 [EMAIL] Starting email send process...');
  console.log('📧 [EMAIL] To:', to);
  console.log('📧 [EMAIL] Subject:', subject);
  console.log('📧 [EMAIL] Using Brevo API');
  
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
    console.error('❌ [EMAIL] Missing Brevo credentials!');
    throw new Error('Email service not configured. Please set BREVO_API_KEY and BREVO_FROM_EMAIL.');
  }
  
  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: 'New Blog', email: process.env.BREVO_FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html
    }, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ [EMAIL] Email sent successfully!');
    console.log('📧 [EMAIL] Brevo Response:', JSON.stringify(response.data));
    console.log('⚠️ [EMAIL] Check: 1) Sender email verified at https://app.brevo.com/senders 2) Check spam folder');
    return { success: true };
  } catch (error) {
    console.error('❌ [EMAIL] Email send failed!');
    console.error('❌ [EMAIL] Error:', error.response?.data || error.message);
    console.error('⚠️ [EMAIL] Verify sender email at: https://app.brevo.com/senders');
    throw new Error('Failed to send email: ' + (error.response?.data?.message || error.message));
  }
};

const sendVerificationEmail = async (email, username, verificationCode) => {
  console.log('📧 [EMAIL] Sending verification email to:', email);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #1f2937; margin-bottom: 20px;">Welcome to New Blog!</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${username},</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Thank you for registering! Your verification code is:</p>
        <div style="background-color: #3b82f6; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 30px 0; letter-spacing: 8px;">
          ${verificationCode}
        </div>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #92400e; font-size: 14px; font-weight: bold; margin: 0;">⏰ This code expires in 2 minutes</p>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email - New Blog',
    html,
  });
};

const sendPasswordResetEmail = async (email, username, resetCode) => {
  console.log('📧 [EMAIL] Sending password reset email to:', email);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${username},</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">You requested to reset your password. Use this code:</p>
        <div style="background-color: #ef4444; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 30px 0; letter-spacing: 8px;">
          ${resetCode}
        </div>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #92400e; font-size: 14px; font-weight: bold; margin: 0;">⏰ This code expires in 2 minutes</p>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Code - New Blog',
    html,
  });
};

const sendWelcomeEmail = async (email, username) => {
  console.log('📧 [EMAIL] Sending welcome email to:', email);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #1f2937; margin-bottom: 20px;">🎉 Welcome to New Blog!</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${username},</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Your email has been verified successfully! You can now start creating amazing blog posts.</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 20px;">Happy blogging! 🚀</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to New Blog',
    html,
  });
};

const sendPasswordChangeConfirmation = async (email, username, confirmationCode) => {
  console.log('📧 [EMAIL] Sending password change confirmation to:', email);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #1f2937; margin-bottom: 20px;">🔐 Password Change Request</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${username},</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">You requested to change your password. Use this code to confirm:</p>
        <div style="background-color: #3b82f6; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 30px 0; letter-spacing: 8px;">
          ${confirmationCode}
        </div>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #92400e; font-size: 14px; font-weight: bold; margin: 0;">⏰ This code expires in 2 minutes</p>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Confirm Password Change - New Blog',
    html,
  });
};

const sendAccountDeletionConfirmation = async (email, username, confirmationCode) => {
  console.log('📧 [EMAIL] Sending account deletion confirmation to:', email);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #ef4444; margin-bottom: 20px;">⚠️ Account Deletion Request</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${username},</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">You requested to delete your account. Use this code to confirm:</p>
        <div style="background-color: #ef4444; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 30px 0; letter-spacing: 8px;">
          ${confirmationCode}
        </div>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #92400e; font-size: 14px; font-weight: bold; margin: 0;">⏰ This code expires in 2 minutes</p>
        </div>
        <p style="color: #ef4444; font-size: 14px; line-height: 1.6; font-weight: bold;">⚠️ This action is permanent and cannot be undone!</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you didn't request this, please secure your account immediately.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Confirm Account Deletion - New Blog',
    html,
  });
};

const sendPasswordChangedSuccess = async (email, username) => {
  console.log('📧 [EMAIL] Sending password changed success to:', email);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #10b981; margin-bottom: 20px;">✅ Password Changed Successfully</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${username},</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Your password has been changed successfully.</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 20px;">If you didn't make this change, please contact support immediately.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Changed Successfully - New Blog',
    html,
  });
};

const sendAccountDeletedSuccess = async (email, username) => {
  console.log('📧 [EMAIL] Sending account deleted success to:', email);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #6b7280; margin-bottom: 20px;">Account Deleted</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${username},</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Your account has been permanently deleted from New Blog.</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 20px;">We're sorry to see you go. If you change your mind, you're always welcome to create a new account.</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">Thank you for being part of our community.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Account Deleted - New Blog',
    html,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordChangeConfirmation,
  sendAccountDeletionConfirmation,
  sendPasswordChangedSuccess,
  sendAccountDeletedSuccess,
};
