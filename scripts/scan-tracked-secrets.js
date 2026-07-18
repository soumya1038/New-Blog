#!/usr/bin/env node

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { allowedClientEnvKeys } = require('../redirect/scripts/scrubClientEnv');

const ROOT = path.resolve(__dirname, '..');

const SECRET_PATTERNS = [
  { name: 'private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/ },
  { name: 'OpenAI API key', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/ },
  { name: 'AWS access key id', pattern: /\b(A3T[A-Z0-9]|AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/ },
  { name: 'Brevo API key', pattern: /\bxkeysib-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Stripe secret key', pattern: /\bsk_(?:live|test)_[0-9A-Za-z]{20,}\b/ },
];

const ALLOWED_ENV_FILES = new Set([
  'backend/.env.example',
  'redirect/.env.example',
  'redirect/.env.production',
]);

const EXPECTED_PUBLIC_REACT_ENV_KEYS = allowedClientEnvKeys;

const getTrackedFiles = () => {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'buffer',
  });
  return output
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((file) => file.replace(/\\/g, '/'));
};

const isLikelyBinary = (buffer) => buffer.includes(0);

const isEnvFile = (file) => /(^|\/)\.env(\.|$)/.test(file);

const lineColumnForIndex = (text, index) => {
  const before = text.slice(0, index);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
};

const validateTrackedEnvFile = (file, text, findings) => {
  if (!isEnvFile(file)) return;
  if (!ALLOWED_ENV_FILES.has(file)) {
    findings.push({
      file,
      line: 1,
      column: 1,
      type: 'tracked env file',
      detail: 'raw env files must stay ignored; commit an example file instead',
    });
    return;
  }

  if (file !== 'redirect/.env.production') return;

  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    const [, key, value] = match;
    if (!EXPECTED_PUBLIC_REACT_ENV_KEYS.has(key)) {
      findings.push({
        file,
        line: index + 1,
        column: 1,
        type: 'unexpected production React env key',
        detail: key,
      });
      return;
    }
    if (value && !/^https?:\/\//.test(value)) {
      findings.push({
        file,
        line: index + 1,
        column: line.indexOf('=') + 2,
        type: 'unexpected production React env value',
        detail: `${key} must remain a public URL`,
      });
    }
  });
};

const scanFile = (file, findings) => {
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute)) return;
  const buffer = fs.readFileSync(absolute);
  if (isLikelyBinary(buffer)) return;

  const text = buffer.toString('utf8');
  validateTrackedEnvFile(file, text, findings);

  SECRET_PATTERNS.forEach(({ name, pattern }) => {
    const regex = new RegExp(pattern.source, 'g');
    let match;
    while ((match = regex.exec(text))) {
      const location = lineColumnForIndex(text, match.index);
      findings.push({
        file,
        line: location.line,
        column: location.column,
        type: name,
        detail: 'high-confidence secret pattern',
      });
    }
  });
};

const main = () => {
  const findings = [];
  getTrackedFiles().forEach((file) => scanFile(file, findings));

  if (findings.length) {
    console.error('Tracked secret scan failed:');
    findings.forEach((finding) => {
      console.error(
        `- ${finding.file}:${finding.line}:${finding.column} ${finding.type} (${finding.detail})`
      );
    });
    process.exit(1);
  }

  console.log('Tracked secret scan passed.');
};

main();
