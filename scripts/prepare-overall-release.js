#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'docs', 'releases');

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run release:overall -- [version] [--tag] [--push-tag]',
      '',
      'Examples:',
      '  npm run release:overall -- 1.1.12',
      '  npm run release:overall --',
      '  npm run release:overall -- 1.1.12 --tag',
      '  npm run release:overall -- 1.1.12 --tag --push-tag'
    ].join('\n')
  );
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });
const todayISO = () => new Date().toISOString().slice(0, 10);

const safeExec = (command) => execSync(command, { cwd: rootDir, stdio: 'pipe', encoding: 'utf8' }).trim();

const args = process.argv.slice(2);
const versionArg = args.find((arg) => !arg.startsWith('--'));
const shouldTag = args.includes('--tag') || args.includes('-t');
const shouldPushTag = args.includes('--push-tag');

if (shouldPushTag && !shouldTag) {
  console.error('--push-tag requires --tag.');
  process.exit(1);
}

const currentBranch = safeExec('git rev-parse --abbrev-ref HEAD');

if (shouldTag && currentBranch !== 'main') {
  console.error(
    `Tag creation is restricted to main branch. Current branch: ${currentBranch}.`
  );
  process.exit(1);
}

const backendPkgPath = path.join(rootDir, 'backend', 'package.json');
const redirectPkgPath = path.join(rootDir, 'redirect', 'package.json');
const overallPkgPath = path.join(rootDir, 'package.json');

if (!fs.existsSync(overallPkgPath) || !fs.existsSync(backendPkgPath) || !fs.existsSync(redirectPkgPath)) {
  console.error('Cannot find root/backend/redirect package.json files.');
  process.exit(1);
}

const overallVersionFromPkg = readJson(overallPkgPath).version || 'unknown';
const normalizedVersion = String(versionArg || overallVersionFromPkg).replace(/^v/i, '');
const releaseTag = `v${normalizedVersion}`;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(normalizedVersion)) {
  if (!versionArg) {
    console.error('Root package.json does not have a valid semver "version".');
  } else {
    console.error(`Invalid version "${versionArg}". Use semver format like 1.2.3`);
  }
  printUsage();
  process.exit(1);
}

const backendVersion = readJson(backendPkgPath).version || 'unknown';
const redirectVersion = readJson(redirectPkgPath).version || 'unknown';
const overallVersion = normalizedVersion;
const releaseDate = todayISO();

ensureDir(releaseDir);

const releaseNotePath = path.join(releaseDir, `${releaseTag}.md`);
if (fs.existsSync(releaseNotePath)) {
  console.error(`Release note already exists: ${path.relative(rootDir, releaseNotePath)}`);
  process.exit(1);
}

const releaseNotes = `# ${releaseTag}

Release Date: ${releaseDate}

## Component Versions
- Overall: \`${overallVersion}\`
- Backend: \`${backendVersion}\`
- Redirect: \`${redirectVersion}\`

## Highlights
- Add summary of the most important changes here.

## Technical Changes
- Backend:
  - 
- Redirect:
  - 

## Checks
- [ ] Backend smoke checks passed
- [ ] Redirect production build passed
- [ ] CI pipeline passed

## Links
- Branch: \`development\`
- Tag: \`${releaseTag}\`
`;

fs.writeFileSync(releaseNotePath, releaseNotes, 'utf8');

const releaseLogPath = path.join(releaseDir, 'RELEASE_LOG.md');
let releaseLog = '# Release Log\n\n';
if (fs.existsSync(releaseLogPath)) {
  releaseLog = fs.readFileSync(releaseLogPath, 'utf8');
  if (!releaseLog.endsWith('\n')) releaseLog += '\n';
}

const releaseLine = `- ${releaseTag} (${releaseDate}) - overall ${overallVersion}, backend ${backendVersion}, redirect ${redirectVersion} - [notes](./${releaseTag}.md)\n`;
if (!releaseLog.includes(releaseLine)) {
  if (!releaseLog.includes('\n- ')) {
    releaseLog += releaseLine;
  } else {
    const lines = releaseLog.split('\n');
    const headerEnd = lines.findIndex((line) => line.startsWith('- '));
    if (headerEnd === -1) {
      releaseLog += releaseLine;
    } else {
      lines.splice(headerEnd, 0, releaseLine.trimEnd());
      releaseLog = `${lines.join('\n')}\n`;
    }
  }
  fs.writeFileSync(releaseLogPath, releaseLog, 'utf8');
}

console.log(`Created release note: ${path.relative(rootDir, releaseNotePath)}`);
console.log(`Updated release log: ${path.relative(rootDir, releaseLogPath)}`);
console.log(`Components: overall ${overallVersion}, backend ${backendVersion}, redirect ${redirectVersion}`);
console.log(`Branch: ${currentBranch}`);

if (shouldTag) {
  let tagExists = false;
  try {
    safeExec(`git rev-parse --verify refs/tags/${releaseTag}`);
    tagExists = true;
  } catch (error) {
    tagExists = false;
  }

  if (tagExists) {
    console.error(`Tag already exists: ${releaseTag}`);
    process.exit(1);
  }

  const tagMessage = `${releaseTag} (overall ${overallVersion}, backend ${backendVersion}, redirect ${redirectVersion})`;
  execSync(`git tag -a ${releaseTag} -m "${tagMessage}"`, { cwd: rootDir, stdio: 'inherit' });
  console.log(`Created git tag: ${releaseTag}`);

  if (shouldPushTag) {
    execSync(`git push origin ${releaseTag}`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`Pushed git tag: ${releaseTag}`);
  }
}
