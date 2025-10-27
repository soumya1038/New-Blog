const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");
const nodemailer = require('nodemailer');

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
});

const sendEmail = async ({ to, subject, html }) => {
  // Try MailerSend first
  if (process.env.MAILERSEND_API_KEY) {
    try {
      // Use MailerSend trial domain (already verified)
      const sentFrom = new Sender("noreply@trial-3vz9dle7xo0lkj50.mlsender.net", "New Blog");
      const recipients = [new Recipient(to, to.split('@')[0])];

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(subject)
        .setHtml(html);

      await mailerSend.email.send(emailParams);
      console.log(`✅ Email sent via MailerSend to ${to}`);
      return { success: true };
    } catch (error) {
      console.error('⚠️ MailerSend failed, trying nodemailer...', error.message);
      if (error.body) {
        console.error('MailerSend error:', error.body);
      }
    }
  }

  // Fallback to nodemailer (Gmail)
  try {
    console.log('📧 Using nodemailer fallback...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"New Blog" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });

    console.log(`✅ Email sent via Gmail to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send failed (both MailerSend and Gmail):', error.message);
    throw new Error('Failed to send email');
  }
};

const sendVerificationEmail = async (email, username, verificationCode) => {
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
