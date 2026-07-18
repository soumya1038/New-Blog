import api from '../services/api';

export const getTwoFactorRequirement = (error) => {
  const data = error?.response?.data;
  if (!data?.requiresTwoFactor) return null;

  return {
    action: data.action,
    actionLabel: data.actionLabel,
    twoFactor: data.twoFactor || {},
    message: data.message,
  };
};

export const getSensitiveActionRequirement = (error) => {
  const data = error?.response?.data;
  if (!data?.requiresPassword) return null;

  return {
    action: data.action,
    actionLabel: data.actionLabel,
    message: data.message,
  };
};

export const requestAuthenticatedTwoFactorChallenge = async ({ action, method }) => {
  const { data } = await api.post('/users/2fa/challenge', { action, method });
  return data;
};

export const verifyAuthenticatedTwoFactorChallenge = async ({ action, challengeId, code }) => {
  const { data } = await api.post('/users/2fa/verify', { action, challengeId, code });
  return data;
};

export const buildTwoFactorHeaders = (token) =>
  token ? { 'x-two-factor-token': token } : {};

export const buildSensitiveActionHeaders = ({ sensitiveActionToken, twoFactorToken } = {}) => ({
  ...(sensitiveActionToken ? { 'x-sensitive-action-token': sensitiveActionToken } : {}),
  ...(twoFactorToken ? { 'x-two-factor-token': twoFactorToken } : {}),
});
