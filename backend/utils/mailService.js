const axios = require('axios');
const {
  renderWelcomeEmail,
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderPasswordChangeConfirmationEmail,
  renderPasswordChangedSuccessEmail,
  renderAccountDeletionConfirmationEmail,
  renderAccountDeletedSuccessEmail,
  renderContactAdminEmail,
} = require('./emailTemplates');

const sendEmail = async ({ to, subject, html }) => {
  console.log('[EMAIL] Starting email send process...');
  console.log('[EMAIL] To:', to);
  console.log('[EMAIL] Subject:', subject);
  console.log('[EMAIL] Using Brevo API');

  if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
    console.error('[EMAIL] Missing Brevo credentials.');
    throw new Error('Email service not configured. Please set BREVO_API_KEY and BREVO_FROM_EMAIL.');
  }

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'Lekhon', email: process.env.BREVO_FROM_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[EMAIL] Email sent successfully.');
    console.log('[EMAIL] Brevo response:', JSON.stringify(response.data));
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Email send failed.');
    console.error('[EMAIL] Error:', error.response?.data || error.message);
    throw new Error('Failed to send email: ' + (error.response?.data?.message || error.message));
  }
};

const sendVerificationEmail = async (email, username, verificationCode, expiresAt) => {
  console.log('[EMAIL] Sending verification email to:', email);
  const { subject, html } = renderVerificationEmail({
    username,
    code: verificationCode,
    expiresAt,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendPasswordResetEmail = async (email, username, resetCode, expiresAt) => {
  console.log('[EMAIL] Sending password reset email to:', email);
  const { subject, html } = renderPasswordResetEmail({
    username,
    code: resetCode,
    expiresAt,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendWelcomeEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Sending welcome email to:', email);
  const { subject, html } = renderWelcomeEmail({
    username,
    temporaryPassword: options.temporaryPassword || ''
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendPasswordChangeConfirmation = async (email, username, confirmationCode, expiresAt) => {
  console.log('[EMAIL] Sending password change confirmation to:', email);
  const { subject, html } = renderPasswordChangeConfirmationEmail({
    username,
    code: confirmationCode,
    expiresAt,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendAccountDeletionConfirmation = async (email, username, confirmationCode, expiresAt) => {
  console.log('[EMAIL] Sending account deletion confirmation to:', email);
  const { subject, html } = renderAccountDeletionConfirmationEmail({
    username,
    code: confirmationCode,
    expiresAt,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendPasswordChangedSuccess = async (email, username, changedAt) => {
  console.log('[EMAIL] Sending password changed success to:', email);
  const { subject, html } = renderPasswordChangedSuccessEmail({
    username,
    changedAt,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendAccountDeletedSuccess = async (email, username) => {
  console.log('[EMAIL] Sending account deleted success to:', email);
  const { subject, html } = renderAccountDeletedSuccessEmail({ username });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendContactEmail = async ({ userEmail, username, issue, advice }) => {
  console.log('[EMAIL] Sending contact message to admin');
  const { subject, html } = renderContactAdminEmail({
    username,
    userEmail,
    issue,
    advice,
  });

  return sendEmail({
    to: process.env.My_email || process.env.MY_EMAIL || 'soumyamaiti20@gmail.com',
    subject,
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
