const { spawnSync } = require('child_process');
const path = require('path');
const { scrubClientEnv } = require('./scrubClientEnv');

scrubClientEnv();

const passthroughArgs = process.argv.slice(2).filter((arg) => (
  arg !== '--runInBand' &&
  arg !== '--forceExit' &&
  arg !== '--watchAll=false'
));
const vitestPackagePath = require.resolve('vitest/package.json');
const vitestBinPath = path.join(path.dirname(vitestPackagePath), require(vitestPackagePath).bin.vitest);

const result = spawnSync(
  process.execPath,
  [
    vitestBinPath,
    'run',
    'src/content/helpCenterContent.test.js',
    ...passthroughArgs,
  ],
  {
    stdio: 'inherit',
    env: process.env,
  }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
