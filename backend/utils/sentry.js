const Sentry = require('@sentry/node');

let sentryEnabled = false;
let processHandlersRegistered = false;

const parseSampleRate = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
};

const buildSentryOptions = () => ({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  release: process.env.SENTRY_RELEASE || `backend@${process.env.npm_package_version || 'unknown'}`,
  tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1)
});

const registerProcessHandlers = () => {
  if (processHandlersRegistered || !sentryEnabled) return;
  processHandlersRegistered = true;

  process.on('unhandledRejection', (reason) => {
    const normalizedError = reason instanceof Error ? reason : new Error(String(reason));
    Sentry.captureException(normalizedError);
  });

  process.on('uncaughtException', (error) => {
    Sentry.captureException(error);
  });
};

const initSentry = ({ app } = {}) => {
  if (!process.env.SENTRY_DSN) {
    sentryEnabled = false;
    console.log('[sentry] SENTRY_DSN not set; Sentry is disabled.');
    return false;
  }

  if (!sentryEnabled) {
    Sentry.init(buildSentryOptions());
    sentryEnabled = true;
    registerProcessHandlers();
    console.log('[sentry] Initialized.');
  }

  if (app) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  return true;
};

const attachSentryErrorHandler = (app) => {
  if (!sentryEnabled || !app) return;
  app.use(Sentry.Handlers.errorHandler());
};

const captureException = (error, context = {}) => {
  if (!sentryEnabled) return null;

  return Sentry.withScope((scope) => {
    const { tags, extras, user, level } = context;

    if (tags) {
      Object.entries(tags).forEach(([key, value]) => scope.setTag(key, String(value)));
    }

    if (extras) {
      Object.entries(extras).forEach(([key, value]) => scope.setExtra(key, value));
    }

    if (user) scope.setUser(user);
    if (level) scope.setLevel(level);

    return Sentry.captureException(error);
  });
};

const isSentryEnabled = () => sentryEnabled;

module.exports = {
  initSentry,
  attachSentryErrorHandler,
  captureException,
  isSentryEnabled
};
