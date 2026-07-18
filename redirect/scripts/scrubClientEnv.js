const allowedClientEnvKeys = new Set([
  'REACT_APP_API_URL',
  'REACT_APP_WHISPER_PROXY_WS_URL',
  'REACT_APP_ENABLE_BG_REMOVER_WARMUP',
  'REACT_APP_SENTRY_DSN',
  'REACT_APP_SENTRY_ENVIRONMENT',
  'REACT_APP_SENTRY_RELEASE',
  'REACT_APP_SENTRY_TRACES_SAMPLE_RATE',
  'REACT_APP_VERSION',
  'REACT_APP_SITE_URL',
  'REACT_APP_PLATFORM_TRANSACTION_FEE',
  'REACT_APP_LIVEKIT_WS_URL',
  'REACT_APP_NATIVE_GOOGLE_REDIRECT_URI',
  'REACT_APP_NATIVE_FACEBOOK_REDIRECT_URI',
  'REACT_APP_NATIVE_TWITTER_REDIRECT_URI',
  'REACT_APP_NATIVE_LINKEDIN_REDIRECT_URI',
  'REACT_APP_NATIVE_REDIRECT_ORIGIN',
]);

const isClientEnvKey = (key) => /^REACT_APP_/i.test(key);

const scrubClientEnv = () => {
  Object.keys(process.env).forEach((key) => {
    if (isClientEnvKey(key) && !allowedClientEnvKeys.has(key)) {
      delete process.env[key];
    }
  });
};

const patchDotenvForClientEnvScrub = () => {
  const dotenv = require('dotenv');
  const loadDotenv = dotenv.config.bind(dotenv);

  dotenv.config = (...args) => {
    const result = loadDotenv(...args);
    if (result?.parsed) {
      Object.keys(result.parsed).forEach((key) => {
        if (isClientEnvKey(key) && !allowedClientEnvKeys.has(key)) {
          delete result.parsed[key];
        }
      });
    }
    scrubClientEnv();
    return result;
  };

  scrubClientEnv();
};

module.exports = {
  allowedClientEnvKeys,
  isClientEnvKey,
  patchDotenvForClientEnvScrub,
  scrubClientEnv,
};
