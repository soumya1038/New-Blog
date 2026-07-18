const axios = require('axios');
const { logError } = require('./safeErrorLog');
const {
  renderWelcomeEmail,
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderPasswordChangeConfirmationEmail,
  renderPasswordChangedSuccessEmail,
  renderAccountDeletionConfirmationEmail,
  renderAccountDeletedSuccessEmail,
  renderGenericNotificationEmail,
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

const parseTimeoutMs = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1000 && parsed <= 60000 ? parsed : fallback;
};

const BREVO_EMAIL_TIMEOUT_MS = parseTimeoutMs(process.env.BREVO_EMAIL_TIMEOUT_MS, 15000);
const BREVO_SMS_TIMEOUT_MS = parseTimeoutMs(process.env.BREVO_SMS_TIMEOUT_MS, 10000);

const sendEmail = async ({ to, subject, html }) => {
  console.log('[EMAIL] Sending transactional email via Brevo.');

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
        timeout: BREVO_EMAIL_TIMEOUT_MS,
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[EMAIL] Email sent successfully.');
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Email send failed.');
    logError('[EMAIL] Error:', error);
    throw new Error('Failed to send email');
  }
};

const sendSms = async ({ to, content, sender }) => {
  console.log('[SMS] Sending transactional SMS via Brevo.');

  if (!process.env.BREVO_API_KEY) {
    console.error('[SMS] Missing Brevo API key.');
    throw new Error('SMS service not configured. Please set BREVO_API_KEY.');
  }

  const smsSender = String(sender || process.env.BREVO_SMS_SENDER || 'Lekhon').trim().slice(0, 11);

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/transactionalSMS/send',
      {
        sender: smsSender,
        recipient: to,
        content,
        type: 'transactional',
        tag: 'two-factor-authentication',
      },
      {
        timeout: BREVO_SMS_TIMEOUT_MS,
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[SMS] SMS sent successfully.');
    return { success: true };
  } catch (error) {
    console.error('[SMS] SMS send failed.');
    logError('[SMS] Error:', error);
    throw new Error('Failed to send SMS');
  }
};

const sendVerificationEmail = async (email, username, verificationCode, expiresAt) => {
  console.log('[EMAIL] Queue payload: verification email.');
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
  console.log('[EMAIL] Queue payload: password reset email.');
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
  console.log('[EMAIL] Queue payload: welcome email.');
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
  console.log('[EMAIL] Queue payload: password change confirmation email.');
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
  console.log('[EMAIL] Queue payload: account deletion confirmation email.');
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
  console.log('[EMAIL] Queue payload: password changed success email.');
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
  console.log('[EMAIL] Queue payload: account deleted success email.');
  const { subject, html } = renderAccountDeletedSuccessEmail({ username });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendGenericNotificationEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Queue payload: generic notification email.');
  const { subject, html } = renderGenericNotificationEmail({
    username,
    subject: options.subject,
    headingText: options.headingText,
    message: options.message,
    details: options.details,
    actionLabel: options.actionLabel,
    actionPath: options.actionPath,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendContactEmail = async ({ userEmail, username, issue, advice }) => {
  console.log('[EMAIL] Sending contact message to admin');
  const adminEmail = process.env.SUPPORT_ADMIN_EMAIL || process.env.MY_EMAIL || process.env.My_email;
  if (!adminEmail) {
    throw new Error('Contact email recipient is not configured. Please set SUPPORT_ADMIN_EMAIL.');
  }

  const { subject, html } = renderContactAdminEmail({
    username,
    userEmail,
    issue,
    advice,
  });

  return sendEmail({
    to: adminEmail,
    subject,
    html,
  });
};

const sendNewFollowerEmail = async (email, username, options = {}) => {
  console.log('[EMAIL] Queue payload: new follower email.');
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
  console.log('[EMAIL] Queue payload: new message email.');
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
  console.log('[EMAIL] Queue payload: missed call email.');
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
  console.log('[EMAIL] Queue payload: content published email.');
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
  console.log('[EMAIL] Queue payload: new comment email.');
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
  console.log('[EMAIL] Queue payload: new reaction email.');
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
  console.log('[EMAIL] Queue payload: account warning email.');
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
  console.log('[EMAIL] Queue payload: account suspension email.');
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
  console.log('[EMAIL] Queue payload: pre-deletion warning email.');
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
  sendSms,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordChangeConfirmation,
  sendAccountDeletionConfirmation,
  sendPasswordChangedSuccess,
  sendAccountDeletedSuccess,
  sendGenericNotificationEmail,
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
