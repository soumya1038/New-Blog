#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'coverage-approvals');
const releaseReadinessPath = path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js');

const args = process.argv.slice(2);

const sourceDocs = [
  {
    path: 'docs/help-center-planning/01-application-audit.md',
    purpose: 'Confirm every major product area, role, and mobile/web workflow was audited.',
  },
  {
    path: 'docs/help-center-planning/02-coverage-matrix.md',
    purpose: 'Confirm each feature maps to guidance, policy, safety, visual, contextual, or operations coverage.',
  },
  {
    path: 'docs/help-center-planning/03-information-architecture.md',
    purpose: 'Confirm public Help, policy, safety, support, and footer navigation surfaces match the matrix.',
  },
  {
    path: 'docs/help-center-planning/04-delivery-and-governance.md',
    purpose: 'Confirm delivery phases, owners, approval checkpoints, and release gates are still valid.',
  },
  {
    path: 'docs/help-center-planning/17-route-navigation-registry.md',
    purpose: 'Confirm web, Android, and footer routes stay connected to approved Help destinations.',
  },
  {
    path: 'docs/help-center-planning/25-goal-completion-audit.md',
    purpose: 'Confirm the objective-level completion boundary still blocks incomplete release claims.',
  },
];

const objectiveCoverageRows = [
  {
    requirement: 'Audit every application feature and user workflow',
    sources: '01-application-audit.md, 02-coverage-matrix.md, 17-route-navigation-registry.md',
    approvalOwner: 'Program owner + product owners',
    decision: 'approve / changes requested',
  },
  {
    requirement: 'Approve a comprehensive coverage matrix',
    sources: '02-coverage-matrix.md, 04-delivery-and-governance.md, this coverage approval packet',
    approvalOwner: 'Program owner + policy/product reviewers',
    decision: 'approve / changes requested',
  },
  {
    requirement: 'Build Help Center guidance',
    sources: 'helpCenterContent.js, HelpCenter.jsx, HelpCategory.jsx, HelpArticle.jsx',
    approvalOwner: 'Content owners + Engineering',
    decision: 'approve / changes requested',
  },
  {
    requirement: 'Build policy documentation safely',
    sources: 'policyContent.js, PolicyCenter.jsx, PolicyDetail.jsx, 22-policy-publication-safety-protocol.md',
    approvalOwner: 'Legal/privacy/safety reviewers',
    decision: 'blocked until specialist approval',
  },
  {
    requirement: 'Build safety, support, report, and appeal documentation',
    sources: 'SafetyCenter.jsx, SupportRequest.jsx, support backend, 15-support-lifecycle-cleanup-protocol.md',
    approvalOwner: 'Support operations + Safety',
    decision: 'approve / changes requested',
  },
  {
    requirement: 'Build visual guidance',
    sources: 'HELP_VISUAL_REQUIREMENTS, 11-visual-guidance-inventory.md, 21-visual-evidence-capture-protocol.md',
    approvalOwner: 'QA + feature owners',
    decision: 'blocked until P0 evidence capture',
  },
  {
    requirement: 'Build contextual Help',
    sources: '12-contextual-help-inventory.md, AddProduct.js, SellerDashboard.js, Help link tests',
    approvalOwner: 'Product owners + Engineering',
    decision: 'approve / changes requested',
  },
  {
    requirement: 'Build footer navigation',
    sources: 'PublicFooter.js, PublicFooter.css, 13-footer-navigation-inventory.md, public route verifier',
    approvalOwner: 'Product owners + Engineering',
    decision: 'approve / changes requested',
  },
  {
    requirement: 'Support Android mobile behavior',
    sources: 'capacitor.config.ts, AndroidManifest.xml, App.js, 16-android-oauth-permissions-verification-protocol.md',
    approvalOwner: 'Mobile + QA',
    decision: 'blocked until physical-device evidence',
  },
  {
    requirement: 'Maintain ownership and review governance',
    sources: '08-operations-runbook.md, 18-content-ownership-review-protocol.md, 19-search-feedback-operations-protocol.md',
    approvalOwner: 'Program owner + operations owners',
    decision: 'approve / changes requested',
  },
  {
    requirement: 'Verify release readiness in controlled phases',
    sources: '09-release-evidence-record.md, 23-release-readiness-gate-protocol.md, 24-release-candidate-execution-checklist.md',
    approvalOwner: 'Program owner + release owners',
    decision: 'blocked until open gates have evidence or approved exceptions',
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

const summarizeDoc = (sourceDoc) => {
  const absolutePath = path.join(rootDir, sourceDoc.path);
  const exists = fs.existsSync(absolutePath);
  const text = exists ? fs.readFileSync(absolutePath, 'utf8') : '';
  const headings = (text.match(/^#{1,3}\s+/gm) || []).length;
  const tableRows = text
    .split(/\r?\n/)
    .filter((line) => /^\|/.test(line.trim()) && !/^\|\s*-/.test(line.trim())).length;

  return {
    ...sourceDoc,
    exists,
    headings,
    tableRows,
  };
};

const formatList = (items) =>
  items && items.length > 0 ? items.map((item) => `  - ${item}`).join('\n') : '  - None recorded';

const renderSourceRows = (sources) =>
  sources
    .map(
      (source) =>
        `| \`${source.path}\` | ${source.exists ? 'yes' : 'no'} | ${source.headings} | ${source.tableRows} | ${source.purpose} |`
    )
    .join('\n');

const renderObjectiveRows = () =>
  objectiveCoverageRows
    .map(
      (row) =>
        `| ${row.requirement} | ${row.sources} | ${row.approvalOwner} | ${row.decision} | TBD |`
    )
    .join('\n');

const renderGateRows = (gates) =>
  gates
    .map(
      (gate) =>
        `| ${gate.id} | ${gate.status} | ${gate.owner} | ${gate.protocol} | ${gate.releaseImpact} |`
    )
    .join('\n');

const renderPacket = ({ packetName, packetDate, releaseReadiness }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const sources = sourceDocs.map(summarizeDoc);
  const openGateIds = releaseReadiness.openReleaseReadinessGates.map((gate) => gate.id);
  const unresolvedGateIds = releaseReadiness.openGatesWithoutApprovedExceptions.map((gate) => gate.id);

  return `# Help Coverage Approval Packet - ${packetName}

Status: Draft coverage approval packet; not release approval  
Generated: ${packetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this packet to review and approve the Lekhon Help Center application audit and feature-to-documentation coverage matrix before claiming that the Help Center scope is complete.

This packet checks whether the documented coverage plan is reviewable and owner-approved. It does not close external release gates, publish binding policies, replace manual mobile/accessibility/support/analytics/visual evidence, or mark the overall goal complete.

## 2. Coverage Source Index

| Source | Exists | Headings | Table rows | Review purpose |
|---|---|---:|---:|---|
${renderSourceRows(sources)}

## 3. Objective Coverage Matrix

| Objective requirement | Primary sources | Approval owner | Expected decision | Reviewer notes |
|---|---|---|---|---|
${renderObjectiveRows()}

## 4. Open Gate Impact

Coverage approval cannot close open release gates. It only confirms that the review plan, owner mapping, and documentation coverage are accepted.

| Metric | Count |
|---|---:|
| Release gates | ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length} |
| Verified local gates | ${releaseReadiness.verifiedLocalReleaseReadinessGates.length} |
| Open gates | ${releaseReadiness.openReleaseReadinessGates.length} |
| Open gates without approved exceptions | ${releaseReadiness.openGatesWithoutApprovedExceptions.length} |
| Release exceptions | ${releaseReadiness.HELP_RELEASE_EXCEPTIONS.length} |
| Approved release exceptions | ${releaseReadiness.approvedReleaseReadinessExceptions.length} |
| Coverage source documents | ${sources.length} |
| Objective coverage rows | ${objectiveCoverageRows.length} |

Open gate ids:

${formatList(openGateIds)}

Open gate ids without approved exceptions:

${formatList(unresolvedGateIds)}

| Open gate | Source status | Owner | Protocol | Release impact |
|---|---|---|---|---|
${releaseReadiness.openReleaseReadinessGates.length > 0 ? renderGateRows(releaseReadiness.openReleaseReadinessGates) : '| None | n/a | n/a | n/a | n/a |'}

## 5. Approval Checklist

| Approval item | Owner | Result | Evidence or change request |
|---|---|---|---|
| Application audit covers current product features and workflows | Program owner + product owners | pending | TBD |
| Coverage matrix maps every critical feature to guidance, policy, safety, visual, contextual, or operations coverage | Program owner + product owners | pending | TBD |
| Mobile Android behavior is represented separately from browser-only behavior | Mobile + product owners | pending | TBD |
| Footer, Help Center, policies, support, report, appeal, and safety routes match the information architecture | Product owners + Engineering | pending | TBD |
| Policy coverage remains draft or blocked until specialist approval is recorded | Legal/privacy/safety reviewers | pending | TBD |
| Release gates remain open until direct evidence or approved exceptions exist | Program owner + release owners | pending | TBD |

## 6. Reviewer Signoff

| Field | Value |
|---|---|
| Coverage approval owner | TBD |
| Product reviewer | TBD |
| Policy reviewer | TBD |
| Mobile reviewer | TBD |
| Accessibility reviewer | TBD |
| Review date | ${packetDate} |
| Final coverage result | approve / changes requested / blocked |
| Follow-up issue or decision record | TBD |

## 7. Required Follow-Up

After coverage approval:

1. Link this packet from \`09-release-evidence-record.md\`.
2. Record coverage changes in \`02-coverage-matrix.md\`, \`04-delivery-and-governance.md\`, or the relevant planning doc.
3. Run \`npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD> --json\`.
4. Run \`npm run help:goal-audit -- --json\`.
5. Run \`npm run help:governance\`.

## 8. Completion Boundary

Do not mark the Help Center goal complete from this coverage approval packet. Completion still requires current evidence or valid approved exceptions for every open gate, linked release evidence artifacts, source gate status updates, and a goal audit with no source gaps and no open gates without approved exceptions.
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:coverage-approval -- --name coverage-pass-name',
      '  npm run help:coverage-approval -- --name coverage-pass-name --date 2026-06-28',
      '  npm run help:coverage-approval -- --name coverage-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Coverage approval packet label. Defaults to coverage-approval-YYYY-MM-DD.',
      '  --date <value>   ISO date for the generated file. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated coverage approval packet.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const packetDate = getArgValue('--date') || todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(packetDate)) {
    console.error(`Invalid --date value: ${packetDate}`);
    process.exit(1);
  }

  const packetName = getArgValue('--name') || `coverage-approval-${packetDate}`;
  const slug = sanitizeSlug(packetName);
  if (!slug) {
    console.error('Coverage approval packet name must contain at least one letter or number.');
    process.exit(1);
  }

  const releaseReadiness = loadReleaseReadiness();
  const outputPath = path.join(outputDir, `${packetDate}-${slug}.md`);
  const content = renderPacket({ packetName, packetDate, releaseReadiness });
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.existsSync(outputPath) && !force) {
      console.error(`Coverage approval packet already exists: ${toRelative(outputPath)}`);
      console.error('Use --force to overwrite it.');
      process.exit(1);
    }
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  const sources = sourceDocs.map(summarizeDoc);
  console.log(
    dryRun
      ? `Dry run: would create ${toRelative(outputPath)}`
      : `Created ${toRelative(outputPath)}`
  );
  console.log(`Coverage source documents: ${sources.length}`);
  console.log(`Coverage source documents found: ${sources.filter((source) => source.exists).length}`);
  console.log(`Objective coverage rows: ${objectiveCoverageRows.length}`);
  console.log(`Release gates: ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length}`);
  console.log(`Open gates: ${releaseReadiness.openReleaseReadinessGates.length}`);
  console.log(
    `Open gates without approved exceptions: ${releaseReadiness.openGatesWithoutApprovedExceptions.length}`
  );
};

main();
