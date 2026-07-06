#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'open-gate-owner-handoffs');
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

const formatList = (items) =>
  items && items.length > 0 ? items.map((item) => `  - ${item}`).join('\n') : '  - None recorded';

const formatInline = (items) => (items && items.length > 0 ? items.join(', ') : 'none');

const buildOwnerRows = (releaseReadiness) => {
  const unresolvedGateIds = new Set(
    releaseReadiness.openGatesWithoutApprovedExceptions.map((gate) => gate.id)
  );
  const statusCounts = countBy(releaseReadiness.openReleaseReadinessGates, 'status');
  const groups = releaseReadiness.openReleaseReadinessGates.reduce((ownerMap, gate) => {
    if (!ownerMap.has(gate.owner)) ownerMap.set(gate.owner, []);
    ownerMap.get(gate.owner).push(gate);
    return ownerMap;
  }, new Map());

  const owners = [...groups.entries()]
    .map(([owner, gates]) => {
      const evidence = unique(gates.flatMap((gate) => gate.evidence || []));
      return {
        owner,
        gates,
        gateIds: gates.map((gate) => gate.id),
        statuses: unique(gates.map((gate) => gate.status)),
        areas: unique(gates.map((gate) => gate.area)),
        protocols: unique(gates.map((gate) => gate.protocol)),
        evidence,
        commands: unique(evidence.filter(isCommandLike)),
        blockers: unique(gates.flatMap((gate) => gate.blockers || [])),
        releaseImpacts: unique(gates.map((gate) => gate.releaseImpact)),
        openGateIdsWithoutApprovedExceptions: gates
          .filter((gate) => unresolvedGateIds.has(gate.id))
          .map((gate) => gate.id),
      };
    })
    .sort((a, b) => a.owner.localeCompare(b.owner));

  return {
    owners,
    statusCounts,
  };
};

const renderOwnerMatrixRows = (owners) =>
  owners
    .map(
      (owner) =>
        `| ${owner.owner} | ${owner.gateIds.length} | ${formatInline(owner.gateIds)} | ${formatInline(
          owner.statuses
        )} | ${formatInline(owner.protocols)} | pending |`
    )
    .join('\n');

const renderEvidenceRows = (items) =>
  items.map((item) => `| ${item} | pending | TBD | TBD |`).join('\n');

const renderCommandRows = (commands) =>
  commands.map((command) => `| \`${command}\` | pending | TBD |`).join('\n');

const renderGateRows = (gates) =>
  gates
    .map(
      (gate) =>
        `| ${gate.id} | ${gate.status} | ${gate.area} | ${gate.protocol} | ${gate.releaseImpact} | pending |`
    )
    .join('\n');

const renderOwnerWorksheet = (owner) => `### ${owner.owner}

#### Owner Signoff

| Field | Value |
|---|---|
| Evidence owner | ${owner.owner} |
| Reviewer | TBD |
| Review date | TBD |
| Final owner result | pending |
| Evidence folder or links | TBD |
| Exception decision, if any | TBD |
| Next action | TBD |

#### Gates Covered

| Gate | Source status | Area | Protocol | Release impact | Owner result |
|---|---|---|---|---|---|
${renderGateRows(owner.gates)}

#### Evidence Collection Checklist

| Evidence item | Status | Link or output | Notes |
|---|---|---|---|
${owner.evidence.length > 0 ? renderEvidenceRows(owner.evidence) : '| None recorded | n/a | n/a | n/a |'}

#### Command Checklist

| Command | Status | Output or link |
|---|---|---|
${owner.commands.length > 0 ? renderCommandRows(owner.commands) : '| No command-like evidence item recorded | n/a | n/a |'}

#### Current Blockers

${formatList(owner.blockers)}

#### Open Gates Without Approved Exceptions

${formatList(owner.openGateIdsWithoutApprovedExceptions)}

#### Release Impact Notes

${formatList(owner.releaseImpacts)}
`;

const renderHandoff = ({ handoffName, handoffDate, releaseReadiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const { owners, statusCounts } = buildOwnerRows(releaseReadiness);
  const unresolvedGateIds = releaseReadiness.openGatesWithoutApprovedExceptions.map((gate) => gate.id);

  return `# Help Open Gate Owner Handoff - ${handoffName}

Status: Draft owner handoff packet; not release approval  
Generated: ${handoffDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this handoff to assign and collect the owner evidence still required for the Lekhon Help Center release. It is generated from \`redirect/src/content/releaseReadiness.js\` and covers only gates that are currently open.

This packet does not close a gate by itself. Owners must attach current evidence, approved exceptions, or blocker decisions, then the release evidence record and source gate registry must be updated.

## 2. Handoff Summary

| Metric | Count |
|---|---:|
| Release gates | ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length} |
| Verified local gates | ${releaseReadiness.verifiedLocalReleaseReadinessGates.length} |
| Open gates | ${releaseReadiness.openReleaseReadinessGates.length} |
| Open gate owners | ${owners.length} |
| Open gates without approved exceptions | ${releaseReadiness.openGatesWithoutApprovedExceptions.length} |
| Pending external gates | ${statusCounts['pending-external'] || 0} |
| Blocked approval gates | ${statusCounts['blocked-approval'] || 0} |
| Blocked production gates | ${statusCounts['blocked-production'] || 0} |
| Release exceptions | ${releaseReadiness.HELP_RELEASE_EXCEPTIONS.length} |
| Approved release exceptions | ${releaseReadiness.approvedReleaseReadinessExceptions.length} |

Open gates without approved exceptions:

${formatList(unresolvedGateIds)}

## 3. Owner Handoff Matrix

| Owner | Open gates | Gate ids | Statuses | Protocols | Handoff result |
|---|---:|---|---|---|---|
${owners.length > 0 ? renderOwnerMatrixRows(owners) : '| None | 0 | none | none | none | complete candidate |'}

## 4. Owner Evidence Collection Worksheets

${owners.length > 0 ? owners.map(renderOwnerWorksheet).join('\n') : 'No open owner worksheets are required.'}

## 5. Release Evidence Record Updates

After owners return evidence:

1. Link the evidence files or notes from \`09-release-evidence-record.md\`.
2. Update the relevant generated packet or worksheet for Android, accessibility, support, policy, visual evidence, or analytics approval.
3. Update \`HELP_RELEASE_READINESS_GATES\` only after the gate evidence satisfies the protocol or an approved exception exists.
4. Run \`npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD> --json\`.
5. Run \`npm run help:goal-audit -- --json\`.
6. Run \`npm run help:governance\`.

## 6. Completion Boundary

Do not mark the Help Center goal complete from this owner handoff packet. Completion still requires current evidence or valid approved exceptions for every open gate, linked release evidence artifacts, source gate status updates, and a goal audit with no source gaps and no open gates without approved exceptions.
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:open-gate-handoff -- --name handoff-name',
      '  npm run help:open-gate-handoff -- --name handoff-name --date 2026-06-28',
      '  npm run help:open-gate-handoff -- --name handoff-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Handoff label. Defaults to open-gate-handoff-YYYY-MM-DD.',
      '  --date <value>   ISO date for generated artifact paths. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated handoff packet.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const handoffDate = getArgValue('--date') || todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(handoffDate)) {
    console.error(`Invalid --date value: ${handoffDate}`);
    process.exit(1);
  }

  const handoffName = getArgValue('--name') || `open-gate-handoff-${handoffDate}`;
  const slug = sanitizeSlug(handoffName);
  if (!slug) {
    console.error('Open gate owner handoff name must contain at least one letter or number.');
    process.exit(1);
  }

  const releaseReadiness = loadReleaseReadiness();
  const outputPath = path.join(outputDir, `${handoffDate}-${slug}.md`);
  const content = renderHandoff({ handoffName, handoffDate, releaseReadiness });
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');
  const { owners } = buildOwnerRows(releaseReadiness);

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.existsSync(outputPath) && !force) {
      console.error(`Open gate owner handoff already exists: ${toRelative(outputPath)}`);
      console.error('Use --force to overwrite it.');
      process.exit(1);
    }
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  console.log(dryRun ? 'Help open gate owner handoff dry run passed.' : 'Help open gate owner handoff created.');
  console.log(`Target: ${toRelative(outputPath)}`);
  console.log(`Release gates: ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length}`);
  console.log(`Verified local gates: ${releaseReadiness.verifiedLocalReleaseReadinessGates.length}`);
  console.log(`Open gates: ${releaseReadiness.openReleaseReadinessGates.length}`);
  console.log(`Open gate owners: ${owners.length}`);
  console.log(`Open gates without approved exceptions: ${releaseReadiness.openGatesWithoutApprovedExceptions.length}`);
  console.log(`Open gate ids: ${releaseReadiness.openReleaseReadinessGates.map((gate) => gate.id).join(', ')}`);
};

main();
