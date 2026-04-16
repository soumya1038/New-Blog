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
      '  npm run release:overall -- <version> [--tag] [--push-tag]',
      '',
      'Examples:',
      '  npm run release:overall -- 1.1.0',
      '  npm run release:overall -- 1.1.0 --tag',
      '  npm run release:overall -- 1.1.0 --tag --push-tag'
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

if (!versionArg) {
  printUsage();
  process.exit(1);
}

const normalizedVersion = String(versionArg).replace(/^v/i, '');
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(normalizedVersion)) {
  console.error(`Invalid version "${versionArg}". Use semver format like 1.2.3`);
  process.exit(1);
}

if (shouldPushTag && !shouldTag) {
  console.error('--push-tag requires --tag.');
  process.exit(1);
}

const releaseTag = `v${normalizedVersion}`;

const backendPkgPath = path.join(rootDir, 'backend', 'package.json');
const redirectPkgPath = path.join(rootDir, 'redirect', 'package.json');

if (!fs.existsSync(backendPkgPath) || !fs.existsSync(redirectPkgPath)) {
  console.error('Cannot find backend/redirect package.json files.');
  process.exit(1);
}

const backendVersion = readJson(backendPkgPath).version || 'unknown';
const redirectVersion = readJson(redirectPkgPath).version || 'unknown';
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

const releaseLine = `- ${releaseTag} (${releaseDate}) - backend ${backendVersion}, redirect ${redirectVersion} - [notes](./${releaseTag}.md)\n`;
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
console.log(`Components: backend ${backendVersion}, redirect ${redirectVersion}`);

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

  const tagMessage = `${releaseTag} (backend ${backendVersion}, redirect ${redirectVersion})`;
  execSync(`git tag -a ${releaseTag} -m "${tagMessage}"`, { cwd: rootDir, stdio: 'inherit' });
  console.log(`Created git tag: ${releaseTag}`);

  if (shouldPushTag) {
    execSync(`git push origin ${releaseTag}`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`Pushed git tag: ${releaseTag}`);
  }
}
