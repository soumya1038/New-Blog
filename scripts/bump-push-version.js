#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const includeOverallFlag = args.includes('--include-overall');
const requireMain = args.includes('--require-main');

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

const getCurrentBranch = () => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
  } catch (error) {
    return 'unknown';
  }
};

const currentBranch = getCurrentBranch();
const onMain = currentBranch === 'main';
const includeOverall = includeOverallFlag || onMain;

if (requireMain && !onMain) {
  console.error(`[version] This command requires main branch. Current branch: ${currentBranch}`);
  process.exit(1);
}

if (includeOverallFlag && !onMain && !requireMain) {
  console.error(
    `[version] Overall version bump is allowed only on main branch. Current branch: ${currentBranch}`
  );
  process.exit(1);
}

const components = [
  ...(includeOverall ? [{ name: 'overall', dir: rootDir }] : []),
  { name: 'backend', dir: path.join(rootDir, 'backend') },
  { name: 'redirect', dir: path.join(rootDir, 'redirect') }
];

console.log(
  `[version] Branch: ${currentBranch} | Mode: ${includeOverall ? 'overall+components' : 'components-only'}`
);

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
