#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildReadiness } = require('./report-help-visual-readiness');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'visual-evidence-packets');

const completionRule =
  'Do not mark the p0-visual-evidence-capture gate complete until every unblocked P0 visual requirement has current evidence, privacy review, accessibility text, replacement-trigger review, and owner approval. Keep blocked P0 visuals listed as release blockers unless an approved exception records the owner, risk, and next review date.';

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

const renderOpenP0Rows = (items) =>
  items
    .map(
      (item) =>
        `| ${item.id} | ${item.articleSlug} | ${item.visualType} | ${formatInline(item.platforms)} | ${item.owner} | ${item.status} | ${item.blocker || 'TBD'} | ${item.nextStep || 'TBD'} | pending |`
    )
    .join('\n');

const renderCheckRows = (checks) =>
  checks
    .map((entry) => `| ${entry.area} | ${entry.label} | ${entry.source} | ${entry.passed ? 'pass' : 'fail'} |`)
    .join('\n');

const renderOwnerRows = (owners) =>
  owners.map((owner) => `| ${owner} | pending | TBD | TBD | TBD |`).join('\n');

const renderPacket = ({ packetName, packetDate, readiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');

  return `# P0 Visual Evidence Packet - ${packetName}

Status: Draft evidence packet; not visual release approval  
Generated: ${packetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this packet to collect release-candidate evidence for P0 Help Center screenshots, clips, diagrams, screenshot sequences, workflow strips, privacy review, accessibility text, replacement-trigger review, and owner approval.

This packet is generated from \`HELP_VISUAL_REQUIREMENTS\`. It does not capture assets, approve visuals, or mark the P0 visual evidence gate complete by itself.

## 2. Release Identity

| Field | Value |
|---|---|
| Visual evidence pass | ${packetName} |
| Review date | ${packetDate} |
| Branch | ${branch} |
| Commit | ${commit} |
| QA owner | TBD |
| Mobile owner | TBD |
| Evidence folder | TBD |
| Release candidate | TBD |

## 3. Current Source Counts

| Metric | Count |
|---|---:|
| Visual requirements | ${readiness.counts.total} |
| P0 requirements | ${readiness.counts.p0} |
| Open P0 requirements | ${readiness.counts.openP0} |
| Implemented requirements | ${readiness.counts.implemented} |
| Pending requirements | ${readiness.counts.pending} |
| Blocked requirements | ${readiness.counts.blocked} |
| Failed local visual checks | ${readiness.failedLocalChecks.length} |
| Owners for open P0 requirements | ${readiness.ownersForOpenP0.length} |

## 4. Required Local Commands

- \`npm run help:visual-readiness\` from repository root.
- \`npm run help:visual-evidence -- --name <visual-pass-name> --dry-run\` from repository root.
- \`npm run help:visual-worksheet -- --name <visual-pass-name> --dry-run\` from repository root.
- \`npm run help:gate-closure -- --json\` from repository root before promoting the visual evidence gate.
- \`npm run help:governance\` from repository root.
- \`npm run test:help -- --runInBand\` from repository root or \`redirect\`.
- \`npm run build\` from \`redirect\`.

## 5. Open P0 Visual Requirements

| Requirement | Article | Type | Platforms | Owner | Source status | Blocker | Next step | Release result |
|---|---|---|---|---|---|---|---|---|
${renderOpenP0Rows(readiness.openP0Requirements)}

## 6. Owner Sign-Off Matrix

| Owner | Approval status | Reviewer | Date | Evidence |
|---|---|---|---|---|
${renderOwnerRows(readiness.ownersForOpenP0)}

## 7. Capture And Review Matrix

| Check | Result | Evidence | Notes |
|---|---|---|---|
| Current build or APK identified | pending | TBD | Must match this release candidate |
| Seeded data used | pending | TBD | No real private user data |
| Privacy review complete | pending | TBD | Email, payment, address, token, message, report, and legal data removed |
| Accessibility text complete | pending | TBD | Alt text, transcript, captions, or equivalent steps |
| Replacement triggers reviewed | pending | TBD | Route, UI label, policy, Android behavior, and data changes checked |
| Evidence files named with stable requirement ids | pending | TBD | Use protocol filename pattern |
| Blocked P0 visuals have owner/risk/next review | pending | TBD | Required if not captured |

## 8. Source Checks

| Area | Check | Source | Result |
|---|---|---|---|
${renderCheckRows(readiness.localChecks)}

## 9. Counts By Status

${formatList(Object.entries(readiness.counts.byStatus).map(([key, value]) => `${key}: ${value}`))}

## 10. Counts By Priority

${formatList(Object.entries(readiness.counts.byPriority).map(([key, value]) => `${key}: ${value}`))}

## 11. Counts By Visual Type

${formatList(Object.entries(readiness.counts.byVisualType).map(([key, value]) => `${key}: ${value}`))}

## 12. Final Decision

| Decision | Result | Owner | Date | Notes |
|---|---|---|---|---|
| P0 visuals ready for web release | no | QA + feature owners | ${packetDate} | Keep no until every unblocked P0 requirement has evidence and approval |
| P0 visuals ready for Android release | no | Mobile + QA | ${packetDate} | Physical-device visuals remain required where listed |
| Blocked P0 visuals accepted by exception | no | Program owner | ${packetDate} | Requires approved release exception with risk and next review |

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
      '  npm run help:visual-evidence -- --name visual-pass-name',
      '  npm run help:visual-evidence -- --name visual-pass-name --date 2026-06-28',
      '  npm run help:visual-evidence -- --name visual-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Visual evidence pass label. Defaults to visual-YYYY-MM-DD.',
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

  const packetName = getArgValue('--name') || `visual-${packetDate}`;
  const slug = sanitizeSlug(packetName);
  if (!slug) {
    console.error('Visual evidence packet name must contain at least one letter or number.');
    process.exit(1);
  }

  const readiness = buildReadiness();
  const outputPath = path.join(outputDir, `${packetDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');
  const content = renderPacket({ packetName, packetDate, readiness });

  if (dryRun) {
    console.log('Help visual evidence packet dry run passed.');
    console.log(`Target: ${toRelative(outputPath)}`);
    console.log(`Visual requirements: ${readiness.counts.total}`);
    console.log(`P0 requirements: ${readiness.counts.p0}`);
    console.log(`Open P0 requirements: ${readiness.counts.openP0}`);
    console.log(`Blocked requirements: ${readiness.counts.blocked}`);
    console.log(`Failed local visual checks: ${readiness.failedLocalChecks.length}`);
    console.log(`Owners for open P0 requirements: ${readiness.ownersForOpenP0.length}`);
    return;
  }

  if (fs.existsSync(outputPath) && !force) {
    console.error(`Refusing to overwrite existing visual evidence packet: ${toRelative(outputPath)}`);
    console.error('Use --force if this release pass should replace the existing packet.');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, content);
  console.log(`Created ${toRelative(outputPath)}`);
};

main();
