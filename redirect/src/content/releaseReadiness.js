export const RELEASE_GATE_STATUSES = [
  'verified-local',
  'pending-external',
  'blocked-approval',
  'blocked-production',
];

export const RELEASE_EXCEPTION_STATUSES = [
  'draft',
  'approved',
  'expired',
  'rejected',
];

export const RELEASE_GATE_AREAS = [
  'automated',
  'public-web',
  'support-operations',
  'android',
  'accessibility',
  'policy',
  'visual-guidance',
  'analytics-operations',
];

export const HELP_RELEASE_READINESS_GATES = [
  {
    id: 'automated-help-registry',
    area: 'automated',
    title: 'Help, policy, footer, contextual-link, and governance source checks',
    owner: 'Engineering',
    status: 'verified-local',
    evidence: ['npm run test:help -- --runInBand'],
    protocol: '09-release-evidence-record.md',
    releaseImpact: 'Required for any Help Center, policy, footer, contextual help, or support release.',
  },
  {
    id: 'frontend-production-build',
    area: 'automated',
    title: 'Frontend production build',
    owner: 'Engineering',
    status: 'verified-local',
    evidence: ['npm run build'],
    protocol: '09-release-evidence-record.md',
    releaseImpact: 'Required before web deployment or Capacitor sync.',
  },
  {
    id: 'support-backend-syntax',
    area: 'automated',
    title: 'Support backend syntax checks',
    owner: 'Engineering',
    status: 'verified-local',
    evidence: [
      'node --check backend/controllers/supportController.js',
      'node --check backend/routes/supportRoutes.js',
      'node --check backend/models/SupportRequest.js',
    ],
    protocol: '15-support-lifecycle-cleanup-protocol.md',
    releaseImpact: 'Required when support, report, appeal, admin queue, or metrics code changes.',
  },
  {
    id: 'public-web-help-policy-safety',
    area: 'public-web',
    title: 'Public Help, policy, safety, contact, report, appeal, and footer smoke tests',
    owner: 'QA',
    status: 'verified-local',
    evidence: [
      'npm run help:public-routes',
      'Desktop and mobile public-route browser verification recorded in implementation status.',
    ],
    protocol: '09-release-evidence-record.md',
    releaseImpact: 'Required before claiming public web Help readiness.',
  },
  {
    id: 'android-debug-packaging-emulator',
    area: 'android',
    title: 'Android debug APK packaging and emulator runtime smoke test',
    owner: 'Mobile',
    status: 'verified-local',
    evidence: [
      'npx cap sync android',
      'gradlew assembleDebug',
      'APK signature verification',
      'Emulator WebView route checks',
    ],
    protocol: '16-android-oauth-permissions-verification-protocol.md',
    releaseImpact: 'Useful for development; does not prove Play Store production readiness.',
  },
  {
    id: 'physical-android-device',
    area: 'android',
    title: 'Physical Android install, route, back navigation, and storage behavior',
    owner: 'Mobile + QA',
    status: 'pending-external',
    evidence: [
      'npm run help:android-readiness',
      'npm run help:android-device-evidence',
      'npm run help:android-evidence -- --name <android-pass-name> --dry-run',
      'npm run help:android-worksheet -- --name <android-pass-name> --dry-run',
      'Physical phone install and route/back/local-save evidence',
    ],
    blockers: ['A current APK or internal-test build must be installed and tested on a real phone.'],
    protocol: '16-android-oauth-permissions-verification-protocol.md',
    releaseImpact: 'Blocks Android internal-testing readiness and Play Store readiness claims.',
  },
  {
    id: 'android-oauth-provider-return',
    area: 'android',
    title: 'Google, Facebook, X/Twitter, and LinkedIn provider return on Android',
    owner: 'Mobile + auth',
    status: 'pending-external',
    evidence: [
      'npm run help:android-readiness',
      'npm run help:android-device-evidence',
      'npm run help:android-evidence -- --name <android-pass-name> --dry-run',
      'npm run help:android-worksheet -- --name <android-pass-name> --dry-run',
      'Provider start URL, redirect URI, handoff behavior, callback domain, final app state',
    ],
    blockers: ['Provider consoles, deployed frontend URL, and deployed backend URL must match.'],
    protocol: '16-android-oauth-permissions-verification-protocol.md',
    releaseImpact: 'Blocks social sign-in readiness on Android.',
  },
  {
    id: 'android-permissions-camera-microphone',
    area: 'android',
    title: 'Camera, microphone, file, and denied-permission recovery on Android',
    owner: 'Mobile + seller QA + chat QA',
    status: 'pending-external',
    evidence: [
      'npm run help:android-readiness',
      'npm run help:android-device-evidence',
      'npm run help:android-evidence -- --name <android-pass-name> --dry-run',
      'npm run help:android-worksheet -- --name <android-pass-name> --dry-run',
      'Camera allow/deny evidence',
      'Microphone allow/deny evidence',
      'Help recovery route evidence',
    ],
    blockers: ['Physical-device permission prompts and feature flows must be tested.'],
    protocol: '16-android-oauth-permissions-verification-protocol.md',
    releaseImpact: 'Blocks Android permission readiness and Play Store disclosure confidence.',
  },
  {
    id: 'manual-screen-reader-verification',
    area: 'accessibility',
    title: 'Manual NVDA and TalkBack verification',
    owner: 'Accessibility + mobile',
    status: 'pending-external',
    evidence: [
      'npm run help:accessibility-readiness',
      'npm run help:accessibility-environment',
      'npm run help:accessibility-verification -- --name <accessibility-pass-name> --dry-run',
      'npm run help:external-worksheet -- --name <external-pass-name> --dry-run',
      'NVDA desktop evidence',
      'TalkBack physical-device evidence',
      'Focus restoration notes',
    ],
    blockers: ['Manual assistive-technology testing has not been recorded for the current release candidate.'],
    protocol: '14-accessibility-verification-protocol.md',
    releaseImpact: 'Blocks public accessibility-readiness and Android accessibility claims.',
  },
  {
    id: 'live-support-report-appeal-lifecycle',
    area: 'support-operations',
    title: 'Live or production-like support, report, appeal, admin queue, metrics, and cleanup verification',
    owner: 'Support operations + Safety',
    status: 'pending-external',
    evidence: [
      'npm run help:support-readiness',
      'npm run help:support-cleanup',
      'npm run help:support-lifecycle -- --name <support-pass-name> --dry-run',
      'npm run help:external-worksheet -- --name <external-pass-name> --dry-run',
      'Support reference',
      'Report reference',
      'Appeal reference',
      'Admin triage evidence',
      'Cleanup evidence',
    ],
    blockers: ['A cleanup owner and method must be approved before production-like records are submitted.'],
    protocol: '15-support-lifecycle-cleanup-protocol.md',
    releaseImpact: 'Blocks support operations readiness claims.',
  },
  {
    id: 'policy-specialist-approvals',
    area: 'policy',
    title: 'Legal, privacy, finance, safety, commerce, mobile, and accessibility policy approvals',
    owner: 'Program owner + specialist reviewers',
    status: 'blocked-approval',
    evidence: [
      'npm run help:policy-readiness',
      'npm run help:policy-approval -- --name <policy-pass-name> --dry-run',
      'npm run help:external-worksheet -- --name <external-pass-name> --dry-run',
      'Approval tracker entries',
      'Resolved decision register items',
      'Effective dates',
    ],
    blockers: ['Decision register items remain open and draft policies are not effective.'],
    protocol: '22-policy-publication-safety-protocol.md',
    releaseImpact: 'Blocks binding policy publication.',
  },
  {
    id: 'p0-visual-evidence-capture',
    area: 'visual-guidance',
    title: 'P0 screenshots, diagrams, clips, privacy review, and accessibility text',
    owner: 'QA + feature owners',
    status: 'blocked-production',
    evidence: [
      'npm run help:visual-readiness',
      'npm run help:visual-evidence -- --name <visual-pass-name> --dry-run',
      'npm run help:visual-worksheet -- --name <visual-pass-name> --dry-run',
      'Visual evidence notes for every unblocked P0 visual requirement',
    ],
    blockers: [
      'Physical-device OAuth, report/appeal categories, deletion/retention, refund, payout, camera, seeded data, and cleanup decisions remain incomplete.',
    ],
    protocol: '21-visual-evidence-capture-protocol.md',
    releaseImpact: 'Blocks visual-guidance production readiness.',
  },
  {
    id: 'analytics-consent-operations',
    area: 'analytics-operations',
    title: 'Help analytics, helpfulness votes, production monitoring, and owner cadence',
    owner: 'Privacy + analytics + operations',
    status: 'blocked-approval',
    evidence: [
      'npm run help:analytics-readiness',
      'npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run',
      'npm run help:external-worksheet -- --name <external-pass-name> --dry-run',
      'Consent decision',
      'Retention rule',
      'Owner cadence',
      'Monitoring evidence',
    ],
    blockers: ['Analytics consent, retention, backend storage, access control, and deletion/export rules remain open.'],
    protocol: '19-search-feedback-operations-protocol.md',
    releaseImpact: 'Blocks production Help analytics and governance-complete claims.',
  },
];

export const openReleaseReadinessGates = HELP_RELEASE_READINESS_GATES.filter(
  (gate) => gate.status !== 'verified-local'
);

export const verifiedLocalReleaseReadinessGates = HELP_RELEASE_READINESS_GATES.filter(
  (gate) => gate.status === 'verified-local'
);

export const HELP_RELEASE_EXCEPTIONS = [];

export const approvedReleaseReadinessExceptions = HELP_RELEASE_EXCEPTIONS.filter(
  (exception) => exception.status === 'approved'
);

export const openGatesWithoutApprovedExceptions = openReleaseReadinessGates.filter(
  (gate) => !approvedReleaseReadinessExceptions.some((exception) => exception.gateId === gate.id)
);

export const RELEASE_CANDIDATE_CHECKLIST = HELP_RELEASE_READINESS_GATES.map((gate) => ({
  gateId: gate.id,
  area: gate.area,
  owner: gate.owner,
  status: gate.status,
  requiredEvidence: gate.evidence,
  protocol: gate.protocol,
  releaseImpact: gate.releaseImpact,
  decision:
    gate.status === 'verified-local'
      ? 'Confirm current release candidate evidence'
      : 'Collect evidence or record approved exception before release',
}));
