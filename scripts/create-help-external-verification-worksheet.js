#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'external-verification');
const releaseReadinessPath = path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js');
const policyContentPath = path.join(rootDir, 'redirect', 'src', 'content', 'policyContent.js');

const args = process.argv.slice(2);

const externalGateIds = [
  'manual-screen-reader-verification',
  'live-support-report-appeal-lifecycle',
  'policy-specialist-approvals',
  'analytics-consent-operations',
];

const accessibilityRoutes = [
  '/help',
  '/help/category/account-access',
  '/help/category/selling',
  '/help/article/sign-in-with-google-facebook-x-or-linkedin',
  '/help/article/add-a-product-and-save-each-section',
  '/help/article/report-abuse-fraud-or-unsafe-content',
  '/policies',
  '/safety',
  '/contact',
  '/report',
  '/appeals',
];

const supportSubmissions = [
  { type: 'support', route: '/contact', category: 'Android app' },
  { type: 'report', route: '/report', category: 'Harassment or threat' },
  { type: 'appeal', route: '/appeals', category: 'Account suspension' },
];

const analyticsDecisions = [
  'Consent wording and opt-in or opt-out model',
  'Retention period for article views, searches, and helpfulness votes',
  'Backend storage schema and aggregation level',
  'Access control for analytics dashboards or exports',
  'Deletion and export handling if feedback becomes account-linked',
  'Weekly owner cadence for zero-result and low-helpfulness review',
  'Production monitoring and alert threshold',
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

const loadReleaseReadiness = () => {
  const source = fs
    .readFileSync(releaseReadinessPath, 'utf8')
    .replace(/export const /g, 'const ')
    .concat(`
globalThis.__releaseReadiness = {
  HELP_RELEASE_READINESS_GATES,
  openReleaseReadinessGates,
  verifiedLocalReleaseReadinessGates,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: releaseReadinessPath });
  return context.__releaseReadiness;
};

const loadPolicyContent = () => {
  const source = fs
    .readFileSync(policyContentPath, 'utf8')
    .replace(/export const /g, 'const ')
    .concat(`
globalThis.__policyContent = {
  policyDocuments,
  POLICY_REQUIRED_APPROVALS,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: policyContentPath });
  return context.__policyContent;
};

const formatList = (items) =>
  items && items.length > 0
    ? items.map((item) => `  - ${item}`).join('\n')
    : '  - None recorded';

const formatInline = (items) => (items && items.length > 0 ? items.join(', ') : 'None');

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

const renderAccessibilityRoutes = () =>
  accessibilityRoutes
    .map(
      (route) =>
        `| ${route} | keyboard | NVDA | TalkBack where applicable | text zoom/reflow | focus/back behavior | TBD |`
    )
    .join('\n');

const renderSupportRows = () =>
  supportSubmissions
    .map(
      (entry) =>
        `| ${entry.type} | ${entry.route} | ${entry.category} | QA-CLEANUP ${todayISO()} - ${entry.type} | TBD | TBD | TBD |`
    )
    .join('\n');

const renderPolicyRows = (draftPolicies) =>
  draftPolicies
    .map(
      (policy) =>
        `| ${policy.title} | ${policy.slug} | ${formatInline(policy.owners)} | ${formatInline(
          policy.blockingDecisionIds
        )} | ${formatInline(policy.approvalRequirements)} | ${policy.effectiveDate} | blocked |`
    )
    .join('\n');

const renderAnalyticsRows = () =>
  analyticsDecisions
    .map((decision) => `| ${decision} | Privacy + analytics + operations | blocked | TBD | TBD |`)
    .join('\n');

const renderWorksheet = ({ worksheetName, worksheetDate, releaseReadiness, policyContent }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const gates = releaseReadiness.HELP_RELEASE_READINESS_GATES.filter((gate) =>
    externalGateIds.includes(gate.id)
  );
  const openGates = gates.filter((gate) => gate.status !== 'verified-local');
  const draftPolicies = policyContent.policyDocuments.filter((policy) => !policy.isBinding);
  const publishedPolicies = policyContent.policyDocuments.filter((policy) => policy.isBinding);
  const blockingDecisionIds = [
    ...new Set(draftPolicies.flatMap((policy) => policy.blockingDecisionIds || [])),
  ].sort();

  return `# Help External Verification Worksheet - ${worksheetName}

Status: Draft external verification worksheet  
Generated: ${worksheetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this worksheet to collect the non-Android, non-visual external evidence that local automated checks cannot prove: manual accessibility, support/report/appeal operations, policy approvals, and analytics/privacy operations.

This file is generated from \`redirect/src/content/releaseReadiness.js\` and \`redirect/src/content/policyContent.js\`. Do not mark any external gate verified from this worksheet alone; update source gate statuses, policy publication states, approval trackers, and the release evidence record only after current evidence and approvals exist.

## 2. Summary

| Metric | Count |
|---|---:|
| External verification gates | ${gates.length} |
| Open external verification gates | ${openGates.length} |
| Draft policy records | ${draftPolicies.length} |
| Published policy records | ${publishedPolicies.length} |
| Unique draft policy blockers | ${blockingDecisionIds.length} |

Open gate ids:

${formatList(openGates.map((gate) => gate.id))}

Draft policy blocker ids:

${formatList(blockingDecisionIds)}

## 3. Required Local Commands

Run and record current output before external verification:

- \`npm run help:governance\` from repository root.
- \`npm run help:accessibility-environment\` from repository root before manual keyboard, NVDA, and TalkBack testing.
- \`npm run help:accessibility-verification -- --name <accessibility-pass-name> --dry-run\` from repository root before manual screen-reader verification.
- \`npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run\` from repository root before analytics and consent approval.
- \`npm run help:analytics-readiness\` from repository root.
- \`npm run help:support-cleanup\` from repository root before and after support lifecycle testing.
- \`npm run help:support-lifecycle -- --name <support-pass-name> --dry-run\` from repository root before support lifecycle testing.
- \`npm run test:help -- --runInBand\` from \`redirect\`.
- \`npm run help:public-routes\` from repository root or \`redirect\`.
- \`npm run help:release-candidate -- --name <release-candidate-name> --dry-run\` from repository root.
- \`npm run help:policy-approval -- --name <policy-pass-name> --dry-run\` from repository root before specialist policy approval.
- \`npm run help:exceptions\` from repository root.
- \`npm run help:gate-closure -- --json\` from repository root before promoting external gates.
- \`npm run help:goal-audit\` from repository root.
- \`npm run build\` from \`redirect\`.

## 4. Manual Accessibility Worksheet

Accessibility verification packet:

| Field | Value |
|---|---|
| Packet command | \`npm run help:accessibility-verification -- --name <accessibility-pass-name>\` |
| Packet path | TBD |
| Accessibility owner | TBD |
| Mobile owner | TBD |

| Route or workflow | Keyboard | NVDA | TalkBack | Reflow/text zoom | Focus/back behavior | Result |
|---|---|---|---|---|---|---|
${renderAccessibilityRoutes()}

Assistive technology identity:

| Field | Value |
|---|---|
| NVDA version | TBD |
| Desktop browser/version | TBD |
| Accessibility environment command | TBD |
| Android device/model | TBD |
| Android version | TBD |
| TalkBack version | TBD |
| App build or URL | TBD |
| Tester | TBD |
| Evidence folder | TBD |

## 5. Support, Report, Appeal Lifecycle Worksheet

Do not submit production-like records until cleanup is approved.

Support lifecycle packet:

| Field | Value |
|---|---|
| Packet command | \`npm run help:support-lifecycle -- --name <support-pass-name>\` |
| Packet path | TBD |
| Support operations owner | TBD |
| Cleanup owner | TBD |

| Type | Route | Category | Subject prefix | Reference number | Admin queue evidence | Cleanup result |
|---|---|---|---|---|---|---|
${renderSupportRows()}

Admin operations:

| Check | Result | Evidence |
|---|---|---|
| Metrics loaded | TBD | TBD |
| Urgent/high priority visible | TBD | TBD |
| Unassigned queue visible | TBD | TBD |
| Assignment or unassignment works | TBD | TBD |
| Status update works | TBD | TBD |
| Priority update works | TBD | TBD |
| Admin note added without sensitive data | TBD | TBD |
| Cleanup completed | TBD | TBD |
| Cleanup dry-run evidence captured | TBD | TBD |

## 6. Policy Approval Worksheet

Published policies must stay separate from draft policies until approval evidence exists.

Policy approval packet:

| Field | Value |
|---|---|
| Packet command | \`npm run help:policy-approval -- --name <policy-pass-name>\` |
| Packet path | TBD |
| Program owner | TBD |

| Draft policy | Slug | Owners | Blocking decisions | Required approvals | Effective date | Release result |
|---|---|---|---|---|---|---|
${renderPolicyRows(draftPolicies)}

Promotion evidence required for each policy:

${formatList(policyContent.POLICY_REQUIRED_APPROVALS)}

## 7. Analytics And Operations Worksheet

Keep Help feedback local-only until these decisions are approved.

Analytics approval packet:

| Field | Value |
|---|---|
| Packet command | \`npm run help:analytics-approval -- --name <analytics-pass-name>\` |
| Packet path | TBD |
| Privacy owner | TBD |
| Analytics owner | TBD |
| Operations owner | TBD |

| Decision | Owner | Current result | Evidence | Next action |
|---|---|---|---|---|
${renderAnalyticsRows()}

## 8. Gate Worksheets

${gates.map(renderGateWorksheet).join('\n')}
## 9. Final External Verification Decision

| Decision | Result | Owner | Date | Notes |
|---|---|---|---|---|
| Manual accessibility ready | no | Accessibility + mobile | ${worksheetDate} | Keep no until keyboard, NVDA, TalkBack, reflow, and focus evidence exist |
| Support operations ready | no | Support operations + Safety | ${worksheetDate} | Keep no until lifecycle and cleanup evidence exist |
| Binding policy publication ready | no | Program owner + specialist reviewers | ${worksheetDate} | Keep no until draft blockers and approvals are resolved |
| Help analytics operations ready | no | Privacy + analytics + operations | ${worksheetDate} | Keep no until consent, retention, storage, access, deletion/export, and cadence decisions are approved |

## 10. Completion Rule

Do not mark the Help Center goal complete while any external verification gate remains pending, blocked, missing evidence, or missing an approved exception with owner, risk, and next review date.
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:external-worksheet -- --name external-pass-name',
      '  npm run help:external-worksheet -- --name external-pass-name --date 2026-06-26',
      '  npm run help:external-worksheet -- --name external-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   External verification pass label. Defaults to help-external-YYYY-MM-DD.',
      '  --date <value>   ISO date for the generated file. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated worksheet.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const worksheetDate = getArgValue('--date') || todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(worksheetDate)) {
    console.error(`Invalid --date value: ${worksheetDate}`);
    process.exit(1);
  }

  const worksheetName = getArgValue('--name') || `help-external-${worksheetDate}`;
  const slug = sanitizeSlug(worksheetName);
  if (!slug) {
    console.error('External worksheet name must contain at least one letter or number.');
    process.exit(1);
  }

  const releaseReadiness = loadReleaseReadiness();
  const policyContent = loadPolicyContent();
  const content = renderWorksheet({ worksheetName, worksheetDate, releaseReadiness, policyContent });
  const outputPath = path.join(outputDir, `${worksheetDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');
  const gates = releaseReadiness.HELP_RELEASE_READINESS_GATES.filter((gate) =>
    externalGateIds.includes(gate.id)
  );
  const openGates = gates.filter((gate) => gate.status !== 'verified-local');
  const draftPolicies = policyContent.policyDocuments.filter((policy) => !policy.isBinding);
  const blockingDecisionIds = [
    ...new Set(draftPolicies.flatMap((policy) => policy.blockingDecisionIds || [])),
  ].sort();

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.existsSync(outputPath) && !force) {
      console.error(`External verification worksheet already exists: ${path.relative(rootDir, outputPath)}`);
      console.error('Use --force to overwrite it.');
      process.exit(1);
    }
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  console.log(dryRun ? 'Help external verification worksheet dry run passed.' : 'Help external verification worksheet created.');
  console.log(`Target: ${path.relative(rootDir, outputPath).replace(/\\/g, '/')}`);
  console.log(`External verification gates: ${gates.length}`);
  console.log(`Open external verification gates: ${openGates.length}`);
  console.log(`Draft policy records: ${draftPolicies.length}`);
  console.log(`Unique draft policy blockers: ${blockingDecisionIds.length}`);
  console.log(`Open gate ids: ${openGates.map((gate) => gate.id).join(', ')}`);
};

main();
