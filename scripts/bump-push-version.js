#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const components = [
  { name: 'backend', dir: path.join(rootDir, 'backend') },
  { name: 'redirect', dir: path.join(rootDir, 'redirect') }
];

const parseSemver = (value) => {
  const match = String(value).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
};

const bumpMinorKeepPatch = (version) => {
  const parsed = parseSemver(version);
  if (!parsed) {
    throw new Error(`Unsupported version format: ${version}`);
  }
  return `${parsed.major}.${parsed.minor + 1}.${parsed.patch}`;
};

for (const component of components) {
  const pkgPath = path.join(component.dir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`Missing ${component.name} package.json`);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldVersion = pkg.version;
  const newVersion = bumpMinorKeepPatch(oldVersion);

  execSync(`npm version ${newVersion} --no-git-tag-version`, {
    cwd: component.dir,
    stdio: 'inherit'
  });

  console.log(`[version] ${component.name}: ${oldVersion} -> ${newVersion}`);
}
