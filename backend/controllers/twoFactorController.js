const User = require('../models/User');
const TwoFactorChallenge = require('../models/TwoFactorChallenge');
const { encrypt, decrypt } = require('../utils/encryption');
const { sendSms } = require('../utils/mailService');
const { getActiveVerificationCode } = require('../utils/verificationCodes');
const {
  ACTION_LABELS,
  CHALLENGE_TTL_MS,
  MAX_ATTEMPTS,
  buildOtpAuthUrl,
  buildTwoFactorStatus,
  completeChallengeWithToken,
  createTwoFactorChallenge,
  generateBase32Secret,
  generateSmsCode,
  getChallengeMethodsPayload,
  getPreferredMethod,
  getTwoFactorSecretForUser,
  hashChallengeCode,
  isValidSmsPhone,
  normalizeCode,
  normalizePhone,
  verifyTotp,
} = require('../utils/twoFactor');
const { logError } = require('../utils/safeErrorLog');

const TWO_FACTOR_SERVER_ERROR_MESSAGE = 'Unable to process two-factor request';

const getSafeErrorStatus = (error) => {
  const status = Number(error?.statusCode || error?.status);
  return Number.isInteger(status) && status >= 400 && status < 500 ? status : 500;
};

const sendTwoFactorError = (res, error, fallbackMessage = TWO_FACTOR_SERVER_ERROR_MESSAGE) => {
  const status = getSafeErrorStatus(error);
  if (status >= 500) {
    logError('Two-factor request failed:', error);
  }

  return res.status(status).json({
    success: false,
    message: status < 500 && error?.message ? error.message : fallbackMessage,
  });
};

const getSelectedMethod = (user, requestedMethod) => {
  const status = buildTwoFactorStatus(user);
  if (requestedMethod && status.methods.includes(requestedMethod)) return requestedMethod;
  return getPreferredMethod(user);
};

const getChallengeExpirySeconds = () => Math.floor(CHALLENGE_TTL_MS / 1000);

const sendTwoFactorSms = async ({ phone, code, actionLabel }) => {
  const content = `${code} is your Lekhon verification code to ${actionLabel}. It expires in 5 minutes.`;
  await sendSms({ to: phone, content });
};

const createStepUpChallengeForUser = async ({ user, action, requestedMethod }) => {
  const status = buildTwoFactorStatus(user);

  if (!status.enabled) {
    return {
      required: false,
      payload: {
        required: false,
        twoFactor: status,
      },
    };
  }

  const method = getSelectedMethod(user, requestedMethod);
  if (!method) {
    const error = new Error('No two-factor method is available');
    error.statusCode = 400;
    throw error;
  }

  const actionLabel = ACTION_LABELS[action] || 'continue';
  let challenge;

  if (method === 'sms') {
    const phone = normalizePhone(user?.twoFactor?.sms?.phone);
    if (!phone || !isValidSmsPhone(phone)) {
      const error = new Error('SMS two-factor is not fully configured');
      error.statusCode = 400;
      throw error;
    }

    const code = generateSmsCode();
    challenge = await createTwoFactorChallenge({
      userId: user._id,
      action,
      method,
      code,
      metadata: { phone },
    });

    await sendTwoFactorSms({ phone, code, actionLabel });
  } else {
    challenge = await createTwoFactorChallenge({
      userId: user._id,
      action,
      method,
    });
  }

  return {
    required: true,
    payload: {
      required: true,
      challengeId: challenge._id,
      action,
      actionLabel,
      method,
      expiresInSeconds: getChallengeExpirySeconds(),
      twoFactor: getChallengeMethodsPayload(user),
      message: method === 'sms'
        ? 'Verification code sent by SMS'
        : 'Enter the current code from your authenticator app',
    },
  };
};

const findActiveChallenge = async ({ userId, challengeId, action }) =>
  TwoFactorChallenge.findOne({
    _id: challengeId,
    user: userId,
    action,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('+codeHash +metadata');

const rejectChallengeAttempt = async (challenge, message = 'Invalid verification code') => {
  challenge.attempts += 1;
  if (challenge.attempts >= MAX_ATTEMPTS) {
    challenge.consumedAt = new Date();
  }
  await challenge.save();
  const error = new Error(challenge.attempts >= MAX_ATTEMPTS ? 'Too many invalid attempts. Please start again.' : message);
  error.statusCode = 400;
  throw error;
};

const verifyChallengeCode = async ({ challenge, code }) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return false;

  if (challenge.method === 'sms') {
    const expectedHash = hashChallengeCode({
      userId: challenge.user,
      action: challenge.action,
      code: normalizedCode,
    });
    return challenge.codeHash === expectedHash;
  }

  const secret = await getTwoFactorSecretForUser(challenge.user);
  return verifyTotp(normalizedCode, secret);
};

exports.getTwoFactorStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.json({
      success: true,
      twoFactor: buildTwoFactorStatus(user),
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};

exports.startAuthenticatorSetup = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFactor.authenticator.secret +twoFactor.authenticator.setupSecret');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const secret = generateBase32Secret();
    user.twoFactor = user.twoFactor || {};
    user.twoFactor.authenticator = user.twoFactor.authenticator || {};
    user.twoFactor.authenticator.secret = '';
    user.twoFactor.authenticator.setupSecret = encrypt(secret);
    user.twoFactor.authenticator.enabled = false;
    user.twoFactor.authenticator.confirmedAt = null;
    user.twoFactor.enabled = Boolean(user.twoFactor.sms?.enabled);
    user.twoFactor.preferredMethod = user.twoFactor.sms?.enabled ? 'sms' : 'authenticator';
    user.twoFactor.lastChangedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      secret,
      otpAuthUrl: buildOtpAuthUrl({
        username: user.username,
        email: user.email,
        secret,
      }),
      message: 'Scan this code with your authenticator app',
      previousAuthenticatorRemoved: true,
      twoFactor: buildTwoFactorStatus(user),
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};

exports.verifyAuthenticatorSetup = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id).select('+twoFactor.authenticator.setupSecret');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const secret = decrypt(user?.twoFactor?.authenticator?.setupSecret || '');
    if (!secret) {
      return res.status(400).json({ success: false, message: 'Start authenticator setup first' });
    }

    if (!verifyTotp(code, secret)) {
      return res.status(400).json({ success: false, message: 'Invalid authenticator code' });
    }

    user.twoFactor.authenticator.secret = encrypt(secret);
    user.twoFactor.authenticator.setupSecret = '';
    user.twoFactor.authenticator.enabled = true;
    user.twoFactor.authenticator.confirmedAt = new Date();
    user.twoFactor.enabled = true;
    user.twoFactor.preferredMethod = 'authenticator';
    user.twoFactor.lastChangedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      message: 'Authenticator app enabled',
      twoFactor: buildTwoFactorStatus(user),
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};

exports.startSmsSetup = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!isValidSmsPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid mobile number with country code',
      });
    }

    const code = generateSmsCode();
    const challenge = await createTwoFactorChallenge({
      userId: req.user._id,
      action: 'setup_sms',
      method: 'sms',
      code,
      metadata: { phone },
    });

    await sendTwoFactorSms({
      phone,
      code,
      actionLabel: 'enable SMS two-factor authentication',
    });

    return res.json({
      success: true,
      challengeId: challenge._id,
      expiresInSeconds: getChallengeExpirySeconds(),
      message: 'Verification code sent by SMS',
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};

exports.verifySmsSetup = async (req, res) => {
  try {
    const { challengeId, code } = req.body;
    const challenge = await findActiveChallenge({
      userId: req.user._id,
      challengeId,
      action: 'setup_sms',
    });

    if (!challenge || challenge.method !== 'sms') {
      return res.status(400).json({ success: false, message: 'SMS setup request expired or not found' });
    }

    const verified = await verifyChallengeCode({ challenge, code });
    if (!verified) {
      await rejectChallengeAttempt(challenge);
    }

    const phone = normalizePhone(challenge?.metadata?.phone);
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.twoFactor = user.twoFactor || {};
    user.twoFactor.sms = user.twoFactor.sms || {};
    user.twoFactor.sms.enabled = true;
    user.twoFactor.sms.phone = phone;
    user.twoFactor.sms.verifiedAt = new Date();
    user.twoFactor.enabled = true;
    if (!user.twoFactor.authenticator?.enabled) {
      user.twoFactor.preferredMethod = 'sms';
    }
    user.twoFactor.lastChangedAt = new Date();

    challenge.consumedAt = new Date();
    await Promise.all([user.save(), challenge.save()]);

    return res.json({
      success: true,
      message: 'SMS verification enabled',
      twoFactor: buildTwoFactorStatus(user),
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};

exports.setPreferredTwoFactorMethod = async (req, res) => {
  try {
    const method = String(req.body.method || '').trim();
    const user = await User.findById(req.user._id);
    const status = buildTwoFactorStatus(user);

    if (!status.methods.includes(method)) {
      return res.status(400).json({ success: false, message: 'That two-factor method is not enabled' });
    }

    user.twoFactor.preferredMethod = method;
    user.twoFactor.lastChangedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      message: 'Preferred two-factor method updated',
      twoFactor: buildTwoFactorStatus(user),
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};

exports.disableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFactor.authenticator.secret +twoFactor.authenticator.setupSecret');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.twoFactor = {
      enabled: false,
      preferredMethod: 'authenticator',
      authenticator: {
        enabled: false,
        secret: '',
        setupSecret: '',
        confirmedAt: null,
      },
      sms: {
        enabled: false,
        phone: '',
        verifiedAt: null,
      },
      lastChangedAt: new Date(),
    };
    await user.save();

    return res.json({
      success: true,
      message: 'Two-factor authentication turned off',
      twoFactor: buildTwoFactorStatus(user),
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};

exports.createTwoFactorChallenge = async (req, res) => {
  try {
    const action = String(req.body.action || '').trim();
    const method = String(req.body.method || '').trim();

    if (!ACTION_LABELS[action]) {
      return res.status(400).json({ success: false, message: 'Unsupported two-factor action' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const result = await createStepUpChallengeForUser({
      user,
      action,
      requestedMethod: method,
    });

    return res.json({
      success: true,
      ...result.payload,
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};

exports.verifyTwoFactorChallenge = async (req, res) => {
  try {
    const { challengeId } = req.body;
    const action = String(req.body.action || '').trim();
    const challenge = await findActiveChallenge({
      userId: req.user._id,
      challengeId,
      action,
    });

    if (!challenge) {
      return res.status(400).json({ success: false, message: 'Verification request expired or not found' });
    }

    const verified = await verifyChallengeCode({ challenge, code: req.body.code });
    if (!verified) {
      await rejectChallengeAttempt(challenge);
    }

    const twoFactorToken = await completeChallengeWithToken(challenge);

    return res.json({
      success: true,
      twoFactorToken,
      action,
      expiresInSeconds: 600,
      message: 'Two-factor verification complete',
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};

const getForgotPasswordSessionUser = async ({ username, email }) => {
  if (!username || !email) {
    const error = new Error('Username and email are required');
    error.statusCode = 400;
    throw error;
  }

  const verificationSession = await getActiveVerificationCode({
    email,
    type: 'forgotPassword',
    username,
    requireVerified: true,
  });
  const changeSession = await getActiveVerificationCode({
    email,
    type: 'forgotPasswordChange',
    username,
  });

  if (
    !verificationSession ||
    !changeSession
  ) {
    const error = new Error('Verify your email and request the password change first');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ username, email });
  if (!user) {
    const error = new Error('Invalid password reset session');
    error.statusCode = 400;
    throw error;
  }

  return user;
};

exports.createForgotPasswordTwoFactorChallenge = async (req, res) => {
  try {
    const user = await getForgotPasswordSessionUser(req.body);
    const result = await createStepUpChallengeForUser({
      user,
      action: 'forgot_password',
      requestedMethod: String(req.body.method || '').trim(),
    });

    return res.json({
      success: true,
      ...result.payload,
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};

exports.verifyForgotPasswordTwoFactorChallenge = async (req, res) => {
  try {
    const user = await getForgotPasswordSessionUser(req.body);
    const challenge = await findActiveChallenge({
      userId: user._id,
      challengeId: req.body.challengeId,
      action: 'forgot_password',
    });

    if (!challenge) {
      return res.status(400).json({ success: false, message: 'Verification request expired or not found' });
    }

    const verified = await verifyChallengeCode({ challenge, code: req.body.code });
    if (!verified) {
      await rejectChallengeAttempt(challenge);
    }

    const twoFactorToken = await completeChallengeWithToken(challenge);

    return res.json({
      success: true,
      twoFactorToken,
      action: 'forgot_password',
      expiresInSeconds: 600,
      message: 'Two-factor verification complete',
    });
  } catch (error) {
    return sendTwoFactorError(res, error);
  }
};
