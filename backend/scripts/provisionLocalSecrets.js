#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');
const REQUIRED_SECRETS = [
  'ENCRYPTION_KEY',
  'API_KEY_HASH_SECRET',
  'VERIFICATION_CODE_PEPPER',
  'TWO_FACTOR_SECRET',
  'TEMPORARY_STATE_SECRET',
];
const MIN_SECRET_LENGTH = 32;

const parseEnv = (content) => {
  const values = new Map();
  content.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    values.set(match[1], match[2].trim().replace(/^['"]|['"]$/g, ''));
  });
  return values;
};

const createSecret = () => crypto.randomBytes(48).toString('base64url');

const main = () => {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing ${envPath}. Create backend/.env before provisioning local secrets.`);
  }

  const original = fs.readFileSync(envPath, 'utf8');
  const values = parseEnv(original);
  const additions = [];
  const weakExisting = [];

  REQUIRED_SECRETS.forEach((key) => {
    const existing = values.get(key);
    if (existing) {
      if (existing.length < MIN_SECRET_LENGTH) weakExisting.push(key);
      return;
    }

    if (key === 'ENCRYPTION_KEY') {
      const legacySecret = values.get('SECRET_KEY');
      if (legacySecret && legacySecret.length >= MIN_SECRET_LENGTH) {
        additions.push(`${key}=${legacySecret}`);
        return;
      }
    }

    additions.push(`${key}=${createSecret()}`);
  });

  if (weakExisting.length) {
    throw new Error(
      `Refusing to overwrite weak existing secret(s): ${weakExisting.join(', ')}. Rotate them manually.`
    );
  }

  if (!additions.length) {
    console.log('Local secret provisioning skipped: all required keys already exist.');
    return;
  }

  const separator = original.endsWith('\n') ? '' : '\n';
  const block = [
    '',
    '# Provisioned local-only secrets. Keep this file ignored and never commit it.',
    ...additions,
    '',
  ].join('\n');
  fs.writeFileSync(envPath, `${original}${separator}${block}`);
  console.log(`Local secret provisioning complete: added ${additions.length} missing key(s).`);
};

main();
