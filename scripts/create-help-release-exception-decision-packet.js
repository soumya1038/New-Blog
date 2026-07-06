#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'release-exception-decisions');
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

const toRelative = (filePath) => path.relative(rootDir, filePath).replace(/\\/g, '/');

const loadReleaseReadiness = () => {
  const source = fs
    .readFileSync(releaseReadinessPath, 'utf8')
    .replace(/export const /g, 'const ')
    .concat(`
globalThis.__releaseReadiness = {
  RELEASE_EXCEPTION_STATUSES,
  HELP_RELEASE_READINESS_GATES,
  HELP_RELEASE_EXCEPTIONS,
  approvedReleaseReadinessExceptions,
  openReleaseReadinessGates,
  openGatesWithoutApprovedExceptions,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: releaseReadinessPath });
  return context.__releaseReadiness;
};

const formatList = (items) =>
  items && items.length > 0 ? items.map((item) => `  - ${item}`).join('\n') : '  - None recorded';

const renderDecisionRows = (gates) =>
  gates
    .map(
      (gate) =>
        `| ${gate.id} | ${gate.status} | ${gate.owner} | ${gate.protocol} | pending | TBD |`
    )
    .join('\n');

const renderExceptionTemplate = (gate, packetDate) => `### ${gate.id}

| Field | Value |
|---|---|
| Gate id | ${gate.id} |
| Gate title | ${gate.title} |
| Gate status | ${gate.status} |
| Gate owner | ${gate.owner} |
| Protocol | ${gate.protocol} |
| Release impact | ${gate.releaseImpact} |
| Requested exception id | TBD |
| Requested exception status | draft / approved / rejected / expired |
| Exception owner | TBD |
| Scope | TBD |
| Risk accepted | TBD |
| Evidence links | TBD |
| Approved by | TBD |
| Approved date | ${packetDate} |
| Expires on | TBD |
| Decision record | TBD |
| Next review date | TBD |
| Final decision | approve / reject / defer |

Required gate evidence before preferring a pass over an exception:

${formatList(gate.evidence || [])}

Current blockers:

${formatList(gate.blockers || [])}

Source object to add only after approval:

\`\`\`js
{
  id: 'TBD',
  gateId: '${gate.id}',
  status: 'approved',
  owner: 'TBD',
  scope: 'TBD',
  risk: 'TBD',
  evidence: ['TBD'],
  approvedBy: 'TBD',
  approvedDate: '${packetDate}',
  expiresOn: 'TBD',
  decisionRecord: 'TBD',
  nextReviewDate: 'TBD',
}
\`\`\`
`;

const renderPacket = ({ packetName, packetDate, releaseReadiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const decisionGates = releaseReadiness.openGatesWithoutApprovedExceptions;

  return `# Help Release Exception Decision Packet - ${packetName}

Status: Draft exception decision packet; not release approval  
Generated: ${packetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this packet only when a release owner wants to request, approve, reject, or defer an exception for an open Lekhon Help Center release gate.

This packet does not approve an exception by itself. An approved exception must be recorded in \`HELP_RELEASE_EXCEPTIONS\`, validated with \`npm run help:exceptions -- --json\`, linked from \`09-release-evidence-record.md\`, and scoped to the current release claim.

## 2. Exception Summary

| Metric | Count |
|---|---:|
| Release gates | ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length} |
| Open gates | ${releaseReadiness.openReleaseReadinessGates.length} |
| Open gates without approved exceptions | ${releaseReadiness.openGatesWithoutApprovedExceptions.length} |
| Release exceptions | ${releaseReadiness.HELP_RELEASE_EXCEPTIONS.length} |
| Approved release exceptions | ${releaseReadiness.approvedReleaseReadinessExceptions.length} |

Open gates without approved exceptions:

${formatList(decisionGates.map((gate) => gate.id))}

## 3. Exception Decision Matrix

| Gate | Source status | Owner | Protocol | Decision | Decision owner |
|---|---|---|---|---|---|
${decisionGates.length > 0 ? renderDecisionRows(decisionGates) : '| None | n/a | n/a | n/a | n/a | n/a |'}

## 4. Gate Exception Worksheets

${decisionGates.length > 0 ? decisionGates.map((gate) => renderExceptionTemplate(gate, packetDate)).join('\n') : 'No exception worksheets are required.'}

## 5. Required Approved Exception Fields

Every approved exception must include:

${formatList([
  'id',
  'gateId',
  'status',
  'owner',
  'scope',
  'risk',
  'evidence',
  'approvedBy',
  'approvedDate',
  'expiresOn',
  'decisionRecord',
  'nextReviewDate',
])}

## 6. Validation And Release Evidence Updates

After an exception decision is approved:

1. Add the approved exception object to \`HELP_RELEASE_EXCEPTIONS\`.
2. Run \`npm run help:exceptions -- --json\` and confirm the exception is valid and unexpired.
3. Link this decision packet and the decision record from \`09-release-evidence-record.md\`.
4. Run \`npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD> --json\`.
5. Run \`npm run help:goal-audit -- --json\`.
6. Run \`npm run help:governance\`.

## 7. Completion Boundary

Do not mark the Help Center goal complete from this exception decision packet. Completion still requires current evidence or valid approved exceptions for every open gate, linked release evidence artifacts, source gate status updates, and a goal audit with no source gaps and no open gates without approved exceptions.
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:exception-decision -- --name exception-pass-name',
      '  npm run help:exception-decision -- --name exception-pass-name --date 2026-06-28',
      '  npm run help:exception-decision -- --name exception-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Exception packet label. Defaults to exception-decision-YYYY-MM-DD.',
      '  --date <value>   ISO date for the generated file. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated exception packet.',
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

  const packetName = getArgValue('--name') || `exception-decision-${packetDate}`;
  const slug = sanitizeSlug(packetName);
  if (!slug) {
    console.error('Release exception decision packet name must contain at least one letter or number.');
    process.exit(1);
  }

  const releaseReadiness = loadReleaseReadiness();
  const outputPath = path.join(outputDir, `${packetDate}-${slug}.md`);
  const content = renderPacket({ packetName, packetDate, releaseReadiness });
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.existsSync(outputPath) && !force) {
      console.error(`Release exception decision packet already exists: ${toRelative(outputPath)}`);
      console.error('Use --force to overwrite it.');
      process.exit(1);
    }
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  console.log(
    dryRun
      ? 'Help release exception decision packet dry run passed.'
      : 'Help release exception decision packet created.'
  );
  console.log(`Target: ${toRelative(outputPath)}`);
  console.log(`Release gates: ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length}`);
  console.log(`Open gates: ${releaseReadiness.openReleaseReadinessGates.length}`);
  console.log(
    `Open gates without approved exceptions: ${releaseReadiness.openGatesWithoutApprovedExceptions.length}`
  );
  console.log(`Release exceptions: ${releaseReadiness.HELP_RELEASE_EXCEPTIONS.length}`);
  console.log(`Approved release exceptions: ${releaseReadiness.approvedReleaseReadinessExceptions.length}`);
  console.log(
    `Open gate ids without approved exceptions: ${releaseReadiness.openGatesWithoutApprovedExceptions
      .map((gate) => gate.id)
      .join(', ')}`
  );
};

main();
