#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const releaseReadinessPath = path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js');

const args = process.argv.slice(2);

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
  RELEASE_GATE_STATUSES,
  RELEASE_GATE_AREAS,
  RELEASE_EXCEPTION_STATUSES,
  HELP_RELEASE_READINESS_GATES,
  HELP_RELEASE_EXCEPTIONS,
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

const countBy = (items, key) =>
  items.reduce((counts, item) => {
    const value = item[key] || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

const unique = (items) => [...new Set(items)];

const worksheetCommandsFor = (gate) =>
  gate.evidence.filter((item) => /^npm run help:.*worksheet/.test(item));

const preparationCommandsFor = (gate) =>
  gate.evidence.filter((item) => /^(npm run|node --check|npx cap|gradlew)/.test(item));

const localCommands = [
  'npm run help:readiness',
  'npm run help:accessibility-environment',
  'npm run help:accessibility-readiness',
  'npm run help:accessibility-verification -- --name <accessibility-pass-name> --dry-run',
  'npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run',
  'npm run help:analytics-readiness',
  'npm run help:android-device-evidence',
  'npm run help:android-evidence -- --name <android-pass-name> --dry-run',
  'npm run help:android-readiness',
  'npm run help:policy-approval -- --name <policy-pass-name> --dry-run',
  'npm run help:policy-readiness',
  'npm run help:support-cleanup',
  'npm run help:support-lifecycle -- --name <support-pass-name> --dry-run',
  'npm run help:support-readiness',
  'npm run help:visual-evidence -- --name <visual-pass-name> --dry-run',
  'npm run help:visual-readiness',
  'npm run help:governance',
  'npm run test:help -- --runInBand',
  'npm run help:public-routes',
  'npm run help:release-pass-checklist -- --name <release-pass-name> --dry-run',
  'npm run help:release-evidence-binder -- --name <binder-name> --dry-run',
  'npm run help:release-record-audit -- --json',
  'npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD>',
  'npm run help:release-candidate -- --name <release-candidate-name> --dry-run',
  'npm run help:android-worksheet -- --name <android-pass-name> --dry-run',
  'npm run help:external-worksheet -- --name <external-pass-name> --dry-run',
  'npm run help:visual-worksheet -- --name <visual-pass-name> --dry-run',
  'npm run help:exceptions',
  'npm run help:exception-decision -- --name <exception-pass-name> --dry-run',
  'npm run help:coverage-approval -- --name <coverage-pass-name> --dry-run',
  'npm run help:gate-closure',
  'npm run help:goal-audit',
  'npm run help:open-gate-handoff -- --name <handoff-name> --dry-run',
  'npm run help:open-gate-owners',
  'npm run build',
];

const renderMarkdown = ({ releaseReadiness, branch, commit }) => {
  const gates = releaseReadiness.HELP_RELEASE_READINESS_GATES;
  const openGates = releaseReadiness.openReleaseReadinessGates;
  const unresolvedGates = releaseReadiness.openGatesWithoutApprovedExceptions;
  const verifiedGates = releaseReadiness.verifiedLocalReleaseReadinessGates;
  const exceptions = releaseReadiness.HELP_RELEASE_EXCEPTIONS;
  const approvedExceptions = releaseReadiness.approvedReleaseReadinessExceptions;
  const statusCounts = countBy(gates, 'status');
  const areaCounts = countBy(gates, 'area');
  const preparationCommands = unique(openGates.flatMap(preparationCommandsFor));
  const worksheetCommands = unique(openGates.flatMap(worksheetCommandsFor));

  const lines = [
    '# Lekhon Help Readiness Summary',
    '',
    `Branch: ${branch}`,
    `Commit: ${commit}`,
    `Result: ${unresolvedGates.length === 0 ? 'complete candidate' : 'not complete'}`,
    '',
    '## Gate Counts',
    '',
    `- Release gates: ${gates.length}`,
    `- Verified local gates: ${verifiedGates.length}`,
    `- Open gates: ${openGates.length}`,
    `- Open gates without approved exceptions: ${unresolvedGates.length}`,
    `- Release exceptions: ${exceptions.length}`,
    `- Approved release exceptions: ${approvedExceptions.length}`,
    '',
    '## Counts By Status',
    '',
    ...releaseReadiness.RELEASE_GATE_STATUSES.map(
      (status) => `- ${status}: ${statusCounts[status] || 0}`
    ),
    '',
    '## Counts By Area',
    '',
    ...releaseReadiness.RELEASE_GATE_AREAS.map((area) => `- ${area}: ${areaCounts[area] || 0}`),
    '',
    '## Counts By Exception Status',
    '',
    ...releaseReadiness.RELEASE_EXCEPTION_STATUSES.map(
      (status) => `- ${status}: ${countBy(exceptions, 'status')[status] || 0}`
    ),
    '',
    '## Local Commands',
    '',
    ...localCommands.map((command) => `- ${command}`),
    '',
    '## Preparation Commands For Open Gates',
    '',
    ...(preparationCommands.length > 0
      ? preparationCommands.map((command) => `- ${command}`)
      : ['- None. No open gates list a command-like preparation step.']),
    '',
    '## Worksheet Commands For Open Gates',
    '',
    ...(worksheetCommands.length > 0
      ? worksheetCommands.map((command) => `- ${command}`)
      : ['- None. No open gates require a worksheet command.']),
    '',
    '## Open Gates',
    '',
    ...(openGates.length > 0
      ? openGates.map((gate) => {
          const commands = preparationCommandsFor(gate);
          const approvedException = approvedExceptions.find((exception) => exception.gateId === gate.id);
          return [
            `### ${gate.id}`,
            '',
            `- Area: ${gate.area}`,
            `- Status: ${gate.status}`,
            `- Approved exception: ${approvedException ? approvedException.id : 'none'}`,
            `- Owner: ${gate.owner}`,
            `- Protocol: ${gate.protocol}`,
            `- Next command: ${commands[0] || 'Record evidence listed on the gate'}`,
            ...(commands.length > 1
              ? ['- Other commands:', ...commands.slice(1).map((command) => `  - ${command}`)]
              : []),
            `- Release impact: ${gate.releaseImpact}`,
            '- Blockers:',
            ...(gate.blockers || []).map((blocker) => `  - ${blocker}`),
            '',
          ].join('\n');
        })
      : ['No open gates. Confirm release evidence before marking the goal complete.']),
    '## Open Gates Without Approved Exceptions',
    '',
    ...(unresolvedGates.length > 0
      ? unresolvedGates.map((gate) => `- ${gate.id} (${gate.status})`)
      : ['- None. Confirm every exception is current before marking the goal complete.']),
    '## Completion Rule',
    '',
    'Do not mark the Help Center goal complete while any gate remains open, missing current evidence, or missing an approved exception with owner, risk, and next review date.',
    '',
  ];

  return lines.join('\n');
};

const renderJson = ({ releaseReadiness, branch, commit }) => {
  const gates = releaseReadiness.HELP_RELEASE_READINESS_GATES;
  const openGates = releaseReadiness.openReleaseReadinessGates;
  const unresolvedGates = releaseReadiness.openGatesWithoutApprovedExceptions;
  const exceptions = releaseReadiness.HELP_RELEASE_EXCEPTIONS;

  return JSON.stringify(
    {
      branch,
      commit,
      result: unresolvedGates.length === 0 ? 'complete candidate' : 'not complete',
      gateCounts: {
        total: gates.length,
        verifiedLocal: releaseReadiness.verifiedLocalReleaseReadinessGates.length,
        open: openGates.length,
        openWithoutApprovedExceptions: unresolvedGates.length,
        byStatus: countBy(gates, 'status'),
        byArea: countBy(gates, 'area'),
      },
      exceptionCounts: {
        total: exceptions.length,
        approved: releaseReadiness.approvedReleaseReadinessExceptions.length,
        byStatus: countBy(exceptions, 'status'),
      },
      localCommands,
      preparationCommandsForOpenGates: unique(openGates.flatMap(preparationCommandsFor)),
      worksheetCommandsForOpenGates: unique(openGates.flatMap(worksheetCommandsFor)),
      openGates: openGates.map((gate) => ({
        id: gate.id,
        area: gate.area,
        status: gate.status,
        owner: gate.owner,
        protocol: gate.protocol,
        preparationCommands: preparationCommandsFor(gate),
        worksheetCommands: worksheetCommandsFor(gate),
        blockers: gate.blockers || [],
        releaseImpact: gate.releaseImpact,
      })),
      openGatesWithoutApprovedExceptions: unresolvedGates.map((gate) => ({
        id: gate.id,
        area: gate.area,
        status: gate.status,
        owner: gate.owner,
        protocol: gate.protocol,
        releaseImpact: gate.releaseImpact,
      })),
      approvedExceptions: releaseReadiness.approvedReleaseReadinessExceptions,
    },
    null,
    2
  );
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:readiness',
      '  npm run help:readiness -- --json',
      '',
      'Options:',
      '  --json   Print machine-readable readiness data.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const releaseReadiness = loadReleaseReadiness();
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const payload = { releaseReadiness, branch, commit };

  console.log(hasFlag('--json') ? renderJson(payload) : renderMarkdown(payload));
};

main();
