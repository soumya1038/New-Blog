#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildReadiness } = require('./report-help-analytics-readiness');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'analytics-approvals');

const completionRule =
  'Do not mark the analytics-consent-operations gate complete and do not ship Help production analytics until consent, retention, backend storage, access control, deletion/export handling, owner cadence, monitoring thresholds, and D-031 approval are recorded. Keep Help feedback local-only until those decisions are approved.';

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

const renderSignalRows = (signals) =>
  signals
    .map(
      (entry) =>
        `| ${entry.query} | ${entry.expectedSlug} | ${entry.actualSlug || '(no result)'} | ${
          entry.passed ? 'pass' : 'fail'
        } |`
    )
    .join('\n');

const renderCheckRows = (checks) =>
  checks
    .map((entry) => `| ${entry.area} | ${entry.label} | ${entry.source} | ${entry.passed ? 'pass' : 'fail'} |`)
    .join('\n');

const renderDecisionRows = (decisions) =>
  decisions
    .map((decision) => `| ${decision} | Privacy + analytics + operations | blocked | TBD | TBD |`)
    .join('\n');

const renderPacket = ({ packetName, packetDate, readiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');

  return `# Help Analytics Approval Packet - ${packetName}

Status: Draft approval packet; not an analytics approval  
Generated: ${packetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this packet to collect privacy, analytics, and operations approval before Lekhon ships Help search analytics, article-view analytics, helpfulness-vote aggregation, dashboards, exports, or production monitoring based on Help feedback.

This packet is generated from the analytics readiness source checks. It does not approve analytics by itself. Keep Help feedback local-only until consent, retention, storage, access control, deletion/export, owner cadence, monitoring, and D-031 approval evidence is recorded.

## 2. Release Identity

| Field | Value |
|---|---|
| Analytics approval pass | ${packetName} |
| Review date | ${packetDate} |
| Branch | ${branch} |
| Commit | ${commit} |
| Privacy owner | TBD |
| Analytics owner | TBD |
| Operations owner | TBD |
| Evidence folder | TBD |
| Release candidate | TBD |

## 3. Current Source Counts

| Metric | Count |
|---|---:|
| Critical search signals | ${readiness.searchSignalCount} |
| Passing critical search signals | ${readiness.passingSearchSignalCount} |
| Local analytics safeguard checks | ${readiness.localChecks.length} |
| Failed local analytics safeguard checks | ${readiness.failedLocalChecks.length} |
| Production decision blockers | ${readiness.productionDecisionBlockers.length} |
| Covered local check areas | ${Object.keys(readiness.checksByArea).length} |

## 4. Required Local Commands

- \`npm run help:analytics-readiness\` from repository root.
- \`npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run\` from repository root.
- \`npm run help:external-worksheet -- --name <external-pass-name> --dry-run\` from repository root.
- \`npm run help:gate-closure -- --json\` from repository root before promoting the analytics gate.
- \`npm run help:governance\` from repository root.
- \`npm run test:help -- --runInBand\` from repository root or \`redirect\`.
- \`npm run build\` from \`redirect\`.

## 5. Critical Search Signal Results

| Query | Expected guide | Actual guide | Result |
|---|---|---|---|
${renderSignalRows(readiness.signalResults)}

## 6. Local Safeguard Checks

| Area | Check | Source | Result |
|---|---|---|---|
${renderCheckRows(readiness.localChecks)}

## 7. Production Decision Matrix

| Decision | Owner | Current result | Evidence | Next action |
|---|---|---|---|---|
${renderDecisionRows(readiness.productionDecisionBlockers)}

## 8. Consent And Privacy Copy

| Check | Result | Evidence |
|---|---|---|
| Consent model selected | no | TBD |
| User-facing wording approved | no | TBD |
| Sensitive payload exclusions approved | no | TBD |
| Local-only fallback remains available | yes / no | TBD |

## 9. Storage, Retention, And Access

| Check | Result | Evidence |
|---|---|---|
| Backend storage schema approved | no | TBD |
| Aggregation level approved | no | TBD |
| Retention period approved | no | TBD |
| Dashboard or export access controls approved | no | TBD |
| Deletion/export behavior approved if account-linked | no | TBD |

## 10. Operations Cadence And Monitoring

| Check | Result | Evidence |
|---|---|---|
| Weekly zero-result review owner assigned | no | TBD |
| Low-helpfulness review owner assigned | no | TBD |
| Production monitoring threshold approved | no | TBD |
| Escalation route for stale content approved | no | TBD |

## 11. Final Decision

| Decision | Result | Owner | Date | Notes |
|---|---|---|---|---|
| Approved to ship Help production analytics | no | Privacy + analytics + operations | ${packetDate} | Keep no until every decision blocker and D-031 approval is recorded |
| Approved to keep local-only feedback live | yes | Program owner | ${packetDate} | Current Help feedback remains on the user's device |

## 12. Completion Rule

${completionRule}

Local source result:

${formatList([readiness.result])}
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:analytics-approval -- --name analytics-pass-name',
      '  npm run help:analytics-approval -- --name analytics-pass-name --date 2026-06-28',
      '  npm run help:analytics-approval -- --name analytics-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Analytics approval pass label. Defaults to analytics-YYYY-MM-DD.',
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

  const packetName = getArgValue('--name') || `analytics-${packetDate}`;
  const slug = sanitizeSlug(packetName);
  if (!slug) {
    console.error('Analytics approval packet name must contain at least one letter or number.');
    process.exit(1);
  }

  const readiness = buildReadiness();
  const outputPath = path.join(outputDir, `${packetDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');
  const content = renderPacket({ packetName, packetDate, readiness });

  if (dryRun) {
    console.log('Help analytics approval packet dry run passed.');
    console.log(`Target: ${toRelative(outputPath)}`);
    console.log(`Critical search signals: ${readiness.searchSignalCount}`);
    console.log(`Passing critical search signals: ${readiness.passingSearchSignalCount}`);
    console.log(`Local analytics safeguard checks: ${readiness.localChecks.length}`);
    console.log(`Failed local analytics safeguard checks: ${readiness.failedLocalChecks.length}`);
    console.log(`Production decision blockers: ${readiness.productionDecisionBlockers.length}`);
    return;
  }

  if (fs.existsSync(outputPath) && !force) {
    console.error(`Refusing to overwrite existing analytics approval packet: ${toRelative(outputPath)}`);
    console.error('Use --force if this release pass should replace the existing packet.');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, content);
  console.log(`Created ${toRelative(outputPath)}`);
};

main();
