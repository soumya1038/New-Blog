#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'release-candidates');
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
  RELEASE_CANDIDATE_CHECKLIST,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: releaseReadinessPath });
  return context.__releaseReadiness;
};

const formatList = (items) =>
  items && items.length > 0
    ? items.map((item) => `  - ${item}`).join('\n')
    : '  - None recorded';

const renderGateWorksheet = (gate) => `### ${gate.id}

| Field | Value |
|---|---|
| Title | ${gate.title} |
| Area | ${gate.area} |
| Owner | ${gate.owner} |
| Source status | ${gate.status} |
| Protocol | ${gate.protocol} |
| Release impact | ${gate.releaseImpact} |

Required evidence:

${formatList(gate.evidence)}

Current blockers:

${formatList(gate.blockers || [])}

Reviewer result: pass / exception / blocked

Evidence links:

- 

Notes:

- 
`;

const renderCandidate = ({ releaseName, releaseDate, releaseReadiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const openGateIds = releaseReadiness.openReleaseReadinessGates.map((gate) => gate.id);
  const unresolvedGateIds = releaseReadiness.openGatesWithoutApprovedExceptions.map((gate) => gate.id);

  return `# Help Center Release Candidate Evidence - ${releaseName}

Status: Draft release-candidate evidence  
Generated: ${releaseDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this release-candidate file as the working evidence record for the current Help Center, policy, safety, visual guidance, contextual Help, footer, support, and mobile documentation release.

This file is generated from \`redirect/src/content/releaseReadiness.js\`. Do not mark the overall Help Center goal complete from this file alone; copy final evidence and decisions back into \`09-release-evidence-record.md\` and update source gate statuses only after current evidence exists.

## 2. Release Identity

| Field | Value |
|---|---|
| Release candidate | ${releaseName} |
| Reviewer | TBD |
| Review date | ${releaseDate} |
| Frontend build | TBD |
| Backend build | TBD |
| Android artifact | TBD |
| Production frontend URL | TBD |
| Production backend URL | TBD |
| Evidence folder | TBD |
| Cleanup owner | TBD |

## 3. Gate Summary

| Metric | Count |
|---|---:|
| Release gates | ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length} |
| Verified local gates | ${releaseReadiness.verifiedLocalReleaseReadinessGates.length} |
| Open gates | ${releaseReadiness.openReleaseReadinessGates.length} |
| Open gates without approved exceptions | ${releaseReadiness.openGatesWithoutApprovedExceptions.length} |
| Release exceptions | ${releaseReadiness.HELP_RELEASE_EXCEPTIONS.length} |
| Approved release exceptions | ${releaseReadiness.approvedReleaseReadinessExceptions.length} |

Open gate ids:

${formatList(openGateIds)}

Open gate ids without approved exceptions:

${formatList(unresolvedGateIds)}

## 4. Local Commands

Run and record current output:

- \`npm run help:readiness\` from repository root.
- \`npm run help:open-gate-owners -- --json\` from repository root.
- \`npm run help:open-gate-handoff -- --name <handoff-name> --dry-run\` from repository root.
- \`npm run help:exception-decision -- --name <exception-pass-name> --dry-run\` from repository root.
- \`npm run help:coverage-approval -- --name <coverage-pass-name> --dry-run\` from repository root.
- \`npm run help:gate-closure\` from repository root.
- \`npm run help:accessibility-environment\` from repository root before manual keyboard, NVDA, and TalkBack testing.
- \`npm run help:accessibility-readiness\` from repository root.
- \`npm run help:accessibility-verification -- --name <accessibility-pass-name> --dry-run\` from repository root.
- \`npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run\` from repository root.
- \`npm run help:analytics-readiness\` from repository root.
- \`npm run help:policy-approval -- --name <policy-pass-name> --dry-run\` from repository root.
- \`npm run help:policy-readiness\` from repository root.
- \`npm run help:support-readiness\` from repository root.
- \`npm run help:support-cleanup\` from repository root before and after support lifecycle testing.
- \`npm run help:support-lifecycle -- --name <support-pass-name> --dry-run\` from repository root before support lifecycle testing.
- \`npm run help:governance\` from repository root.
- \`npm run test:help -- --runInBand\` from \`redirect\`.
- \`npm run help:public-routes\` from repository root or \`redirect\`.
- \`npm run help:release-pass-checklist -- --name <release-pass-name> --dry-run\` from repository root.
- \`npm run help:release-evidence-binder -- --name <binder-name> --dry-run\` from repository root.
- \`npm run help:release-record-audit -- --json\` from repository root.
- \`npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD>\` from repository root after generating evidence packets.
- \`npm run help:android-device-evidence\` from repository root after connecting the physical phone.
- \`npm run help:android-evidence -- --name <android-pass-name> --dry-run\` from repository root.
- \`npm run help:android-readiness\` from repository root.
- \`npm run help:android-worksheet -- --name <android-pass-name> --dry-run\` from repository root or \`redirect\`.
- \`npm run help:external-worksheet -- --name <external-pass-name> --dry-run\` from repository root or \`redirect\`.
- \`npm run help:visual-evidence -- --name <visual-pass-name> --dry-run\` from repository root.
- \`npm run help:visual-readiness\` from repository root.
- \`npm run help:visual-worksheet -- --name <visual-pass-name> --dry-run\` from repository root or \`redirect\`.
- \`npm run help:exceptions\` from repository root.
- \`npm run help:goal-audit\` from repository root.
- \`npm run build\` from \`redirect\`.
- \`node --check backend/controllers/supportController.js\`.
- \`node --check backend/routes/supportRoutes.js\`.
- \`node --check backend/models/SupportRequest.js\`.

## 5. Gate Worksheets

${releaseReadiness.HELP_RELEASE_READINESS_GATES.map(renderGateWorksheet).join('\n')}
## 6. Release Exceptions

Current release exceptions:

${formatList(
  releaseReadiness.HELP_RELEASE_EXCEPTIONS.map(
    (exception) => `${exception.id} - ${exception.gateId} - ${exception.status}`
  )
)}

Approved release exceptions:

${formatList(
  releaseReadiness.approvedReleaseReadinessExceptions.map(
    (exception) => `${exception.id} - ${exception.gateId}`
  )
)}

Do not use draft, rejected, expired, or invalid exceptions to complete a gate.

## 7. Final Decision

| Decision | Result | Owner | Date | Notes |
|---|---|---|---|---|
| Approved for public web release | TBD | TBD | TBD | TBD |
| Approved for Android internal testing | TBD | TBD | TBD | TBD |
| Approved for Play Store production | TBD | TBD | TBD | TBD |
| Approved to publish binding policies | TBD | TBD | TBD | TBD |
| Approved to claim Help Center goal complete | No | Program owner | ${releaseDate} | Keep no until every required gate has current evidence or an approved exception |

## 8. Completion Rule

Do not mark the Help Center goal complete while any required release gate remains pending, blocked, missing current evidence, or missing an approved exception with owner, risk, and next review date.
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:release-candidate -- --name rc-name',
      '  npm run help:release-candidate -- --name rc-name --date 2026-06-26',
      '  npm run help:release-candidate -- --name rc-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Release candidate label. Defaults to help-center-YYYY-MM-DD.',
      '  --date <value>   ISO date for the generated file. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated candidate file.'
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

  const releaseName = getArgValue('--name') || `help-center-${releaseDate}`;
  const slug = sanitizeSlug(releaseName);
  if (!slug) {
    console.error('Release candidate name must contain at least one letter or number.');
    process.exit(1);
  }

  const releaseReadiness = loadReleaseReadiness();
  const content = renderCandidate({ releaseName, releaseDate, releaseReadiness });
  const outputPath = path.join(outputDir, `${releaseDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.existsSync(outputPath) && !force) {
      console.error(`Release candidate file already exists: ${path.relative(rootDir, outputPath)}`);
      console.error('Use --force to overwrite it.');
      process.exit(1);
    }
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  console.log(dryRun ? 'Help release candidate dry run passed.' : 'Help release candidate created.');
  console.log(`Target: ${path.relative(rootDir, outputPath).replace(/\\/g, '/')}`);
  console.log(`Release gates: ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length}`);
  console.log(`Verified local gates: ${releaseReadiness.verifiedLocalReleaseReadinessGates.length}`);
  console.log(`Open gates: ${releaseReadiness.openReleaseReadinessGates.length}`);
  console.log(`Open gates without approved exceptions: ${releaseReadiness.openGatesWithoutApprovedExceptions.length}`);
  console.log(`Release exceptions: ${releaseReadiness.HELP_RELEASE_EXCEPTIONS.length}`);
  console.log(`Approved release exceptions: ${releaseReadiness.approvedReleaseReadinessExceptions.length}`);
  console.log(
    `Open gate ids: ${releaseReadiness.openReleaseReadinessGates.map((gate) => gate.id).join(', ')}`
  );
};

main();
