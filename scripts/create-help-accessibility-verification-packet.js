#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildReadiness } = require('./report-help-accessibility-readiness');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'accessibility-verification');

const completionRule =
  'Do not mark the manual-screen-reader-verification gate complete until keyboard, NVDA, TalkBack, text zoom, contrast, focus restoration, reduced-motion, and Android physical-device accessibility evidence are captured from the current release candidate.';

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

const renderRouteRows = (surfaces) =>
  surfaces
    .map(
      (surface) =>
        `| ${surface} | pending | pending | pending | pending | pending | pending | TBD | TBD |`
    )
    .join('\n');

const renderCheckRows = (checks) =>
  checks
    .map((entry) => `| ${entry.area} | ${entry.label} | ${entry.source} | ${entry.passed ? 'pass' : 'fail'} |`)
    .join('\n');

const renderManualEvidenceRows = (items) =>
  items.map((item) => `| ${item} | pending | TBD | TBD |`).join('\n');

const renderPacket = ({ packetName, packetDate, readiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');

  return `# Accessibility Verification Packet - ${packetName}

Status: Draft verification packet; not an accessibility approval  
Generated: ${packetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this packet to collect manual accessibility evidence for Lekhon Help, policy, safety, support, report, appeal, footer, contextual Help, and Android WebView behavior before the manual screen-reader release gate is marked complete.

This packet is generated from the accessibility readiness source checks. It does not replace keyboard, NVDA, TalkBack, text zoom, contrast, focus restoration, reduced-motion, or physical Android testing.

## 2. Release Identity

| Field | Value |
|---|---|
| Accessibility pass | ${packetName} |
| Review date | ${packetDate} |
| Branch | ${branch} |
| Commit | ${commit} |
| Accessibility owner | TBD |
| Mobile owner | TBD |
| Evidence folder | TBD |
| Release candidate | TBD |

## 3. Current Source Counts

| Metric | Count |
|---|---:|
| Required route/workflow surfaces | ${readiness.routeSurfaces.length} |
| Source accessibility checks | ${readiness.checks.length} |
| Failed source checks | ${readiness.failedChecks.length} |
| Accessibility check areas | ${Object.keys(readiness.checksByArea).length} |
| Remaining manual evidence items | ${readiness.remainingEvidence.length} |

## 4. Required Local Commands

- \`npm run help:accessibility-environment\` from repository root before manual keyboard, NVDA, and TalkBack testing.
- \`npm run help:accessibility-readiness\` from repository root.
- \`npm run help:accessibility-verification -- --name <accessibility-pass-name> --dry-run\` from repository root.
- \`npm run help:external-worksheet -- --name <external-pass-name> --dry-run\` from repository root.
- \`npm run help:gate-closure -- --json\` from repository root before promoting the accessibility gate.
- \`npm run help:governance\` from repository root.
- \`npm run test:help -- --runInBand\` from repository root or \`redirect\`.
- \`npm run build\` from \`redirect\`.

## 5. Environment Identity

| Field | Value |
|---|---|
| Accessibility environment command | TBD |
| Desktop OS | TBD |
| Desktop browser and version | TBD |
| NVDA version | TBD |
| NVDA running during pass | yes / no |
| Android device model | TBD |
| Android version | TBD |
| App package and version | TBD |
| TalkBack package and version | TBD |
| Android font/display size | TBD |
| Tester | TBD |

## 6. Route And Workflow Manual Matrix

| Route or workflow | Keyboard | NVDA | TalkBack | Reflow/text zoom | Focus/back behavior | Result | Evidence | Issue owner |
|---|---|---|---|---|---|---|---|---|
${renderRouteRows(readiness.routeSurfaces)}

## 7. Source Accessibility Checks

| Area | Check | Source | Result |
|---|---|---|---|
${renderCheckRows(readiness.checks)}

## 8. Remaining Manual Evidence Checklist

| Evidence item | Result | Evidence | Notes |
|---|---|---|---|
${renderManualEvidenceRows(readiness.remainingEvidence)}

## 9. Critical Failure Review

| Failure type | Found | Owner | Release decision |
|---|---|---|---|
| Keyboard trap or unreachable required action | TBD | TBD | blocked / exception / fixed |
| Missing or confusing screen-reader label | TBD | TBD | blocked / exception / fixed |
| Form error or success state not announced | TBD | TBD | blocked / exception / fixed |
| Android TalkBack cannot complete Help/support flow | TBD | TBD | blocked / exception / fixed |
| Text zoom clips controls or blocks submission | TBD | TBD | blocked / exception / fixed |
| Reduced-motion preference ignored for essential motion | TBD | TBD | blocked / exception / fixed |

## 10. Final Decision

| Decision | Result | Owner | Date | Notes |
|---|---|---|---|---|
| Manual accessibility ready | no | Accessibility + mobile | ${packetDate} | Keep no until every required evidence row is complete |
| Public accessibility claim approved | no | Accessibility + legal | ${packetDate} | Keep no until D-030 and the public statement are approved |

## 11. Completion Rule

${completionRule}

Local source result:

${formatList([readiness.result])}
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:accessibility-verification -- --name accessibility-pass-name',
      '  npm run help:accessibility-verification -- --name accessibility-pass-name --date 2026-06-28',
      '  npm run help:accessibility-verification -- --name accessibility-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Accessibility verification pass label. Defaults to accessibility-YYYY-MM-DD.',
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

  const packetName = getArgValue('--name') || `accessibility-${packetDate}`;
  const slug = sanitizeSlug(packetName);
  if (!slug) {
    console.error('Accessibility verification packet name must contain at least one letter or number.');
    process.exit(1);
  }

  const readiness = buildReadiness();
  const outputPath = path.join(outputDir, `${packetDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');
  const content = renderPacket({ packetName, packetDate, readiness });

  if (dryRun) {
    console.log('Help accessibility verification packet dry run passed.');
    console.log(`Target: ${toRelative(outputPath)}`);
    console.log(`Required route/workflow surfaces: ${readiness.routeSurfaces.length}`);
    console.log(`Source accessibility checks: ${readiness.checks.length}`);
    console.log(`Failed source checks: ${readiness.failedChecks.length}`);
    console.log(`Accessibility check areas: ${Object.keys(readiness.checksByArea).length}`);
    console.log(`Remaining manual evidence items: ${readiness.remainingEvidence.length}`);
    return;
  }

  if (fs.existsSync(outputPath) && !force) {
    console.error(`Refusing to overwrite existing accessibility verification packet: ${toRelative(outputPath)}`);
    console.error('Use --force if this release pass should replace the existing packet.');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, content);
  console.log(`Created ${toRelative(outputPath)}`);
};

main();
