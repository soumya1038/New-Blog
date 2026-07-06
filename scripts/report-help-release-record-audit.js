#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const releaseEvidencePath = path.join(planningDir, '09-release-evidence-record.md');
const releaseReadinessPath = path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js');

const args = process.argv.slice(2);

const requiredCommandTokens = [
  'help:release-pass-checklist',
  'help:release-evidence-binder',
  'help:release-evidence-status',
  'help:release-candidate',
  'help:coverage-approval',
  'help:gate-closure',
  'help:exceptions',
  'help:exception-decision',
  'help:goal-audit',
  'help:open-gate-handoff',
  'help:open-gate-owners',
  'help:android-evidence',
  'help:android-worksheet',
  'help:accessibility-verification',
  'help:external-worksheet',
  'help:support-lifecycle',
  'help:policy-approval',
  'help:visual-evidence',
  'help:visual-worksheet',
  'help:analytics-approval',
];

const requiredArtifactFolders = [
  'release-pass-checklists',
  'release-evidence-binders',
  'release-candidates',
  'coverage-approvals',
  'open-gate-owner-handoffs',
  'release-exception-decisions',
  'android-evidence',
  'android-verification',
  'accessibility-verification',
  'external-verification',
  'support-lifecycle',
  'policy-approvals',
  'visual-evidence-packets',
  'visual-evidence',
  'analytics-approvals',
];

const requiredBoundaryTokens = [
  'Do not mark the overall Help Center objective complete',
  'Do not treat the release evidence record as final',
  'pending-external',
  'blocked-approval',
  'blocked-production',
];

const hasFlag = (flag) => args.includes(flag);

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
  approvedReleaseReadinessExceptions,
  openReleaseReadinessGates,
  verifiedLocalReleaseReadinessGates,
  openGatesWithoutApprovedExceptions,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: releaseReadinessPath });
  return context.__releaseReadiness;
};

const countMatches = (text, pattern) => {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
};

const linesMatching = (text, pattern) =>
  text
    .split(/\r?\n/)
    .map((line, index) => ({ lineNumber: index + 1, text: line }))
    .filter(({ text: line }) => pattern.test(line));

const buildAudit = ({ releaseReadiness }) => {
  const exists = fs.existsSync(releaseEvidencePath);
  const releaseEvidence = exists ? fs.readFileSync(releaseEvidencePath, 'utf8') : '';
  const openGateIds = releaseReadiness.openReleaseReadinessGates.map((gate) => gate.id);
  const openGateIdsWithoutApprovedExceptions = releaseReadiness.openGatesWithoutApprovedExceptions.map(
    (gate) => gate.id
  );
  const placeholderTbd = countMatches(releaseEvidence, /\bTBD\b/g);
  const pendingRows = linesMatching(releaseEvidence, /\|\s*Pending\s*\|/);
  const missingCommandTokens = requiredCommandTokens.filter((token) => !releaseEvidence.includes(token));
  const missingArtifactFolders = requiredArtifactFolders.filter((folder) => !releaseEvidence.includes(folder));
  const missingOpenGateIds = openGateIds.filter((gateId) => !releaseEvidence.includes(gateId));
  const missingBoundaryTokens = requiredBoundaryTokens.filter((token) => !releaseEvidence.includes(token));
  const draftProblemCount = placeholderTbd + pendingRows.length;
  const missingCoverageCount =
    missingCommandTokens.length +
    missingArtifactFolders.length +
    missingOpenGateIds.length +
    missingBoundaryTokens.length;
  const result = !exists
    ? 'release evidence record missing'
    : draftProblemCount > 0
      ? 'release evidence record still draft'
      : missingCoverageCount > 0
        ? 'release evidence record missing required coverage'
        : openGateIdsWithoutApprovedExceptions.length > 0
          ? 'release evidence record has current blockers'
          : 'release evidence record complete candidate';

  return {
    result,
    exists,
    releaseEvidencePath: path.relative(rootDir, releaseEvidencePath).replace(/\\/g, '/'),
    counts: {
      placeholderTbd,
      pendingRows: pendingRows.length,
      missingCommandTokens: missingCommandTokens.length,
      missingArtifactFolders: missingArtifactFolders.length,
      missingOpenGateIds: missingOpenGateIds.length,
      missingBoundaryTokens: missingBoundaryTokens.length,
      releaseGates: releaseReadiness.HELP_RELEASE_READINESS_GATES.length,
      verifiedLocalReleaseReadinessGates: releaseReadiness.verifiedLocalReleaseReadinessGates.length,
      openReleaseReadinessGates: releaseReadiness.openReleaseReadinessGates.length,
      openGatesWithoutApprovedExceptions: openGateIdsWithoutApprovedExceptions.length,
      approvedExceptions: releaseReadiness.approvedReleaseReadinessExceptions.length,
    },
    pendingRows: pendingRows.slice(0, 20),
    missingCommandTokens,
    missingArtifactFolders,
    missingOpenGateIds,
    missingBoundaryTokens,
    openGateIds,
    openGateIdsWithoutApprovedExceptions,
  };
};

const formatList = (items) =>
  items && items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None';

const formatPendingRows = (rows) =>
  rows.length > 0
    ? rows.map((row) => `- Line ${row.lineNumber}: ${row.text}`).join('\n')
    : '- None';

const renderMarkdown = ({ branch, commit, audit }) => `# Lekhon Release Evidence Record Audit

Branch: ${branch}
Commit: ${commit}
Result: ${audit.result}
Record: ${audit.releaseEvidencePath}

## Counts

- TBD placeholders: ${audit.counts.placeholderTbd}
- Pending table rows: ${audit.counts.pendingRows}
- Missing command tokens: ${audit.counts.missingCommandTokens}
- Missing artifact folders: ${audit.counts.missingArtifactFolders}
- Missing open gate ids: ${audit.counts.missingOpenGateIds}
- Missing boundary tokens: ${audit.counts.missingBoundaryTokens}
- Release gates: ${audit.counts.releaseGates}
- Verified local gates: ${audit.counts.verifiedLocalReleaseReadinessGates}
- Open gates: ${audit.counts.openReleaseReadinessGates}
- Open gates without approved exceptions: ${audit.counts.openGatesWithoutApprovedExceptions}
- Approved exceptions: ${audit.counts.approvedExceptions}

## Draft Indicators

Pending rows are capped to the first 20 entries in this report.

${formatPendingRows(audit.pendingRows)}

## Missing Command Tokens

${formatList(audit.missingCommandTokens)}

## Missing Artifact Folders

${formatList(audit.missingArtifactFolders)}

## Missing Open Gate IDs

${formatList(audit.missingOpenGateIds)}

## Missing Boundary Tokens

${formatList(audit.missingBoundaryTokens)}

## Open Gates Without Approved Exceptions

${formatList(audit.openGateIdsWithoutApprovedExceptions)}

## Completion Rule

Do not treat the release evidence record as final while this audit reports placeholders, pending rows, missing command coverage, missing artifact folders, missing open gate ids, missing completion boundary text, or open gates without approved exceptions.
`;

const renderJson = ({ branch, commit, audit }) =>
  JSON.stringify(
    {
      branch,
      commit,
      result: audit.result,
      counts: audit.counts,
      record: audit.releaseEvidencePath,
      pendingRows: audit.pendingRows,
      missingCommandTokens: audit.missingCommandTokens,
      missingArtifactFolders: audit.missingArtifactFolders,
      missingOpenGateIds: audit.missingOpenGateIds,
      missingBoundaryTokens: audit.missingBoundaryTokens,
      openGateIdsWithoutApprovedExceptions: audit.openGateIdsWithoutApprovedExceptions,
    },
    null,
    2
  );

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:release-record-audit',
      '  npm run help:release-record-audit -- --json',
      '',
      'Options:',
      '  --json           Print machine-readable release evidence record audit.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const releaseReadiness = loadReleaseReadiness();
  const audit = buildAudit({ releaseReadiness });
  const payload = {
    branch: shellValue('git rev-parse --abbrev-ref HEAD'),
    commit: shellValue('git rev-parse --short HEAD'),
    audit,
  };

  console.log(hasFlag('--json') ? renderJson(payload) : renderMarkdown(payload));
};

main();
