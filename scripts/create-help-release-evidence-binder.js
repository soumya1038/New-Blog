#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'release-evidence-binders');
const releaseReadinessPath = path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js');

const args = process.argv.slice(2);

const packetRows = [
  {
    label: 'Release pass checklist',
    command: 'npm run help:release-pass-checklist -- --name <release-pass-name>',
    dryRun: 'npm run help:release-pass-checklist -- --name <release-pass-name> --dry-run',
    path: 'docs/help-center-planning/release-pass-checklists/<date>-<release-pass-name>.md',
    owner: 'Program owner + release owners',
    gateIds: 'all release gates',
  },
  {
    label: 'Release candidate evidence',
    command: 'npm run help:release-candidate -- --name <release-candidate-name>',
    dryRun: 'npm run help:release-candidate -- --name <release-candidate-name> --dry-run',
    path: 'docs/help-center-planning/release-candidates/<date>-<release-candidate-name>.md',
    owner: 'Program owner',
    gateIds: 'all release gates',
  },
  {
    label: 'Coverage approval packet',
    command: 'npm run help:coverage-approval -- --name <coverage-pass-name>',
    dryRun: 'npm run help:coverage-approval -- --name <coverage-pass-name> --dry-run',
    path: 'docs/help-center-planning/coverage-approvals/<date>-<coverage-pass-name>.md',
    owner: 'Program owner + product owners',
    gateIds: 'all release gates',
  },
  {
    label: 'Open gate owner handoff',
    command: 'npm run help:open-gate-handoff -- --name <handoff-name>',
    dryRun: 'npm run help:open-gate-handoff -- --name <handoff-name> --dry-run',
    path: 'docs/help-center-planning/open-gate-owner-handoffs/<date>-<handoff-name>.md',
    owner: 'Program owner + release owners',
    gateIds: 'all open release gates',
  },
  {
    label: 'Release exception decision packet',
    command: 'npm run help:exception-decision -- --name <exception-pass-name>',
    dryRun: 'npm run help:exception-decision -- --name <exception-pass-name> --dry-run',
    path: 'docs/help-center-planning/release-exception-decisions/<date>-<exception-pass-name>.md',
    owner: 'Program owner + risk approvers',
    gateIds: 'all open release gates',
  },
  {
    label: 'Android evidence packet',
    command: 'npm run help:android-evidence -- --name <android-pass-name>',
    dryRun: 'npm run help:android-evidence -- --name <android-pass-name> --dry-run',
    path: 'docs/help-center-planning/android-evidence/<date>-<android-pass-name>.md',
    owner: 'Mobile + QA',
    gateIds: 'physical-android-device, android-oauth-provider-return, android-permissions-camera-microphone',
  },
  {
    label: 'Android verification worksheet',
    command: 'npm run help:android-worksheet -- --name <android-pass-name>',
    dryRun: 'npm run help:android-worksheet -- --name <android-pass-name> --dry-run',
    path: 'docs/help-center-planning/android-verification/<date>-<android-pass-name>.md',
    owner: 'Mobile + accessibility',
    gateIds: 'physical-android-device, android-oauth-provider-return, android-permissions-camera-microphone, manual-screen-reader-verification',
  },
  {
    label: 'Accessibility verification packet',
    command: 'npm run help:accessibility-verification -- --name <accessibility-pass-name>',
    dryRun: 'npm run help:accessibility-verification -- --name <accessibility-pass-name> --dry-run',
    path: 'docs/help-center-planning/accessibility-verification/<date>-<accessibility-pass-name>.md',
    owner: 'Accessibility + mobile',
    gateIds: 'manual-screen-reader-verification',
  },
  {
    label: 'External verification worksheet',
    command: 'npm run help:external-worksheet -- --name <external-pass-name>',
    dryRun: 'npm run help:external-worksheet -- --name <external-pass-name> --dry-run',
    path: 'docs/help-center-planning/external-verification/<date>-<external-pass-name>.md',
    owner: 'Accessibility + support + policy + analytics',
    gateIds: 'manual-screen-reader-verification, live-support-report-appeal-lifecycle, policy-specialist-approvals, analytics-consent-operations',
  },
  {
    label: 'Support lifecycle packet',
    command: 'npm run help:support-lifecycle -- --name <support-pass-name>',
    dryRun: 'npm run help:support-lifecycle -- --name <support-pass-name> --dry-run',
    path: 'docs/help-center-planning/support-lifecycle/<date>-<support-pass-name>.md',
    owner: 'Support operations + Safety',
    gateIds: 'live-support-report-appeal-lifecycle',
  },
  {
    label: 'Policy approval packet',
    command: 'npm run help:policy-approval -- --name <policy-pass-name>',
    dryRun: 'npm run help:policy-approval -- --name <policy-pass-name> --dry-run',
    path: 'docs/help-center-planning/policy-approvals/<date>-<policy-pass-name>.md',
    owner: 'Program owner + specialist reviewers',
    gateIds: 'policy-specialist-approvals',
  },
  {
    label: 'Visual evidence packet',
    command: 'npm run help:visual-evidence -- --name <visual-pass-name>',
    dryRun: 'npm run help:visual-evidence -- --name <visual-pass-name> --dry-run',
    path: 'docs/help-center-planning/visual-evidence-packets/<date>-<visual-pass-name>.md',
    owner: 'QA + feature owners',
    gateIds: 'p0-visual-evidence-capture',
  },
  {
    label: 'Visual worksheet',
    command: 'npm run help:visual-worksheet -- --name <visual-pass-name>',
    dryRun: 'npm run help:visual-worksheet -- --name <visual-pass-name> --dry-run',
    path: 'docs/help-center-planning/visual-evidence/<date>-<visual-pass-name>.md',
    owner: 'QA + feature owners',
    gateIds: 'p0-visual-evidence-capture',
  },
  {
    label: 'Analytics approval packet',
    command: 'npm run help:analytics-approval -- --name <analytics-pass-name>',
    dryRun: 'npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run',
    path: 'docs/help-center-planning/analytics-approvals/<date>-<analytics-pass-name>.md',
    owner: 'Privacy + analytics + operations',
    gateIds: 'analytics-consent-operations',
  },
];

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

const formatList = (items) =>
  items && items.length > 0 ? items.map((item) => `  - ${item}`).join('\n') : '  - None recorded';

const renderPacketRows = () =>
  packetRows
    .map(
      (packet) =>
        `| ${packet.label} | \`${packet.command}\` | \`${packet.dryRun}\` | \`${packet.path}\` | ${packet.owner} | ${packet.gateIds} | pending |`
    )
    .join('\n');

const renderGateRows = (gates) =>
  gates
    .map((gate) => {
      const packets = packetRows
        .filter(
          (packet) =>
            packet.gateIds === 'all release gates' ||
            (packet.gateIds === 'all open release gates' && gate.status !== 'verified-local') ||
            packet.gateIds.includes(gate.id)
        )
        .map((packet) => packet.label)
        .join(', ');

      return `| ${gate.id} | ${gate.status} | ${gate.owner} | ${gate.protocol} | ${packets || 'release evidence record'} | pending |`;
    })
    .join('\n');

const renderDecisionRows = (openGates) =>
  openGates
    .map(
      (gate) =>
        `| ${gate.id} | no | ${gate.owner} | pending | ${gate.releaseImpact} |`
    )
    .join('\n');

const renderBinder = ({ binderName, binderDate, releaseReadiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const openGateIds = releaseReadiness.openReleaseReadinessGates.map((gate) => gate.id);
  const unresolvedGateIds = releaseReadiness.openGatesWithoutApprovedExceptions.map((gate) => gate.id);

  return `# Help Release Evidence Binder - ${binderName}

Status: Draft evidence binder; not release approval  
Generated: ${binderDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this binder as the master index for the current Lekhon Help Center release evidence. It connects the source-owned release gates to the generated Android, accessibility, support, policy, visual, analytics, worksheet, exception, goal-audit, and release-candidate evidence files.

This binder does not prove any external gate by itself. It is a reviewer-facing checklist so every manual result, approval, and packet path has one place to land before \`09-release-evidence-record.md\` and source gate statuses are updated.

## 2. Release Summary

| Metric | Count |
|---|---:|
| Release gates | ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length} |
| Verified local gates | ${releaseReadiness.verifiedLocalReleaseReadinessGates.length} |
| Open gates | ${releaseReadiness.openReleaseReadinessGates.length} |
| Open gates without approved exceptions | ${releaseReadiness.openGatesWithoutApprovedExceptions.length} |
| Release exceptions | ${releaseReadiness.HELP_RELEASE_EXCEPTIONS.length} |
| Approved release exceptions | ${releaseReadiness.approvedReleaseReadinessExceptions.length} |
| Evidence packet rows | ${packetRows.length} |

Open gate ids:

${formatList(openGateIds)}

Open gate ids without approved exceptions:

${formatList(unresolvedGateIds)}

## 3. Evidence Packet Index

| Evidence packet | Create command | Dry-run command | Expected path | Owner | Gates covered | Result |
|---|---|---|---|---|---|---|
${renderPacketRows()}

## 4. Gate Coverage Matrix

| Gate | Source status | Owner | Protocol | Binder evidence packets | Final result |
|---|---|---|---|---|---|
${renderGateRows(releaseReadiness.HELP_RELEASE_READINESS_GATES)}

## 5. Required Final Commands

- \`npm run help:readiness\`
- \`npm run help:open-gate-owners -- --json\`
- \`npm run help:open-gate-handoff -- --name <handoff-name> --dry-run\`
- \`npm run help:exception-decision -- --name <exception-pass-name> --dry-run\`
- \`npm run help:coverage-approval -- --name <coverage-pass-name> --dry-run\`
- \`npm run help:release-pass-checklist -- --name <release-pass-name> --dry-run\`
- \`npm run help:release-evidence-binder -- --name <binder-name> --dry-run\`
- \`npm run help:release-record-audit -- --json\`
- \`npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD>\`
- \`npm run help:release-candidate -- --name <release-candidate-name> --dry-run\`
- \`npm run help:gate-closure -- --json\`
- \`npm run help:android-evidence -- --name <android-pass-name> --dry-run\`
- \`npm run help:android-worksheet -- --name <android-pass-name> --dry-run\`
- \`npm run help:accessibility-verification -- --name <accessibility-pass-name> --dry-run\`
- \`npm run help:external-worksheet -- --name <external-pass-name> --dry-run\`
- \`npm run help:support-lifecycle -- --name <support-pass-name> --dry-run\`
- \`npm run help:policy-approval -- --name <policy-pass-name> --dry-run\`
- \`npm run help:visual-evidence -- --name <visual-pass-name> --dry-run\`
- \`npm run help:visual-worksheet -- --name <visual-pass-name> --dry-run\`
- \`npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run\`
- \`npm run help:exceptions\`
- \`npm run help:goal-audit\`
- \`npm run help:governance\`
- \`npm run test:help -- --runInBand\`
- \`npm run build\`

## 6. Final Open-Gate Decisions

| Gate | Approved | Owner | Evidence link | Release impact |
|---|---|---|---|---|
${renderDecisionRows(releaseReadiness.openReleaseReadinessGates)}

## 7. Release Evidence Record Update Checklist

| Update | Result | Evidence |
|---|---|---|
| All generated packet paths are linked from \`09-release-evidence-record.md\` | pending | TBD |
| Gate statuses in \`redirect/src/content/releaseReadiness.js\` match final evidence | pending | TBD |
| Approved exceptions, if any, include owner, risk, scope, evidence, expiration, decision record, and next review date | pending | TBD |
| Draft policies remain non-binding until specialist approvals and effective dates exist | pending | TBD |
| Goal audit reports no source gaps and no open gates without approved exceptions | pending | TBD |

## 8. Completion Rule

Do not mark the Help Center goal complete from this binder alone. Completion requires current evidence for every gate, generated packet paths linked in the release evidence record, source gate statuses updated, and \`npm run help:goal-audit -- --json\` reporting no open release gates without approved exceptions.
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:release-evidence-binder -- --name binder-name',
      '  npm run help:release-evidence-binder -- --name binder-name --date 2026-06-28',
      '  npm run help:release-evidence-binder -- --name binder-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Binder label. Defaults to help-evidence-YYYY-MM-DD.',
      '  --date <value>   ISO date for the generated file. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated binder.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const binderDate = getArgValue('--date') || todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(binderDate)) {
    console.error(`Invalid --date value: ${binderDate}`);
    process.exit(1);
  }

  const binderName = getArgValue('--name') || `help-evidence-${binderDate}`;
  const slug = sanitizeSlug(binderName);
  if (!slug) {
    console.error('Release evidence binder name must contain at least one letter or number.');
    process.exit(1);
  }

  const releaseReadiness = loadReleaseReadiness();
  const outputPath = path.join(outputDir, `${binderDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');
  const content = renderBinder({ binderName, binderDate, releaseReadiness });

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.existsSync(outputPath) && !force) {
      console.error(`Release evidence binder already exists: ${toRelative(outputPath)}`);
      console.error('Use --force to overwrite it.');
      process.exit(1);
    }
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  console.log(dryRun ? 'Help release evidence binder dry run passed.' : 'Help release evidence binder created.');
  console.log(`Target: ${toRelative(outputPath)}`);
  console.log(`Release gates: ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length}`);
  console.log(`Verified local gates: ${releaseReadiness.verifiedLocalReleaseReadinessGates.length}`);
  console.log(`Open gates: ${releaseReadiness.openReleaseReadinessGates.length}`);
  console.log(`Open gates without approved exceptions: ${releaseReadiness.openGatesWithoutApprovedExceptions.length}`);
  console.log(`Evidence packet rows: ${packetRows.length}`);
  console.log(
    `Open gate ids: ${releaseReadiness.openReleaseReadinessGates.map((gate) => gate.id).join(', ')}`
  );
};

main();
