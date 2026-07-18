const { maskApiKey } = require('./apiKeys');
const { normalizeHttpUrl } = require('./safeUrls');

const sanitizeOwnerProfile = (userObject = {}) => {
  const safeUser = { ...userObject };
  safeUser.linkedProviders = {
    google: Boolean(userObject?.oauthProviders?.google?.id),
    facebook: Boolean(userObject?.oauthProviders?.facebook?.id),
    twitter: Boolean(userObject?.oauthProviders?.twitter?.id),
    linkedin: Boolean(userObject?.oauthProviders?.linkedin?.id),
    telegram: Boolean(userObject?.oauthProviders?.telegram?.id),
  };
  delete safeUser.password;
  delete safeUser.verificationToken;
  delete safeUser.oauthProviders;
  delete safeUser.security;
  delete safeUser.authVersion;

  safeUser.apiKeys = Array.isArray(safeUser.apiKeys)
    ? safeUser.apiKeys.map(maskApiKey)
    : [];
  safeUser.socialMedia = Array.isArray(safeUser.socialMedia)
    ? safeUser.socialMedia
      .map((entry) => ({
        ...entry,
        url: normalizeHttpUrl(entry?.url, { maxLength: 300 }),
      }))
      .filter((entry) => entry.url)
    : [];

  if (safeUser.twoFactor?.authenticator) {
    delete safeUser.twoFactor.authenticator.secret;
    delete safeUser.twoFactor.authenticator.setupSecret;
  }
  if (safeUser.twoFactor?.sms) {
    delete safeUser.twoFactor.sms.phone;
  }

  return safeUser;
};

module.exports = {
  sanitizeOwnerProfile,
};
