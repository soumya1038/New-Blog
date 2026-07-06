#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'redirect');
const srcDir = path.join(frontendDir, 'src');

const errors = [];

const toRelative = (filePath) => path.relative(rootDir, filePath).replace(/\\/g, '/');
const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const addError = (message) => errors.push(message);

const ensureExists = (filePath, label = toRelative(filePath)) => {
  if (!fs.existsSync(filePath)) {
    addError(`Missing ${label}`);
    return false;
  }
  return true;
};

const ensureContains = (text, token, label) => {
  if (!text.includes(token)) addError(`${label} must contain ${token}`);
};

const appPath = path.join(srcDir, 'App.js');
const footerPath = path.join(srcDir, 'components', 'PublicFooter.js');
const footerCssPath = path.join(srcDir, 'components', 'PublicFooter.css');
const helpCssPath = path.join(srcDir, 'pages', 'HelpCenter.css');

const publicRouteChecks = [
  {
    routePath: '/help',
    componentToken: '<HelpCenter />',
    file: path.join(srcDir, 'pages', 'HelpCenter.jsx'),
    requiredTokens: [
      'Lekhon Help Center',
      'Search the Lekhon Help Center',
      'Browse by topic',
      'Safety Center',
      'Policies',
      'Contact support',
    ],
  },
  {
    routePath: '/help/category/:categoryId',
    componentToken: '<HelpCategory />',
    file: path.join(srcDir, 'pages', 'HelpCategory.jsx'),
    requiredTokens: ['Help Center', 'Guides', 'Search all help'],
  },
  {
    routePath: '/help/article/:slug',
    componentToken: '<HelpArticle />',
    file: path.join(srcDir, 'pages', 'HelpArticle.jsx'),
    requiredTokens: [
      'Guide details',
      'On this page',
      'Choose the next safe action',
      'Was this guide helpful?',
      'Related guides',
    ],
  },
  {
    routePath: '/policies',
    componentToken: '<PolicyCenter />',
    file: path.join(srcDir, 'pages', 'PolicyCenter.jsx'),
    requiredTokens: [
      'Rules and policies',
      'Policy directory',
      'Policy program in progress',
      'Contact support',
    ],
  },
  {
    routePath: '/policies/:slug',
    componentToken: '<PolicyDetail />',
    file: path.join(srcDir, 'pages', 'PolicyDetail.jsx'),
    requiredTokens: ['Publication gate', 'Approvals needed', 'Blocking decisions'],
  },
  {
    routePath: '/safety',
    componentToken: '<SafetyCenter />',
    file: path.join(srcDir, 'pages', 'SafetyCenter.jsx'),
    requiredTokens: [
      'Lekhon Safety Center',
      'Report abuse or fraud',
      'Block or mute',
      'Submit an appeal',
      'Preserve useful evidence',
    ],
  },
  {
    routePath: '/contact',
    componentToken: '<SupportRequest />',
    file: path.join(srcDir, 'pages', 'SupportRequest.jsx'),
    requiredTokens: [
      'Contact Lekhon support',
      'Category',
      'Email for a response',
      'Subject',
      'Details',
      'Request received',
    ],
  },
  {
    routePath: '/report',
    componentToken: '<SupportRequest />',
    file: path.join(srcDir, 'pages', 'SupportRequest.jsx'),
    requiredTokens: [
      "if (pathname === '/report') return 'report'",
      'Report abuse, unsafe content, or marketplace fraud',
      'Submit report',
      'Harassment or threat',
      'Product or seller fraud',
    ],
  },
  {
    routePath: '/appeals',
    componentToken: '<SupportRequest />',
    file: path.join(srcDir, 'pages', 'SupportRequest.jsx'),
    requiredTokens: [
      "if (pathname === '/appeals') return 'appeal'",
      'Submit an appeal',
      'Submit appeal',
      'Account suspension',
      'Seller status revocation',
    ],
  },
  {
    routePath: '/privacy',
    componentToken: '<PrivacyPolicy />',
    file: path.join(srcDir, 'pages', 'PrivacyPolicy.js'),
    requiredTokens: ['Privacy Policy'],
  },
  {
    routePath: '/terms',
    componentToken: '<TermsOfService />',
    file: path.join(srcDir, 'pages', 'TermsOfService.js'),
    requiredTokens: ['Terms of Service'],
  },
  {
    routePath: '/about',
    componentToken: '<About />',
    file: path.join(srcDir, 'pages', 'About.js'),
    requiredTokens: ['About'],
  },
];

const footerRequiredTargets = [
  '/help',
  '/contact',
  '/report',
  '/appeals',
  '/policies',
  '/terms',
  '/privacy',
  '/safety',
  '/help/category/android',
  '/help/category/marketplace-buyers',
  '/help/category/selling',
  '/help/category/writing-publishing',
  '/help/category/ai-tools',
  '/help/category/community-messaging',
  '/help/category/privacy-security',
  '/help/article/cancel-order-and-understand-refund',
  '/help/article/understand-seller-earnings-and-payouts',
  '/help/article/use-ai-tools-responsibly',
  '/help/article/create-and-protect-api-key',
];

const main = () => {
  [appPath, footerPath, footerCssPath, helpCssPath].forEach((filePath) => ensureExists(filePath));
  if (errors.length > 0) return;

  const appSource = readText(appPath);
  const footerSource = readText(footerPath);
  const footerCss = readText(footerCssPath);
  const helpCss = readText(helpCssPath);

  [
    "const PUBLIC_FOOTER_ROUTES = new Set(['/about', '/privacy', '/terms'])",
    "const PUBLIC_FOOTER_PREFIXES = ['/help', '/policies', '/safety', '/contact', '/report', '/appeals']",
    'PUBLIC_FOOTER_ROUTES.has(normalizedPath)',
    'PUBLIC_FOOTER_PREFIXES.some(',
    '{showPublicFooter && <PublicFooter />}',
  ].forEach((token) => ensureContains(appSource, token, toRelative(appPath)));

  publicRouteChecks.forEach((route) => {
    ensureContains(appSource, `path="${route.routePath}"`, toRelative(appPath));
    ensureContains(appSource, route.componentToken, toRelative(appPath));

    if (!ensureExists(route.file)) return;
    const pageSource = readText(route.file);
    route.requiredTokens.forEach((token) => ensureContains(pageSource, token, toRelative(route.file)));
  });

  [
    'aria-label="Lekhon public footer"',
    'aria-label="Footer navigation"',
    '<details',
    '<summary>',
    'Published policies apply as shown',
  ].forEach((token) => ensureContains(footerSource, token, toRelative(footerPath)));

  footerRequiredTargets.forEach((target) => {
    ensureContains(footerSource, `to: '${target}'`, toRelative(footerPath));
  });

  [
    '.public-footer__columns--desktop',
    '.public-footer__columns--mobile',
    '@media',
  ].forEach((token) => ensureContains(footerCss, token, toRelative(footerCssPath)));

  [
    '.help-page',
    '.help-hero',
    '.help-form',
    '.help-callout--warning',
    '@media (prefers-reduced-motion: reduce)',
  ].forEach((token) => ensureContains(helpCss, token, toRelative(helpCssPath)));

  if (errors.length > 0) {
    console.error('Help public route verification failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('Help public route verification passed.');
  console.log(`Public routes checked: ${publicRouteChecks.length}`);
  console.log(`Footer targets checked: ${footerRequiredTargets.length}`);
  console.log('Surfaces: Help, policies, safety, contact, report, appeal, privacy, terms, about, footer');
};

main();
