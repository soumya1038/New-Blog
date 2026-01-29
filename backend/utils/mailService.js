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
      sender: { name: 'Lekhon', email: process.env.BREVO_FROM_EMAIL },
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
  const logoUrl = process.env.LOGO_URL || '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
              ${logoUrl ? `<tr><td align="center" style="padding: 40px 40px 20px;"><img src="${logoUrl}" alt="Lekhon" style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%; display: block;"/></td></tr>` : ''}
              <tr><td align="center" style="padding: ${logoUrl ? '20px' : '40px'} 40px 30px;"><h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 700;">Welcome to Lekhon!</h1></td></tr>
              <tr><td style="padding: 0 40px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${username}</strong>,</p><p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Thank you for joining us! Enter this code to verify your email:</p></td></tr>
              <tr><td align="center" style="padding: 0 40px 30px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 36px; font-weight: 700; padding: 24px; border-radius: 12px; letter-spacing: 10px; display: inline-block;">${verificationCode}</div></td></tr>
              <tr><td style="padding: 0 40px 30px;"><div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px;"><p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⏰ Expires in 2 minutes</p></div></td></tr>
              <tr><td style="padding: 0 40px 40px;"><p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">If you didn't create this account, please ignore this email.</p></td></tr>
              <tr><td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">© 2024 Lekhon. All rights reserved.</p></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email - Lekhon',
    html,
  });
};

const sendPasswordResetEmail = async (email, username, resetCode) => {
  console.log('📧 [EMAIL] Sending password reset email to:', email);
  const logoUrl = process.env.LOGO_URL || '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
              ${logoUrl ? `<tr><td align="center" style="padding: 40px 40px 20px;"><img src="${logoUrl}" alt="Lekhon" style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%; display: block;"/></td></tr>` : ''}
              <tr><td align="center" style="padding: ${logoUrl ? '20px' : '40px'} 40px 30px;"><h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 700;">Password Reset</h1></td></tr>
              <tr><td style="padding: 0 40px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${username}</strong>,</p><p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Use this code to reset your password:</p></td></tr>
              <tr><td align="center" style="padding: 0 40px 30px;"><div style="background: linear-gradient(135deg, #f43f5e 0%, #dc2626 100%); color: #ffffff; font-size: 36px; font-weight: 700; padding: 24px; border-radius: 12px; letter-spacing: 10px; display: inline-block;">${resetCode}</div></td></tr>
              <tr><td style="padding: 0 40px 30px;"><div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px;"><p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⏰ Expires in 2 minutes</p></div></td></tr>
              <tr><td style="padding: 0 40px 40px;"><p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">If you didn't request this, please ignore this email.</p></td></tr>
              <tr><td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">© 2024 Lekhon. All rights reserved.</p></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Code - Lekhon',
    html,
  });
};

const sendWelcomeEmail = async (email, username) => {
  console.log('📧 [EMAIL] Sending welcome email to:', email);
  const logoUrl = process.env.LOGO_URL || '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
              ${logoUrl ? `<tr><td align="center" style="padding: 40px 40px 20px;"><img src="${logoUrl}" alt="Lekhon" style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%; display: block;"/></td></tr>` : ''}
              <tr><td align="center" style="padding: ${logoUrl ? '20px' : '40px'} 40px 30px;"><h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 700;">🎉 Welcome to Lekhon!</h1></td></tr>
              <tr><td style="padding: 0 40px 20px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${username}</strong>,</p><p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">Your email has been verified successfully! You're all set to start creating amazing content.</p></td></tr>
              <tr><td align="center" style="padding: 0 40px 30px;"><a href="${process.env.FRONTEND_URL}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Start Writing</a></td></tr>
              <tr><td style="padding: 0 40px 40px;"><p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">Happy blogging! 🚀</p></td></tr>
              <tr><td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">© 2024 Lekhon. All rights reserved.</p></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Lekhon',
    html,
  });
};

const sendPasswordChangeConfirmation = async (email, username, confirmationCode) => {
  console.log('📧 [EMAIL] Sending password change confirmation to:', email);
  const logoUrl = process.env.LOGO_URL || '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
              ${logoUrl ? `<tr><td align="center" style="padding: 40px 40px 20px;"><img src="${logoUrl}" alt="Lekhon" style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%; display: block;"/></td></tr>` : ''}
              <tr><td align="center" style="padding: ${logoUrl ? '20px' : '40px'} 40px 30px;"><h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 700;">🔐 Password Change</h1></td></tr>
              <tr><td style="padding: 0 40px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${username}</strong>,</p><p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Confirm your password change with this code:</p></td></tr>
              <tr><td align="center" style="padding: 0 40px 30px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 36px; font-weight: 700; padding: 24px; border-radius: 12px; letter-spacing: 10px; display: inline-block;">${confirmationCode}</div></td></tr>
              <tr><td style="padding: 0 40px 30px;"><div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px;"><p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⏰ Expires in 2 minutes</p></div></td></tr>
              <tr><td style="padding: 0 40px 40px;"><p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">If you didn't request this, please secure your account immediately.</p></td></tr>
              <tr><td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">© 2024 Lekhon. All rights reserved.</p></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Confirm Password Change - Lekhon',
    html,
  });
};

const sendAccountDeletionConfirmation = async (email, username, confirmationCode) => {
  console.log('📧 [EMAIL] Sending account deletion confirmation to:', email);
  const logoUrl = process.env.LOGO_URL || '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
              ${logoUrl ? `<tr><td align="center" style="padding: 40px 40px 20px;"><img src="${logoUrl}" alt="Lekhon" style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%; display: block;"/></td></tr>` : ''}
              <tr><td align="center" style="padding: ${logoUrl ? '20px' : '40px'} 40px 30px;"><h1 style="margin: 0; color: #dc2626; font-size: 28px; font-weight: 700;">⚠️ Account Deletion</h1></td></tr>
              <tr><td style="padding: 0 40px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${username}</strong>,</p><p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Confirm account deletion with this code:</p></td></tr>
              <tr><td align="center" style="padding: 0 40px 30px;"><div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; font-size: 36px; font-weight: 700; padding: 24px; border-radius: 12px; letter-spacing: 10px; display: inline-block;">${confirmationCode}</div></td></tr>
              <tr><td style="padding: 0 40px 20px;"><div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px;"><p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⏰ Expires in 2 minutes</p></div></td></tr>
              <tr><td style="padding: 0 40px 30px;"><div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 8px;"><p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">⚠️ This action is permanent and cannot be undone!</p></div></td></tr>
              <tr><td style="padding: 0 40px 40px;"><p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">If you didn't request this, please secure your account immediately.</p></td></tr>
              <tr><td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">© 2024 Lekhon. All rights reserved.</p></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Confirm Account Deletion - Lekhon',
    html,
  });
};

const sendPasswordChangedSuccess = async (email, username) => {
  console.log('📧 [EMAIL] Sending password changed success to:', email);
  const logoUrl = process.env.LOGO_URL || '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
              ${logoUrl ? `<tr><td align="center" style="padding: 40px 40px 20px;"><img src="${logoUrl}" alt="Lekhon" style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%; display: block;"/></td></tr>` : ''}
              <tr><td align="center" style="padding: ${logoUrl ? '20px' : '40px'} 40px 30px;"><h1 style="margin: 0; color: #059669; font-size: 28px; font-weight: 700;">✅ Password Changed</h1></td></tr>
              <tr><td style="padding: 0 40px 20px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${username}</strong>,</p><p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">Your password has been changed successfully.</p></td></tr>
              <tr><td style="padding: 0 40px 40px;"><p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">If you didn't make this change, please contact support immediately.</p></td></tr>
              <tr><td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">© 2024 Lekhon. All rights reserved.</p></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Changed Successfully - Lekhon',
    html,
  });
};

const sendAccountDeletedSuccess = async (email, username) => {
  console.log('📧 [EMAIL] Sending account deleted success to:', email);
  const logoUrl = process.env.LOGO_URL || '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
              ${logoUrl ? `<tr><td align="center" style="padding: 40px 40px 20px;"><img src="${logoUrl}" alt="Lekhon" style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%; display: block;"/></td></tr>` : ''}
              <tr><td align="center" style="padding: ${logoUrl ? '20px' : '40px'} 40px 30px;"><h1 style="margin: 0; color: #6b7280; font-size: 28px; font-weight: 700;">Account Deleted</h1></td></tr>
              <tr><td style="padding: 0 40px 20px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi <strong>${username}</strong>,</p><p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Your account has been permanently deleted from Lekhon.</p><p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">We're sorry to see you go. If you change your mind, you're always welcome to create a new account.</p></td></tr>
              <tr><td style="padding: 0 40px 40px;"><p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">Thank you for being part of our community.</p></td></tr>
              <tr><td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">© 2024 Lekhon. All rights reserved.</p></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Account Deleted - Lekhon',
    html,
  });
};

const sendContactEmail = async ({ userEmail, username, issue, advice }) => {
  console.log('📧 [EMAIL] Sending contact message to admin');
  const logoUrl = process.env.LOGO_URL || '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
              ${logoUrl ? `<tr><td align="center" style="padding: 40px 40px 20px;"><img src="${logoUrl}" alt="Lekhon" style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%; display: block;"/></td></tr>` : ''}
              <tr><td align="center" style="padding: ${logoUrl ? '20px' : '40px'} 40px 30px;"><h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 700;">📧 New Contact Message</h1></td></tr>
              <tr><td style="padding: 0 40px 20px;"><p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;"><strong>From:</strong> ${username} (${userEmail})</p></td></tr>
              <tr><td style="padding: 0 40px 20px;"><div style="border-top: 2px solid #e5e7eb; margin: 20px 0;"></div><h3 style="margin: 0 0 12px; color: #111827; font-size: 18px; font-weight: 600;">Issue / Problem:</h3><div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;"><p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">${issue}</p></div></td></tr>
              ${advice ? `<tr><td style="padding: 0 40px 30px;"><h3 style="margin: 0 0 12px; color: #111827; font-size: 18px; font-weight: 600;">Advice / Suggestions:</h3><div style="background-color: #dbeafe; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;"><p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">${advice}</p></div></td></tr>` : '<tr><td style="padding: 0 40px 30px;"></td></tr>'}
              <tr><td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">© 2024 Lekhon. All rights reserved.</p></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: process.env.My_email || 'soumyamaiti20@gmail.com',
    subject: `Contact Message from ${username} - Lekhon`,
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
  sendContactEmail,
};
