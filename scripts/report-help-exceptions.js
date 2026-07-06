#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const releaseReadinessPath = path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js');

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

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
  RELEASE_EXCEPTION_STATUSES,
  HELP_RELEASE_READINESS_GATES,
  HELP_RELEASE_EXCEPTIONS,
  approvedReleaseReadinessExceptions,
  openReleaseReadinessGates,
  openGatesWithoutApprovedExceptions,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: releaseReadinessPath });
  return context.__releaseReadiness;
};

const countBy = (items, key) =>
  items.reduce((counts, item) => {
    const value = item[key] || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const todayISO = () => new Date().toISOString().slice(0, 10);

const isExpired = (exception, today = todayISO()) =>
  isIsoDate(exception.expiresOn) && exception.expiresOn < today;

const requiredBaseFields = [
  'id',
  'gateId',
  'status',
  'owner',
  'scope',
  'risk',
  'nextReviewDate',
];

const requiredApprovedFields = ['approvedBy', 'approvedDate', 'expiresOn', 'decisionRecord'];

const validateException = (exception, releaseReadiness) => {
  const gateIds = new Set(releaseReadiness.HELP_RELEASE_READINESS_GATES.map((gate) => gate.id));
  const errors = [];

  requiredBaseFields.forEach((field) => {
    if (!String(exception[field] || '').trim()) {
      errors.push(`${field} is required`);
    }
  });

  if (exception.gateId && !gateIds.has(exception.gateId)) {
    errors.push(`unknown gateId ${exception.gateId}`);
  }

  if (!releaseReadiness.RELEASE_EXCEPTION_STATUSES.includes(exception.status)) {
    errors.push(`unknown status ${exception.status}`);
  }

  if (!Array.isArray(exception.evidence) || exception.evidence.length === 0) {
    errors.push('evidence must list at least one current evidence record');
  }

  if (exception.nextReviewDate && !isIsoDate(exception.nextReviewDate)) {
    errors.push('nextReviewDate must use YYYY-MM-DD');
  }

  if (exception.status === 'approved') {
    requiredApprovedFields.forEach((field) => {
      if (!String(exception[field] || '').trim()) {
        errors.push(`${field} is required for approved exceptions`);
      }
    });

    if (exception.approvedDate && !isIsoDate(exception.approvedDate)) {
      errors.push('approvedDate must use YYYY-MM-DD');
    }

    if (exception.expiresOn && !isIsoDate(exception.expiresOn)) {
      errors.push('expiresOn must use YYYY-MM-DD');
    }

    if (isExpired(exception)) {
      errors.push('approved exception is expired');
    }
  }

  return {
    id: exception.id || '(missing id)',
    gateId: exception.gateId || '(missing gateId)',
    status: exception.status || '(missing status)',
    valid: errors.length === 0,
    errors,
  };
};

const buildSummary = (releaseReadiness) => {
  const exceptions = releaseReadiness.HELP_RELEASE_EXCEPTIONS;
  const validations = exceptions.map((exception) => validateException(exception, releaseReadiness));
  const validApprovedGateIds = new Set(
    exceptions
      .filter((exception, index) => exception.status === 'approved' && validations[index].valid)
      .map((exception) => exception.gateId)
  );
  const openGatesWithoutValidApprovedExceptions = releaseReadiness.openReleaseReadinessGates.filter(
    (gate) => !validApprovedGateIds.has(gate.id)
  );
  const result =
    exceptions.length === 0
      ? 'no approved exceptions recorded; open gates still require evidence'
      : validations.some((validation) => !validation.valid)
        ? 'exception registry has invalid records'
        : openGatesWithoutValidApprovedExceptions.length > 0
          ? 'open gates still require evidence or approved exceptions'
          : 'all open gates have valid approved exceptions';

  return {
    result,
    exceptions,
    validations,
    openGatesWithoutValidApprovedExceptions,
    counts: {
      exceptions: exceptions.length,
      approved: exceptions.filter((exception) => exception.status === 'approved').length,
      valid: validations.filter((validation) => validation.valid).length,
      invalid: validations.filter((validation) => !validation.valid).length,
      expiredApproved: exceptions.filter(
        (exception) => exception.status === 'approved' && isExpired(exception)
      ).length,
      openGates: releaseReadiness.openReleaseReadinessGates.length,
      openGatesWithoutValidApprovedExceptions: openGatesWithoutValidApprovedExceptions.length,
    },
  };
};

const renderMarkdown = ({ releaseReadiness, branch, commit, summary }) => {
  const statusCounts = countBy(summary.exceptions, 'status');
  const lines = [
    '# Lekhon Release Exception Summary',
    '',
    `Branch: ${branch}`,
    `Commit: ${commit}`,
    `Result: ${summary.result}`,
    '',
    '## Exception Counts',
    '',
    `- Release exceptions: ${summary.counts.exceptions}`,
    `- Approved exceptions: ${summary.counts.approved}`,
    `- Valid exception records: ${summary.counts.valid}`,
    `- Invalid exception records: ${summary.counts.invalid}`,
    `- Expired approved exceptions: ${summary.counts.expiredApproved}`,
    `- Open gates: ${summary.counts.openGates}`,
    `- Open gates without valid approved exceptions: ${summary.counts.openGatesWithoutValidApprovedExceptions}`,
    '',
    '## Counts By Exception Status',
    '',
    ...releaseReadiness.RELEASE_EXCEPTION_STATUSES.map(
      (status) => `- ${status}: ${statusCounts[status] || 0}`
    ),
    '',
    '## Open Gates Without Valid Approved Exceptions',
    '',
    ...(summary.openGatesWithoutValidApprovedExceptions.length > 0
      ? summary.openGatesWithoutValidApprovedExceptions.map(
          (gate) => `- ${gate.id} (${gate.status}) - ${gate.owner}`
        )
      : ['- None']),
    '',
    '## Validation',
    '',
    ...(summary.validations.length > 0
      ? summary.validations.flatMap((validation) => [
          `### ${validation.id}`,
          '',
          `- Gate: ${validation.gateId}`,
          `- Status: ${validation.status}`,
          `- Valid: ${validation.valid ? 'yes' : 'no'}`,
          '- Errors:',
          ...(validation.errors.length > 0 ? validation.errors.map((error) => `  - ${error}`) : ['  - None']),
          '',
        ])
      : ['- No release exceptions are recorded in HELP_RELEASE_EXCEPTIONS.']),
    '',
    '## Completion Rule',
    '',
    'Approved exceptions require owner, risk, scope, evidence, expiration, decision record, and next review date. Do not use an exception to complete a gate after it expires or when its evidence is missing.',
    '',
  ];

  return lines.join('\n');
};

const renderJson = ({ releaseReadiness, branch, commit, summary }) =>
  JSON.stringify(
    {
      branch,
      commit,
      result: summary.result,
      counts: summary.counts,
      countsByExceptionStatus: countBy(summary.exceptions, 'status'),
      openGateIdsWithoutValidApprovedExceptions: summary.openGatesWithoutValidApprovedExceptions.map(
        (gate) => gate.id
      ),
      validations: summary.validations,
      exceptions: releaseReadiness.HELP_RELEASE_EXCEPTIONS,
    },
    null,
    2
  );

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:exceptions',
      '  npm run help:exceptions -- --json',
      '',
      'Options:',
      '  --json   Print machine-readable release exception data.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const releaseReadiness = loadReleaseReadiness();
  const payload = {
    releaseReadiness,
    branch: shellValue('git rev-parse --abbrev-ref HEAD'),
    commit: shellValue('git rev-parse --short HEAD'),
    summary: buildSummary(releaseReadiness),
  };

  console.log(hasFlag('--json') ? renderJson(payload) : renderMarkdown(payload));
};

main();
