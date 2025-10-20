// List of disposable/temporary email domains to block
const disposableDomains = [
  'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
  'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc',
  'yopmail.com', 'trashmail.com', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamail.info', 'grr.la', 'guerrillamail.biz', 'guerrillamail.de',
  'spam4.me', 'tempinbox.com', 'emailondeck.com', 'mintemail.com',
  'mytemp.email', 'mohmal.com', 'emailfake.com', 'dispostable.com',
  'throwawaymail.com', 'tempr.email', 'tempmail.net', 'guerrillamailblock.com'
];

// List of allowed major email providers
const allowedDomains = [
  // Google
  'gmail.com', 'googlemail.com',
  // Microsoft
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  // Yahoo
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.fr', 'yahoo.de',
  // Apple
  'icloud.com', 'me.com', 'mac.com',
  // Other major providers
  'aol.com', 'protonmail.com', 'proton.me', 'zoho.com', 'mail.com',
  'gmx.com', 'gmx.net', 'yandex.com', 'mail.ru'
];

const validateEmail = (email) => {
  if (!email) {
    return { valid: false, message: 'Email is required' };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return { valid: false, message: 'Invalid email format' };
  }

  // Check if domain is in disposable list
  if (disposableDomains.includes(domain)) {
    return { valid: false, message: 'Temporary/disposable email addresses are not allowed' };
  }

  // Check if domain is in allowed list
  if (!allowedDomains.includes(domain)) {
    return { valid: false, message: 'Please use a valid email from Gmail, Outlook, Yahoo, or other major providers' };
  }

  return { valid: true };
};

module.exports = { validateEmail, allowedDomains, disposableDomains };
