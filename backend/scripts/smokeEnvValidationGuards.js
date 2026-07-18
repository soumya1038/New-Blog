#!/usr/bin/env node

const assert = require('assert/strict');
const { validateEnvironment } = require('../utils/envValidation');

const secret = 'x'.repeat(40);

const baseProductionEnv = {
  NODE_ENV: 'production',
  PORT: '5000',
  MONGODB_URI: 'mongodb+srv://cluster.example.com/app',
  JWT_SECRET: secret,
  JWT_EXPIRE: '7d',
  ENCRYPTION_KEY: secret,
  API_KEY_HASH_SECRET: secret,
  VERIFICATION_CODE_PEPPER: secret,
  TWO_FACTOR_SECRET: secret,
  TEMPORARY_STATE_SECRET: secret,
  CONTENT_VIEW_HASH_SECRET: secret,
  FRONTEND_URL: 'https://app.example.com',
  PUBLIC_SITE_URL: 'https://www.example.com',
  BACKEND_PUBLIC_URL: 'https://api.example.com',
  BREVO_API_KEY: 'brevo-key',
  BREVO_FROM_EMAIL: 'no-reply@example.com',
  CLOUDINARY_CLOUD_NAME: 'cloud',
  CLOUDINARY_API_KEY: 'cloud-key',
  CLOUDINARY_API_SECRET: 'cloud-secret',
  LIVEKIT_API_KEY: 'livekit-key',
  LIVEKIT_API_SECRET: 'livekit-secret',
  LIVEKIT_WS_URL: 'wss://livekit.example.com',
  RAZORPAY_KEY_ID: 'rzp_key',
  RAZORPAY_KEY_SECRET: 'rzp_secret',
  RAZORPAY_WEBHOOK_SECRET: secret,
  REDIS_URL: 'rediss://redis.example.com:6379',
};

const expectValid = (env, label) => {
  const result = validateEnvironment({ profile: 'server', env });
  assert.equal(result.ok, true, `${label}: ${result.errors.join('; ')}`);
};

const expectError = (env, expectedMessage, label) => {
  const result = validateEnvironment({ profile: 'server', env });
  assert.equal(result.ok, false, `${label}: validation should fail`);
  assert.ok(
    result.errors.includes(expectedMessage),
    `${label}: expected "${expectedMessage}", got ${JSON.stringify(result.errors)}`
  );
};

expectValid(
  {
    ...baseProductionEnv,
    CSP_CONNECT_SRC: 'https://api2.example.com,wss://events.example.com',
    CSP_SCRIPT_SRC: "https://cdn.example.com,'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='",
  },
  'specific HTTPS/WSS CSP sources are accepted'
);

expectError(
  { ...baseProductionEnv, CSP_CONNECT_SRC: '*' },
  'CSP_CONNECT_SRC source "*" must not use wildcard sources in production',
  'wildcard CSP source is rejected'
);

expectError(
  { ...baseProductionEnv, CSP_SCRIPT_SRC: "'unsafe-inline'" },
  'CSP_SCRIPT_SRC source "\'unsafe-inline\'" must not use \'unsafe-inline\' in production',
  'unsafe inline script CSP source is rejected'
);

expectError(
  { ...baseProductionEnv, CSP_CONNECT_SRC: 'http://api.example.com' },
  'CSP_CONNECT_SRC source "http://api.example.com" must use https:// or wss:// in production',
  'plaintext HTTP CSP source is rejected'
);

expectError(
  { ...baseProductionEnv, CSP_CONNECT_SRC: 'ws://events.example.com' },
  'CSP_CONNECT_SRC source "ws://events.example.com" must use https:// or wss:// in production',
  'plaintext WebSocket CSP source is rejected'
);

expectError(
  { ...baseProductionEnv, CSP_IMG_SRC: 'data:' },
  'CSP_IMG_SRC source "data:" must not use broad or plaintext scheme sources in production',
  'broad data CSP source is rejected'
);

expectError(
  { ...baseProductionEnv, CSP_SCRIPT_SRC: 'wss://scripts.example.com' },
  'CSP_SCRIPT_SRC source "wss://scripts.example.com" must use https:// in production',
  'WSS is rejected outside connect-src'
);

expectError(
  { ...baseProductionEnv, CSP_FRAME_SRC: 'https://localhost' },
  'CSP_FRAME_SRC source "https://localhost" must not point to localhost in production',
  'localhost CSP source is rejected'
);

expectError(
  { ...baseProductionEnv, QUEUE_ENABLED: 'false' },
  'QUEUE_ENABLED must not be false in production',
  'production queues cannot silently use local fallback mode'
);

const withoutRedis = { ...baseProductionEnv };
delete withoutRedis.REDIS_URL;
expectError(
  withoutRedis,
  'REDIS_URL is required in production',
  'production queue requires Redis'
);

console.log('env validation CSP guard smoke ok');
