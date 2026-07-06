#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'policy-approvals');
const policyContentPath = path.join(rootDir, 'redirect', 'src', 'content', 'policyContent.js');
const decisionRegisterPath = path.join(planningDir, '05-decision-register.md');
const approvalTrackerPath = path.join(planningDir, '10-policy-approval-tracker.md');
const completionRule =
  'Do not mark `policy-specialist-approvals` complete, and do not publish draft policy text as binding, until this packet or an equivalent approval record shows resolved decisions, product behavior evidence, specialist approvals, effective dates, and release evidence for the current release candidate.';

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

const loadPolicyContent = () => {
  const source = fs
    .readFileSync(policyContentPath, 'utf8')
    .replace(/export const /g, 'const ')
    .concat(`
globalThis.__policyContent = {
  POLICY_PUBLICATION_STATES,
  POLICY_REQUIRED_APPROVALS,
  POLICY_PUBLICATION_RULES,
  policyDocuments,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: policyContentPath });
  return context.__policyContent;
};

const parseTableRows = (markdown) =>
  markdown
    .split(/\r?\n/)
    .filter((line) => /^\|.*\|$/.test(line.trim()))
    .filter((line) => !/^\|\s*-/.test(line.trim()))
    .map((line) =>
      line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim())
    );

const parseDecisionRegister = () => {
  const rows = parseTableRows(fs.readFileSync(decisionRegisterPath, 'utf8'));
  const decisions = new Map();

  rows.forEach((cells) => {
    if (!/^D-\d{3}$/.test(cells[0] || '')) return;
    const hasReasonColumn = cells.length >= 5;
    decisions.set(cells[0], {
      id: cells[0],
      title: cells[1] || '',
      reason: hasReasonColumn ? cells[2] || '' : '',
      owner: hasReasonColumn ? cells[3] || '' : cells[2] || '',
      status: hasReasonColumn ? cells[4] || '' : cells[3] || '',
    });
  });

  return decisions;
};

const parseApprovalTracker = () => {
  const markdown = fs.readFileSync(approvalTrackerPath, 'utf8');
  const matrixSection = markdown.split('## 3. Policy Approval Matrix')[1]?.split('## 4. Approval Record Template')[0] || '';
  return parseTableRows(matrixSection)
    .filter((cells) => cells[0] && cells[0] !== 'Policy')
    .map((cells) => ({
      policy: cells[0] || '',
      blockingDecisions: (cells[1] || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      requiredReviewers: (cells[2] || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      state: cells[3] || '',
      effectiveDate: cells[4] || '',
      notes: cells[5] || '',
    }));
};

const unique = (items) => [...new Set(items)];

const formatList = (items) =>
  items && items.length > 0 ? items.map((item) => `  - ${item}`).join('\n') : '  - None recorded';

const formatInline = (items) => (items && items.length > 0 ? items.join(', ') : 'None');

const decisionRows = (draftPolicies, decisions) => {
  const ids = unique(draftPolicies.flatMap((policy) => policy.blockingDecisionIds || [])).sort();
  return ids.map((id) => {
    const decision = decisions.get(id);
    const policies = draftPolicies
      .filter((policy) => (policy.blockingDecisionIds || []).includes(id))
      .map((policy) => policy.title);
    return {
      id,
      title: decision?.title || 'Missing decision register entry',
      owner: decision?.owner || 'missing',
      status: decision?.status || 'missing',
      policies,
    };
  });
};

const trackerForPolicy = (trackerRows, title) =>
  trackerRows.find((row) => row.policy.toLowerCase() === title.toLowerCase()) || null;

const reviewerGroups = (draftPolicies, trackerRows) =>
  unique([
    ...draftPolicies.flatMap((policy) => policy.owners || []),
    ...trackerRows.flatMap((row) => row.requiredReviewers || []),
    'Program owner',
  ]).sort((a, b) => a.localeCompare(b));

const renderDraftPolicyRows = (draftPolicies, trackerRows) =>
  draftPolicies
    .map((policy) => {
      const tracker = trackerForPolicy(trackerRows, policy.title);
      return `| ${policy.title} | ${policy.slug} | ${formatInline(policy.owners)} | ${formatInline(policy.blockingDecisionIds)} | ${tracker?.state || 'missing tracker row'} | ${tracker?.effectiveDate || 'TBD'} | blocked |`;
    })
    .join('\n');

const renderDecisionRows = (rows) =>
  rows
    .map(
      (row) =>
        `| ${row.id} | ${row.title} | ${row.owner} | ${row.status} | ${formatInline(row.policies)} | pending |`
    )
    .join('\n');

const renderReviewerRows = (groups) =>
  groups
    .map((group) => `| ${group} | pending | TBD | TBD | TBD |`)
    .join('\n');

const renderPolicyBehaviorRows = (draftPolicies) =>
  draftPolicies
    .map((policy) => `| ${policy.title} | TBD | TBD | pending | TBD |`)
    .join('\n');

const renderPublishedRows = (publishedPolicies) =>
  publishedPolicies
    .map((policy) => `| ${policy.title} | ${policy.href} | ${policy.effectiveDate} | keep published route evidence current |`)
    .join('\n');

const renderPacket = ({ packetName, packetDate, policyContent, decisions, trackerRows }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const policies = policyContent.policyDocuments;
  const draftPolicies = policies.filter((policy) => !policy.isBinding);
  const publishedPolicies = policies.filter((policy) => policy.isBinding);
  const blockers = decisionRows(draftPolicies, decisions);
  const blockedTrackerRows = trackerRows.filter((row) => /blocked/i.test(row.state));
  const groups = reviewerGroups(draftPolicies, trackerRows);

  return `# Policy Approval Packet - ${packetName}

Status: Draft approval packet; not a policy approval  
Generated: ${packetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this packet to collect specialist approval evidence before any draft Lekhon policy is marked binding, effective, or ready for release.

This packet is generated from \`redirect/src/content/policyContent.js\`, \`05-decision-register.md\`, and \`10-policy-approval-tracker.md\`. It does not approve policy text by itself. Policy publication remains blocked until reviewers record approvals, product behavior evidence, effective dates, and release decisions.

## 2. Release Identity

| Field | Value |
|---|---|
| Policy approval pass | ${packetName} |
| Review date | ${packetDate} |
| Branch | ${branch} |
| Commit | ${commit} |
| Program owner | TBD |
| Evidence folder | TBD |
| Release candidate | TBD |

## 3. Current Source Counts

| Metric | Count |
|---|---:|
| Source policy records | ${policies.length} |
| Published source policies | ${publishedPolicies.length} |
| Draft source policies | ${draftPolicies.length} |
| Unique draft decision blockers | ${blockers.length} |
| Approval tracker rows | ${trackerRows.length} |
| Blocked tracker rows | ${blockedTrackerRows.length} |
| Reviewer groups | ${groups.length} |

## 4. Required Local Commands

- \`npm run help:policy-readiness\` from repository root.
- \`npm run help:policy-approval -- --name <policy-pass-name> --dry-run\` from repository root.
- \`npm run help:external-worksheet -- --name <external-pass-name> --dry-run\` from repository root.
- \`npm run help:gate-closure -- --json\` from repository root before promoting the policy gate.
- \`npm run help:governance\` from repository root.
- \`npm run test:help -- --runInBand\` from \`redirect\`.
- \`npm run build\` from \`redirect\`.

## 5. Published Policies To Preserve

| Policy | Route | Effective date | Required release check |
|---|---|---|---|
${renderPublishedRows(publishedPolicies)}

## 6. Draft Policy Approval Matrix

| Policy | Slug | Owners | Blocking decisions | Tracker state | Effective date | Release result |
|---|---|---|---|---|---|---|
${renderDraftPolicyRows(draftPolicies, trackerRows)}

## 7. Blocking Decision Matrix

| Decision | Title | Owner | Current status | Draft policies blocked | Release result |
|---|---|---|---|---|---|
${renderDecisionRows(blockers)}

## 8. Specialist Sign-Off Matrix

| Reviewer group | Approval status | Reviewer | Date | Evidence |
|---|---|---|---|---|
${renderReviewerRows(groups)}

## 9. Product Behavior Verification

| Policy | Route or workflow checked | Evidence | Result | Notes |
|---|---|---|---|---|
${renderPolicyBehaviorRows(draftPolicies)}

## 10. Promotion Checklist

- All blocking decisions are approved or scoped by an approved release exception.
- Product behavior matches the policy text.
- Required owners and specialist reviewers are recorded with dates.
- Version and effective date are assigned.
- Published route, footer link, Help link, and contextual links are updated.
- Previous effective version is retained or archived.
- Release evidence record links this packet and the final reviewer decision.

## 11. Final Decision

| Decision | Result | Owner | Date | Notes |
|---|---|---|---|---|
| Approved to publish binding policy text | no | Program owner + specialist reviewers | ${packetDate} | Keep no until every blocker, reviewer, behavior, effective-date, and release evidence item is complete |
| Approved to keep draft policy pages visible | yes / no | Program owner | ${packetDate} | Draft pages must remain clearly non-binding |

## 12. Completion Rule

${completionRule}
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:policy-approval -- --name policy-pass-name',
      '  npm run help:policy-approval -- --name policy-pass-name --date 2026-06-27',
      '  npm run help:policy-approval -- --name policy-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Policy approval pass label. Defaults to policy-YYYY-MM-DD.',
      '  --date <value>   ISO date for the generated file. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated packet.',
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

  const packetName = getArgValue('--name') || `policy-${packetDate}`;
  const slug = sanitizeSlug(packetName);
  if (!slug) {
    console.error('Policy approval packet name must contain at least one letter or number.');
    process.exit(1);
  }

  const policyContent = loadPolicyContent();
  const decisions = parseDecisionRegister();
  const trackerRows = parseApprovalTracker();
  const draftPolicies = policyContent.policyDocuments.filter((policy) => !policy.isBinding);
  const publishedPolicies = policyContent.policyDocuments.filter((policy) => policy.isBinding);
  const blockers = decisionRows(draftPolicies, decisions);
  const outputPath = path.join(outputDir, `${packetDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');

  const content = renderPacket({
    packetName,
    packetDate,
    policyContent,
    decisions,
    trackerRows,
  });

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.existsSync(outputPath) && !force) {
      console.error(`Policy approval packet already exists: ${path.relative(rootDir, outputPath)}`);
      console.error('Use --force to overwrite it.');
      process.exit(1);
    }
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  console.log(dryRun ? 'Help policy approval packet dry run passed.' : 'Help policy approval packet created.');
  console.log(`Target: ${path.relative(rootDir, outputPath).replace(/\\/g, '/')}`);
  console.log(`Source policy records: ${policyContent.policyDocuments.length}`);
  console.log(`Published source policies: ${publishedPolicies.length}`);
  console.log(`Draft source policies: ${draftPolicies.length}`);
  console.log(`Unique draft decision blockers: ${blockers.length}`);
  console.log(`Approval tracker rows: ${trackerRows.length}`);
  console.log(`Blocked tracker rows: ${trackerRows.filter((row) => /blocked/i.test(row.state)).length}`);
};

main();
