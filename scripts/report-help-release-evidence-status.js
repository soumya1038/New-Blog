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

const evidenceArtifacts = [
  {
    label: 'Release pass checklist',
    folder: 'release-pass-checklists',
    command: 'npm run help:release-pass-checklist -- --name <release-pass-name>',
  },
  {
    label: 'Release evidence binder',
    folder: 'release-evidence-binders',
    command: 'npm run help:release-evidence-binder -- --name <release-pass-name>',
  },
  {
    label: 'Release candidate evidence',
    folder: 'release-candidates',
    command: 'npm run help:release-candidate -- --name <release-pass-name>',
  },
  {
    label: 'Coverage approval packet',
    folder: 'coverage-approvals',
    command: 'npm run help:coverage-approval -- --name <release-pass-name>',
  },
  {
    label: 'Open gate owner handoff',
    folder: 'open-gate-owner-handoffs',
    command: 'npm run help:open-gate-handoff -- --name <release-pass-name>',
  },
  {
    label: 'Release exception decision packet',
    folder: 'release-exception-decisions',
    command: 'npm run help:exception-decision -- --name <release-pass-name>',
  },
  {
    label: 'Android evidence packet',
    folder: 'android-evidence',
    command: 'npm run help:android-evidence -- --name <release-pass-name>',
  },
  {
    label: 'Android verification worksheet',
    folder: 'android-verification',
    command: 'npm run help:android-worksheet -- --name <release-pass-name>',
  },
  {
    label: 'Accessibility verification packet',
    folder: 'accessibility-verification',
    command: 'npm run help:accessibility-verification -- --name <release-pass-name>',
  },
  {
    label: 'External verification worksheet',
    folder: 'external-verification',
    command: 'npm run help:external-worksheet -- --name <release-pass-name>',
  },
  {
    label: 'Support lifecycle packet',
    folder: 'support-lifecycle',
    command: 'npm run help:support-lifecycle -- --name <release-pass-name>',
  },
  {
    label: 'Policy approval packet',
    folder: 'policy-approvals',
    command: 'npm run help:policy-approval -- --name <release-pass-name>',
  },
  {
    label: 'Visual evidence packet',
    folder: 'visual-evidence-packets',
    command: 'npm run help:visual-evidence -- --name <release-pass-name>',
  },
  {
    label: 'Visual evidence worksheet',
    folder: 'visual-evidence',
    command: 'npm run help:visual-worksheet -- --name <release-pass-name>',
  },
  {
    label: 'Analytics approval packet',
    folder: 'analytics-approvals',
    command: 'npm run help:analytics-approval -- --name <release-pass-name>',
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

const toRelative = (filePath) => path.relative(rootDir, filePath).replace(/\\/g, '/');

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
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: releaseReadinessPath });
  return context.__releaseReadiness;
};

const artifactPathFor = ({ date, slug, folder }) =>
  path.join(planningDir, folder, `${date}-${slug}.md`);

const buildStatus = ({ releaseName, releaseDate, releaseReadiness }) => {
  const slug = sanitizeSlug(releaseName);
  const releaseEvidence = fs.existsSync(releaseEvidencePath)
    ? fs.readFileSync(releaseEvidencePath, 'utf8')
    : '';

  const artifacts = evidenceArtifacts.map((artifact) => {
    const absolutePath = artifactPathFor({ date: releaseDate, slug, folder: artifact.folder });
    const relativePath = toRelative(absolutePath);
    const exists = fs.existsSync(absolutePath);
    const linked = releaseEvidence.includes(relativePath);

    return {
      ...artifact,
      path: relativePath,
      exists,
      linked,
    };
  });

  const missingArtifacts = artifacts.filter((artifact) => !artifact.exists);
  const unlinkedArtifacts = artifacts.filter((artifact) => artifact.exists && !artifact.linked);
  const unresolvedGates = releaseReadiness.openGatesWithoutApprovedExceptions;
  const result =
    missingArtifacts.length > 0
      ? 'release evidence artifacts missing'
      : unlinkedArtifacts.length > 0
        ? 'release evidence artifacts exist but are not linked'
        : unresolvedGates.length > 0
          ? 'release evidence artifacts present; gates still require evidence or approved exceptions'
          : 'release evidence complete candidate';

  return {
    releaseName,
    releaseDate,
    slug,
    result,
    artifacts,
    missingArtifacts,
    unlinkedArtifacts,
    unresolvedGates,
    counts: {
      artifacts: artifacts.length,
      existingArtifacts: artifacts.filter((artifact) => artifact.exists).length,
      missingArtifacts: missingArtifacts.length,
      linkedArtifacts: artifacts.filter((artifact) => artifact.linked).length,
      unlinkedExistingArtifacts: unlinkedArtifacts.length,
      openGates: releaseReadiness.openReleaseReadinessGates.length,
      openGatesWithoutApprovedExceptions: unresolvedGates.length,
      approvedExceptions: releaseReadiness.approvedReleaseReadinessExceptions.length,
    },
  };
};

const renderArtifactRows = (artifacts) =>
  artifacts
    .map(
      (artifact) =>
        `| ${artifact.label} | ${artifact.exists ? 'yes' : 'no'} | ${artifact.linked ? 'yes' : 'no'} | \`${artifact.path}\` | \`${artifact.command}\` |`
    )
    .join('\n');

const renderMarkdown = ({ branch, commit, status }) => `# Lekhon Release Evidence Status

Branch: ${branch}  
Commit: ${commit}  
Release pass: ${status.releaseName}  
Release date: ${status.releaseDate}  
Result: ${status.result}

## Counts

- Evidence artifacts expected: ${status.counts.artifacts}
- Evidence artifacts existing: ${status.counts.existingArtifacts}
- Evidence artifacts missing: ${status.counts.missingArtifacts}
- Evidence artifacts linked from release evidence record: ${status.counts.linkedArtifacts}
- Existing artifacts not linked from release evidence record: ${status.counts.unlinkedExistingArtifacts}
- Open gates: ${status.counts.openGates}
- Open gates without approved exceptions: ${status.counts.openGatesWithoutApprovedExceptions}
- Approved exceptions: ${status.counts.approvedExceptions}

## Evidence Artifacts

| Artifact | Exists | Linked from release evidence | Expected path | Create command |
|---|---|---|---|---|
${renderArtifactRows(status.artifacts)}

## Open Gates Without Approved Exceptions

${
  status.unresolvedGates.length > 0
    ? status.unresolvedGates
        .map((gate) => `- ${gate.id} (${gate.status}) - ${gate.owner}`)
        .join('\n')
    : '- None'
}

## Completion Rule

Do not mark the Help Center goal complete until this command reports no missing evidence artifacts, no unlinked existing artifacts, and no open gates without approved exceptions for the current release pass.
`;

const renderJson = ({ branch, commit, status }) =>
  JSON.stringify(
    {
      branch,
      commit,
      result: status.result,
      releaseName: status.releaseName,
      releaseDate: status.releaseDate,
      counts: status.counts,
      artifacts: status.artifacts,
      missingArtifacts: status.missingArtifacts.map((artifact) => artifact.path),
      unlinkedArtifacts: status.unlinkedArtifacts.map((artifact) => artifact.path),
      openGateIdsWithoutApprovedExceptions: status.unresolvedGates.map((gate) => gate.id),
    },
    null,
    2
  );

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:release-evidence-status -- --name release-pass-name',
      '  npm run help:release-evidence-status -- --name release-pass-name --date 2026-06-28',
      '  npm run help:release-evidence-status -- --name release-pass-name --json',
      '',
      'Options:',
      '  --name <value>   Shared release pass label used for generated evidence files.',
      '  --date <value>   ISO date used for generated evidence files. Defaults to today.',
      '  --json           Print machine-readable evidence artifact status.',
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

  const releaseName = getArgValue('--name') || `help-evidence-${releaseDate}`;
  const slug = sanitizeSlug(releaseName);
  if (!slug) {
    console.error('Release evidence status name must contain at least one letter or number.');
    process.exit(1);
  }

  const releaseReadiness = loadReleaseReadiness();
  const status = buildStatus({ releaseName, releaseDate, releaseReadiness });
  const payload = {
    branch: shellValue('git rev-parse --abbrev-ref HEAD'),
    commit: shellValue('git rev-parse --short HEAD'),
    status,
  };

  console.log(hasFlag('--json') ? renderJson(payload) : renderMarkdown(payload));
};

main();
