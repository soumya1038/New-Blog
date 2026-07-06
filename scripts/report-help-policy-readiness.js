#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const policyContentPath = path.join(rootDir, 'redirect', 'src', 'content', 'policyContent.js');
const decisionRegisterPath = path.join(planningDir, '05-decision-register.md');
const approvalTrackerPath = path.join(planningDir, '10-policy-approval-tracker.md');

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

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
    const isBlockingDecisionRow = cells.length >= 5;
    decisions.set(cells[0], {
      id: cells[0],
      title: cells[1] || '',
      reason: isBlockingDecisionRow ? cells[2] || '' : '',
      owner: isBlockingDecisionRow ? cells[3] || '' : cells[2] || '',
      status: isBlockingDecisionRow ? cells[4] || '' : cells[3] || '',
    });
  });

  return decisions;
};

const parseApprovalTracker = () => {
  const markdown = fs.readFileSync(approvalTrackerPath, 'utf8');
  const matrixSection = markdown.split('## 3. Policy Approval Matrix')[1]?.split('## 4. Approval Record Template')[0] || '';
  const rows = parseTableRows(matrixSection);
  return rows
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

const countBy = (items, getKey) =>
  items.reduce((counts, item) => {
    const key = getKey(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

const unique = (items) => [...new Set(items)];

const sourceBlockerRows = (draftPolicies, decisions) => {
  const blockerIds = unique(draftPolicies.flatMap((policy) => policy.blockingDecisionIds || [])).sort();

  return blockerIds.map((id) => {
    const decision = decisions.get(id);
    const policies = draftPolicies
      .filter((policy) => (policy.blockingDecisionIds || []).includes(id))
      .map((policy) => policy.title);

    return {
      id,
      title: decision ? decision.title : 'Missing decision register entry',
      status: decision ? decision.status : 'missing',
      owner: decision ? decision.owner : 'missing',
      policyCount: policies.length,
      policies,
    };
  });
};

const trackerBlockerRows = (trackerRows) => {
  const blockerIds = unique(trackerRows.flatMap((row) => row.blockingDecisions)).sort();

  return blockerIds.map((id) => ({
    id,
    policyCount: trackerRows.filter((row) => row.blockingDecisions.includes(id)).length,
    policies: trackerRows
      .filter((row) => row.blockingDecisions.includes(id))
      .map((row) => row.policy),
  }));
};

const renderList = (items) => (items.length > 0 ? items.map((item) => `  - ${item}`).join('\n') : '  - None');

const renderMarkdown = ({ policyContent, decisions, trackerRows }) => {
  const policies = policyContent.policyDocuments;
  const draftPolicies = policies.filter((policy) => !policy.isBinding);
  const publishedPolicies = policies.filter((policy) => policy.isBinding);
  const sourceBlockers = sourceBlockerRows(draftPolicies, decisions);
  const trackerBlockers = trackerBlockerRows(trackerRows);
  const decisionStatusCounts = countBy(sourceBlockers, (blocker) => blocker.status);
  const missingSourceDecisionIds = sourceBlockers
    .filter((blocker) => blocker.status === 'missing')
    .map((blocker) => blocker.id);
  const trackerBlockedRows = trackerRows.filter((row) => /blocked/i.test(row.state));
  const bindingBlocked =
    draftPolicies.length > 0 ||
    sourceBlockers.some((blocker) => blocker.status !== 'Approved') ||
    trackerBlockedRows.length > 0 ||
    missingSourceDecisionIds.length > 0;

  const lines = [
    '# Lekhon Policy Readiness Summary',
    '',
    `Result: ${bindingBlocked ? 'binding publication blocked' : 'binding publication candidate'}`,
    '',
    '## Counts',
    '',
    `- Source policy records: ${policies.length}`,
    `- Published source policies: ${publishedPolicies.length}`,
    `- Draft source policies: ${draftPolicies.length}`,
    `- Unique source draft blockers: ${sourceBlockers.length}`,
    `- Policy approval tracker rows: ${trackerRows.length}`,
    `- Blocked tracker rows: ${trackerBlockedRows.length}`,
    `- Unique tracker blockers: ${trackerBlockers.length}`,
    '',
    '## Source Blocker Status Counts',
    '',
    ...Object.entries(decisionStatusCounts).map(([status, count]) => `- ${status}: ${count}`),
    '',
    '## Published Source Policies',
    '',
    ...publishedPolicies.map((policy) => `- ${policy.title}: ${policy.href} effective ${policy.effectiveDate}`),
    '',
    '## Draft Source Policies',
    '',
    ...draftPolicies.map(
      (policy) =>
        `- ${policy.title}: ${policy.blockingDecisionIds.join(', ')}; owners ${policy.owners.join(', ')}`
    ),
    '',
    '## Source Decision Blockers',
    '',
    ...sourceBlockers.map((blocker) => [
      `### ${blocker.id}`,
      '',
      `- Decision: ${blocker.title}`,
      `- Status: ${blocker.status}`,
      `- Owner: ${blocker.owner}`,
      `- Draft policies blocked: ${blocker.policyCount}`,
      '- Policies:',
      renderList(blocker.policies),
      '',
    ].join('\n')),
    '## Tracker Gaps To Resolve',
    '',
    ...(trackerBlockedRows.length > 0
      ? trackerBlockedRows.map(
          (row) =>
            `- ${row.policy}: ${row.state}; blockers ${row.blockingDecisions.join(', ')}; reviewers ${row.requiredReviewers.join(', ')}`
        )
      : ['- None']),
    '',
    '## Required Approval Evidence',
    '',
    ...policyContent.POLICY_REQUIRED_APPROVALS.map((approval) => `- ${approval}`),
    '',
    '## Approval Packet Command',
    '',
    '- `npm run help:policy-approval -- --name <policy-pass-name> --dry-run`',
    '',
    '## Completion Rule',
    '',
    'Do not publish draft policy text as binding until all blocking decisions are approved or scoped by approved exception, product behavior is verified, required reviewers are recorded, and an effective date is assigned.',
    '',
  ];

  return lines.join('\n');
};

const renderJson = ({ policyContent, decisions, trackerRows }) => {
  const policies = policyContent.policyDocuments;
  const draftPolicies = policies.filter((policy) => !policy.isBinding);
  const publishedPolicies = policies.filter((policy) => policy.isBinding);
  const sourceBlockers = sourceBlockerRows(draftPolicies, decisions);
  const trackerRowsBlocked = trackerRows.filter((row) => /blocked/i.test(row.state));
  const decisionStatusCounts = countBy(sourceBlockers, (blocker) => blocker.status);
  const result =
    draftPolicies.length > 0 ||
    sourceBlockers.some((blocker) => blocker.status !== 'Approved') ||
    trackerRowsBlocked.length > 0
      ? 'binding publication blocked'
      : 'binding publication candidate';

  return JSON.stringify(
    {
      result,
      counts: {
        sourcePolicies: policies.length,
        publishedSourcePolicies: publishedPolicies.length,
        draftSourcePolicies: draftPolicies.length,
        uniqueSourceDraftBlockers: sourceBlockers.length,
        policyApprovalTrackerRows: trackerRows.length,
        blockedTrackerRows: trackerRowsBlocked.length,
      },
      decisionStatusCounts,
      publishedPolicies: publishedPolicies.map((policy) => ({
        slug: policy.slug,
        title: policy.title,
        href: policy.href,
        effectiveDate: policy.effectiveDate,
      })),
      draftPolicies: draftPolicies.map((policy) => ({
        slug: policy.slug,
        title: policy.title,
        owners: policy.owners,
        blockingDecisionIds: policy.blockingDecisionIds,
        approvalRequirements: policy.approvalRequirements,
      })),
      sourceDecisionBlockers: sourceBlockers,
      blockedTrackerPolicies: trackerRowsBlocked,
      approvalPacketCommand: 'npm run help:policy-approval -- --name <policy-pass-name> --dry-run',
      completionRule:
        'Do not publish draft policy text as binding until all blocking decisions are approved or scoped by approved exception, product behavior is verified, required reviewers are recorded, and an effective date is assigned.',
    },
    null,
    2
  );
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:policy-readiness',
      '  npm run help:policy-readiness -- --json',
      '',
      'Options:',
      '  --json   Print machine-readable policy readiness data.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const payload = {
    policyContent: loadPolicyContent(),
    decisions: parseDecisionRegister(),
    trackerRows: parseApprovalTracker(),
  };

  console.log(hasFlag('--json') ? renderJson(payload) : renderMarkdown(payload));
};

main();
