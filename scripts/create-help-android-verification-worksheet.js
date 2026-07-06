#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'android-verification');
const releaseReadinessPath = path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js');

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

const loadReleaseReadiness = () => {
  const source = fs
    .readFileSync(releaseReadinessPath, 'utf8')
    .replace(/export const /g, 'const ')
    .concat(`
globalThis.__releaseReadiness = {
  HELP_RELEASE_READINESS_GATES,
  openReleaseReadinessGates,
  verifiedLocalReleaseReadinessGates,
  RELEASE_CANDIDATE_CHECKLIST,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: releaseReadinessPath });
  return context.__releaseReadiness;
};

const formatList = (items) =>
  items && items.length > 0
    ? items.map((item) => `  - ${item}`).join('\n')
    : '  - None recorded';

const androidGateIds = [
  'android-debug-packaging-emulator',
  'physical-android-device',
  'android-oauth-provider-return',
  'android-permissions-camera-microphone',
  'manual-screen-reader-verification',
];

const renderGateWorksheet = (gate) => `### ${gate.id}

| Field | Value |
|---|---|
| Title | ${gate.title} |
| Area | ${gate.area} |
| Owner | ${gate.owner} |
| Source status | ${gate.status} |
| Protocol | ${gate.protocol} |
| Release impact | ${gate.releaseImpact} |

Required evidence:

${formatList(gate.evidence)}

Current blockers:

${formatList(gate.blockers || [])}

Reviewer result: pass / exception / blocked

Evidence links:

- 

Notes:

- 
`;

const renderProviderRows = () =>
  ['Google', 'Facebook', 'X/Twitter', 'LinkedIn']
    .map(
      (provider) => `| ${provider} | TBD | TBD | TBD | TBD | TBD | TBD | TBD | pending |`
    )
    .join('\n');

const renderPermissionRows = () =>
  ['Camera', 'Microphone', 'Files/photos', 'Audio settings']
    .map((permission) => `| ${permission} | TBD | TBD | TBD | TBD | pending |`)
    .join('\n');

const renderNavigationRows = () =>
  [
    'Install current APK or internal-test build',
    'Launch from app icon',
    'Open Home to Help to article to support form',
    'Use Android back from support form to article to Help to Home',
    'Seller dashboard to own store and back',
    'Order list to order detail to Help article and back',
    'Add-product local save before expiry',
    'Add-product local save after expiry',
    'Clear app storage warning and result',
  ]
    .map((area) => `| ${area} | TBD | pending | TBD |`)
    .join('\n');

const renderWorksheet = ({ worksheetName, worksheetDate, releaseReadiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const gates = releaseReadiness.HELP_RELEASE_READINESS_GATES.filter((gate) =>
    androidGateIds.includes(gate.id)
  );
  const openAndroidGates = gates.filter((gate) => gate.status !== 'verified-local');

  return `# Android Verification Worksheet - ${worksheetName}

Status: Draft Android verification worksheet  
Generated: ${worksheetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this worksheet to verify the Lekhon Android app on a real phone before internal testing, Play Store preparation, or any release claim that Android Help, OAuth, permissions, back navigation, and TalkBack guidance are ready.

This file is generated from \`redirect/src/content/releaseReadiness.js\` and follows \`16-android-oauth-permissions-verification-protocol.md\`. Do not mark Android gates complete from this file alone; update source gate statuses and release evidence only after current physical-device evidence exists.

## 2. Release And Device Identity

| Field | Value |
|---|---|
| Release candidate | ${worksheetName} |
| APK or internal-test build | TBD |
| APK SHA-256 | TBD |
| App id | com.lekhon.app |
| Version code / name | TBD |
| Device model | TBD |
| Android version | TBD |
| Tester | TBD |
| Test date | ${worksheetDate} |
| Frontend URL | TBD |
| Backend URL | TBD |
| Evidence folder | TBD |
| Cleanup owner | TBD |

## 3. Gate Summary

| Metric | Count |
|---|---:|
| Android-related gates | ${gates.length} |
| Open Android-related gates | ${openAndroidGates.length} |
| Verified local Android gates | ${gates.length - openAndroidGates.length} |

Open Android-related gate ids:

${formatList(openAndroidGates.map((gate) => gate.id))}

## 4. Required Local Commands Before Device Testing

- \`npm run build\` from \`redirect\`.
- \`npx cap sync android\` from \`redirect\`.
- \`gradlew assembleDebug\` from \`redirect/android\` with Android Studio JBR.
- \`apksigner verify --verbose <apk>\`.
- \`npm run help:governance\` from repository root.
- \`npm run help:android-readiness\` from repository root.
- \`npm run help:android-device-evidence\` from repository root after connecting the physical phone.
- \`npm run help:android-evidence -- --name <android-pass-name> --dry-run\` from repository root.
- \`npm run test:help -- --runInBand\` from \`redirect\`.
- \`npm run help:exceptions\` from repository root.
- \`npm run help:gate-closure -- --json\` from repository root before promoting Android gates.
- \`npm run help:goal-audit\` from repository root.

## 5. Navigation And Storage Matrix

| Check | Evidence | Result | Notes |
|---|---|---|---|
${renderNavigationRows()}

## 6. OAuth Provider Matrix

| Provider | Start route | Backend start URL | Redirect URI sent | App/browser handoff | Callback domain | Final app state | Error text | Result |
|---|---|---|---|---|---|---|---|---|
${renderProviderRows()}

## 7. Permission Matrix

| Permission | Feature path | Allow result | Deny result | Help recovery route | Result |
|---|---|---|---|---|---|
${renderPermissionRows()}

## 8. TalkBack And Mobile Accessibility

| Check | Evidence | Result | Notes |
|---|---|---|---|
| Home announces meaningful content after launch | TBD | pending | TBD |
| Help search and categories reachable | TBD | pending | TBD |
| Article workflow strips readable | TBD | pending | TBD |
| Footer accordions reachable | TBD | pending | TBD |
| Support/report/appeal forms usable | TBD | pending | TBD |
| OAuth handoff does not strand focus | TBD | pending | TBD |
| Permission prompts understandable | TBD | pending | TBD |
| Android back focus behavior understandable | TBD | pending | TBD |

## 9. Gate Worksheets

${gates.map(renderGateWorksheet).join('\n')}
## 10. Final Android Decision

Android evidence packet:

| Field | Value |
|---|---|
| Packet command | \`npm run help:android-evidence -- --name <android-pass-name>\` |
| Packet path | TBD |
| Mobile owner | TBD |
| QA owner | TBD |

| Decision | Result | Owner | Date | Notes |
|---|---|---|---|---|
| Approved for Android internal testing | no | Mobile + QA | ${worksheetDate} | Keep no until physical-device install, navigation, OAuth, permissions, and TalkBack evidence passes or has approved exceptions |
| Approved for Play Store production | no | Mobile + program owner | ${worksheetDate} | Keep no while using debug-only evidence or missing provider/permission evidence |
| Approved to claim Android Help guidance complete | no | Mobile + support | ${worksheetDate} | Keep no until Help guidance matches current verified Android behavior |

## 11. Completion Rule

Do not mark \`physical-android-device\`, \`android-oauth-provider-return\`, or \`android-permissions-camera-microphone\` complete until current physical-device evidence exists. Emulator checks and worksheet dry runs prepare testing, but do not replace real-phone evidence.
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:android-worksheet -- --name android-pass-name',
      '  npm run help:android-worksheet -- --name android-pass-name --date 2026-06-26',
      '  npm run help:android-worksheet -- --name android-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Android verification pass label. Defaults to android-YYYY-MM-DD.',
      '  --date <value>   ISO date for the generated file. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated worksheet.'
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const worksheetDate = getArgValue('--date') || todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(worksheetDate)) {
    console.error(`Invalid --date value: ${worksheetDate}`);
    process.exit(1);
  }

  const worksheetName = getArgValue('--name') || `android-${worksheetDate}`;
  const slug = sanitizeSlug(worksheetName);
  if (!slug) {
    console.error('Android worksheet name must contain at least one letter or number.');
    process.exit(1);
  }

  const releaseReadiness = loadReleaseReadiness();
  const gates = releaseReadiness.HELP_RELEASE_READINESS_GATES.filter((gate) =>
    androidGateIds.includes(gate.id)
  );
  const openAndroidGates = gates.filter((gate) => gate.status !== 'verified-local');
  const content = renderWorksheet({ worksheetName, worksheetDate, releaseReadiness });
  const outputPath = path.join(outputDir, `${worksheetDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.existsSync(outputPath) && !force) {
      console.error(`Android worksheet already exists: ${path.relative(rootDir, outputPath)}`);
      console.error('Use --force to overwrite it.');
      process.exit(1);
    }
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  console.log(dryRun ? 'Help Android worksheet dry run passed.' : 'Help Android worksheet created.');
  console.log(`Target: ${path.relative(rootDir, outputPath).replace(/\\/g, '/')}`);
  console.log(`Android-related gates: ${gates.length}`);
  console.log(`Open Android-related gates: ${openAndroidGates.length}`);
  console.log(`Verified local Android gates: ${gates.length - openAndroidGates.length}`);
  console.log(`Open gate ids: ${openAndroidGates.map((gate) => gate.id).join(', ')}`);
};

main();
