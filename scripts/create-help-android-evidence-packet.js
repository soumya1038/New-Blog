#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildReadiness } = require('./report-help-android-readiness');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'android-evidence');

const completionRule =
  'Do not mark the physical Android, Android OAuth, or Android permissions gates complete until current physical-device evidence exists. Emulator checks, source readiness, worksheets, and packet dry runs prepare testing, but do not replace real-phone evidence.';

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const getArgValue = (name) => {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(name);
  if (index !== -1) return args[index + 1];
  return '';
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const sanitizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const shellValue = (command) => {
  try {
    return execSync(command, { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    return 'unknown';
  }
};

const toRelative = (filePath) => path.relative(rootDir, filePath).replace(/\\/g, '/');

const formatList = (items) =>
  items && items.length > 0 ? items.map((item) => `  - ${item}`).join('\n') : '  - None recorded';

const renderCheckRows = (checks) =>
  checks
    .map((entry) => `| ${entry.area} | ${entry.label} | ${entry.source} | ${entry.passed ? 'pass' : 'fail'} |`)
    .join('\n');

const renderEvidenceRows = (items) =>
  items.map((item) => `| ${item} | pending | TBD | TBD |`).join('\n');

const renderProviderRows = () =>
  ['Google', 'Facebook', 'X/Twitter', 'LinkedIn']
    .map(
      (provider) =>
        `| ${provider} | pending | TBD | TBD | TBD | TBD | TBD | TBD |`
    )
    .join('\n');

const renderPermissionRows = () =>
  ['Camera', 'Microphone', 'Files/photos', 'Audio settings']
    .map((permission) => `| ${permission} | pending | pending | TBD | TBD |`)
    .join('\n');

const renderNavigationRows = () =>
  [
    'Install on physical phone',
    'Launch from icon to Home',
    'Home to Help to category to article',
    'Support/report/appeal form navigation',
    'Seller dashboard to store and back',
    'Order list to order detail to Help and back',
    'Add-product local-save and reopen behavior',
    'Clear storage behavior',
  ]
    .map((scenario) => `| ${scenario} | pending | TBD | TBD |`)
    .join('\n');

const renderPacket = ({ packetName, packetDate, readiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');

  return `# Android Evidence Packet - ${packetName}

Status: Draft evidence packet; not Android release approval  
Generated: ${packetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this packet to collect release-candidate evidence for the Lekhon Android app: physical device install, package identity, launch route, in-app back navigation, OAuth provider return, camera and microphone permissions, file/photo recovery, TalkBack, artifact identity, and final Android decisions.

This packet is generated from Android source readiness checks. It does not install the app, run OAuth, grant permissions, or mark Android gates complete by itself.

## 2. Release Identity

| Field | Value |
|---|---|
| Android evidence pass | ${packetName} |
| Review date | ${packetDate} |
| Branch | ${branch} |
| Commit | ${commit} |
| APK or internal test artifact | TBD |
| APK SHA-256 | TBD |
| App package | com.lekhon.app |
| Device model | TBD |
| Android version | TBD |
| Tester | TBD |
| Evidence folder | TBD |
| Cleanup owner | TBD |

## 3. Current Source Counts

| Metric | Count |
|---|---:|
| Android-related gates | ${readiness.gateCounts.androidRelated} |
| Verified local Android gates | ${readiness.gateCounts.verifiedLocalAndroid} |
| Open Android gates | ${readiness.gateCounts.openAndroid} |
| Android Help articles | ${readiness.androidArticles.length} |
| Source checks | ${readiness.sourceChecks.length} |
| Failed source checks | ${readiness.failedSourceChecks.length} |
| Remaining evidence items | ${readiness.remainingEvidence.length} |

## 4. Required Local Commands

- \`npm run help:android-readiness\` from repository root.
- \`npm run help:android-device-evidence\` from repository root after connecting the physical phone.
- \`npm run help:android-evidence -- --name <android-pass-name> --dry-run\` from repository root.
- \`npm run help:android-worksheet -- --name <android-pass-name> --dry-run\` from repository root.
- \`npm run help:gate-closure -- --json\` from repository root before promoting Android gates.
- \`npm run help:governance\` from repository root.
- \`npm run test:help -- --runInBand\` from repository root or \`redirect\`.
- \`npm run build\` from \`redirect\`.
- \`npx cap sync android\` from \`redirect\`.
- \`gradlew assembleDebug\` from \`redirect/android\` with Android Studio JBR.

## 5. Device And Package Evidence

| Check | Result | Evidence | Notes |
|---|---|---|---|
| Physical phone connected and authorized | pending | TBD | Must not be emulator-only |
| \`npm run help:android-device-evidence\` output captured | pending | TBD | Include device serial or masked serial policy |
| Installed package identity captured | pending | TBD | Package, version, target SDK |
| Runtime permission snapshot captured | pending | TBD | Camera, microphone, files/photos where available |
| App launched from installed icon | pending | TBD | Start route should be Home |

## 6. Navigation And Storage Matrix

| Scenario | Result | Evidence | Notes |
|---|---|---|---|
${renderNavigationRows()}

## 7. OAuth Provider Matrix

| Provider | Result | Start URL | Redirect URI | Provider app/browser | Final callback domain | Final app state | Evidence |
|---|---|---|---|---|---|---|---|
${renderProviderRows()}

## 8. Permission Matrix

| Permission or media flow | Allow path | Deny path | Evidence | Notes |
|---|---|---|---|---|
${renderPermissionRows()}

## 9. TalkBack And Mobile Accessibility

| Check | Result | Evidence | Notes |
|---|---|---|---|
| Help search, categories, and articles reachable | pending | TBD | Use physical phone |
| Footer accordions reachable | pending | TBD | Include mobile footer |
| Support/report/appeal success reference reachable | pending | TBD | Record reference |
| OAuth handoff does not strand focus | pending | TBD | Provider-specific |
| Permission prompts understandable | pending | TBD | Allow and deny |
| Android back focus behavior understandable | pending | TBD | Article, support form, Home |

## 10. Source Checks

| Area | Check | Source | Result |
|---|---|---|---|
${renderCheckRows(readiness.sourceChecks)}

## 11. Remaining Evidence Checklist

| Evidence item | Result | Evidence | Notes |
|---|---|---|---|
${renderEvidenceRows(readiness.remainingEvidence)}

## 12. Final Android Decision

| Decision | Result | Owner | Date | Notes |
|---|---|---|---|---|
| Approved for Android internal testing | no | Mobile + QA | ${packetDate} | Keep no until physical-device install, navigation, OAuth, permissions, and TalkBack evidence passes or has approved exceptions |
| Approved for Play Store production preparation | no | Mobile + product + legal | ${packetDate} | Debug APK evidence is not production signing evidence |
| Approved to claim Android Help guidance complete | no | Mobile + support | ${packetDate} | Keep no until Help guidance matches current verified Android behavior |

## 13. Completion Rule

${completionRule}

Local source result:

${formatList([readiness.result])}
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:android-evidence -- --name android-pass-name',
      '  npm run help:android-evidence -- --name android-pass-name --date 2026-06-28',
      '  npm run help:android-evidence -- --name android-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Android evidence pass label. Defaults to android-YYYY-MM-DD.',
      '  --date <value>   ISO date for the generated file. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated packet.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const packetDate = getArgValue('--date') || todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(packetDate)) {
    console.error(`Invalid --date value: ${packetDate}`);
    process.exit(1);
  }

  const packetName = getArgValue('--name') || `android-${packetDate}`;
  const slug = sanitizeSlug(packetName);
  if (!slug) {
    console.error('Android evidence packet name must contain at least one letter or number.');
    process.exit(1);
  }

  const readiness = buildReadiness();
  const outputPath = path.join(outputDir, `${packetDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');
  const content = renderPacket({ packetName, packetDate, readiness });

  if (dryRun) {
    console.log('Help Android evidence packet dry run passed.');
    console.log(`Target: ${toRelative(outputPath)}`);
    console.log(`Android-related gates: ${readiness.gateCounts.androidRelated}`);
    console.log(`Verified local Android gates: ${readiness.gateCounts.verifiedLocalAndroid}`);
    console.log(`Open Android gates: ${readiness.gateCounts.openAndroid}`);
    console.log(`Source checks: ${readiness.sourceChecks.length}`);
    console.log(`Failed source checks: ${readiness.failedSourceChecks.length}`);
    console.log(`Remaining evidence items: ${readiness.remainingEvidence.length}`);
    return;
  }

  if (fs.existsSync(outputPath) && !force) {
    console.error(`Refusing to overwrite existing Android evidence packet: ${toRelative(outputPath)}`);
    console.error('Use --force if this release pass should replace the existing packet.');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, content);
  console.log(`Created ${toRelative(outputPath)}`);
};

main();
