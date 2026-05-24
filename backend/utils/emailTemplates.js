const DEFAULT_LOGO_URL =
  'https://res.cloudinary.com/ddpdydsji/image/upload/v1769780228/ChatGPT_Image_Jan_30_2026_03_07_38_AM-photoaidcom-cropped_oq1pfz.png';
const DEFAULT_SITE_URL = 'https://lekhon-development.netlify.app';
const DEFAULT_SUPPORT_EMAIL = 'support@lekhon.app';
const DEFAULT_OTP_TTL_MS = 2 * 60 * 1000;

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeUrl = (value, fallback) => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
  } catch (error) {
    return fallback;
  }
};

const normalizeSubjectText = (value) => String(value || '').replace(/[\r\n]+/g, ' ').trim();

const buildAppUrl = (baseUrl, path = '/') => {
  const safeBase = String(baseUrl || '').replace(/\/+$/, '');
  const safePath = String(path || '/').startsWith('/') ? path : `/${path}`;
  return `${safeBase}${safePath}`;
};

const resolvePublicUrl = (baseUrl, candidatePath = '/') => {
  const candidate = String(candidatePath || '').trim();
  if (!candidate) return buildAppUrl(baseUrl, '/');
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return buildAppUrl(baseUrl, candidate);
};

const stripHtmlTags = (value = '') => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const truncateText = (value = '', maxLength = 160) => {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const getConfig = () => {
  const siteUrl = normalizeUrl(
    process.env.FRONTEND_URL_PROD || process.env.FRONTEND_URL,
    DEFAULT_SITE_URL
  );
  return {
    logoUrl: String(process.env.LOGO_URL || '').trim() || DEFAULT_LOGO_URL,
    siteUrl,
    supportEmail: String(process.env.SUPPORT_EMAIL || '').trim() || DEFAULT_SUPPORT_EMAIL,
    timeZone: String(process.env.EMAIL_TIMEZONE || '').trim() || 'UTC',
  };
};

const heading = (text) =>
  `<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:25px;color:#1a1a1a;margin:0 0 20px;font-weight:normal;line-height:1.35;">${text}</h1>`;

const paragraph = (text) =>
  `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#444;line-height:1.85;margin:0 0 16px;">${text}</p>`;

const button = (label, url) =>
  `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td style="background:#c9a227;border-radius:5px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 28px;font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;text-decoration:none;font-weight:700;letter-spacing:.4px;">${label}</a></td></tr></table>`;

const card = (inner) =>
  `<div style="border:1px solid #e8d8b0;border-radius:7px;padding:18px 22px;background:#faf8f2;margin:0 0 20px;">${inner}</div>`;

const warning = (text, tone = 'amber') => {
  const palette =
    tone === 'red'
      ? { background: '#fef2f2', border: '#dc2626', color: '#991b1b' }
      : { background: '#fffbeb', border: '#f59e0b', color: '#92400e' };
  return `<div style="border-left:4px solid ${palette.border};padding:14px 18px;background:${palette.background};margin:0 0 20px;border-radius:0 6px 6px 0;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:${palette.color};line-height:1.65;">${text}</p></div>`;
};

const signature = (name = 'The Lekhon Team') =>
  `<p style="font-family:Georgia,serif;font-size:14px;color:#999;font-style:italic;margin:28px 0 0;border-top:1px solid #e8d8b0;padding-top:20px;">Warmly,<br/><strong style="color:#1a1a1a;font-style:normal;">${name}</strong></p>`;

const formatCode = (code) => {
  const cleaned = String(code || '').replace(/\s+/g, '');
  if (/^\d{6}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return cleaned || '------';
};

const toTimestamp = (value, fallback = Date.now()) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(String(value || ''));
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
};

const resolveExpiry = (expiresAt) => {
  const numeric = Number(expiresAt);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  return Date.now() + DEFAULT_OTP_TTL_MS;
};

const formatExpiryDate = (expiresAt, timeZone) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone,
      timeZoneName: 'short',
    }).format(new Date(expiresAt));
  } catch (error) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(new Date(expiresAt));
  }
};

const formatCountdown = (expiresAt) => {
  const remainingMs = Math.max(0, expiresAt - Date.now());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const otpBlock = ({ code, expiresAt, timeZone, validityLabel = '2 minutes' }) => {
  const expiryText = formatExpiryDate(expiresAt, timeZone);
  const countdown = formatCountdown(expiresAt);
  return `<div style="background:#1a1a1a;border-radius:10px;padding:28px;text-align:center;margin:22px 0;">
    <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:10px;color:#c9a227;letter-spacing:3px;text-transform:uppercase;">Your One-Time Code</p>
    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:38px;color:#fff;letter-spacing:14px;font-weight:700;">${escapeHtml(formatCode(code))}</p>
    <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#c3c3c3;">Valid for ${escapeHtml(validityLabel)}</p>
    <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#c3c3c3;">Expires at ${escapeHtml(expiryText)}</p>
    <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#c3c3c3;">Timer at send: ${escapeHtml(countdown)}</p>
  </div>`;
};

const footer = ({ siteUrl, supportEmail }) => `
<tr>
  <td style="background-color:#faf8f2;border-top:1px solid #e8d8b0;padding:26px 40px;text-align:center;">
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center" style="margin:0 auto 16px;">
      <tr>
        <td style="padding:0 3px;"><a href="#twitter" style="display:inline-block;width:33px;height:33px;line-height:33px;border-radius:17px;background-color:#1a1a1a;color:#c9a227;text-decoration:none;font-family:Arial,sans-serif;font-size:12px;font-weight:700;text-align:center;">X</a></td>
        <td style="padding:0 3px;"><a href="#instagram" style="display:inline-block;width:33px;height:33px;line-height:33px;border-radius:17px;background-color:#1a1a1a;color:#c9a227;text-decoration:none;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-align:center;">IG</a></td>
        <td style="padding:0 3px;"><a href="#linkedin" style="display:inline-block;width:33px;height:33px;line-height:33px;border-radius:17px;background-color:#1a1a1a;color:#c9a227;text-decoration:none;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-align:center;">in</a></td>
        <td style="padding:0 3px;"><a href="#facebook" style="display:inline-block;width:33px;height:33px;line-height:33px;border-radius:17px;background-color:#1a1a1a;color:#c9a227;text-decoration:none;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-align:center;">f</a></td>
      </tr>
    </table>
    <p style="margin:0 0 5px;font-family:Georgia,'Times New Roman',serif;font-size:10px;color:#c9a227;letter-spacing:2.5px;text-transform:uppercase;">Write. Connect. Inspire.</p>
    <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">&copy; ${new Date().getFullYear()} Lekhon &middot; All rights reserved.</p>
    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">
      <a href="${escapeHtml(siteUrl)}" style="color:#c9a227;text-decoration:none;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:${escapeHtml(supportEmail)}" style="color:#c9a227;text-decoration:none;">${escapeHtml(supportEmail)}</a>
    </p>
  </td>
</tr>`;

const wrapTemplate = ({ subject, bodyHtml, config }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0ebe0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#f0ebe0;">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e8d8b0;">
        <tr>
          <td style="background-color:#1a1a1a;padding:26px 40px;text-align:center;">
            <img src="${escapeHtml(config.logoUrl)}" alt="Lekhon" height="44" style="display:block;margin:0 auto;border:0;height:44px;width:auto;"/>
          </td>
        </tr>
        <tr>
          <td height="4" bgcolor="#c9a227" style="background-color:#c9a227;height:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:36px 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr><td>${bodyHtml}</td></tr>
            </table>
          </td>
        </tr>
        ${footer(config)}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

const renderWelcomeEmail = ({ username, temporaryPassword = '' }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const safeTemporaryPassword = escapeHtml(temporaryPassword || '');
  const hasTemporaryPassword = Boolean(safeTemporaryPassword);
  const securityBlock = hasTemporaryPassword
    ? [
        heading('Important: Secure your account password'),
        paragraph(
          'You signed up using Google for the first time. We created a temporary Lekhon password for your account so that you can also access password-based security features.'
        ),
        card(`<table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0 0 8px;">
            <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:12px;color:#666;letter-spacing:1px;text-transform:uppercase;">Temporary Password</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:26px;color:#1a1a1a;letter-spacing:3px;font-weight:700;">${safeTemporaryPassword}</p>
          </td></tr>
        </table>`),
        warning(
          'For your security, please log in and change this temporary password as soon as possible from Profile -> Password & Security.'
        ),
      ].join('')
    : '';
  const body = [
    heading('Welcome to Lekhon.'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      "Your Lekhon account has been created successfully. You've joined a curated community of writers, thinkers, and storytellers who believe words have the power to connect us all."
    ),
    paragraph("Here's everything that awaits you on the platform:"),
    card(`<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:9px 0;border-bottom:1px solid #e8d8b0;">
        <p style="margin:0 0 3px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#1a1a1a;">Write and Publish</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#666;line-height:1.5;">Post text and image-based blogs. Verified members can publish full-length articles.</p>
      </td></tr>
      <tr><td style="padding:9px 0;border-bottom:1px solid #e8d8b0;">
        <p style="margin:0 0 3px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#1a1a1a;">Connect and Chat</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#666;line-height:1.5;">Follow writers you admire, send direct messages, and join group conversations.</p>
      </td></tr>
      <tr><td style="padding:9px 0;">
        <p style="margin:0 0 3px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#1a1a1a;">Call and Collaborate</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#666;line-height:1.5;">Start individual or group calls and collaborate with your community in real time.</p>
      </td></tr>
    </table>`),
    button('Explore Your Dashboard ->', buildAppUrl(config.siteUrl, '/profile')),
    securityBlock,
    paragraph(
      `Our team is always here to help - reach us at <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#c9a227;text-decoration:none;">${escapeHtml(config.supportEmail)}</a>.`
    ),
    signature(),
  ].join('');

  return {
    subject: 'Welcome to Lekhon - Write. Connect. Inspire.',
    html: wrapTemplate({ subject: 'Welcome to Lekhon - Write. Connect. Inspire.', bodyHtml: body, config }),
  };
};

const renderVerificationEmail = ({ username, code, expiresAt }) => {
  const config = getConfig();
  const expiry = resolveExpiry(expiresAt);
  const safeUsername = escapeHtml(username || 'User');
  const body = [
    heading('Verify your email address'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      'Thank you for creating a Lekhon account. To complete your registration and activate all platform features, please verify your email address using the one-time code below.'
    ),
    otpBlock({ code, expiresAt: expiry, timeZone: config.timeZone, validityLabel: '2 minutes' }),
    paragraph(
      "Enter this code on the verification page. If you did not create a Lekhon account, you can safely ignore this email - no action is required."
    ),
    warning(
      '<strong>Security notice:</strong> Never share this code with anyone. The Lekhon team will never ask for your one-time verification code.',
      'amber'
    ),
    signature(),
  ].join('');

  return {
    subject: 'Verify your Lekhon email address',
    html: wrapTemplate({ subject: 'Verify your Lekhon email address', bodyHtml: body, config }),
  };
};

const renderPasswordResetEmail = ({ username, code, expiresAt }) => {
  const config = getConfig();
  const expiry = resolveExpiry(expiresAt);
  const safeUsername = escapeHtml(username || 'User');
  const body = [
    heading('Reset your password'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      'We received a request to reset the password associated with your Lekhon account. Use the one-time code below to proceed with setting a new password.'
    ),
    otpBlock({ code, expiresAt: expiry, timeZone: config.timeZone, validityLabel: '2 minutes' }),
    warning(
      '<strong>Security notice:</strong> This code expires in 2 minutes and can only be used once. Never share it with anyone.',
      'amber'
    ),
    paragraph(
      'Return to the password reset form where you started this request, then enter the code to continue.'
    ),
    paragraph(
      "If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure."
    ),
    signature(),
  ].join('');

  return {
    subject: 'Reset your Lekhon password',
    html: wrapTemplate({ subject: 'Reset your Lekhon password', bodyHtml: body, config }),
  };
};

const renderPasswordChangeConfirmationEmail = ({ username, code, expiresAt }) => {
  const config = getConfig();
  const expiry = resolveExpiry(expiresAt);
  const safeUsername = escapeHtml(username || 'User');
  const body = [
    heading('Confirm your password change'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      "You've initiated a password change on your Lekhon account. For your security, we require two-step verification to confirm this action before the change takes effect."
    ),
    otpBlock({ code, expiresAt: expiry, timeZone: config.timeZone, validityLabel: '2 minutes' }),
    warning(
      `<strong>Didn't request this?</strong> If you did not initiate this change, your account may be at risk. Please contact us immediately at <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#92400e;text-decoration:none;">${escapeHtml(config.supportEmail)}</a>.`,
      'red'
    ),
    signature(),
  ].join('');

  return {
    subject: 'Confirm your password change - Lekhon',
    html: wrapTemplate({ subject: 'Confirm your password change - Lekhon', bodyHtml: body, config }),
  };
};

const renderPasswordChangedSuccessEmail = ({ username, changedAt }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const changedOn = formatExpiryDate(Number(changedAt) || Date.now(), config.timeZone);
  const body = [
    heading('Password changed successfully'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph('Your Lekhon account password has been successfully updated.'),
    card(`<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Date and Time</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${escapeHtml(changedOn)}</td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Account</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${safeUsername}</td></tr>
    </table>`),
    warning(
      `<strong>Wasn't you?</strong> Contact <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#92400e;text-decoration:none;">${escapeHtml(config.supportEmail)}</a> immediately to secure your account.`,
      'red'
    ),
    signature(),
  ].join('');

  return {
    subject: 'Your Lekhon password has been changed',
    html: wrapTemplate({ subject: 'Your Lekhon password has been changed', bodyHtml: body, config }),
  };
};

const renderAccountDeletionConfirmationEmail = ({ username, code, expiresAt }) => {
  const config = getConfig();
  const expiry = resolveExpiry(expiresAt);
  const safeUsername = escapeHtml(username || 'User');
  const body = [
    heading('Confirm account deletion'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      'We received a request to permanently delete your Lekhon account. This is an <strong>irreversible action</strong> - once confirmed, your account and associated content will be permanently removed.'
    ),
    paragraph('To confirm this deletion request, please enter the verification code below:'),
    otpBlock({ code, expiresAt: expiry, timeZone: config.timeZone, validityLabel: '2 minutes' }),
    card(`<p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#1a1a1a;">What this action removes:</p>
      <ul style="margin:0;padding:0 0 0 18px;font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:2.1;">
        <li>Your profile and account access</li>
        <li>Your published blogs and articles</li>
        <li>Related account notifications</li>
      </ul>`),
    warning(
      `<strong>Did not make this request?</strong> Do not enter this code. Contact us immediately at <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#92400e;text-decoration:none;">${escapeHtml(config.supportEmail)}</a>.`,
      'red'
    ),
    button('Keep My Account ->', buildAppUrl(config.siteUrl, '/profile')),
    signature(),
  ].join('');

  return {
    subject: 'Action required: Confirm your Lekhon account deletion',
    html: wrapTemplate({
      subject: 'Action required: Confirm your Lekhon account deletion',
      bodyHtml: body,
      config,
    }),
  };
};

const renderAccountDeletedSuccessEmail = ({ username }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const body = [
    heading('Account successfully deleted'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      'Your Lekhon account and associated content have been permanently removed from our systems. This process is now complete and cannot be undone.'
    ),
    paragraph(
      "We're sorry to see you go. If you ever want to return, you're always welcome to create a new account."
    ),
    button('Rejoin Lekhon ->', buildAppUrl(config.siteUrl, '/login')),
    signature(),
  ].join('');

  return {
    subject: 'Your Lekhon account has been deleted',
    html: wrapTemplate({ subject: 'Your Lekhon account has been deleted', bodyHtml: body, config }),
  };
};

const renderContactAdminEmail = ({ username, userEmail, issue, advice }) => {
  const config = getConfig();
  const usernameText = String(username || 'Unknown user').trim() || 'Unknown user';
  const safeUsername = escapeHtml(usernameText);
  const safeUserEmail = escapeHtml(userEmail || 'Not provided');
  const safeIssue = escapeHtml(issue || 'No issue details provided.');
  const safeAdvice = escapeHtml(advice || '');
  const subject = normalizeSubjectText(`Contact Message from ${usernameText} - Lekhon`);
  const body = [
    `<div style="background:#1a1a1a;border-radius:7px;padding:11px 18px;margin:0 0 22px;text-align:center;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;color:#c9a227;text-transform:uppercase;letter-spacing:2.5px;">Internal Communication - Admin Use Only</p>
    </div>`,
    heading('New contact message'),
    card(`<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">From</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${safeUsername}</td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Email</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${safeUserEmail}</td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Date / Time</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${escapeHtml(
        formatExpiryDate(Date.now(), config.timeZone)
      )}</td></tr>
    </table>`),
    `<div style="border-left:4px solid #c9a227;padding:18px 22px;background:#faf8f2;border-radius:0 7px 7px 0;margin:0 0 22px;">
      <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1.2px;">Issue</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;color:#2d2d2d;line-height:1.8;">${safeIssue}</p>
    </div>`,
    safeAdvice
      ? `<div style="border-left:4px solid #3b82f6;padding:18px 22px;background:#eff6ff;border-radius:0 7px 7px 0;margin:0 0 22px;">
      <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1.2px;">Advice / Suggestions</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;color:#2d2d2d;line-height:1.8;">${safeAdvice}</p>
    </div>`
      : '',
    button('Open Admin Dashboard ->', buildAppUrl(config.siteUrl, '/admin')),
    signature('Lekhon Contact System'),
  ].join('');

  return {
    subject,
    html: wrapTemplate({ subject, bodyHtml: body, config }),
  };
};

const renderNewFollowerEmail = ({ username, followerName, followerProfileUrl }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const followerNameText = String(followerName || 'Someone').trim() || 'Someone';
  const safeFollowerName = escapeHtml(followerNameText);
  const profileUrl = resolvePublicUrl(config.siteUrl, followerProfileUrl || '/notifications');
  const body = [
    heading('You have a new follower'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      `<strong style="color:#1a1a1a;">${safeFollowerName}</strong> just started following you on Lekhon.`
    ),
    card(
      `<p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#555;line-height:1.7;">Keep writing and sharing your work - your audience is growing.</p>`
    ),
    button(`View ${safeFollowerName}'s Profile ->`, profileUrl),
    signature(),
  ].join('');

  return {
    subject: normalizeSubjectText(`${followerNameText} started following you on Lekhon`),
    html: wrapTemplate({
      subject: normalizeSubjectText(`${followerNameText} started following you on Lekhon`),
      bodyHtml: body,
      config,
    }),
  };
};

const renderNewMessageEmail = ({ username, senderName, messagePreview, chatUrl }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const senderNameText = String(senderName || 'A user').trim() || 'A user';
  const safeSenderName = escapeHtml(senderNameText);
  const previewText = truncateText(stripHtmlTags(messagePreview || 'You received a new message.'), 160);
  const safePreview = escapeHtml(previewText);
  const safeChatUrl = resolvePublicUrl(config.siteUrl, chatUrl || '/chat');
  const body = [
    heading('New message received'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(`<strong style="color:#1a1a1a;">${safeSenderName}</strong> sent you a new message on Lekhon.`),
    card(
      `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Message Preview</p><p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#2d2d2d;line-height:1.75;">"${safePreview}"</p>`
    ),
    button('Open Chat ->', safeChatUrl),
    signature(),
  ].join('');

  return {
    subject: normalizeSubjectText(`New message from ${senderNameText} on Lekhon`),
    html: wrapTemplate({
      subject: normalizeSubjectText(`New message from ${senderNameText} on Lekhon`),
      bodyHtml: body,
      config,
    }),
  };
};

const renderMissedCallEmail = ({ username, callerName, callType, callTime }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const callerNameText = String(callerName || 'A user').trim() || 'A user';
  const safeCallerName = escapeHtml(callerNameText);
  const normalizedCallType = String(callType || 'Audio').toLowerCase() === 'video' ? 'Video' : 'Audio';
  const callTimestamp = toTimestamp(callTime, Date.now());
  const safeCallTime = escapeHtml(formatExpiryDate(callTimestamp, config.timeZone));
  const body = [
    heading('Missed call alert'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(`<strong style="color:#1a1a1a;">${safeCallerName}</strong> tried to reach you on Lekhon.`),
    card(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">${[
        `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Caller</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${safeCallerName}</td></tr>`,
        `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Call type</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${escapeHtml(normalizedCallType)}</td></tr>`,
        `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Time</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${safeCallTime}</td></tr>`,
      ].join('')}</table>`
    ),
    button('Open Chat ->', buildAppUrl(config.siteUrl, '/chat')),
    signature(),
  ].join('');

  return {
    subject: normalizeSubjectText(
      `Missed ${normalizedCallType.toLowerCase()} call from ${callerNameText} on Lekhon`
    ),
    html: wrapTemplate({
      subject: normalizeSubjectText(
        `Missed ${normalizedCallType.toLowerCase()} call from ${callerNameText} on Lekhon`
      ),
      bodyHtml: body,
      config,
    }),
  };
};

const renderContentPublishedEmail = ({ username, contentType, postTitle, postUrl }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const safeContentType = escapeHtml(String(contentType || 'content').trim() || 'content');
  const safePostTitle = escapeHtml(postTitle || 'Untitled');
  const safePostUrl = resolvePublicUrl(config.siteUrl, postUrl || '/profile');
  const body = [
    heading('Your content is now live'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(`Your ${safeContentType} has been published successfully on Lekhon.`),
    card(
      `<p style="margin:0 0 5px;font-family:Arial,sans-serif;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Published ${safeContentType}</p><p style="margin:0;font-family:Georgia,serif;font-size:19px;color:#1a1a1a;line-height:1.5;">${safePostTitle}</p>`
    ),
    button('View Published Content ->', safePostUrl),
    signature(),
  ].join('');

  return {
    subject: normalizeSubjectText(`Your ${String(contentType || 'content')} is now live on Lekhon`),
    html: wrapTemplate({
      subject: normalizeSubjectText(`Your ${String(contentType || 'content')} is now live on Lekhon`),
      bodyHtml: body,
      config,
    }),
  };
};

const renderNewCommentEmail = ({ username, commenterName, postTitle, commentText, postUrl }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const commenterNameText = String(commenterName || 'A reader').trim() || 'A reader';
  const safeCommenterName = escapeHtml(commenterNameText);
  const safePostTitle = escapeHtml(postTitle || 'your post');
  const commentPreview = truncateText(stripHtmlTags(commentText || ''), 220);
  const safeCommentPreview = escapeHtml(commentPreview || 'A new comment was posted.');
  const safePostUrl = resolvePublicUrl(config.siteUrl, postUrl || '/notifications');
  const body = [
    heading('New comment on your content'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      `<strong style="color:#1a1a1a;">${safeCommenterName}</strong> commented on "<strong style="color:#1a1a1a;">${safePostTitle}</strong>".`
    ),
    card(
      `<p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#2d2d2d;line-height:1.75;">"${safeCommentPreview}"</p>`
    ),
    button('View Comment ->', safePostUrl),
    signature(),
  ].join('');

  return {
    subject: normalizeSubjectText(`${commenterNameText} commented on your post`),
    html: wrapTemplate({
      subject: normalizeSubjectText(`${commenterNameText} commented on your post`),
      bodyHtml: body,
      config,
    }),
  };
};

const renderNewReactionEmail = ({ username, reactorName, reactionCount, postTitle, postUrl }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const safeReactorName = escapeHtml(reactorName || 'Someone');
  const count = Math.max(1, Number(reactionCount) || 1);
  const safePostTitle = escapeHtml(postTitle || 'your post');
  const safePostUrl = resolvePublicUrl(config.siteUrl, postUrl || '/notifications');
  const body = [
    heading('Your content received new reactions'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      `<strong style="color:#1a1a1a;">${safeReactorName}</strong>${count > 1 ? ` and ${count - 1} others` : ''} reacted to "<strong style="color:#1a1a1a;">${safePostTitle}</strong>".`
    ),
    card(
      `<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Total new reactions</p><p style="margin:0;font-family:Georgia,serif;font-size:42px;color:#c9a227;line-height:1.2;">${escapeHtml(String(count))}</p>`
    ),
    button('View Reactions ->', safePostUrl),
    signature(),
  ].join('');

  return {
    subject: normalizeSubjectText(`${count} new reaction${count === 1 ? '' : 's'} on your content`),
    html: wrapTemplate({
      subject: normalizeSubjectText(`${count} new reaction${count === 1 ? '' : 's'} on your content`),
      bodyHtml: body,
      config,
    }),
  };
};

const renderAccountWarningEmail = ({ username, violationReason, warningDate }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const safeReason = escapeHtml(violationReason || 'Policy violation detected');
  const timestamp = toTimestamp(warningDate, Date.now());
  const safeWarningDate = escapeHtml(formatExpiryDate(timestamp, config.timeZone));
  const body = [
    heading('Important notice regarding your account'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph('Your Lekhon account has received a warning and needs your attention.'),
    card(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">${[
        `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Reason</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${safeReason}</td></tr>`,
        `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Date</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${safeWarningDate}</td></tr>`,
      ].join('')}</table>`
    ),
    warning(
      'Please review your recent activity and avoid repeated policy violations. Repeated issues may result in temporary suspension.',
      'amber'
    ),
    button('Review Terms of Service ->', buildAppUrl(config.siteUrl, '/terms')),
    signature('The Lekhon Moderation Team'),
  ].join('');

  return {
    subject: 'Important notice regarding your Lekhon account',
    html: wrapTemplate({
      subject: 'Important notice regarding your Lekhon account',
      bodyHtml: body,
      config,
    }),
  };
};

const renderAccountSuspensionEmail = ({
  username,
  suspensionReason,
  suspensionDuration,
  reviewDate,
}) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const safeReason = escapeHtml(suspensionReason || 'Policy violation');
  const safeDuration = escapeHtml(suspensionDuration || 'temporarily');
  const safeReviewDate = escapeHtml(
    formatExpiryDate(toTimestamp(reviewDate, Date.now()), config.timeZone)
  );
  const body = [
    heading('Your account has been suspended'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      `Your Lekhon account has been suspended for <strong>${safeDuration}</strong> due to: <strong>${safeReason}</strong>.`
    ),
    card(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">${[
        `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Suspension</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${safeDuration}</td></tr>`,
        `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Review date</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${safeReviewDate}</td></tr>`,
      ].join('')}</table>`
    ),
    warning(
      `If you believe this suspension is incorrect, contact us at <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#92400e;text-decoration:none;">${escapeHtml(config.supportEmail)}</a>.`,
      'red'
    ),
    signature('The Lekhon Moderation Team'),
  ].join('');

  return {
    subject: 'Your Lekhon account has been suspended',
    html: wrapTemplate({
      subject: 'Your Lekhon account has been suspended',
      bodyHtml: body,
      config,
    }),
  };
};

const renderPreDeletionWarningEmail = ({ username, daysRemaining, deletionDate }) => {
  const config = getConfig();
  const safeUsername = escapeHtml(username || 'User');
  const remainingDays = Math.max(1, Number(daysRemaining) || 1);
  const safeDeletionDate = escapeHtml(
    formatExpiryDate(toTimestamp(deletionDate, Date.now()), config.timeZone)
  );
  const body = [
    heading('Account deletion reminder'),
    paragraph(`Dear <strong style="color:#1a1a1a;">${safeUsername}</strong>,`),
    paragraph(
      `Your account is scheduled for deletion in <strong>${escapeHtml(
        String(remainingDays)
      )} day${remainingDays === 1 ? '' : 's'}</strong>.`
    ),
    card(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">${[
        `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Days remaining</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${escapeHtml(String(remainingDays))}</td></tr>`,
        `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding:5px 0;width:130px;vertical-align:top;">Deletion date</td><td style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:5px 0;">${safeDeletionDate}</td></tr>`,
      ].join('')}</table>`
    ),
    button('Keep My Account ->', buildAppUrl(config.siteUrl, '/login')),
    paragraph('Log in before the deletion date to keep your account active.'),
    signature(),
  ].join('');

  return {
    subject: `Your Lekhon account will be deleted in ${remainingDays} day${remainingDays === 1 ? '' : 's'}`,
    html: wrapTemplate({
      subject: `Your Lekhon account will be deleted in ${remainingDays} day${remainingDays === 1 ? '' : 's'}`,
      bodyHtml: body,
      config,
    }),
  };
};

module.exports = {
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
};
