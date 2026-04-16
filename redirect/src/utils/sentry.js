import * as Sentry from '@sentry/react';

let sentryEnabled = false;

const parseSampleRate = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
};

export const initSentry = () => {
  if (sentryEnabled) return true;

  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn) {
    console.log('[sentry] REACT_APP_SENTRY_DSN not set; frontend Sentry is disabled.');
    return false;
  }

  Sentry.init({
    dsn,
    environment:
      process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release:
      process.env.REACT_APP_SENTRY_RELEASE ||
      `redirect@${process.env.REACT_APP_VERSION || process.env.npm_package_version || 'unknown'}`,
    tracesSampleRate: parseSampleRate(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE, 0.1),
    ignoreErrors: [
      'ResizeObserver loop completed with undelivered notifications.',
      'ResizeObserver loop limit exceeded'
    ]
  });

  sentryEnabled = true;
  console.log('[sentry] Frontend Sentry initialized.');
  return true;
};

export const captureFrontendException = (error, context = {}) => {
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

export const isSentryEnabled = () => sentryEnabled;
