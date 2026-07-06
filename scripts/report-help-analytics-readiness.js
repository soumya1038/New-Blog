#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');

const sourcePaths = {
  helpContent: path.join(rootDir, 'redirect', 'src', 'content', 'helpCenterContent.js'),
  helpCenter: path.join(rootDir, 'redirect', 'src', 'pages', 'HelpCenter.jsx'),
  helpArticle: path.join(rootDir, 'redirect', 'src', 'pages', 'HelpArticle.jsx'),
  searchProtocol: path.join(rootDir, 'docs', 'help-center-planning', '19-search-feedback-operations-protocol.md'),
  operationsRunbook: path.join(rootDir, 'docs', 'help-center-planning', '08-operations-runbook.md'),
  decisionRegister: path.join(rootDir, 'docs', 'help-center-planning', '05-decision-register.md'),
  policyApprovalTracker: path.join(rootDir, 'docs', 'help-center-planning', '10-policy-approval-tracker.md'),
  externalWorksheetGenerator: path.join(rootDir, 'scripts', 'create-help-external-verification-worksheet.js'),
  releaseReadiness: path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js'),
};

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const sourceHasAll = (source, tokens) => tokens.every((token) => source.includes(token));

const check = (area, label, passed, source) => ({ area, label, passed, source });

const loadHelpContent = (source) => {
  const transformed = source.replace(/export const /g, 'const ').concat(`
globalThis.__helpContent = {
  HELP_SEARCH_REVIEW_SIGNALS,
  SEARCH_FILLER_WORDS,
  searchHelpArticles,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(transformed, context, { filename: sourcePaths.helpContent });
  return context.__helpContent;
};

const buildReadiness = () => {
  const sources = Object.fromEntries(
    Object.entries(sourcePaths).map(([key, filePath]) => [key, readText(filePath)])
  );
  const helpContent = loadHelpContent(sources.helpContent);
  const searchSignals = helpContent.HELP_SEARCH_REVIEW_SIGNALS || [];
  const signalResults = searchSignals.map((signal) => {
    const result = helpContent.searchHelpArticles(signal.query)[0];
    return {
      query: signal.query,
      expectedSlug: signal.expectedSlug,
      actualSlug: result?.slug || '',
      passed: result?.slug === signal.expectedSlug,
    };
  });

  const productionDecisionBlockers = [
    'Consent wording and opt-in or opt-out model',
    'Retention period for article views, searches, and helpfulness votes',
    'Backend storage schema and aggregation level',
    'Access control for analytics dashboards or exports',
    'Deletion and export handling if feedback becomes account-linked',
    'Weekly owner cadence for zero-result and low-helpfulness review',
    'Production monitoring and alert threshold',
  ];

  const localChecks = [
    check(
      'search',
      'Critical search signal registry is present',
      sourceHasAll(sources.helpContent, ['HELP_SEARCH_REVIEW_SIGNALS', 'expectedSlug']),
      'helpCenterContent.js'
    ),
    check(
      'search',
      'Critical search signals are populated',
      searchSignals.length >= 10,
      'helpCenterContent.js'
    ),
    check(
      'search',
      'Every critical query ranks to its expected guide',
      signalResults.every((entry) => entry.passed),
      'helpCenterContent.js'
    ),
    check(
      'search',
      'Search removes filler words before scoring meaningful terms',
      sourceHasAll(sources.helpContent, ['SEARCH_FILLER_WORDS', 'meaningfulTerms', 'minimumScore']),
      'helpCenterContent.js'
    ),
    check(
      'search',
      'Help search preserves query state in the URL',
      sourceHasAll(sources.helpCenter, ['useSearchParams', "searchParams.get('q')", "next.set('q', nextQuery)", 'setSearchParams(next, { replace: true })']),
      'HelpCenter.jsx'
    ),
    check(
      'search',
      'Zero-result search includes recovery guidance',
      sourceHasAll(sources.helpCenter, ['No verified guide matches', 'Try a shorter phrase', 'exact error message', 'Contact support']),
      'HelpCenter.jsx'
    ),
    check(
      'feedback',
      'Article feedback uses per-article local storage keys',
      sourceHasAll(sources.helpArticle, ['lekhon-help-feedback:', 'feedbackKey(slug)', 'localStorage.getItem(feedbackKey(slug))']),
      'HelpArticle.jsx'
    ),
    check(
      'feedback',
      'Article feedback stores value and saved time locally',
      sourceHasAll(sources.helpArticle, ['localStorage.setItem', 'value,', 'savedAt: new Date().toISOString()']),
      'HelpArticle.jsx'
    ),
    check(
      'feedback',
      'Article feedback tells users analytics are gated by privacy and consent approval',
      sourceHasAll(sources.helpArticle, ['saved on this device', 'review analytics only after the privacy and consent flow is approved']),
      'HelpArticle.jsx'
    ),
    check(
      'feedback',
      'Help feedback source does not send votes to a backend or beacon',
      !['api.post(', 'fetch(', 'navigator.sendBeacon'].some((token) => sources.helpArticle.includes(token)),
      'HelpArticle.jsx'
    ),
    check(
      'privacy',
      'Search and feedback protocol keeps production analytics gated',
      sourceHasAll(sources.searchProtocol, ['production analytics remain gated', 'No Help search or feedback analytics are sent to a server', 'privacy, consent, retention, and ownership decisions are approved']),
      '19-search-feedback-operations-protocol.md'
    ),
    check(
      'privacy',
      'Protocol defines production approval topics',
      sourceHasAll(sources.searchProtocol, ['Consent and privacy wording', 'Retention period', 'Aggregated article-level reporting', 'Deletion or export handling']),
      '19-search-feedback-operations-protocol.md'
    ),
    check(
      'privacy',
      'Protocol bans sensitive analytics payloads',
      sourceHasAll(sources.searchProtocol, ['Do not collect raw private form text', 'Do not collect passwords', 'Do not use feedback data for enforcement decisions']),
      '19-search-feedback-operations-protocol.md'
    ),
    check(
      'operations',
      'Operations runbook keeps current feedback local-only until approval',
      sourceHasAll(sources.operationsRunbook, ['Current Help article feedback remains local-only', 'privacy and consent decision register']),
      '08-operations-runbook.md'
    ),
    check(
      'approvals',
      'Decision register keeps D-031 open for Help analytics retention and consent',
      sources.decisionRegister.includes('| D-031 | Help analytics retention and consent | Privacy + analytics | Open |'),
      '05-decision-register.md'
    ),
    check(
      'approvals',
      'Policy approval tracker blocks privacy and local-storage publication on D-031',
      sourceHasAll(sources.policyApprovalTracker, ['Privacy Policy | D-004, D-005, D-007, D-017, D-018, D-031', 'Cookie and Local Storage Notice | D-031']),
      '10-policy-approval-tracker.md'
    ),
    check(
      'release-gate',
      'Release gate remains blocked until analytics operations are approved',
      sourceHasAll(sources.releaseReadiness, ['analytics-consent-operations', "status: 'blocked-approval'", 'Analytics consent, retention, backend storage, access control, and deletion/export rules remain open']),
      'releaseReadiness.js'
    ),
    check(
      'worksheet',
      'External worksheet includes the analytics approval matrix',
      productionDecisionBlockers.every((decision) => sources.externalWorksheetGenerator.includes(decision)) &&
        sources.externalWorksheetGenerator.includes('Keep Help feedback local-only until these decisions are approved'),
      'create-help-external-verification-worksheet.js'
    ),
  ];

  const failedLocalChecks = localChecks.filter((entry) => !entry.passed);
  const checksByArea = localChecks.reduce((counts, entry) => {
    counts[entry.area] = (counts[entry.area] || 0) + 1;
    return counts;
  }, {});

  return {
    result:
      failedLocalChecks.length === 0
        ? 'local analytics safeguards ready; production analytics approval required'
        : 'local analytics safeguards incomplete',
    searchSignalCount: searchSignals.length,
    passingSearchSignalCount: signalResults.filter((entry) => entry.passed).length,
    productionDecisionBlockers,
    signalResults,
    localChecks,
    checksByArea,
    failedLocalChecks,
  };
};

const renderChecks = (checks) =>
  checks.map((entry) => `- ${entry.passed ? 'pass' : 'fail'}: ${entry.label} (${entry.source})`).join('\n');

const renderSignalResults = (signals) =>
  signals
    .map(
      (entry) =>
        `- ${entry.passed ? 'pass' : 'fail'}: "${entry.query}" -> ${entry.actualSlug || '(no result)'} (expected ${entry.expectedSlug})`
    )
    .join('\n');

const renderMarkdown = (readiness) => `# Lekhon Analytics Readiness Summary

Result: ${readiness.result}

## Counts

- Critical search signals: ${readiness.searchSignalCount}
- Passing critical search signals: ${readiness.passingSearchSignalCount}
- Local analytics safeguard checks: ${readiness.localChecks.length}
- Failed local analytics safeguard checks: ${readiness.failedLocalChecks.length}
- Production decision blockers: ${readiness.productionDecisionBlockers.length}
- Areas covered: ${Object.keys(readiness.checksByArea).length}

## Critical Search Signal Results

${renderSignalResults(readiness.signalResults)}

## Local Safeguard Checks

${renderChecks(readiness.localChecks)}

## Checks By Area

${Object.entries(readiness.checksByArea)
  .map(([area, count]) => `- ${area}: ${count}`)
  .join('\n')}

## Production Decision Blockers

${readiness.productionDecisionBlockers.map((item) => `- ${item}`).join('\n')}

## Completion Rule

Do not mark the analytics-consent-operations gate complete and do not ship Help production analytics until consent, retention, backend storage, access control, deletion/export handling, owner cadence, monitoring thresholds, and D-031 approval are recorded. Keep Help feedback local-only until those decisions are approved.
`;

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:analytics-readiness',
      '  npm run help:analytics-readiness -- --json',
      '',
      'Options:',
      '  --json   Print machine-readable analytics readiness data.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const readiness = buildReadiness();
  console.log(hasFlag('--json') ? JSON.stringify(readiness, null, 2) : renderMarkdown(readiness));
};

if (require.main === module) {
  main();
}

module.exports = {
  buildReadiness,
  renderMarkdown,
};
