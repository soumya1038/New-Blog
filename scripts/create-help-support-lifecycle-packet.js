#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildReadiness } = require('./report-help-support-readiness');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'support-lifecycle');

const completionRule =
  'Do not mark the live-support-report-appeal-lifecycle gate complete until support, report, appeal, admin queue, metrics, assignment, status, priority, notes, resolution, dry-run cleanup audit, and cleanup evidence are captured from the current release candidate.';

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

const formatInline = (items) => (items && items.length > 0 ? items.join(', ') : 'None recorded');

const formatList = (items) =>
  items && items.length > 0 ? items.map((item) => `  - ${item}`).join('\n') : '  - None recorded';

const renderRouteRows = (routes) =>
  routes
    .map(
      (entry) =>
        `| ${entry.type} | ${entry.route} | ${entry.mode} | ${entry.categories} | QA-CLEANUP ${todayISO()} - ${entry.type} | pending | TBD | TBD |`
    )
    .join('\n');

const renderCheckRows = (checks) =>
  checks.map((entry) => `| ${entry.label} | ${entry.passed ? 'pass' : 'fail'} | TBD |`).join('\n');

const renderMetricRows = (checks) =>
  checks.map((entry) => `| ${entry.label} | ${entry.passed ? 'source present' : 'missing'} | pending | TBD |`).join('\n');

const renderLiveEvidenceRows = (items) =>
  items.map((item) => `| ${item} | pending | TBD | TBD |`).join('\n');

const renderPacket = ({ packetName, packetDate, readiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const localCheckCount =
    readiness.routeChecks.length +
    readiness.lifecycleChecks.length +
    readiness.metricChecks.length +
    readiness.modelChecks.length;

  return `# Support Lifecycle Verification Packet - ${packetName}

Status: Draft verification packet; not live lifecycle approval  
Generated: ${packetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this packet to collect current release-candidate evidence for Lekhon contact support, safety reports, appeals, admin triage, admin metrics, status updates, priority updates, assignment, admin notes, resolution, and cleanup.

This packet is generated from the support readiness source checks. It does not submit support records, approve cleanup, or mark the live support lifecycle gate complete by itself.

## 2. Release Identity

| Field | Value |
|---|---|
| Support lifecycle pass | ${packetName} |
| Review date | ${packetDate} |
| Branch | ${branch} |
| Commit | ${commit} |
| Frontend URL | TBD |
| Backend URL | TBD |
| Support operations owner | TBD |
| Safety owner | TBD |
| Cleanup owner | TBD |
| Evidence folder | TBD |
| Release candidate | TBD |

## 3. Current Source Counts

| Metric | Count |
|---|---:|
| Public support routes | ${readiness.publicRoutes.length} |
| Contact categories | ${readiness.categoryCounts.contact} |
| Report categories | ${readiness.categoryCounts.report} |
| Appeal categories | ${readiness.categoryCounts.appeal} |
| Backend request types | ${readiness.backendTypes.length} |
| Status values | ${readiness.statuses.controller.length} |
| Priority values | ${readiness.priorities.length} |
| Local source checks | ${localCheckCount} |
| Cleanup checks | ${readiness.cleanupChecks.length} |
| Failed source checks | ${readiness.failedChecks.length} |
| Remaining live evidence items | ${readiness.remainingEvidence.length} |

## 4. Required Local Commands

- \`npm run help:support-readiness\` from repository root.
- \`npm run help:support-cleanup\` from repository root before live lifecycle testing.
- \`npm run help:support-lifecycle -- --name <support-pass-name> --dry-run\` from repository root.
- \`npm run help:external-worksheet -- --name <external-pass-name> --dry-run\` from repository root.
- \`npm run help:gate-closure -- --json\` from repository root before promoting the support lifecycle gate.
- \`npm run help:governance\` from repository root.
- \`npm run test:help -- --runInBand\` from repository root or \`redirect\`.
- \`node --check backend/controllers/supportController.js\`.
- \`node --check backend/routes/supportRoutes.js\`.
- \`node --check backend/models/SupportRequest.js\`.

## 5. Pre-Submission Safety

Do not create production-like support, report, or appeal records until all fields below are filled.

| Field | Value |
|---|---|
| Environment approved for test records | no |
| Subject prefix | QA-CLEANUP ${packetDate} - <workflow> |
| Test account or email | TBD |
| Admin owner | TBD |
| Cleanup method | TBD |
| Cleanup deadline | TBD |
| Sensitive-data warning reviewed | no |

## 6. Submission Matrix

| Type | Route | Mode | Categories in source | Subject prefix | Reference number | Public evidence | Admin queue evidence |
|---|---|---|---:|---|---|---|---|
${renderRouteRows(readiness.publicRoutes)}

## 7. Admin Operations Matrix

| Operation | Source result | Live result | Evidence |
|---|---|---|---|
${renderCheckRows(readiness.lifecycleChecks)}

## 8. Metrics Matrix

| Metric | Source result | Live result | Evidence |
|---|---|---|---|
${renderMetricRows(readiness.metricChecks)}

## 9. Model And Cleanup Safeguards

| Check | Source result | Evidence |
|---|---|---|
${renderCheckRows([...readiness.modelChecks, ...readiness.cleanupChecks])}

## 10. Remaining Live Evidence Checklist

| Evidence item | Result | Evidence | Notes |
|---|---|---|---|
${renderLiveEvidenceRows(readiness.remainingEvidence)}

## 11. Cleanup Record

| Cleanup check | Result | Evidence |
|---|---|---|
| Pre-test cleanup dry-run captured | pending | TBD |
| Matched records limited to intended QA-CLEANUP prefix | pending | TBD |
| Cleanup method completed | pending | TBD |
| Post-test cleanup dry-run captured | pending | TBD |
| Unexpected records found | pending | TBD |

## 12. Final Decision

| Decision | Result | Owner | Date | Notes |
|---|---|---|---|---|
| Support lifecycle ready | no | Support operations + Safety | ${packetDate} | Keep no until submissions, admin triage, metrics, and cleanup evidence exist |
| Test data cleanup complete | no | Cleanup owner | ${packetDate} | Keep no until pre/post cleanup audit is captured |

## 13. Source Summary

- Backend request types: ${formatInline(readiness.backendTypes)}
- Status values: ${formatInline(readiness.statuses.controller)}
- Priority values: ${formatInline(readiness.priorities)}

Priority rules:

${formatList([
  `urgent: ${formatInline(readiness.priorityRules.urgent)}`,
  `high: ${formatInline(readiness.priorityRules.high)}`,
  `normal: ${formatInline(readiness.priorityRules.normal)}`,
])}

## 14. Completion Rule

${completionRule}

Local source result:

${formatList([readiness.result])}
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:support-lifecycle -- --name support-pass-name',
      '  npm run help:support-lifecycle -- --name support-pass-name --date 2026-06-28',
      '  npm run help:support-lifecycle -- --name support-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Support lifecycle pass label. Defaults to support-YYYY-MM-DD.',
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

  const packetName = getArgValue('--name') || `support-${packetDate}`;
  const slug = sanitizeSlug(packetName);
  if (!slug) {
    console.error('Support lifecycle packet name must contain at least one letter or number.');
    process.exit(1);
  }

  const readiness = buildReadiness();
  const outputPath = path.join(outputDir, `${packetDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');
  const content = renderPacket({ packetName, packetDate, readiness });
  const localCheckCount =
    readiness.routeChecks.length +
    readiness.lifecycleChecks.length +
    readiness.metricChecks.length +
    readiness.modelChecks.length;

  if (dryRun) {
    console.log('Help support lifecycle packet dry run passed.');
    console.log(`Target: ${toRelative(outputPath)}`);
    console.log(`Public support routes: ${readiness.publicRoutes.length}`);
    console.log(`Local source checks: ${localCheckCount}`);
    console.log(`Cleanup checks: ${readiness.cleanupChecks.length}`);
    console.log(`Failed source checks: ${readiness.failedChecks.length}`);
    console.log(`Remaining live evidence items: ${readiness.remainingEvidence.length}`);
    return;
  }

  if (fs.existsSync(outputPath) && !force) {
    console.error(`Refusing to overwrite existing support lifecycle packet: ${toRelative(outputPath)}`);
    console.error('Use --force if this release pass should replace the existing packet.');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, content);
  console.log(`Created ${toRelative(outputPath)}`);
};

main();
