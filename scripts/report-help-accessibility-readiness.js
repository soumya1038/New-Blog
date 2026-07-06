#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const sourcePaths = {
  helpCss: path.join(rootDir, 'redirect', 'src', 'pages', 'HelpCenter.css'),
  footerCss: path.join(rootDir, 'redirect', 'src', 'components', 'PublicFooter.css'),
  helpCenter: path.join(rootDir, 'redirect', 'src', 'pages', 'HelpCenter.jsx'),
  helpArticle: path.join(rootDir, 'redirect', 'src', 'pages', 'HelpArticle.jsx'),
  policyCenter: path.join(rootDir, 'redirect', 'src', 'pages', 'PolicyCenter.jsx'),
  policyDetail: path.join(rootDir, 'redirect', 'src', 'pages', 'PolicyDetail.jsx'),
  safetyCenter: path.join(rootDir, 'redirect', 'src', 'pages', 'SafetyCenter.jsx'),
  supportRequest: path.join(rootDir, 'redirect', 'src', 'pages', 'SupportRequest.jsx'),
  footer: path.join(rootDir, 'redirect', 'src', 'components', 'PublicFooter.js'),
  accessibilityEnvironment: path.join(rootDir, 'scripts', 'report-help-accessibility-environment.js'),
  rootPackage: path.join(rootDir, 'package.json'),
  frontendPackage: path.join(rootDir, 'redirect', 'package.json'),
};

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const loadSources = () =>
  Object.fromEntries(
    Object.entries(sourcePaths).map(([key, filePath]) => [key, readText(filePath)])
  );

const sourceHasAll = (source, tokens) => tokens.every((token) => source.includes(token));

const check = (area, label, passed, source) => ({ area, label, passed, source });

const buildReadiness = () => {
  const sources = loadSources();
  const rootPackage = JSON.parse(sources.rootPackage);
  const frontendPackage = JSON.parse(sources.frontendPackage);

  const routeSurfaces = [
    '/help',
    '/help/category/account-access',
    '/help/article/sign-in-with-google-facebook-x-or-linkedin',
    '/policies',
    '/policies/:slug',
    '/safety',
    '/contact',
    '/report',
    '/appeals',
    'Public footer',
    'Android WebView',
  ];

  const checks = [
    check(
      'focus',
      'Help pages define visible focus treatment for links, buttons, and summaries',
      sourceHasAll(sources.helpCss, ['.help-page a:focus-visible', 'outline: 2px solid var(--help-link-color)', 'outline-offset: 3px']),
      'HelpCenter.css'
    ),
    check(
      'focus',
      'Help search fields show a focus ring',
      sourceHasAll(sources.helpCss, ['.help-search input:focus', 'box-shadow: 0 0 0 3px']),
      'HelpCenter.css'
    ),
    check(
      'motion',
      'Reduced-motion mode removes non-essential Help transitions',
      sourceHasAll(sources.helpCss, ['@media (prefers-reduced-motion: reduce)', 'transition: none']),
      'HelpCenter.css'
    ),
    check(
      'reflow',
      'Help article layout collapses for tablet/mobile widths',
      sourceHasAll(sources.helpCss, ['@media (max-width: 840px)', '.help-article-layout', 'grid-template-columns: 1fr']),
      'HelpCenter.css'
    ),
    check(
      'reflow',
      'Small mobile layouts collapse Help grids and flows',
      sourceHasAll(sources.helpCss, ['@media (max-width: 640px)', '.help-grid', '.help-flow']),
      'HelpCenter.css'
    ),
    check(
      'search',
      'Help search input has an accessible name and clear button label',
      sourceHasAll(sources.helpCenter, ['aria-label="Search the Lekhon Help Center"', 'aria-label="Clear search"']),
      'HelpCenter.jsx'
    ),
    check(
      'search',
      'Search results announce changes politely',
      sources.helpCenter.includes('aria-live="polite"'),
      'HelpCenter.jsx'
    ),
    check(
      'landmarks',
      'Help browsing sections use labelled sections',
      sourceHasAll(sources.helpCenter, ['aria-labelledby="help-categories-title"', 'aria-labelledby="popular-help-title"', 'aria-label="More support options"']),
      'HelpCenter.jsx'
    ),
    check(
      'article',
      'Article pages expose breadcrumb navigation and current page state',
      sourceHasAll(sources.helpArticle, ['aria-label="Breadcrumb"', 'aria-current="page"']),
      'HelpArticle.jsx'
    ),
    check(
      'article',
      'Article workflow strips have accessible labels',
      sources.helpArticle.includes('aria-label={`${section.heading} workflow`}'),
      'HelpArticle.jsx'
    ),
    check(
      'article',
      'Article actions expose action group labels',
      sources.helpArticle.includes('aria-label={`${section.heading} actions`}'),
      'HelpArticle.jsx'
    ),
    check(
      'article',
      'Article feedback exposes group, pressed state, and saved status',
      sourceHasAll(sources.helpArticle, ['role="group"', 'aria-pressed', 'role="status"']),
      'HelpArticle.jsx'
    ),
    check(
      'article',
      'Article details and on-page navigation are labelled',
      sourceHasAll(sources.helpArticle, ['aria-label="Guide details"', 'aria-label="On this page"']),
      'HelpArticle.jsx'
    ),
    check(
      'article',
      'Escalation panel uses labelled section semantics',
      sources.helpArticle.includes('aria-labelledby="help-escalation-title"'),
      'HelpArticle.jsx'
    ),
    check(
      'policy',
      'Policy directory has a labelled policy list and visible draft warning',
      sourceHasAll(sources.policyCenter, ['aria-labelledby="policy-list-title"', 'help-callout help-callout--warning']),
      'PolicyCenter.jsx'
    ),
    check(
      'policy',
      'Draft policy pages expose breadcrumb, publication gate, and policy contents labels',
      sourceHasAll(sources.policyDetail, ['aria-label="Breadcrumb"', 'aria-label="Publication gate"', 'aria-label="Policy contents"']),
      'PolicyDetail.jsx'
    ),
    check(
      'safety',
      'Safety Center exposes labelled safety actions',
      sources.safetyCenter.includes('aria-label="Safety actions"'),
      'SafetyCenter.jsx'
    ),
    check(
      'support',
      'Support forms use visible labels and required fields',
      sourceHasAll(sources.supportRequest, ['<label>', 'required', 'type="email"', 'textarea']),
      'SupportRequest.jsx'
    ),
    check(
      'support',
      'Support form errors and success references are exposed',
      sourceHasAll(sources.supportRequest, ['role="alert"', 'Reference: {state.referenceNumber}', 'Request received']),
      'SupportRequest.jsx'
    ),
    check(
      'support',
      'Support submit button has disabled submitting state',
      sourceHasAll(sources.supportRequest, ['disabled={state.status === \'submitting\'}', 'Sending...']),
      'SupportRequest.jsx'
    ),
    check(
      'footer',
      'Public footer, social links, and footer nav are labelled',
      sourceHasAll(sources.footer, ['aria-label="Lekhon public footer"', 'aria-label="Lekhon social links"', 'aria-label="Footer navigation"']),
      'PublicFooter.js'
    ),
    check(
      'footer',
      'Footer logo and social links have accessible labels',
      sourceHasAll(sources.footer, ['alt="Lekhon"', 'aria-label={`Lekhon on ${item.label}`}', 'title={`Lekhon on ${item.label}`}']),
      'PublicFooter.js'
    ),
    check(
      'footer',
      'Mobile footer uses native disclosure controls',
      sourceHasAll(sources.footer, ['<details', '<summary>']),
      'PublicFooter.js'
    ),
    check(
      'footer',
      'Footer has focus-visible affordances and mobile disclosure styling',
      sourceHasAll(sources.footerCss, [':focus-visible', '.public-footer__columns--mobile', '.public-footer__column[open] summary::after']),
      'PublicFooter.css'
    ),
    check(
      'manual-evidence',
      'Accessibility environment reporter is exposed at root and frontend',
      rootPackage.scripts['help:accessibility-environment'] ===
        'node scripts/report-help-accessibility-environment.js' &&
        frontendPackage.scripts['help:accessibility-environment'] ===
          'node ../scripts/report-help-accessibility-environment.js' &&
        sourceHasAll(sources.accessibilityEnvironment, [
          'Lekhon Accessibility Environment Evidence',
          'NVDA',
          'TalkBack',
          'manual assistive-technology pass still required',
        ]),
      'report-help-accessibility-environment.js'
    ),
  ];

  const failedChecks = checks.filter((entry) => !entry.passed);
  const checksByArea = checks.reduce((counts, entry) => {
    counts[entry.area] = (counts[entry.area] || 0) + 1;
    return counts;
  }, {});

  const remainingEvidence = [
    'Keyboard pass for Help, category, article, policy, safety, contact, report, appeal, footer, and contextual Help routes.',
    'Accessibility environment snapshot from npm run help:accessibility-environment.',
    'NVDA pass on Windows for Help search, article workflow strips, policy draft gates, footer navigation, and support forms.',
    'TalkBack pass on a physical Android device for Help, articles, footer accordions, support forms, OAuth return, and Android back behavior.',
    'Text zoom and Android font/display-size pass at required viewport sizes.',
    'Contrast and theme pass for light and dark surfaces.',
    'Reduced-motion verification for Help surfaces, landing page motion, and post-login animation.',
  ];

  return {
    result:
      failedChecks.length === 0
        ? 'source accessibility affordances ready; manual assistive-technology evidence required'
        : 'source accessibility affordances incomplete',
    routeSurfaces,
    checks,
    checksByArea,
    failedChecks,
    remainingEvidence,
  };
};

const renderChecks = (checks) =>
  checks.map((entry) => `- ${entry.passed ? 'pass' : 'fail'}: ${entry.label} (${entry.source})`).join('\n');

const renderMarkdown = (readiness) => `# Lekhon Accessibility Readiness Summary

Result: ${readiness.result}

## Counts

- Required route/workflow surfaces: ${readiness.routeSurfaces.length}
- Source accessibility checks: ${readiness.checks.length}
- Failed source checks: ${readiness.failedChecks.length}
- Areas covered: ${Object.keys(readiness.checksByArea).length}

## Required Route And Workflow Surfaces

${readiness.routeSurfaces.map((surface) => `- ${surface}`).join('\n')}

## Source Checks

${renderChecks(readiness.checks)}

## Checks By Area

${Object.entries(readiness.checksByArea)
  .map(([area, count]) => `- ${area}: ${count}`)
  .join('\n')}

## Remaining Manual Evidence

${readiness.remainingEvidence.map((item) => `- ${item}`).join('\n')}

## Completion Rule

Do not mark the manual screen-reader verification gate complete until keyboard, NVDA, TalkBack, text zoom, contrast, focus restoration, reduced-motion, and Android physical-device accessibility evidence are captured from the current release candidate.
`;

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:accessibility-readiness',
      '  npm run help:accessibility-readiness -- --json',
      '',
      'Options:',
      '  --json   Print machine-readable accessibility readiness data.',
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
