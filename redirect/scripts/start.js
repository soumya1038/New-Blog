const { spawnSync } = require('child_process');
const path = require('path');
const { scrubClientEnv } = require('./scrubClientEnv');

scrubClientEnv();

const vitePackagePath = require.resolve('vite/package.json');
const viteBinPath = path.join(path.dirname(vitePackagePath), require(vitePackagePath).bin.vite);

const result = spawnSync(
  process.execPath,
  [viteBinPath, '--host', '0.0.0.0', ...process.argv.slice(2)],
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
