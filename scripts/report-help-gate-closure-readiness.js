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
  RELEASE_GATE_STATUSES,
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

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const todayISO = () => new Date().toISOString().slice(0, 10);

const isExpired = (exception, today = todayISO()) =>
  isIsoDate(exception.expiresOn) && exception.expiresOn < today;

const isCommandLike = (value) => /^(npm run|node --check|npx cap|gradlew|apksigner)/.test(value);

const evidenceCommandsFor = (gate) => (gate.evidence || []).filter(isCommandLike);

const formatList = (items) =>
  items && items.length > 0 ? items.map((item) => `  - ${item}`).join('\n') : '  - None recorded';

const validateApprovedException = (exception) => {
  const errors = [];
  [
    'id',
    'gateId',
    'owner',
    'scope',
    'risk',
    'approvedBy',
    'approvedDate',
    'expiresOn',
    'decisionRecord',
    'nextReviewDate',
  ].forEach((field) => {
    if (!String(exception[field] || '').trim()) errors.push(`${field} is required`);
  });

  if (!Array.isArray(exception.evidence) || exception.evidence.length === 0) {
    errors.push('evidence must list at least one current evidence record');
  }

  if (exception.approvedDate && !isIsoDate(exception.approvedDate)) {
    errors.push('approvedDate must use YYYY-MM-DD');
  }

  if (exception.expiresOn && !isIsoDate(exception.expiresOn)) {
    errors.push('expiresOn must use YYYY-MM-DD');
  }

  if (exception.nextReviewDate && !isIsoDate(exception.nextReviewDate)) {
    errors.push('nextReviewDate must use YYYY-MM-DD');
  }

  if (isExpired(exception)) {
    errors.push('approved exception is expired');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const buildGateClosure = (gate, releaseReadiness) => {
  const approvedException = releaseReadiness.approvedReleaseReadinessExceptions.find(
    (exception) => exception.gateId === gate.id
  );
  const exceptionValidation = approvedException
    ? validateApprovedException(approvedException)
    : { valid: false, errors: ['no approved exception recorded'] };
  const protocolPath = path.join(planningDir, gate.protocol || '');
  const metadataProblems = [];

  ['id', 'area', 'title', 'owner', 'status', 'protocol', 'releaseImpact'].forEach((field) => {
    if (!String(gate[field] || '').trim()) metadataProblems.push(`${field} is required`);
  });

  if (!releaseReadiness.RELEASE_GATE_STATUSES.includes(gate.status)) {
    metadataProblems.push(`unknown gate status ${gate.status}`);
  }

  if (!Array.isArray(gate.evidence) || gate.evidence.length === 0) {
    metadataProblems.push('evidence list is required');
  }

  if (gate.protocol && !fs.existsSync(protocolPath)) {
    metadataProblems.push(`protocol file missing: ${gate.protocol}`);
  }

  if (gate.status === 'verified-local' && (gate.blockers || []).length > 0) {
    metadataProblems.push('verified-local gate must not keep blockers');
  }

  if (gate.status !== 'verified-local' && (!Array.isArray(gate.blockers) || gate.blockers.length === 0)) {
    metadataProblems.push('open gate must list blockers');
  }

  const closureState =
    metadataProblems.length > 0
      ? 'invalid-source-record'
      : gate.status === 'verified-local'
        ? 'source-verified-local'
        : approvedException && exceptionValidation.valid
          ? 'approved-exception-ready'
          : 'not-closable';
  const commands = evidenceCommandsFor(gate);
  const nextActions =
    closureState === 'source-verified-local'
      ? ['Record current release evidence output and link it from 09-release-evidence-record.md.']
      : closureState === 'approved-exception-ready'
        ? ['Link the approved exception decision record and re-run help:exceptions and help:goal-audit.']
        : [
            ...(gate.blockers || []),
            ...commands.map((command) => `Run or collect: ${command}`),
            'Update 09-release-evidence-record.md only after current evidence or a valid approved exception exists.',
          ];

  return {
    id: gate.id,
    title: gate.title,
    area: gate.area,
    owner: gate.owner,
    status: gate.status,
    closureState,
    protocol: gate.protocol,
    releaseImpact: gate.releaseImpact,
    evidenceCommands: commands,
    blockers: gate.blockers || [],
    metadataProblems,
    approvedException: approvedException ? approvedException.id : '',
    approvedExceptionValid: Boolean(approvedException && exceptionValidation.valid),
    exceptionProblems: approvedException ? exceptionValidation.errors : [],
    nextActions,
  };
};

const buildSummary = (releaseReadiness) => {
  const gates = releaseReadiness.HELP_RELEASE_READINESS_GATES.map((gate) =>
    buildGateClosure(gate, releaseReadiness)
  );
  const invalidSourceRecords = gates.filter((gate) => gate.closureState === 'invalid-source-record');
  const sourceVerifiedLocal = gates.filter((gate) => gate.closureState === 'source-verified-local');
  const approvedExceptionReady = gates.filter((gate) => gate.closureState === 'approved-exception-ready');
  const notClosable = gates.filter((gate) => gate.closureState === 'not-closable');
  const result =
    invalidSourceRecords.length > 0
      ? 'gate closure source records invalid'
      : notClosable.length > 0
        ? 'gate closure blocked by open gates'
        : 'all gates closure-ready candidate';

  return {
    result,
    gates,
    counts: {
      total: gates.length,
      sourceVerifiedLocal: sourceVerifiedLocal.length,
      approvedExceptionReady: approvedExceptionReady.length,
      notClosable: notClosable.length,
      invalidSourceRecords: invalidSourceRecords.length,
      openGates: releaseReadiness.openReleaseReadinessGates.length,
      openGatesWithoutApprovedExceptions: releaseReadiness.openGatesWithoutApprovedExceptions.length,
      approvedExceptions: releaseReadiness.approvedReleaseReadinessExceptions.length,
    },
  };
};

const renderGate = (gate) => [
  `### ${gate.id}`,
  '',
  `- Title: ${gate.title}`,
  `- Area: ${gate.area}`,
  `- Owner: ${gate.owner}`,
  `- Source status: ${gate.status}`,
  `- Closure state: ${gate.closureState}`,
  `- Protocol: ${gate.protocol}`,
  `- Approved exception: ${gate.approvedException || 'none'}`,
  `- Approved exception valid: ${gate.approvedExceptionValid ? 'yes' : 'no'}`,
  '- Evidence commands:',
  formatList(gate.evidenceCommands),
  '- Blockers:',
  formatList(gate.blockers),
  '- Source record problems:',
  formatList(gate.metadataProblems),
  '- Exception problems:',
  formatList(gate.exceptionProblems),
  '- Next actions:',
  formatList(gate.nextActions),
  '',
].join('\n');

const renderMarkdown = ({ branch, commit, summary }) => [
  '# Lekhon Gate Closure Readiness Summary',
  '',
  `Branch: ${branch}`,
  `Commit: ${commit}`,
  `Result: ${summary.result}`,
  '',
  '## Counts',
  '',
  `- Release gates: ${summary.counts.total}`,
  `- Source verified local gates: ${summary.counts.sourceVerifiedLocal}`,
  `- Approved exception ready gates: ${summary.counts.approvedExceptionReady}`,
  `- Gates not closable: ${summary.counts.notClosable}`,
  `- Invalid source records: ${summary.counts.invalidSourceRecords}`,
  `- Open gates: ${summary.counts.openGates}`,
  `- Open gates without approved exceptions: ${summary.counts.openGatesWithoutApprovedExceptions}`,
  `- Approved exceptions: ${summary.counts.approvedExceptions}`,
  '',
  '## Gate Closure Matrix',
  '',
  '| Gate | Source status | Closure state | Owner | Protocol |',
  '|---|---|---|---|---|',
  ...summary.gates.map(
    (gate) => `| ${gate.id} | ${gate.status} | ${gate.closureState} | ${gate.owner} | ${gate.protocol} |`
  ),
  '',
  '## Gate Closure Details',
  '',
  ...summary.gates.map(renderGate),
  '## Completion Rule',
  '',
  'Do not promote a release gate to closed or mark the Help Center goal complete until this command reports no invalid source records and no gates in the not-closable state for the current release candidate.',
  '',
].join('\n');

const renderJson = ({ branch, commit, summary }) =>
  JSON.stringify(
    {
      branch,
      commit,
      result: summary.result,
      counts: summary.counts,
      gates: summary.gates,
      notClosableGateIds: summary.gates
        .filter((gate) => gate.closureState === 'not-closable')
        .map((gate) => gate.id),
      invalidSourceRecordGateIds: summary.gates
        .filter((gate) => gate.closureState === 'invalid-source-record')
        .map((gate) => gate.id),
    },
    null,
    2
  );

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:gate-closure',
      '  npm run help:gate-closure -- --json',
      '',
      'Options:',
      '  --json   Print machine-readable gate closure readiness data.',
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
    branch: shellValue('git rev-parse --abbrev-ref HEAD'),
    commit: shellValue('git rev-parse --short HEAD'),
    summary: buildSummary(releaseReadiness),
  };

  console.log(hasFlag('--json') ? renderJson(payload) : renderMarkdown(payload));
};

main();
