#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');

const sourcePaths = {
  helpContent: path.join(rootDir, 'redirect', 'src', 'content', 'helpCenterContent.js'),
  visualInventory: path.join(rootDir, 'docs', 'help-center-planning', '11-visual-guidance-inventory.md'),
  visualProtocol: path.join(rootDir, 'docs', 'help-center-planning', '21-visual-evidence-capture-protocol.md'),
  visualWorksheetGenerator: path.join(rootDir, 'scripts', 'create-help-visual-evidence-worksheet.js'),
  releaseReadiness: path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js'),
};

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const sourceHasAll = (source, tokens) => tokens.every((token) => source.includes(token));

const countBy = (items, key) =>
  items.reduce((counts, item) => {
    const value = item[key] || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

const unique = (items) => [...new Set(items.filter(Boolean))];

const check = (area, label, passed, source) => ({ area, label, passed, source });

const loadHelpContent = (source) => {
  const transformed = source.replace(/export const /g, 'const ').concat(`
globalThis.__helpContent = {
  HELP_VISUAL_REQUIREMENTS,
  HELP_VISUAL_STATUSES,
  helpArticles,
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
  const requirements = helpContent.HELP_VISUAL_REQUIREMENTS || [];
  const articleSlugs = new Set((helpContent.helpArticles || []).map((article) => article.slug));
  const p0Requirements = requirements.filter((item) => item.priority === 'P0');
  const openP0Requirements = p0Requirements.filter((item) => item.status !== 'implemented');
  const blockedRequirements = requirements.filter((item) => item.status === 'blocked');
  const pendingRequirements = requirements.filter((item) => item.status === 'pending');
  const implementedRequirements = requirements.filter((item) => item.status === 'implemented');
  const implementedWorkflowStrips = implementedRequirements.filter(
    (item) => item.visualType === 'workflow-strip'
  );
  const ownersForOpenP0 = unique(openP0Requirements.map((item) => item.owner)).sort();
  const blockerSummary = openP0Requirements.map((item) => ({
    id: item.id,
    articleSlug: item.articleSlug,
    owner: item.owner,
    status: item.status,
    visualType: item.visualType,
    platforms: item.platforms,
    blocker: item.blocker || '',
    nextStep: item.nextStep,
  }));

  const localChecks = [
    check(
      'registry',
      'Visual requirement status enum and source registry are present',
      sourceHasAll(sources.helpContent, ['HELP_VISUAL_STATUSES', 'HELP_VISUAL_REQUIREMENTS']),
      'helpCenterContent.js'
    ),
    check(
      'registry',
      'Visual requirements are populated',
      requirements.length >= 20,
      'helpCenterContent.js'
    ),
    check(
      'registry',
      'Every visual requirement has required metadata',
      requirements.every(
        (item) =>
          item.id &&
          item.articleSlug &&
          item.priority &&
          item.visualType &&
          item.owner &&
          item.status &&
          item.purpose &&
          item.nextStep &&
          Array.isArray(item.platforms) &&
          item.platforms.length > 0 &&
          Array.isArray(item.replacementTriggers) &&
          item.replacementTriggers.length > 0
      ),
      'helpCenterContent.js'
    ),
    check(
      'registry',
      'Every visual requirement points to a registered article',
      requirements.every((item) => articleSlugs.has(item.articleSlug)),
      'helpCenterContent.js'
    ),
    check(
      'registry',
      'Every incomplete visual requirement has a blocker',
      requirements
        .filter((item) => item.status !== 'implemented')
        .every((item) => Boolean(item.blocker)),
      'helpCenterContent.js'
    ),
    check(
      'registry',
      'Implemented workflow strips have source evidence',
      implementedWorkflowStrips.every((item) => item.evidence && item.evidence.includes('Rendered from article flow steps')),
      'helpCenterContent.js'
    ),
    check(
      'coverage',
      'P0 visual coverage exists for critical Help workflows',
      [
        'sign-in-with-social-account',
        'add-and-save-product',
        'checkout-and-payment',
        'manage-your-seller-dashboard',
        'understand-seller-earnings-and-payouts',
        'delete-your-account',
        'report-abuse-fraud-or-unsafe-content',
        'appeal-an-enforcement-or-seller-decision',
        'android-navigation-and-offline-limits',
      ].every((slug) => p0Requirements.some((item) => item.articleSlug === slug)),
      'helpCenterContent.js'
    ),
    check(
      'inventory',
      'Visual guidance inventory references the source registry and worksheet command',
      sourceHasAll(sources.visualInventory, ['HELP_VISUAL_REQUIREMENTS', 'npm run help:visual-worksheet', 'Required Screenshot and Clip Backlog']),
      '11-visual-guidance-inventory.md'
    ),
    check(
      'protocol',
      'Visual protocol defines capture, privacy, accessibility, and replacement reviews',
      sourceHasAll(sources.visualProtocol, ['Capture Package', 'Privacy Review', 'Accessibility Review', 'Replacement Review']),
      '21-visual-evidence-capture-protocol.md'
    ),
    check(
      'worksheet',
      'Visual worksheet generator is source-owned and includes P0 counts',
      sourceHasAll(sources.visualWorksheetGenerator, ['HELP_VISUAL_REQUIREMENTS', 'P0 open requirements', 'Do not mark', 'p0-visual-evidence-capture']),
      'create-help-visual-evidence-worksheet.js'
    ),
    check(
      'release-gate',
      'P0 visual release gate remains blocked until evidence is captured',
      sourceHasAll(sources.releaseReadiness, ['p0-visual-evidence-capture', "status: 'blocked-production'", 'Visual evidence notes for every unblocked P0 visual requirement']),
      'releaseReadiness.js'
    ),
  ];

  const failedLocalChecks = localChecks.filter((entry) => !entry.passed);

  return {
    result:
      failedLocalChecks.length === 0
        ? 'visual source registry ready; P0 visual evidence capture required'
        : 'visual source registry incomplete',
    counts: {
      total: requirements.length,
      p0: p0Requirements.length,
      openP0: openP0Requirements.length,
      implemented: implementedRequirements.length,
      pending: pendingRequirements.length,
      blocked: blockedRequirements.length,
      byStatus: countBy(requirements, 'status'),
      byPriority: countBy(requirements, 'priority'),
      byVisualType: countBy(requirements, 'visualType'),
    },
    openP0Requirements: blockerSummary,
    ownersForOpenP0,
    localChecks,
    checksByArea: countBy(localChecks, 'area'),
    failedLocalChecks,
  };
};

const renderChecks = (checks) =>
  checks.map((entry) => `- ${entry.passed ? 'pass' : 'fail'}: ${entry.label} (${entry.source})`).join('\n');

const renderOpenP0 = (requirements) =>
  requirements
    .map(
      (item) =>
        `- ${item.id} (${item.status}, ${item.owner}): ${item.blocker || item.nextStep}`
    )
    .join('\n');

const renderKeyValueCounts = (counts) =>
  Object.entries(counts)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

const renderMarkdown = (readiness) => `# Lekhon Visual Readiness Summary

Result: ${readiness.result}

## Counts

- Visual requirements: ${readiness.counts.total}
- P0 requirements: ${readiness.counts.p0}
- Open P0 requirements: ${readiness.counts.openP0}
- Implemented requirements: ${readiness.counts.implemented}
- Pending requirements: ${readiness.counts.pending}
- Blocked requirements: ${readiness.counts.blocked}
- Failed local visual checks: ${readiness.failedLocalChecks.length}

## Counts By Status

${renderKeyValueCounts(readiness.counts.byStatus)}

## Counts By Priority

${renderKeyValueCounts(readiness.counts.byPriority)}

## Counts By Visual Type

${renderKeyValueCounts(readiness.counts.byVisualType)}

## Open P0 Requirements

${renderOpenP0(readiness.openP0Requirements)}

## Owners For Open P0 Requirements

${readiness.ownersForOpenP0.map((owner) => `- ${owner}`).join('\n')}

## Local Checks

${renderChecks(readiness.localChecks)}

## Checks By Area

${renderKeyValueCounts(readiness.checksByArea)}

## Completion Rule

Do not mark the p0-visual-evidence-capture gate complete until every unblocked P0 visual requirement has current evidence, privacy review, accessibility text, replacement-trigger review, and owner approval. Keep blocked P0 visuals listed as release blockers unless an approved exception records the owner, risk, and next review date.
`;

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:visual-readiness',
      '  npm run help:visual-readiness -- --json',
      '',
      'Options:',
      '  --json   Print machine-readable visual readiness data.',
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
