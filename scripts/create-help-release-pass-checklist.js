#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'release-pass-checklists');
const releaseReadinessPath = path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js');

const args = process.argv.slice(2);

const artifactCommands = [
  {
    label: 'Release pass checklist',
    create: 'npm run help:release-pass-checklist -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:release-pass-checklist -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/release-pass-checklists/<date>-<release-pass-name>.md',
  },
  {
    label: 'Release evidence binder',
    create: 'npm run help:release-evidence-binder -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:release-evidence-binder -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/release-evidence-binders/<date>-<release-pass-name>.md',
  },
  {
    label: 'Release candidate evidence',
    create: 'npm run help:release-candidate -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:release-candidate -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/release-candidates/<date>-<release-pass-name>.md',
  },
  {
    label: 'Coverage approval packet',
    create: 'npm run help:coverage-approval -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:coverage-approval -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/coverage-approvals/<date>-<release-pass-name>.md',
  },
  {
    label: 'Open gate owner handoff',
    create: 'npm run help:open-gate-handoff -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:open-gate-handoff -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/open-gate-owner-handoffs/<date>-<release-pass-name>.md',
  },
  {
    label: 'Release exception decision packet',
    create: 'npm run help:exception-decision -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:exception-decision -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/release-exception-decisions/<date>-<release-pass-name>.md',
  },
  {
    label: 'Android evidence packet',
    create: 'npm run help:android-evidence -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:android-evidence -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/android-evidence/<date>-<release-pass-name>.md',
  },
  {
    label: 'Android verification worksheet',
    create: 'npm run help:android-worksheet -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:android-worksheet -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/android-verification/<date>-<release-pass-name>.md',
  },
  {
    label: 'Accessibility verification packet',
    create: 'npm run help:accessibility-verification -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:accessibility-verification -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/accessibility-verification/<date>-<release-pass-name>.md',
  },
  {
    label: 'External verification worksheet',
    create: 'npm run help:external-worksheet -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:external-worksheet -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/external-verification/<date>-<release-pass-name>.md',
  },
  {
    label: 'Support lifecycle packet',
    create: 'npm run help:support-lifecycle -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:support-lifecycle -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/support-lifecycle/<date>-<release-pass-name>.md',
  },
  {
    label: 'Policy approval packet',
    create: 'npm run help:policy-approval -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:policy-approval -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/policy-approvals/<date>-<release-pass-name>.md',
  },
  {
    label: 'Visual evidence packet',
    create: 'npm run help:visual-evidence -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:visual-evidence -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/visual-evidence-packets/<date>-<release-pass-name>.md',
  },
  {
    label: 'Visual evidence worksheet',
    create: 'npm run help:visual-worksheet -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:visual-worksheet -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/visual-evidence/<date>-<release-pass-name>.md',
  },
  {
    label: 'Analytics approval packet',
    create: 'npm run help:analytics-approval -- --name <release-pass-name> --date <YYYY-MM-DD>',
    dryRun: 'npm run help:analytics-approval -- --name <release-pass-name> --date <YYYY-MM-DD> --dry-run',
    path: 'docs/help-center-planning/analytics-approvals/<date>-<release-pass-name>.md',
  },
];

const sourceCommands = [
  'npm run help:governance',
  'npm run test:help -- --runInBand',
  'npm run help:readiness -- --json',
  'npm run help:open-gate-owners -- --json',
  'npm run help:exceptions -- --json',
  'npm run help:exception-decision -- --name <exception-pass-name> --dry-run',
  'npm run help:coverage-approval -- --name <coverage-pass-name> --dry-run',
  'npm run help:gate-closure -- --json',
  'npm run help:release-record-audit -- --json',
  'npm run help:goal-audit -- --json',
  'npm run help:public-routes',
  'npm run build',
];

const statusCommand =
  'npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD> --json';

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

const replacePlaceholders = (value, releaseName, releaseDate) =>
  value
    .replace(/<release-pass-name>/g, releaseName)
    .replace(/<YYYY-MM-DD>/g, releaseDate)
    .replace(/<date>/g, releaseDate);

const renderCommandRows = (releaseName, releaseDate, field) =>
  artifactCommands
    .map((artifact) => `| ${artifact.label} | \`${replacePlaceholders(artifact[field], releaseName, releaseDate)}\` |`)
    .join('\n');

const renderArtifactRows = (releaseName, releaseDate) =>
  artifactCommands
    .map((artifact) => {
      const expectedPath = replacePlaceholders(artifact.path, releaseName, releaseDate);
      return `| ${artifact.label} | \`${expectedPath}\` | pending | TBD |`;
    })
    .join('\n');

const renderGateRows = (gates) =>
  gates
    .map(
      (gate) =>
        `| ${gate.id} | ${gate.status} | ${gate.owner} | ${gate.protocol} | ${gate.releaseImpact} |`
    )
    .join('\n');

const renderChecklist = ({ releaseName, releaseDate, releaseReadiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const statusCommandForPass = replacePlaceholders(statusCommand, releaseName, releaseDate);

  return `# Help Release Pass Checklist - ${releaseName}

Status: Draft release-pass checklist; not release approval  
Generated: ${releaseDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this checklist to run one named Lekhon Help Center release pass from local source checks through generated evidence packets, manual/external evidence collection, release evidence linking, and final status validation.

This checklist does not replace the evidence packets. It keeps the packet commands in one ordered place so reviewers use the same release name and date across every generated artifact.

## 2. Release Summary

| Metric | Count |
|---|---:|
| Release gates | ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length} |
| Verified local gates | ${releaseReadiness.verifiedLocalReleaseReadinessGates.length} |
| Open gates | ${releaseReadiness.openReleaseReadinessGates.length} |
| Open gates without approved exceptions | ${releaseReadiness.openGatesWithoutApprovedExceptions.length} |
| Release exceptions | ${releaseReadiness.HELP_RELEASE_EXCEPTIONS.length} |
| Approved release exceptions | ${releaseReadiness.approvedReleaseReadinessExceptions.length} |
| Expected evidence artifacts | ${artifactCommands.length} |

Open gate ids:

${formatList(releaseReadiness.openReleaseReadinessGates.map((gate) => gate.id))}

Open gate ids without approved exceptions:

${formatList(releaseReadiness.openGatesWithoutApprovedExceptions.map((gate) => gate.id))}

## 3. Phase 1 - Source And Build Checks

Run and paste the current output into the release evidence record:

${sourceCommands.map((command) => `- \`${command}\``).join('\n')}

## 4. Phase 2 - Dry Run Evidence Commands

Confirm target paths and counts before writing files:

| Artifact | Dry-run command |
|---|---|
${renderCommandRows(releaseName, releaseDate, 'dryRun')}

## 5. Phase 3 - Generate Evidence Artifacts

Run only when the release pass is ready to create working files:

| Artifact | Create command |
|---|---|
${renderCommandRows(releaseName, releaseDate, 'create')}

## 6. Phase 4 - Expected Artifact Paths

| Artifact | Expected path | Filled | Evidence owner |
|---|---|---|---|
${renderArtifactRows(releaseName, releaseDate)}

## 7. Phase 5 - Open Gate Evidence

| Gate | Source status | Owner | Protocol | Release impact |
|---|---|---|---|---|
${renderGateRows(releaseReadiness.openReleaseReadinessGates)}

## 8. Phase 6 - Status Validation Loop

Run after packet files are generated and again after \`09-release-evidence-record.md\` is updated:

- \`${statusCommandForPass}\`
- \`npm run help:open-gate-owners -- --json\`
- \`npm run help:exceptions -- --json\`
- \`npm run help:exception-decision -- --name <exception-pass-name> --dry-run\`
- \`npm run help:goal-audit -- --json\`
- \`npm run help:governance\`

The release pass is still incomplete while the status command reports missing artifacts, unlinked artifacts, or open gates without approved exceptions.

## 9. Completion Rule

Do not mark the Help Center goal complete from this checklist. Completion requires all expected artifact files to exist, all existing artifact paths to be linked from \`09-release-evidence-record.md\`, all open gates to have current evidence or valid approved exceptions, and the goal audit to report no source gaps and no open gates without approved exceptions.
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:release-pass-checklist -- --name release-pass-name',
      '  npm run help:release-pass-checklist -- --name release-pass-name --date 2026-06-28',
      '  npm run help:release-pass-checklist -- --name release-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Shared release pass label. Defaults to help-release-pass-YYYY-MM-DD.',
      '  --date <value>   ISO date for generated artifact paths. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated checklist.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const releaseDate = getArgValue('--date') || todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    console.error(`Invalid --date value: ${releaseDate}`);
    process.exit(1);
  }

  const releaseName = getArgValue('--name') || `help-release-pass-${releaseDate}`;
  const slug = sanitizeSlug(releaseName);
  if (!slug) {
    console.error('Release pass checklist name must contain at least one letter or number.');
    process.exit(1);
  }

  const releaseReadiness = loadReleaseReadiness();
  const outputPath = path.join(outputDir, `${releaseDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');
  const content = renderChecklist({ releaseName, releaseDate, releaseReadiness });

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.existsSync(outputPath) && !force) {
      console.error(`Release pass checklist already exists: ${toRelative(outputPath)}`);
      console.error('Use --force to overwrite it.');
      process.exit(1);
    }
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  console.log(dryRun ? 'Help release pass checklist dry run passed.' : 'Help release pass checklist created.');
  console.log(`Target: ${toRelative(outputPath)}`);
  console.log(`Release gates: ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length}`);
  console.log(`Verified local gates: ${releaseReadiness.verifiedLocalReleaseReadinessGates.length}`);
  console.log(`Open gates: ${releaseReadiness.openReleaseReadinessGates.length}`);
  console.log(`Open gates without approved exceptions: ${releaseReadiness.openGatesWithoutApprovedExceptions.length}`);
  console.log(`Expected evidence artifacts: ${artifactCommands.length}`);
  console.log(
    `Open gate ids: ${releaseReadiness.openReleaseReadinessGates.map((gate) => gate.id).join(', ')}`
  );
};

main();
