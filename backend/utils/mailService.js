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
  renderNewFollowerEmail,
  renderNewMessageEmail,
  renderMissedCallEmail,
  renderContentPublishedEmail,
  renderNewCommentEmail,
  renderNewReactionEmail,
  renderAccountWarningEmail,
  renderAccountSuspensionEmail,
  renderPreDeletionWarningEmail,
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

const sendNewFollowerEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Sending new follower email to:', email);
  const { subject, html } = renderNewFollowerEmail({
    username,
    followerName: options.followerName,
    followerProfileUrl: options.followerProfileUrl,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendNewMessageEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Sending new message email to:', email);
  const { subject, html } = renderNewMessageEmail({
    username,
    senderName: options.senderName,
    messagePreview: options.messagePreview,
    chatUrl: options.chatUrl,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendMissedCallEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Sending missed call email to:', email);
  const { subject, html } = renderMissedCallEmail({
    username,
    callerName: options.callerName,
    callType: options.callType,
    callTime: options.callTime,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendContentPublishedEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Sending content published email to:', email);
  const { subject, html } = renderContentPublishedEmail({
    username,
    contentType: options.contentType,
    postTitle: options.postTitle,
    postUrl: options.postUrl,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendNewCommentEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Sending new comment email to:', email);
  const { subject, html } = renderNewCommentEmail({
    username,
    commenterName: options.commenterName,
    postTitle: options.postTitle,
    commentText: options.commentText,
    postUrl: options.postUrl,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendNewReactionEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Sending new reaction email to:', email);
  const { subject, html } = renderNewReactionEmail({
    username,
    reactorName: options.reactorName,
    reactionCount: options.reactionCount,
    postTitle: options.postTitle,
    postUrl: options.postUrl,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendAccountWarningEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Sending account warning email to:', email);
  const { subject, html } = renderAccountWarningEmail({
    username,
    violationReason: options.violationReason,
    warningDate: options.warningDate,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendAccountSuspensionEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Sending account suspension email to:', email);
  const { subject, html } = renderAccountSuspensionEmail({
    username,
    suspensionReason: options.suspensionReason,
    suspensionDuration: options.suspensionDuration,
    reviewDate: options.reviewDate,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendPreDeletionWarningEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Sending pre-deletion warning email to:', email);
  const { subject, html } = renderPreDeletionWarningEmail({
    username,
    daysRemaining: options.daysRemaining,
    deletionDate: options.deletionDate,
  });

  return sendEmail({
    to: email,
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
  sendNewFollowerEmail,
  sendNewMessageEmail,
  sendMissedCallEmail,
  sendContentPublishedEmail,
  sendNewCommentEmail,
  sendNewReactionEmail,
  sendAccountWarningEmail,
  sendAccountSuspensionEmail,
  sendPreDeletionWarningEmail,
};
