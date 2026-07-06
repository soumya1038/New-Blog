#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const releaseReadinessPath = path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js');

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const toRelative = (filePath) => path.relative(rootDir, filePath).replace(/\\/g, '/');

const shellValue = (command) => {
  try {
    return execSync(command, { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    return 'unknown';
  }
};

const readText = (relativePath) => {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
};

const fileExists = (relativePath) => fs.existsSync(path.join(rootDir, relativePath));

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

const requirementDefinitions = [
  {
    id: 'feature-workflow-audit',
    title: 'Audit every application feature and user workflow',
    evidenceFiles: [
      'docs/help-center-planning/01-application-audit.md',
      'docs/help-center-planning/02-coverage-matrix.md',
      'docs/help-center-planning/17-route-navigation-registry.md',
    ],
    sourceTokens: [
      ['docs/help-center-planning/01-application-audit.md', ['Native app skips the web landing page']],
      ['docs/help-center-planning/02-coverage-matrix.md', ['Seller application', 'Direct messages']],
      ['docs/help-center-planning/17-route-navigation-registry.md', ['public route', 'Android']],
    ],
    gateIds: [],
  },
  {
    id: 'coverage-matrix-approval',
    title: 'Approve a comprehensive coverage matrix',
    evidenceFiles: [
      'docs/help-center-planning/02-coverage-matrix.md',
      'docs/help-center-planning/04-delivery-and-governance.md',
      'docs/help-center-planning/README.md',
      'scripts/create-help-coverage-approval-packet.js',
    ],
    sourceTokens: [
      ['docs/help-center-planning/README.md', ['G1 - Coverage approved']],
      ['docs/help-center-planning/04-delivery-and-governance.md', ['Release gate']],
      ['scripts/create-help-coverage-approval-packet.js', ['Help Coverage Approval Packet']],
    ],
    gateIds: ['policy-specialist-approvals'],
  },
  {
    id: 'help-center-guidance',
    title: 'Build Help Center guidance',
    evidenceFiles: [
      'redirect/src/content/helpCenterContent.js',
      'redirect/src/pages/HelpCenter.jsx',
      'redirect/src/pages/HelpCategory.jsx',
      'redirect/src/pages/HelpArticle.jsx',
    ],
    sourceTokens: [
      ['redirect/src/content/helpCenterContent.js', ['helpArticles', 'helpCategories']],
      ['redirect/src/pages/HelpCenter.jsx', ['Search the Lekhon Help Center']],
      ['redirect/src/pages/HelpArticle.jsx', ['Rate this Help guide']],
    ],
    gateIds: ['automated-help-registry', 'public-web-help-policy-safety'],
  },
  {
    id: 'policy-documentation-safety',
    title: 'Build policy documentation safely',
    evidenceFiles: [
      'redirect/src/content/policyContent.js',
      'redirect/src/pages/PolicyCenter.jsx',
      'redirect/src/pages/PolicyDetail.jsx',
      'docs/help-center-planning/22-policy-publication-safety-protocol.md',
    ],
    sourceTokens: [
      ['redirect/src/content/policyContent.js', ['POLICY_PUBLICATION_STATES', 'POLICY_REQUIRED_APPROVALS']],
      ['redirect/src/pages/PolicyDetail.jsx', ['Publication state']],
      ['docs/help-center-planning/22-policy-publication-safety-protocol.md', ['binding policy']],
    ],
    gateIds: ['policy-specialist-approvals'],
  },
  {
    id: 'safety-support-report-appeal',
    title: 'Build safety, support, report, and appeal documentation',
    evidenceFiles: [
      'redirect/src/pages/SafetyCenter.jsx',
      'redirect/src/pages/SupportRequest.jsx',
      'backend/controllers/supportController.js',
      'backend/routes/supportRoutes.js',
      'backend/models/SupportRequest.js',
      'docs/help-center-planning/15-support-lifecycle-cleanup-protocol.md',
    ],
    sourceTokens: [
      ['redirect/src/pages/SupportRequest.jsx', ["if (pathname === '/report') return 'report'", "if (pathname === '/appeals') return 'appeal'"]],
      ['backend/controllers/supportController.js', ['getAdminSupportMetrics', 'createSupportRequest']],
      ['docs/help-center-planning/15-support-lifecycle-cleanup-protocol.md', ['cleanup owner']],
    ],
    gateIds: ['support-backend-syntax', 'live-support-report-appeal-lifecycle'],
  },
  {
    id: 'visual-guidance-system',
    title: 'Build visual guidance',
    evidenceFiles: [
      'redirect/src/content/helpCenterContent.js',
      'docs/help-center-planning/11-visual-guidance-inventory.md',
      'docs/help-center-planning/21-visual-evidence-capture-protocol.md',
      'scripts/report-help-visual-readiness.js',
      'scripts/create-help-visual-evidence-worksheet.js',
    ],
    sourceTokens: [
      ['redirect/src/content/helpCenterContent.js', ['HELP_VISUAL_REQUIREMENTS']],
      ['scripts/report-help-visual-readiness.js', ['Open P0 Requirements']],
      ['scripts/create-help-visual-evidence-worksheet.js', ['P0 open requirements']],
    ],
    gateIds: ['p0-visual-evidence-capture'],
  },
  {
    id: 'contextual-help-system',
    title: 'Build contextual Help',
    evidenceFiles: [
      'docs/help-center-planning/12-contextual-help-inventory.md',
      'redirect/src/content/helpCenterContent.test.js',
      'redirect/src/pages/AddProduct.js',
      'redirect/src/pages/SellerDashboard.js',
    ],
    sourceTokens: [
      ['docs/help-center-planning/12-contextual-help-inventory.md', ['Contextual Help']],
      ['redirect/src/content/helpCenterContent.test.js', ['getSourceHelpLinks']],
      ['redirect/src/pages/AddProduct.js', ['/help/article/add-and-save-product']],
    ],
    gateIds: ['automated-help-registry', 'public-web-help-policy-safety'],
  },
  {
    id: 'footer-navigation-system',
    title: 'Build footer navigation',
    evidenceFiles: [
      'redirect/src/components/PublicFooter.js',
      'redirect/src/components/PublicFooter.css',
      'docs/help-center-planning/13-footer-navigation-inventory.md',
      'scripts/verify-help-public-routes.js',
    ],
    sourceTokens: [
      ['redirect/src/components/PublicFooter.js', ['footerColumns', 'Lekhon public footer']],
      ['redirect/src/components/PublicFooter.css', ['public-footer']],
      ['scripts/verify-help-public-routes.js', ['footerRequiredTargets']],
    ],
    gateIds: ['automated-help-registry', 'public-web-help-policy-safety'],
  },
  {
    id: 'android-mobile-support',
    title: 'Support Android mobile behavior',
    evidenceFiles: [
      'redirect/capacitor.config.ts',
      'redirect/android/app/src/main/AndroidManifest.xml',
      'redirect/src/App.js',
      'docs/help-center-planning/16-android-oauth-permissions-verification-protocol.md',
      'scripts/report-help-android-readiness.js',
    ],
    sourceTokens: [
      ['redirect/capacitor.config.ts', ["appId: 'com.lekhon.app'", "androidScheme: 'https'"]],
      ['redirect/android/app/src/main/AndroidManifest.xml', ['android.permission.CAMERA', 'android:launchMode="singleTask"']],
      ['redirect/src/App.js', ["CapacitorApp.addListener('backButton'", 'runningNativeApp ? <Navigate to="/home" replace /> : <LandingPage />']],
    ],
    gateIds: [
      'android-debug-packaging-emulator',
      'physical-android-device',
      'android-oauth-provider-return',
      'android-permissions-camera-microphone',
    ],
  },
  {
    id: 'ownership-review-governance',
    title: 'Maintain ownership and review governance',
    evidenceFiles: [
      'docs/help-center-planning/08-operations-runbook.md',
      'docs/help-center-planning/18-content-ownership-review-protocol.md',
      'docs/help-center-planning/19-search-feedback-operations-protocol.md',
      'scripts/report-help-analytics-readiness.js',
    ],
    sourceTokens: [
      ['docs/help-center-planning/08-operations-runbook.md', ['owner', 'review']],
      ['redirect/src/content/helpCenterContent.js', ['HELP_REVIEW_TRIGGERS', 'HELP_SEARCH_REVIEW_SIGNALS']],
      ['scripts/report-help-analytics-readiness.js', ['local analytics safeguards ready; production analytics approval required']],
    ],
    gateIds: ['analytics-consent-operations'],
  },
  {
    id: 'controlled-release-verification',
    title: 'Verify release readiness in controlled phases',
    evidenceFiles: [
      'redirect/src/content/releaseReadiness.js',
      'docs/help-center-planning/09-release-evidence-record.md',
      'docs/help-center-planning/23-release-readiness-gate-protocol.md',
      'docs/help-center-planning/24-release-candidate-execution-checklist.md',
      'docs/help-center-planning/25-goal-completion-audit.md',
      'docs/help-center-planning/26-release-exception-register.md',
      'scripts/report-help-readiness.js',
      'scripts/create-help-release-pass-checklist.js',
      'scripts/create-help-release-evidence-binder.js',
      'scripts/create-help-release-candidate.js',
      'scripts/report-help-release-record-audit.js',
      'scripts/report-help-release-evidence-status.js',
      'scripts/report-help-exceptions.js',
      'scripts/create-help-release-exception-decision-packet.js',
      'scripts/create-help-coverage-approval-packet.js',
      'scripts/report-help-gate-closure-readiness.js',
      'scripts/report-help-goal-audit.js',
      'scripts/create-help-open-gate-owner-handoff.js',
      'scripts/report-help-open-gate-owners.js',
    ],
    sourceTokens: [
      ['redirect/src/content/releaseReadiness.js', ['HELP_RELEASE_READINESS_GATES', 'HELP_RELEASE_EXCEPTIONS', 'openReleaseReadinessGates']],
      ['docs/help-center-planning/25-goal-completion-audit.md', ['Current result: not complete']],
      ['docs/help-center-planning/26-release-exception-register.md', ['Current approved exceptions: none']],
      ['scripts/report-help-readiness.js', ['Completion Rule']],
      ['scripts/create-help-release-pass-checklist.js', ['Help Release Pass Checklist']],
      ['scripts/report-help-release-record-audit.js', ['Lekhon Release Evidence Record Audit']],
      ['scripts/report-help-release-evidence-status.js', ['Lekhon Release Evidence Status']],
      ['scripts/create-help-release-exception-decision-packet.js', ['Help Release Exception Decision Packet']],
      ['scripts/create-help-coverage-approval-packet.js', ['Help Coverage Approval Packet']],
      ['scripts/report-help-gate-closure-readiness.js', ['Lekhon Gate Closure Readiness Summary']],
      ['scripts/create-help-open-gate-owner-handoff.js', ['Help Open Gate Owner Handoff']],
      ['scripts/report-help-open-gate-owners.js', ['Lekhon Open Gate Owner Summary']],
    ],
    gateIds: 'all',
  },
];

const sourceCheck = ([relativePath, tokens]) => {
  const text = readText(relativePath);
  const missingTokens = tokens.filter((token) => !text.includes(token));

  return {
    file: relativePath,
    passed: text.length > 0 && missingTokens.length === 0,
    missingTokens,
  };
};

const evaluateRequirements = (releaseReadiness) => {
  const gateById = new Map(releaseReadiness.HELP_RELEASE_READINESS_GATES.map((gate) => [gate.id, gate]));
  const unresolvedGateIds = new Set(
    releaseReadiness.openGatesWithoutApprovedExceptions.map((gate) => gate.id)
  );

  return requirementDefinitions.map((requirement) => {
    const fileChecks = requirement.evidenceFiles.map((relativePath) => ({
      file: relativePath,
      passed: fileExists(relativePath),
    }));
    const tokenChecks = requirement.sourceTokens.map(sourceCheck);
    const sourceReady =
      fileChecks.every((check) => check.passed) && tokenChecks.every((check) => check.passed);
    const gateIds =
      requirement.gateIds === 'all'
        ? releaseReadiness.HELP_RELEASE_READINESS_GATES.map((gate) => gate.id)
        : requirement.gateIds;
    const openGateIds = gateIds
      .map((gateId) => gateById.get(gateId))
      .filter((gate) => gate && unresolvedGateIds.has(gate.id))
      .map((gate) => gate.id);
    const status = !sourceReady
      ? 'source-gap'
      : openGateIds.length > 0
        ? 'external-evidence-required'
        : 'verified-local';

    return {
      id: requirement.id,
      title: requirement.title,
      status,
      sourceReady,
      fileChecks,
      tokenChecks,
      controllingGates: gateIds,
      openGateIds,
    };
  });
};

const countBy = (items, key) =>
  items.reduce((counts, item) => {
    counts[item[key]] = (counts[item[key]] || 0) + 1;
    return counts;
  }, {});

const renderFailedChecks = (requirement) => {
  const missingFiles = requirement.fileChecks
    .filter((check) => !check.passed)
    .map((check) => `  - Missing file: ${check.file}`);
  const missingTokens = requirement.tokenChecks
    .filter((check) => !check.passed)
    .flatMap((check) =>
      check.missingTokens.map((token) => `  - ${check.file} missing token: ${token}`)
    );
  const lines = [...missingFiles, ...missingTokens];
  return lines.length > 0 ? lines : ['  - None'];
};

const renderMarkdown = ({ branch, commit, releaseReadiness, requirements }) => {
  const openGates = releaseReadiness.openReleaseReadinessGates;
  const unresolvedGates = releaseReadiness.openGatesWithoutApprovedExceptions;
  const exceptions = releaseReadiness.HELP_RELEASE_EXCEPTIONS;
  const approvedExceptions = releaseReadiness.approvedReleaseReadinessExceptions;
  const sourceGaps = requirements.filter((requirement) => requirement.status === 'source-gap');
  const evidenceRequired = requirements.filter(
    (requirement) => requirement.status === 'external-evidence-required'
  );
  const verifiedLocal = requirements.filter((requirement) => requirement.status === 'verified-local');
  const result =
    sourceGaps.length === 0 && unresolvedGates.length === 0 ? 'complete candidate' : 'not complete';

  const lines = [
    '# Lekhon Help Goal Audit Summary',
    '',
    `Branch: ${branch}`,
    `Commit: ${commit}`,
    `Result: ${result}`,
    '',
    '## Requirement Counts',
    '',
    `- Objective requirements: ${requirements.length}`,
    `- Verified local requirements: ${verifiedLocal.length}`,
    `- Requirements waiting on external evidence: ${evidenceRequired.length}`,
    `- Requirements with source gaps: ${sourceGaps.length}`,
    `- Release gates: ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length}`,
    `- Open release gates: ${openGates.length}`,
    `- Open release gates without approved exceptions: ${unresolvedGates.length}`,
    `- Release exceptions: ${exceptions.length}`,
    `- Approved release exceptions: ${approvedExceptions.length}`,
    '',
    '## Open Release Gates',
    '',
    ...(openGates.length > 0
      ? openGates.map((gate) => `- ${gate.id} (${gate.status}) - ${gate.owner}`)
      : ['- None']),
    '',
    '## Open Release Gates Without Approved Exceptions',
    '',
    ...(unresolvedGates.length > 0
      ? unresolvedGates.map((gate) => `- ${gate.id} (${gate.status}) - ${gate.owner}`)
      : ['- None']),
    '',
    '## Objective Requirements',
    '',
    ...requirements.flatMap((requirement) => [
      `### ${requirement.id}`,
      '',
      `- Title: ${requirement.title}`,
      `- Status: ${requirement.status}`,
      `- Source ready: ${requirement.sourceReady ? 'yes' : 'no'}`,
      `- Open controlling gates: ${
        requirement.openGateIds.length > 0 ? requirement.openGateIds.join(', ') : 'none'
      }`,
      '- Source gaps:',
      ...renderFailedChecks(requirement),
      '',
    ]),
    '## Completion Rule',
    '',
    'Do not mark the Help Center goal complete unless this command reports no source gaps and no open release gates without approved exceptions, and the release-candidate evidence record contains current proof or approved exceptions for every gate.',
    '',
  ];

  return lines.join('\n');
};

const renderJson = ({ branch, commit, releaseReadiness, requirements }) => {
  const openGates = releaseReadiness.openReleaseReadinessGates;
  const unresolvedGates = releaseReadiness.openGatesWithoutApprovedExceptions;
  const statusCounts = countBy(requirements, 'status');
  const sourceGaps = requirements.filter((requirement) => requirement.status === 'source-gap');
  const result =
    sourceGaps.length === 0 && unresolvedGates.length === 0 ? 'complete candidate' : 'not complete';

  return JSON.stringify(
    {
      branch,
      commit,
      result,
      requirementCounts: {
        total: requirements.length,
        byStatus: statusCounts,
      },
      gateCounts: {
        total: releaseReadiness.HELP_RELEASE_READINESS_GATES.length,
        verifiedLocal: releaseReadiness.verifiedLocalReleaseReadinessGates.length,
        open: openGates.length,
        openWithoutApprovedExceptions: unresolvedGates.length,
      },
      exceptionCounts: {
        total: releaseReadiness.HELP_RELEASE_EXCEPTIONS.length,
        approved: releaseReadiness.approvedReleaseReadinessExceptions.length,
      },
      openGateIds: openGates.map((gate) => gate.id),
      openGateIdsWithoutApprovedExceptions: unresolvedGates.map((gate) => gate.id),
      approvedExceptions: releaseReadiness.approvedReleaseReadinessExceptions,
      requirements: requirements.map((requirement) => ({
        id: requirement.id,
        title: requirement.title,
        status: requirement.status,
        sourceReady: requirement.sourceReady,
        controllingGates: requirement.controllingGates,
        openGateIds: requirement.openGateIds,
        missingFiles: requirement.fileChecks
          .filter((check) => !check.passed)
          .map((check) => check.file),
        missingTokens: requirement.tokenChecks
          .filter((check) => !check.passed)
          .map((check) => ({
            file: check.file,
            tokens: check.missingTokens,
          })),
      })),
    },
    null,
    2
  );
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:goal-audit',
      '  npm run help:goal-audit -- --json',
      '',
      'Options:',
      '  --json   Print machine-readable objective audit data.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  if (!fs.existsSync(planningDir) || !fs.existsSync(releaseReadinessPath)) {
    console.error('Help Center planning directory or release readiness registry is missing.');
    process.exit(1);
  }

  const releaseReadiness = loadReleaseReadiness();
  const requirements = evaluateRequirements(releaseReadiness);
  const payload = {
    branch: shellValue('git rev-parse --abbrev-ref HEAD'),
    commit: shellValue('git rev-parse --short HEAD'),
    releaseReadiness,
    requirements,
  };

  console.log(hasFlag('--json') ? renderJson(payload) : renderMarkdown(payload));
};

main();
