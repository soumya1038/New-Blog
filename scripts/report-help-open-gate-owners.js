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

const unique = (items) => [...new Set(items.filter(Boolean))];

const countBy = (items, key) =>
  items.reduce((counts, item) => {
    const value = item[key] || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

const isCommandLike = (value) => /^(npm run|node --check|npx cap|gradlew)/.test(value);

const formatInline = (items) => (items.length > 0 ? items.join(', ') : 'none');

const formatList = (items) =>
  items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None recorded';

const buildOwnerSummary = (releaseReadiness) => {
  const openGates = releaseReadiness.openReleaseReadinessGates;
  const unresolvedGateIds = new Set(
    releaseReadiness.openGatesWithoutApprovedExceptions.map((gate) => gate.id)
  );
  const gatesByOwner = openGates.reduce((groups, gate) => {
    if (!groups.has(gate.owner)) groups.set(gate.owner, []);
    groups.get(gate.owner).push(gate);
    return groups;
  }, new Map());

  const owners = [...gatesByOwner.entries()]
    .map(([owner, gates]) => {
      const evidence = unique(gates.flatMap((gate) => gate.evidence || []));
      const blockers = unique(gates.flatMap((gate) => gate.blockers || []));
      const commands = unique(evidence.filter(isCommandLike));

      return {
        owner,
        gateCount: gates.length,
        gateIds: gates.map((gate) => gate.id),
        gateStatuses: unique(gates.map((gate) => gate.status)),
        gateAreas: unique(gates.map((gate) => gate.area)),
        protocols: unique(gates.map((gate) => gate.protocol)),
        evidence,
        commands,
        blockers,
        releaseImpacts: unique(gates.map((gate) => gate.releaseImpact)),
        openGateIdsWithoutApprovedExceptions: gates
          .filter((gate) => unresolvedGateIds.has(gate.id))
          .map((gate) => gate.id),
      };
    })
    .sort((a, b) => a.owner.localeCompare(b.owner));

  const statusCounts = countBy(openGates, 'status');

  return {
    result:
      openGates.length === 0
        ? 'no open release gates'
        : 'open release gates require owner evidence',
    counts: {
      releaseGates: releaseReadiness.HELP_RELEASE_READINESS_GATES.length,
      verifiedLocalGates: releaseReadiness.verifiedLocalReleaseReadinessGates.length,
      openGates: openGates.length,
      owners: owners.length,
      openGatesWithoutApprovedExceptions:
        releaseReadiness.openGatesWithoutApprovedExceptions.length,
      releaseExceptions: releaseReadiness.HELP_RELEASE_EXCEPTIONS.length,
      approvedExceptions: releaseReadiness.approvedReleaseReadinessExceptions.length,
      pendingExternal: statusCounts['pending-external'] || 0,
      blockedApproval: statusCounts['blocked-approval'] || 0,
      blockedProduction: statusCounts['blocked-production'] || 0,
    },
    owners,
    openGateIdsWithoutApprovedExceptions:
      releaseReadiness.openGatesWithoutApprovedExceptions.map((gate) => gate.id),
  };
};

const renderOwnerRows = (owners) =>
  owners
    .map(
      (owner) =>
        `| ${owner.owner} | ${owner.gateCount} | ${formatInline(owner.gateIds)} | ${formatInline(
          owner.gateStatuses
        )} | ${formatInline(owner.gateAreas)} | \`${
          owner.commands[0] || 'Record owner evidence listed below'
        }\` | ${formatInline(owner.protocols)} |`
    )
    .join('\n');

const renderOwnerDetails = (owners) =>
  owners
    .map(
      (owner) => `### ${owner.owner}

Open gates:

${formatList(owner.gateIds)}

Open gates without approved exceptions:

${formatList(owner.openGateIdsWithoutApprovedExceptions)}

Evidence needed:

${formatList(owner.evidence)}

Preparation commands:

${formatList(owner.commands)}

Blockers:

${formatList(owner.blockers)}

Release impacts:

${formatList(owner.releaseImpacts)}
`
    )
    .join('\n');

const renderMarkdown = ({ branch, commit, summary }) => `# Lekhon Open Gate Owner Summary

Branch: ${branch}  
Commit: ${commit}  
Result: ${summary.result}

## Counts

- Release gates: ${summary.counts.releaseGates}
- Verified local gates: ${summary.counts.verifiedLocalGates}
- Open gates: ${summary.counts.openGates}
- Open gate owners: ${summary.counts.owners}
- Open gates without approved exceptions: ${summary.counts.openGatesWithoutApprovedExceptions}
- Pending external gates: ${summary.counts.pendingExternal}
- Blocked approval gates: ${summary.counts.blockedApproval}
- Blocked production gates: ${summary.counts.blockedProduction}
- Release exceptions: ${summary.counts.releaseExceptions}
- Approved release exceptions: ${summary.counts.approvedExceptions}

## Owner Action Matrix

| Owner | Open gates | Gate ids | Statuses | Areas | First evidence command | Protocols |
|---|---:|---|---|---|---|---|
${summary.owners.length > 0 ? renderOwnerRows(summary.owners) : '| None | 0 | none | none | none | `None` | none |'}

## Owner Evidence Details

${summary.owners.length > 0 ? renderOwnerDetails(summary.owners) : 'No open owners.'}

## Open Gates Without Approved Exceptions

${formatList(summary.openGateIdsWithoutApprovedExceptions)}

## Completion Rule

Do not mark the Help Center goal complete from this owner summary. Owner evidence, approved exceptions, release evidence artifacts, and source gate status updates are still required before completion can be claimed.
`;

const renderJson = ({ branch, commit, summary }) =>
  JSON.stringify(
    {
      branch,
      commit,
      result: summary.result,
      counts: summary.counts,
      owners: summary.owners,
      openGateIdsWithoutApprovedExceptions: summary.openGateIdsWithoutApprovedExceptions,
    },
    null,
    2
  );

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:open-gate-owners',
      '  npm run help:open-gate-owners -- --json',
      '',
      'Options:',
      '  --json   Print a machine-readable owner action summary.',
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
  const summary = buildOwnerSummary(releaseReadiness);

  if (hasFlag('--json')) {
    console.log(renderJson({ branch, commit, summary }));
    return;
  }

  console.log(renderMarkdown({ branch, commit, summary }));
};

main();
