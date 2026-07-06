import fs from 'fs';
import path from 'path';
import { footerColumns } from '../components/PublicFooter';
import {
  getArticle,
  getCategory,
  HELP_SEARCH_REVIEW_SIGNALS,
  HELP_REVIEW_TRIGGERS,
  HELP_VISUAL_REQUIREMENTS,
  HELP_VISUAL_STATUSES,
  helpArticles,
  helpCategories,
  helpCategoryOwners,
  SEARCH_FILLER_WORDS,
  searchHelpArticles,
} from './helpCenterContent';
import {
  getPolicyDocument,
  POLICY_PUBLICATION_RULES,
  POLICY_PUBLICATION_STATES,
  POLICY_REQUIRED_APPROVALS,
  policyDocuments,
} from './policyContent';
import {
  approvedReleaseReadinessExceptions,
  HELP_RELEASE_EXCEPTIONS,
  HELP_RELEASE_READINESS_GATES,
  openGatesWithoutApprovedExceptions,
  openReleaseReadinessGates,
  RELEASE_CANDIDATE_CHECKLIST,
  RELEASE_EXCEPTION_STATUSES,
  RELEASE_GATE_AREAS,
  RELEASE_GATE_STATUSES,
  verifiedLocalReleaseReadinessGates,
} from './releaseReadiness';

const directRoutes = new Set([
  '/about',
  '/appeals',
  '/contact',
  '/help',
  '/home',
  '/marketplace',
  '/policies',
  '/privacy',
  '/report',
  '/safety',
  '/terms',
]);

const pathOnly = (target) => String(target || '').split('?')[0].split('#')[0];

const isKnownInternalTarget = (target) => {
  const path = pathOnly(target);
  if (directRoutes.has(path)) return true;

  if (path.startsWith('/help/category/')) {
    return Boolean(getCategory(path.slice('/help/category/'.length)));
  }
  if (path.startsWith('/help/article/')) {
    return Boolean(getArticle(path.slice('/help/article/'.length)));
  }
  if (path.startsWith('/policies/')) {
    return Boolean(getPolicyDocument(path.slice('/policies/'.length)));
  }
  return false;
};

const expectUnique = (values) => {
  expect(new Set(values).size).toBe(values.length);
};

const collectSourceFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    if (!/\.(js|jsx)$/.test(entry.name)) return [];
    return [entryPath];
  });
};

const getRelativeSourcePath = (filePath) =>
  path.relative(process.cwd(), filePath).replace(/\\/g, '/');

const sourceRoots = ['pages', 'components', 'content'].map((dir) =>
  path.join(process.cwd(), 'src', dir)
);

const getSourceHelpLinks = () =>
  sourceRoots.flatMap((root) =>
    collectSourceFiles(root).flatMap((filePath) => {
      const text = fs.readFileSync(filePath, 'utf8');
      const matches = text.match(/\/help\/(?:article|category)\/[A-Za-z0-9-]+/g) || [];
      return [...new Set(matches)].map((to) => ({
        file: getRelativeSourcePath(filePath),
        to,
      }));
    })
  );

const readSource = (...parts) => fs.readFileSync(path.join(process.cwd(), 'src', ...parts), 'utf8');

const readBackendSource = (...parts) =>
  fs.readFileSync(path.join(process.cwd(), '..', 'backend', ...parts), 'utf8');

const readProjectFile = (...parts) =>
  fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

describe('Help Center content governance', () => {
  test('category and article identifiers are unique and connected', () => {
    expectUnique(helpCategories.map((category) => category.id));
    expectUnique(helpArticles.map((article) => article.slug));
    expect(Object.keys(helpCategoryOwners).sort()).toEqual(
      helpCategories.map((category) => category.id).sort()
    );
    expect(HELP_REVIEW_TRIGGERS.length).toBeGreaterThanOrEqual(3);

    helpCategories.forEach((category) => {
      expect(category.title.trim()).not.toBe('');
      expect(category.summary.trim()).not.toBe('');
      expect(category.owners.length).toBeGreaterThan(0);
      expect(category.owners).toEqual(helpCategoryOwners[category.id]);
      expect(helpArticles.some((article) => article.category === category.id)).toBe(true);
    });

    helpArticles.forEach((article) => {
      expect(getCategory(article.category)).toBeTruthy();
      expect(article.title.trim()).not.toBe('');
      expect(article.summary.trim()).not.toBe('');
      expect(article.platforms.length).toBeGreaterThan(0);
      expect(article.audiences.length).toBeGreaterThan(0);
      expect(article.owners.length).toBeGreaterThan(0);
      expect(article.owners.every((owner) => helpCategoryOwners[article.category].includes(owner))).toBe(true);
      expect(article.lastReviewed).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
      expect(article.reviewTriggers.length).toBeGreaterThan(0);
      expect(article.reviewTriggers).toEqual(expect.arrayContaining(HELP_REVIEW_TRIGGERS));
      expect(article.sections.length).toBeGreaterThan(0);
      article.sections.forEach((section) => {
        expect(section.heading.trim()).not.toBe('');
      });
    });
  });

  test('article action links and footer links resolve to registered destinations', () => {
    const actionLinks = helpArticles.flatMap((article) =>
      article.sections.flatMap((section) => section.actions || [])
    );
    const footerLinks = footerColumns.flatMap((column) => column.links);

    [...actionLinks, ...footerLinks].forEach((link) => {
      expect(link.label.trim()).not.toBe('');
      expect(isKnownInternalTarget(link.to)).toBe(true);
    });
  });

  test('public footer keeps the required support, policy, and marketplace taxonomy', () => {
    expect(footerColumns.map((column) => column.title)).toEqual([
      'Explore Lekhon',
      'Create and connect',
      'Buy and sell',
      'Help and safety',
      'Legal',
    ]);

    footerColumns.forEach((column) => {
      expect(column.links.length).toBeGreaterThanOrEqual(5);
      column.links.forEach((link) => {
        expect(link.label.trim()).not.toBe('');
        expect(isKnownInternalTarget(link.to)).toBe(true);
      });
    });

    const footerTargets = new Set(footerColumns.flatMap((column) => column.links.map((link) => pathOnly(link.to))));

    [
      '/help',
      '/contact',
      '/report',
      '/appeals',
      '/policies',
      '/terms',
      '/privacy',
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
    ].forEach((target) => {
      expect(footerTargets.has(target)).toBe(true);
    });
  });

  test('Help accessibility affordances stay present at source level', () => {
    const helpCss = readSource('pages', 'HelpCenter.css');
    const supportForm = readSource('pages', 'SupportRequest.jsx');
    const helpArticle = readSource('pages', 'HelpArticle.jsx');
    const footer = readSource('components', 'PublicFooter.js');

    [
      '.help-page a:focus-visible',
      '.help-page button:focus-visible',
      '.help-page summary:focus-visible',
      '.help-search input:focus',
      '.help-form input:focus',
      '.help-form select:focus',
      '.help-form textarea:focus',
      '@media (prefers-reduced-motion: reduce)',
    ].forEach((token) => {
      expect(helpCss).toContain(token);
    });

    ['Category', 'Email for a response', 'Subject', 'Details'].forEach((label) => {
      expect(supportForm).toContain(label);
    });
    expect(supportForm).toContain('role="alert"');
    expect(supportForm).toContain('Reference:');

    expect(helpArticle).toContain('aria-label={`${section.heading} workflow`}');
    expect(helpArticle).toContain('aria-label={`${section.heading} actions`}');
    expect(helpArticle).toContain('aria-label="On this page"');

    expect(footer).toContain('aria-label="Lekhon public footer"');
    expect(footer).toContain('aria-label="Footer navigation"');
    expect(footer).toContain('<details');
    expect(footer).toContain('<summary>');
  });

  test('Help search and local article feedback affordances stay present at source level', () => {
    const helpCenter = readSource('pages', 'HelpCenter.jsx');
    const helpArticle = readSource('pages', 'HelpArticle.jsx');
    const contentRegistry = readSource('content', 'helpCenterContent.js');
    const helpCss = readSource('pages', 'HelpCenter.css');

    [
      'useSearchParams',
      'useDeferredValue',
      'searchHelpArticles(deferredQuery)',
      'new URLSearchParams(searchParams)',
      'setSearchParams(next, { replace: true })',
      'aria-label="Search the Lekhon Help Center"',
      'No verified guide matches',
      'Try a shorter phrase, an exact error message',
      'Contact support',
    ].forEach((token) => {
      expect(helpCenter).toContain(token);
    });

    [
      'SEARCH_FILLER_WORDS',
      'HELP_SEARCH_REVIEW_SIGNALS',
      'searchText.includes(normalized)',
      'minimumScore',
    ].forEach((token) => {
      expect(contentRegistry).toContain(token);
    });

    expect(SEARCH_FILLER_WORDS.has('how')).toBe(true);
    expect(HELP_SEARCH_REVIEW_SIGNALS.length).toBeGreaterThanOrEqual(8);

    [
      'lekhon-help-feedback:',
      'localStorage.getItem(feedbackKey(slug))',
      'localStorage.setItem(',
      'aria-labelledby="help-feedback-title"',
      'aria-label="Rate this Help guide"',
      'aria-pressed={selected === \'helpful\'}',
      'aria-pressed={selected === \'notHelpful\'}',
      'Thanks. Your feedback was saved on this device.',
    ].forEach((token) => {
      expect(helpArticle).toContain(token);
    });

    [
      '.help-feedback',
      '.help-feedback__actions button',
      '.help-feedback__actions button.is-selected',
      '.help-feedback__saved',
    ].forEach((token) => {
      expect(helpCss).toContain(token);
    });
  });

  test('Help article experience keeps guide facts, useful related guides, and escalation paths', () => {
    const helpArticle = readSource('pages', 'HelpArticle.jsx');
    const helpCss = readSource('pages', 'HelpCenter.css');

    [
      'const getRelatedArticles',
      'countOverlap(item.keywords, entry.keywords) * 4',
      'countOverlap(item.audiences, entry.audiences) * 2',
      'supportCategoryByHelpCategory',
      "'marketplace-buyers': 'Marketplace order or payment'",
      "selling: 'Seller account or payout'",
      "android: 'Android app'",
      'const getEscalationActions',
      'Report a safety issue',
      'Appeal a decision',
      'Contact support',
      'to={addReference(action.to, sourceReference)}',
      'aria-label="Guide details"',
      'Topic',
      'Applies to',
      'Useful for',
      'Choose the next safe action',
      'Keep passwords, one-time codes, API keys',
    ].forEach((token) => {
      expect(helpArticle).toContain(token);
    });

    [
      '.help-article-facts',
      '.help-article-facts dl',
      '.help-escalation',
      '.help-escalation__actions',
      '.help-escalation__actions a',
      '.help-escalation__actions small',
    ].forEach((token) => {
      expect(helpCss).toContain(token);
    });
  });

  test('support, report, and appeal lifecycle affordances stay present at source level', () => {
    const supportForm = readSource('pages', 'SupportRequest.jsx');
    const adminQueue = readSource('components', 'AdminSupportRequests.jsx');
    const supportController = readBackendSource('controllers', 'supportController.js');
    const supportRoutes = readBackendSource('routes', 'supportRoutes.js');
    const supportModel = readBackendSource('models', 'SupportRequest.js');

    [
      "if (pathname === '/report') return 'report'",
      "if (pathname === '/appeals') return 'appeal'",
      "type: 'support'",
      "type: 'report'",
      "type: 'appeal'",
      "api.post('/support/requests'",
      "reference: searchParams.get('reference') || ''",
      'sourcePath: pathname',
      'Reference:',
      'Do not include passwords',
      'Immediate physical danger',
    ].forEach((token) => {
      expect(supportForm).toContain(token);
    });

    [
      'Account and sign-in',
      'Marketplace order or payment',
      'Seller account or payout',
      'Android app',
      'Harassment or threat',
      'Product or seller fraud',
      'Child safety concern',
      'Account suspension',
      'Seller application rejection',
      'Seller status revocation',
    ].forEach((category) => {
      expect(supportForm).toContain(category);
    });

    [
      "new Set(['support', 'report', 'appeal'])",
      'buildReferenceNumber',
      'createUniqueReferenceNumber',
      "return 'urgent'",
      "return 'high'",
      'sendContactEmail',
      'getAdminSupportMetrics',
      'updateAdminSupportRequest',
      "['open', 'reviewing', 'waiting_for_user', 'resolved', 'closed']",
      "['normal', 'high', 'urgent']",
    ].forEach((token) => {
      expect(supportController).toContain(token);
    });

    [
      "router.post('/requests', submitLimiter, optionalAuth, createSupportRequest)",
      "router.get('/requests/me', protect, getMySupportRequests)",
      "router.get('/admin/metrics', adminOrCoAdminAuth, getAdminSupportMetrics)",
      "router.get('/admin/requests', adminOrCoAdminAuth, getAdminSupportRequests)",
      "router.patch('/admin/requests/:id', adminAuth, updateAdminSupportRequest)",
      'max: 8',
    ].forEach((token) => {
      expect(supportRoutes).toContain(token);
    });

    [
      "enum: ['support', 'report', 'appeal']",
      "enum: ['open', 'reviewing', 'waiting_for_user', 'resolved', 'closed']",
      "enum: ['normal', 'high', 'urgent']",
      'referenceNumber',
      'adminNotes',
      'metadata',
      'resolvedAt',
    ].forEach((token) => {
      expect(supportModel).toContain(token);
    });

    [
      "api.get('/support/admin/metrics')",
      'api.get(`/support/admin/requests?${params.toString()}`)',
      'api.patch(',
      '`/support/admin/requests/${selected._id}`',
      'Support operations',
      'Review urgent or stale requests',
      'Co-admins can review. Only admins can change status or internal notes.',
      'assignToMe',
      'adminNotes',
    ].forEach((token) => {
      expect(adminQueue).toContain(token);
    });
  });

  test('Android app assumptions and Help guidance stay aligned', () => {
    const capacitorConfig = readProjectFile('capacitor.config.ts');
    const androidManifest = readProjectFile('android', 'app', 'src', 'main', 'AndroidManifest.xml');
    const packageJson = JSON.parse(readProjectFile('package.json'));
    const appSource = readSource('App.js');
    const nativeApp = readSource('utils', 'nativeApp.js');
    const androidArticles = helpArticles.filter((article) => article.category === 'android');
    const androidSlugs = androidArticles.map((article) => article.slug);

    [
      "appId: 'com.lekhon.app'",
      "appName: 'Lekhon'",
      "webDir: 'build'",
      "androidScheme: 'https'",
    ].forEach((token) => {
      expect(capacitorConfig).toContain(token);
    });

    [
      'android.permission.INTERNET',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.hardware.camera" android:required="false"',
      'android.hardware.microphone" android:required="false"',
      'android:launchMode="singleTask"',
    ].forEach((token) => {
      expect(androidManifest).toContain(token);
    });

    expect(packageJson.scripts['android:sync']).toContain('npx cap sync android');
    expect(packageJson.scripts['android:run']).toContain('npx cap run android');

    [
      "import { App as CapacitorApp } from '@capacitor/app'",
      'isNativeApp()',
      'runningNativeApp ? <Navigate to="/home" replace /> : <LandingPage />',
      "CapacitorApp.addListener('backButton'",
      'navigate(-1)',
      'CapacitorApp.minimizeApp',
      'path="/auth/google/callback"',
      'path="/auth/facebook/callback"',
      'path="/auth/twitter/callback"',
      'path="/auth/linkedin/callback"',
    ].forEach((token) => {
      expect(appSource).toContain(token);
    });

    ['isNativePlatform', "platform === 'android'", "platform === 'ios'"].forEach((token) => {
      expect(nativeApp).toContain(token);
    });

    [
      'install-and-update-android-test-app',
      'android-permissions-and-oauth',
      'android-navigation-and-offline-limits',
    ].forEach((slug) => {
      expect(androidSlugs).toContain(slug);
    });

    androidArticles.forEach((article) => {
      expect(article.platforms).toEqual(['Android']);
      expect(article.sections.length).toBeGreaterThan(0);
    });

    const androidHelpText = androidArticles
      .flatMap((article) =>
        article.sections.flatMap((section) => [
          section.heading,
          ...(section.paragraphs || []),
          ...(section.bullets || []),
          ...(section.steps || []),
          section.warning || '',
        ])
      )
      .join(' ');

    [
      'development/testing installation',
      'Camera',
      'Microphone',
      'verified Android App Links',
      'back button should return',
      'Clear app storage carefully',
      'Most Lekhon features require the deployed backend',
    ].forEach((token) => {
      expect(androidHelpText).toContain(token);
    });
  });

  test('app route registration and public footer visibility stay aligned', () => {
    const appSource = readSource('App.js');

    [
      'const PUBLIC_FOOTER_ROUTES = new Set([\'/about\', \'/privacy\', \'/terms\'])',
      "const PUBLIC_FOOTER_PREFIXES = ['/help', '/policies', '/safety', '/contact', '/report', '/appeals']",
      'PUBLIC_FOOTER_ROUTES.has(normalizedPath)',
      'PUBLIC_FOOTER_PREFIXES.some(',
      '{showPublicFooter && <PublicFooter />}',
      'runningNativeApp ? <Navigate to="/home" replace /> : <LandingPage />',
    ].forEach((token) => {
      expect(appSource).toContain(token);
    });

    [
      ['path="/help"', '<HelpCenter />'],
      ['path="/help/category/:categoryId"', '<HelpCategory />'],
      ['path="/help/article/:slug"', '<HelpArticle />'],
      ['path="/policies"', '<PolicyCenter />'],
      ['path="/policies/:slug"', '<PolicyDetail />'],
      ['path="/safety"', '<SafetyCenter />'],
      ['path="/contact"', '<SupportRequest />'],
      ['path="/report"', '<SupportRequest />'],
      ['path="/appeals"', '<SupportRequest />'],
      ['path="/privacy"', '<PrivacyPolicy />'],
      ['path="/terms"', '<TermsOfService />'],
      ['path="/about"', '<About />'],
      ['path="/auth/google/callback"', '<GoogleAuthCallback />'],
      ['path="/auth/facebook/callback"', '<FacebookAuthCallback />'],
      ['path="/auth/twitter/callback"', '<TwitterAuthCallback />'],
      ['path="/auth/linkedin/callback"', '<LinkedInAuthCallback />'],
      ['path="*"', '<NotFound />'],
    ].forEach(([pathToken, componentToken]) => {
      expect(appSource).toContain(pathToken);
      expect(appSource).toContain(componentToken);
    });
  });

  test('workflow strips are accessible, useful, and attached to critical guides', () => {
    const articlesWithFlows = helpArticles.filter((article) =>
      article.sections.some((section) => Array.isArray(section.flow))
    );
    const flowSlugs = articlesWithFlows.map((article) => article.slug);

    [
      'sign-in-with-social-account',
      'understand-drafts-and-local-saves',
      'cancel-order-and-understand-refund',
      'manage-your-seller-dashboard',
      'understand-seller-earnings-and-payouts',
      'secure-a-compromised-account',
      'report-abuse-fraud-or-unsafe-content',
      'appeal-an-enforcement-or-seller-decision',
    ].forEach((slug) => {
      expect(flowSlugs).toContain(slug);
    });

    articlesWithFlows.forEach((article) => {
      article.sections
        .filter((section) => Array.isArray(section.flow))
        .forEach((section) => {
          expect(section.flow.length).toBeGreaterThanOrEqual(2);
          section.flow.forEach((step) => {
            expect(typeof step).toBe('string');
            expect(step.trim().length).toBeGreaterThan(0);
          });
        });
    });
  });

  test('visual guidance requirements are structured, owned, and attached to articles', () => {
    const allowedVisualTypes = new Set([
      'workflow-strip',
      'annotated-screenshot',
      'screenshot-sequence',
      'short-clip',
      'diagram',
      'empty-state-image',
    ]);
    const requirementIds = HELP_VISUAL_REQUIREMENTS.map((requirement) => requirement.id);
    const requirementSlugs = new Set(
      HELP_VISUAL_REQUIREMENTS.map((requirement) => requirement.articleSlug)
    );

    expectUnique(requirementIds);
    expect(HELP_VISUAL_REQUIREMENTS.length).toBeGreaterThanOrEqual(20);
    expect(HELP_VISUAL_STATUSES).toEqual(['implemented', 'pending', 'blocked']);

    HELP_VISUAL_REQUIREMENTS.forEach((requirement) => {
      const article = getArticle(requirement.articleSlug);

      expect(article).toBeTruthy();
      expect(requirement.id.trim()).not.toBe('');
      expect(requirement.priority).toMatch(/^P[0-2]$/);
      expect(allowedVisualTypes.has(requirement.visualType)).toBe(true);
      expect(requirement.platforms.length).toBeGreaterThan(0);
      expect(requirement.owner.trim()).not.toBe('');
      expect(HELP_VISUAL_STATUSES).toContain(requirement.status);
      expect(requirement.purpose.trim()).not.toBe('');
      expect(requirement.nextStep.trim()).not.toBe('');
      expect(requirement.replacementTriggers.length).toBeGreaterThan(0);
      expect(article.visualRequirements).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: requirement.id })])
      );

      if (requirement.status === 'implemented') {
        expect(requirement.evidence.trim()).not.toBe('');
      } else {
        expect(requirement.blocker.trim()).not.toBe('');
      }

      if (requirement.visualType === 'workflow-strip') {
        expect(article.sections.some((section) => Array.isArray(section.flow))).toBe(true);
      }
    });

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
      'create-and-protect-api-key',
    ].forEach((slug) => {
      expect(requirementSlugs.has(slug)).toBe(true);
    });
  });

  test('source Help links resolve and critical contextual links stay in place', () => {
    const sourceHelpLinks = getSourceHelpLinks();

    expect(sourceHelpLinks.length).toBeGreaterThan(0);
    sourceHelpLinks.forEach((link) => {
      expect(isKnownInternalTarget(link.to)).toBe(true);
    });

    [
      ['src/pages/Checkout.js', '/help/article/checkout-and-payment'],
      ['src/pages/AddProduct.js', '/help/article/add-and-save-product'],
      ['src/pages/BecomeASeller.js', '/help/article/apply-to-become-seller'],
      ['src/pages/Login.jsx', '/help/article/secure-a-compromised-account'],
      ['src/pages/Login.jsx', '/help/article/appeal-an-enforcement-or-seller-decision'],
      ['src/pages/MyOrders.js', '/help/article/resolve-an-order-delivery-or-return-problem'],
      ['src/pages/OrderDetail.js', '/help/article/resolve-an-order-delivery-or-return-problem'],
      ['src/components/PrivacySettings.js', '/help/article/manage-profile-privacy'],
      ['src/pages/SellerDashboard.js', '/help/article/manage-your-seller-dashboard'],
      ['src/pages/SellerEarnings.js', '/help/article/understand-seller-earnings-and-payouts'],
      ['src/pages/ChatNew.jsx', '/help/article/report-abuse-fraud-or-unsafe-content'],
      ['src/pages/SafetyCenter.jsx', '/help/article/block-or-mute-a-user'],
    ].forEach(([file, to]) => {
      expect(sourceHelpLinks).toEqual(expect.arrayContaining([expect.objectContaining({ file, to })]));
    });
  });

  test('policy records have unique slugs and publication-safe status metadata', () => {
    expectUnique(policyDocuments.map((policy) => policy.slug));
    expect(POLICY_PUBLICATION_STATES).toEqual(['published', 'draft-review']);
    expect(POLICY_REQUIRED_APPROVALS.length).toBeGreaterThanOrEqual(4);
    expect(POLICY_PUBLICATION_RULES.published.isBinding).toBe(true);
    expect(POLICY_PUBLICATION_RULES['draft-review'].isBinding).toBe(false);

    const decisionRegister = readProjectFile(
      '..',
      'docs',
      'help-center-planning',
      '05-decision-register.md'
    );
    const registeredDecisionIds = new Set(
      [...decisionRegister.matchAll(/\|\s*(D-\d{3})\s*\|/g)].map((match) => match[1])
    );

    policyDocuments.forEach((policy) => {
      expect(policy.title.trim()).not.toBe('');
      expect(policy.summary.trim()).not.toBe('');
      expect(policy.owners.length).toBeGreaterThan(0);
      expect(policy.lastReviewed).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
      expect(POLICY_PUBLICATION_STATES).toContain(policy.state);
      expect(typeof policy.isBinding).toBe('boolean');
      expect(policy.publicLabel.trim()).not.toBe('');
      expect(policy.actionLabel.trim()).not.toBe('');
      expect(policy.notice.trim()).not.toBe('');
      expect(policy.blockingDecisionIds.every((id) => registeredDecisionIds.has(id))).toBe(true);

      if (policy.isBinding) {
        expect(policy.state).toBe('published');
        expect(policy.status).toBe('Published');
        expect(policy.effectiveDate).not.toBe('Not yet effective');
        expect(isKnownInternalTarget(policy.href)).toBe(true);
        expect(policy.approvalRequirements).toHaveLength(0);
        expect(policy.blockingDecisionIds).toHaveLength(0);
        expect(policy.sections).toHaveLength(0);
      } else {
        expect(policy.state).toBe('draft-review');
        expect(policy.status).toMatch(/Draft|review/i);
        expect(policy.effectiveDate).toBe('Not yet effective');
        expect(policy.href).toBe('');
        expect(policy.approvalRequirements).toEqual(POLICY_REQUIRED_APPROVALS);
        expect(policy.blockingDecisionIds.length).toBeGreaterThan(0);
        expect(policy.sections.length).toBeGreaterThan(0);
        expect(policy.sections.some((section) => section.unresolved)).toBe(true);
      }
    });
  });

  test('policy publication UI keeps draft and published states visibly separate', () => {
    const policyRegistry = readSource('content', 'policyContent.js');
    const policyCenter = readSource('pages', 'PolicyCenter.jsx');
    const policyDetail = readSource('pages', 'PolicyDetail.jsx');
    const helpCss = readSource('pages', 'HelpCenter.css');

    [
      'POLICY_PUBLICATION_STATES',
      'POLICY_PUBLICATION_RULES',
      'Read published policy',
      'Review non-effective draft',
      'This draft is provided for transparency only.',
    ].forEach((token) => {
      expect(policyRegistry).toContain(token);
    });

    [
      'entry.isBinding ?',
      'entry.publicLabel',
      'entry.effectiveDate',
      'entry.blockingDecisionIds.length',
      'entry.actionLabel',
    ].forEach((token) => {
      expect(policyCenter).toContain(token);
    });

    [
      'if (policy.href) return <Navigate to={policy.href} replace />',
      'policy.publicLabel',
      'Publication state: {policy.publicLabel}',
      '{policy.notice}',
      'aria-label="Publication gate"',
      'Approvals needed',
      'Blocking decisions',
      'policy.approvalRequirements.join',
      'policy.blockingDecisionIds.join',
    ].forEach((token) => {
      expect(policyDetail).toContain(token);
    });

    [
      '.help-policy-row__meta',
      '.help-status--published',
      '.help-status--draft',
      '.help-policy-gate',
      '.help-policy-gate dl',
    ].forEach((token) => {
      expect(helpCss).toContain(token);
    });
  });

  test('release readiness gates are explicit, owned, and separated by local versus external evidence', () => {
    const gateIds = HELP_RELEASE_READINESS_GATES.map((gate) => gate.id);
    const planningDir = path.join(process.cwd(), '..', 'docs', 'help-center-planning');

    expectUnique(gateIds);
    expect(RELEASE_GATE_STATUSES).toEqual([
      'verified-local',
      'pending-external',
      'blocked-approval',
      'blocked-production',
    ]);
    expect(RELEASE_EXCEPTION_STATUSES).toEqual(['draft', 'approved', 'expired', 'rejected']);
    expect(RELEASE_GATE_AREAS).toEqual(
      expect.arrayContaining([
        'automated',
        'public-web',
        'support-operations',
        'android',
        'accessibility',
        'policy',
        'visual-guidance',
        'analytics-operations',
      ])
    );
    expect(verifiedLocalReleaseReadinessGates.length).toBeGreaterThanOrEqual(4);
    expect(openReleaseReadinessGates.length).toBeGreaterThanOrEqual(6);
    expect(HELP_RELEASE_EXCEPTIONS).toHaveLength(0);
    expect(approvedReleaseReadinessExceptions).toHaveLength(0);
    expect(openGatesWithoutApprovedExceptions.map((gate) => gate.id)).toEqual(
      openReleaseReadinessGates.map((gate) => gate.id)
    );
    expect(RELEASE_CANDIDATE_CHECKLIST).toHaveLength(HELP_RELEASE_READINESS_GATES.length);

    const executionChecklist = fs.readFileSync(
      path.join(planningDir, '24-release-candidate-execution-checklist.md'),
      'utf8'
    );
    const completionAudit = fs.readFileSync(
      path.join(planningDir, '25-goal-completion-audit.md'),
      'utf8'
    );
    const exceptionRegister = fs.readFileSync(
      path.join(planningDir, '26-release-exception-register.md'),
      'utf8'
    );
    const rootPackageJson = JSON.parse(readProjectFile('..', 'package.json'));
    const frontendPackageJson = JSON.parse(readProjectFile('package.json'));
    const backendPackageJson = JSON.parse(readProjectFile('..', 'backend', 'package.json'));
    const governanceVerifier = readProjectFile('..', 'scripts', 'verify-help-governance.js');
    const androidWorksheetGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-android-verification-worksheet.js'
    );
    const androidEvidenceGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-android-evidence-packet.js'
    );
    const externalWorksheetGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-external-verification-worksheet.js'
    );
    const exceptionDecisionGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-release-exception-decision-packet.js'
    );
    const coverageApprovalGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-coverage-approval-packet.js'
    );
    const exceptionReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-exceptions.js'
    );
    const gateClosureReadinessReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-gate-closure-readiness.js'
    );
    const goalAuditReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-goal-audit.js'
    );
    const openGateOwnerHandoffGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-open-gate-owner-handoff.js'
    );
    const openGateOwnerReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-open-gate-owners.js'
    );
    const releaseEvidenceBinderGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-release-evidence-binder.js'
    );
    const releasePassChecklistGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-release-pass-checklist.js'
    );
    const releaseEvidenceStatusReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-release-evidence-status.js'
    );
    const releaseCandidateGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-release-candidate.js'
    );
    const accessibilityEnvironmentReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-accessibility-environment.js'
    );
    const accessibilityReadinessReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-accessibility-readiness.js'
    );
    const accessibilityVerificationGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-accessibility-verification-packet.js'
    );
    const analyticsApprovalGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-analytics-approval-packet.js'
    );
    const analyticsReadinessReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-analytics-readiness.js'
    );
    const androidDeviceEvidenceReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-android-device-evidence.js'
    );
    const androidReadinessReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-android-readiness.js'
    );
    const policyApprovalGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-policy-approval-packet.js'
    );
    const policyReadinessReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-policy-readiness.js'
    );
    const readinessReporter = readProjectFile('..', 'scripts', 'report-help-readiness.js');
    const supportReadinessReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-support-readiness.js'
    );
    const supportCleanupScript = readProjectFile(
      '..',
      'backend',
      'scripts',
      'supportCleanupAudit.js'
    );
    const supportLifecycleGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-support-lifecycle-packet.js'
    );
    const visualEvidenceGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-visual-evidence-packet.js'
    );
    const visualReadinessReporter = readProjectFile(
      '..',
      'scripts',
      'report-help-visual-readiness.js'
    );
    const visualWorksheetGenerator = readProjectFile(
      '..',
      'scripts',
      'create-help-visual-evidence-worksheet.js'
    );
    const publicRoutesVerifier = readProjectFile(
      '..',
      'scripts',
      'verify-help-public-routes.js'
    );

    expect(executionChecklist).toContain('RELEASE_CANDIDATE_CHECKLIST');
    expect(executionChecklist).toContain('Approved to claim Help Center goal complete');
    expect(completionAudit).toContain('Current result: not complete');
    expect(completionAudit).toContain('openReleaseReadinessGates');
    expect(completionAudit).toContain('help:release-pass-checklist');
    expect(completionAudit).toContain('help:release-evidence-binder');
    expect(completionAudit).toContain('help:release-evidence-status');
    expect(completionAudit).toContain('help:exception-decision');
    expect(completionAudit).toContain('help:coverage-approval');
    expect(completionAudit).toContain('help:exceptions');
    expect(completionAudit).toContain('help:gate-closure');
    expect(completionAudit).toContain('help:goal-audit');
    expect(completionAudit).toContain('help:open-gate-handoff');
    expect(completionAudit).toContain('help:open-gate-owners');
    expect(exceptionRegister).toContain('Current approved exceptions: none');
    expect(exceptionRegister).toContain('HELP_RELEASE_EXCEPTIONS');
    expect(exceptionRegister).toContain('help:exception-decision');
    expect(exceptionRegister).toContain('help:exceptions');
    expect(exceptionRegister).toContain('Do not use expired, draft, or rejected exceptions');
    expect(rootPackageJson.scripts['help:governance']).toBe(
      'node scripts/verify-help-governance.js'
    );
    expect(rootPackageJson.scripts['help:policy-approval']).toBe(
      'node scripts/create-help-policy-approval-packet.js'
    );
    expect(rootPackageJson.scripts['help:android-worksheet']).toBe(
      'node scripts/create-help-android-verification-worksheet.js'
    );
    expect(rootPackageJson.scripts['help:accessibility-environment']).toBe(
      'node scripts/report-help-accessibility-environment.js'
    );
    expect(rootPackageJson.scripts['help:accessibility-readiness']).toBe(
      'node scripts/report-help-accessibility-readiness.js'
    );
    expect(rootPackageJson.scripts['help:accessibility-verification']).toBe(
      'node scripts/create-help-accessibility-verification-packet.js'
    );
    expect(rootPackageJson.scripts['help:analytics-approval']).toBe(
      'node scripts/create-help-analytics-approval-packet.js'
    );
    expect(rootPackageJson.scripts['help:analytics-readiness']).toBe(
      'node scripts/report-help-analytics-readiness.js'
    );
    expect(rootPackageJson.scripts['help:android-device-evidence']).toBe(
      'node scripts/report-help-android-device-evidence.js'
    );
    expect(rootPackageJson.scripts['help:android-evidence']).toBe(
      'node scripts/create-help-android-evidence-packet.js'
    );
    expect(rootPackageJson.scripts['help:android-readiness']).toBe(
      'node scripts/report-help-android-readiness.js'
    );
    expect(rootPackageJson.scripts['help:external-worksheet']).toBe(
      'node scripts/create-help-external-verification-worksheet.js'
    );
    expect(rootPackageJson.scripts['help:exception-decision']).toBe(
      'node scripts/create-help-release-exception-decision-packet.js'
    );
    expect(rootPackageJson.scripts['help:coverage-approval']).toBe(
      'node scripts/create-help-coverage-approval-packet.js'
    );
    expect(rootPackageJson.scripts['help:exceptions']).toBe(
      'node scripts/report-help-exceptions.js'
    );
    expect(rootPackageJson.scripts['help:gate-closure']).toBe(
      'node scripts/report-help-gate-closure-readiness.js'
    );
    expect(rootPackageJson.scripts['help:goal-audit']).toBe(
      'node scripts/report-help-goal-audit.js'
    );
    expect(rootPackageJson.scripts['help:open-gate-handoff']).toBe(
      'node scripts/create-help-open-gate-owner-handoff.js'
    );
    expect(rootPackageJson.scripts['help:open-gate-owners']).toBe(
      'node scripts/report-help-open-gate-owners.js'
    );
    expect(rootPackageJson.scripts['help:policy-readiness']).toBe(
      'node scripts/report-help-policy-readiness.js'
    );
    expect(rootPackageJson.scripts['help:public-routes']).toBe(
      'node scripts/verify-help-public-routes.js'
    );
    expect(rootPackageJson.scripts['help:readiness']).toBe(
      'node scripts/report-help-readiness.js'
    );
    expect(rootPackageJson.scripts['help:release-evidence-binder']).toBe(
      'node scripts/create-help-release-evidence-binder.js'
    );
    expect(rootPackageJson.scripts['help:release-evidence-status']).toBe(
      'node scripts/report-help-release-evidence-status.js'
    );
    expect(rootPackageJson.scripts['help:release-pass-checklist']).toBe(
      'node scripts/create-help-release-pass-checklist.js'
    );
    expect(frontendPackageJson.scripts['help:governance']).toBe(
      'node ../scripts/verify-help-governance.js'
    );
    expect(frontendPackageJson.scripts['help:policy-approval']).toBe(
      'node ../scripts/create-help-policy-approval-packet.js'
    );
    expect(frontendPackageJson.scripts['help:android-worksheet']).toBe(
      'node ../scripts/create-help-android-verification-worksheet.js'
    );
    expect(frontendPackageJson.scripts['help:accessibility-environment']).toBe(
      'node ../scripts/report-help-accessibility-environment.js'
    );
    expect(frontendPackageJson.scripts['help:accessibility-readiness']).toBe(
      'node ../scripts/report-help-accessibility-readiness.js'
    );
    expect(frontendPackageJson.scripts['help:accessibility-verification']).toBe(
      'node ../scripts/create-help-accessibility-verification-packet.js'
    );
    expect(frontendPackageJson.scripts['help:analytics-approval']).toBe(
      'node ../scripts/create-help-analytics-approval-packet.js'
    );
    expect(frontendPackageJson.scripts['help:analytics-readiness']).toBe(
      'node ../scripts/report-help-analytics-readiness.js'
    );
    expect(frontendPackageJson.scripts['help:android-device-evidence']).toBe(
      'node ../scripts/report-help-android-device-evidence.js'
    );
    expect(frontendPackageJson.scripts['help:android-evidence']).toBe(
      'node ../scripts/create-help-android-evidence-packet.js'
    );
    expect(frontendPackageJson.scripts['help:android-readiness']).toBe(
      'node ../scripts/report-help-android-readiness.js'
    );
    expect(frontendPackageJson.scripts['help:external-worksheet']).toBe(
      'node ../scripts/create-help-external-verification-worksheet.js'
    );
    expect(frontendPackageJson.scripts['help:exception-decision']).toBe(
      'node ../scripts/create-help-release-exception-decision-packet.js'
    );
    expect(frontendPackageJson.scripts['help:coverage-approval']).toBe(
      'node ../scripts/create-help-coverage-approval-packet.js'
    );
    expect(frontendPackageJson.scripts['help:exceptions']).toBe(
      'node ../scripts/report-help-exceptions.js'
    );
    expect(frontendPackageJson.scripts['help:gate-closure']).toBe(
      'node ../scripts/report-help-gate-closure-readiness.js'
    );
    expect(frontendPackageJson.scripts['help:goal-audit']).toBe(
      'node ../scripts/report-help-goal-audit.js'
    );
    expect(frontendPackageJson.scripts['help:open-gate-handoff']).toBe(
      'node ../scripts/create-help-open-gate-owner-handoff.js'
    );
    expect(frontendPackageJson.scripts['help:open-gate-owners']).toBe(
      'node ../scripts/report-help-open-gate-owners.js'
    );
    expect(frontendPackageJson.scripts['help:policy-readiness']).toBe(
      'node ../scripts/report-help-policy-readiness.js'
    );
    expect(frontendPackageJson.scripts['help:public-routes']).toBe(
      'node ../scripts/verify-help-public-routes.js'
    );
    expect(frontendPackageJson.scripts['help:readiness']).toBe(
      'node ../scripts/report-help-readiness.js'
    );
    expect(frontendPackageJson.scripts['help:release-evidence-binder']).toBe(
      'node ../scripts/create-help-release-evidence-binder.js'
    );
    expect(frontendPackageJson.scripts['help:release-evidence-status']).toBe(
      'node ../scripts/report-help-release-evidence-status.js'
    );
    expect(frontendPackageJson.scripts['help:release-pass-checklist']).toBe(
      'node ../scripts/create-help-release-pass-checklist.js'
    );
    expect(rootPackageJson.scripts['help:release-candidate']).toBe(
      'node scripts/create-help-release-candidate.js'
    );
    expect(rootPackageJson.scripts['help:support-cleanup']).toBe(
      'node backend/scripts/supportCleanupAudit.js --prefix QA-CLEANUP'
    );
    expect(rootPackageJson.scripts['help:support-lifecycle']).toBe(
      'node scripts/create-help-support-lifecycle-packet.js'
    );
    expect(rootPackageJson.scripts['help:support-readiness']).toBe(
      'node scripts/report-help-support-readiness.js'
    );
    expect(rootPackageJson.scripts['help:visual-evidence']).toBe(
      'node scripts/create-help-visual-evidence-packet.js'
    );
    expect(rootPackageJson.scripts['help:visual-readiness']).toBe(
      'node scripts/report-help-visual-readiness.js'
    );
    expect(rootPackageJson.scripts['help:visual-worksheet']).toBe(
      'node scripts/create-help-visual-evidence-worksheet.js'
    );
    expect(frontendPackageJson.scripts['help:release-candidate']).toBe(
      'node ../scripts/create-help-release-candidate.js'
    );
    expect(frontendPackageJson.scripts['help:support-cleanup']).toBe(
      'node ../backend/scripts/supportCleanupAudit.js --prefix QA-CLEANUP'
    );
    expect(frontendPackageJson.scripts['help:support-lifecycle']).toBe(
      'node ../scripts/create-help-support-lifecycle-packet.js'
    );
    expect(frontendPackageJson.scripts['help:support-readiness']).toBe(
      'node ../scripts/report-help-support-readiness.js'
    );
    expect(frontendPackageJson.scripts['help:visual-evidence']).toBe(
      'node ../scripts/create-help-visual-evidence-packet.js'
    );
    expect(frontendPackageJson.scripts['help:visual-readiness']).toBe(
      'node ../scripts/report-help-visual-readiness.js'
    );
    expect(frontendPackageJson.scripts['help:visual-worksheet']).toBe(
      'node ../scripts/create-help-visual-evidence-worksheet.js'
    );
    expect(backendPackageJson.scripts['support:cleanup:dry']).toBe(
      'node scripts/supportCleanupAudit.js --prefix QA-CLEANUP'
    );
    expect(governanceVerifier).toContain('README planning links');
    expect(governanceVerifier).toContain('Open gate ids');
    expect(governanceVerifier).toContain('Current result: not complete');
    expect(governanceVerifier).toContain('help:android-worksheet');
    expect(governanceVerifier).toContain('help:android-evidence');
    expect(governanceVerifier).toContain('help:accessibility-environment');
    expect(governanceVerifier).toContain('help:accessibility-readiness');
    expect(governanceVerifier).toContain('help:accessibility-verification');
    expect(governanceVerifier).toContain('help:analytics-approval');
    expect(governanceVerifier).toContain('help:analytics-readiness');
    expect(governanceVerifier).toContain('help:android-device-evidence');
    expect(governanceVerifier).toContain('help:android-readiness');
    expect(governanceVerifier).toContain('help:external-worksheet');
    expect(governanceVerifier).toContain('help:exception-decision');
    expect(governanceVerifier).toContain('help:coverage-approval');
    expect(governanceVerifier).toContain('help:exceptions');
    expect(governanceVerifier).toContain('help:gate-closure');
    expect(governanceVerifier).toContain('help:goal-audit');
    expect(governanceVerifier).toContain('help:open-gate-handoff');
    expect(governanceVerifier).toContain('help:open-gate-owners');
    expect(governanceVerifier).toContain('help:policy-readiness');
    expect(governanceVerifier).toContain('help:readiness');
    expect(governanceVerifier).toContain('help:release-pass-checklist');
    expect(governanceVerifier).toContain('help:release-evidence-binder');
    expect(governanceVerifier).toContain('help:release-evidence-status');
    expect(governanceVerifier).toContain('help:release-candidate');
    expect(governanceVerifier).toContain('help:support-cleanup');
    expect(governanceVerifier).toContain('help:support-lifecycle');
    expect(governanceVerifier).toContain('help:support-readiness');
    expect(governanceVerifier).toContain('help:visual-evidence');
    expect(governanceVerifier).toContain('help:visual-readiness');
    expect(androidWorksheetGenerator).toContain('android-verification');
    expect(androidWorksheetGenerator).toContain('--dry-run');
    expect(androidWorksheetGenerator).toContain('help:android-device-evidence');
    expect(androidWorksheetGenerator).toContain('help:android-evidence');
    expect(androidWorksheetGenerator).toContain('help:android-readiness');
    expect(androidWorksheetGenerator).toContain('help:exceptions');
    expect(androidWorksheetGenerator).toContain('help:gate-closure');
    expect(androidWorksheetGenerator).toContain('help:goal-audit');
    expect(androidWorksheetGenerator).toContain('physical-android-device');
    expect(androidWorksheetGenerator).toContain('android-oauth-provider-return');
    expect(androidWorksheetGenerator).toContain('android-permissions-camera-microphone');
    expect(androidWorksheetGenerator).toContain('Android evidence packet');
    expect(androidWorksheetGenerator).toContain('TalkBack And Mobile Accessibility');
    expect(externalWorksheetGenerator).toContain('external-verification');
    expect(externalWorksheetGenerator).toContain('--dry-run');
    expect(externalWorksheetGenerator).toContain('help:accessibility-environment');
    expect(externalWorksheetGenerator).toContain('help:accessibility-verification');
    expect(externalWorksheetGenerator).toContain('manual-screen-reader-verification');
    expect(externalWorksheetGenerator).toContain('live-support-report-appeal-lifecycle');
    expect(externalWorksheetGenerator).toContain('policy-specialist-approvals');
    expect(externalWorksheetGenerator).toContain('analytics-consent-operations');
    expect(externalWorksheetGenerator).toContain('help:analytics-approval');
    expect(externalWorksheetGenerator).toContain('help:analytics-readiness');
    expect(externalWorksheetGenerator).toContain('help:exceptions');
    expect(externalWorksheetGenerator).toContain('help:gate-closure');
    expect(externalWorksheetGenerator).toContain('help:goal-audit');
    expect(externalWorksheetGenerator).toContain('help:policy-approval');
    expect(externalWorksheetGenerator).toContain('help:support-cleanup');
    expect(externalWorksheetGenerator).toContain('help:support-lifecycle');
    expect(externalWorksheetGenerator).toContain('Manual Accessibility Worksheet');
    expect(externalWorksheetGenerator).toContain('Support lifecycle packet');
    expect(externalWorksheetGenerator).toContain('Policy Approval Worksheet');
    expect(exceptionReporter).toContain('Lekhon Release Exception Summary');
    expect(exceptionReporter).toContain('--json');
    expect(exceptionReporter).toContain('HELP_RELEASE_EXCEPTIONS');
    expect(exceptionReporter).toContain(
      'no approved exceptions recorded; open gates still require evidence'
    );
    expect(exceptionReporter).toContain('Open Gates Without Valid Approved Exceptions');
    expect(exceptionReporter).toContain(
      'Approved exceptions require owner, risk, scope, evidence, expiration, decision record, and next review date'
    );
    expect(gateClosureReadinessReporter).toContain('Lekhon Gate Closure Readiness Summary');
    expect(gateClosureReadinessReporter).toContain('--json');
    expect(gateClosureReadinessReporter).toContain('source-verified-local');
    expect(gateClosureReadinessReporter).toContain('approved-exception-ready');
    expect(gateClosureReadinessReporter).toContain('invalid-source-record');
    expect(gateClosureReadinessReporter).toContain('not-closable');
    expect(gateClosureReadinessReporter).toContain('Gate Closure Matrix');
    expect(gateClosureReadinessReporter).toContain('Gate Closure Details');
    expect(gateClosureReadinessReporter).toContain('notClosableGateIds');
    expect(gateClosureReadinessReporter).toContain('Do not promote a release gate to closed');
    expect(exceptionDecisionGenerator).toContain('Help Release Exception Decision Packet');
    expect(exceptionDecisionGenerator).toContain('release-exception-decisions');
    expect(exceptionDecisionGenerator).toContain('--dry-run');
    expect(exceptionDecisionGenerator).toContain('Exception Decision Matrix');
    expect(exceptionDecisionGenerator).toContain('Gate Exception Worksheets');
    expect(exceptionDecisionGenerator).toContain('Required Approved Exception Fields');
    expect(exceptionDecisionGenerator).toContain('Validation And Release Evidence Updates');
    expect(exceptionDecisionGenerator).toContain('Completion Boundary');
    expect(exceptionDecisionGenerator).toContain('HELP_RELEASE_EXCEPTIONS');
    expect(exceptionDecisionGenerator).toContain(
      'Do not mark the Help Center goal complete from this exception decision packet'
    );
    expect(coverageApprovalGenerator).toContain('Help Coverage Approval Packet');
    expect(coverageApprovalGenerator).toContain('coverage-approvals');
    expect(coverageApprovalGenerator).toContain('--dry-run');
    expect(coverageApprovalGenerator).toContain('Coverage Source Index');
    expect(coverageApprovalGenerator).toContain('Objective Coverage Matrix');
    expect(coverageApprovalGenerator).toContain('Open Gate Impact');
    expect(coverageApprovalGenerator).toContain('Approval Checklist');
    expect(coverageApprovalGenerator).toContain('Completion Boundary');
    expect(coverageApprovalGenerator).toContain(
      'Do not mark the Help Center goal complete from this coverage approval packet'
    );
    expect(goalAuditReporter).toContain('Lekhon Help Goal Audit Summary');
    expect(goalAuditReporter).toContain('--json');
    expect(goalAuditReporter).toContain('feature-workflow-audit');
    expect(goalAuditReporter).toContain('controlled-release-verification');
    expect(goalAuditReporter).toContain('openReleaseReadinessGates');
    expect(goalAuditReporter).toContain('report-help-release-evidence-status.js');
    expect(goalAuditReporter).toContain('create-help-coverage-approval-packet.js');
    expect(goalAuditReporter).toContain('report-help-gate-closure-readiness.js');
    expect(goalAuditReporter).toContain('create-help-release-exception-decision-packet.js');
    expect(goalAuditReporter).toContain('create-help-open-gate-owner-handoff.js');
    expect(goalAuditReporter).toContain('report-help-open-gate-owners.js');
    expect(goalAuditReporter).toContain('Requirements waiting on external evidence');
    expect(goalAuditReporter).toContain(
      'Do not mark the Help Center goal complete unless this command reports no source gaps and no open release gates without approved exceptions'
    );
    expect(releaseCandidateGenerator).toContain('release-candidates');
    expect(releaseCandidateGenerator).toContain('--dry-run');
    expect(releaseCandidateGenerator).toContain('HELP_RELEASE_READINESS_GATES');
    expect(releaseCandidateGenerator).toContain('HELP_RELEASE_EXCEPTIONS');
    expect(releaseCandidateGenerator).toContain('approvedReleaseReadinessExceptions');
    expect(releaseCandidateGenerator).toContain('openGatesWithoutApprovedExceptions');
    expect(releaseCandidateGenerator).toContain('help:accessibility-environment');
    expect(releaseCandidateGenerator).toContain('help:accessibility-readiness');
    expect(releaseCandidateGenerator).toContain('help:accessibility-verification');
    expect(releaseCandidateGenerator).toContain('help:analytics-approval');
    expect(releaseCandidateGenerator).toContain('help:analytics-readiness');
    expect(releaseCandidateGenerator).toContain('help:android-device-evidence');
    expect(releaseCandidateGenerator).toContain('help:android-evidence');
    expect(releaseCandidateGenerator).toContain('help:android-readiness');
    expect(releaseCandidateGenerator).toContain('help:coverage-approval');
    expect(releaseCandidateGenerator).toContain('help:exception-decision');
    expect(releaseCandidateGenerator).toContain('help:exceptions');
    expect(releaseCandidateGenerator).toContain('help:gate-closure');
    expect(releaseCandidateGenerator).toContain('help:goal-audit');
    expect(releaseCandidateGenerator).toContain('help:open-gate-handoff');
    expect(releaseCandidateGenerator).toContain('help:open-gate-owners');
    expect(releaseCandidateGenerator).toContain('help:readiness');
    expect(releaseCandidateGenerator).toContain('help:release-pass-checklist');
    expect(releaseCandidateGenerator).toContain('help:release-evidence-binder');
    expect(releaseCandidateGenerator).toContain('help:release-evidence-status');
    expect(releaseCandidateGenerator).toContain('help:policy-approval');
    expect(releaseCandidateGenerator).toContain('help:policy-readiness');
    expect(releaseCandidateGenerator).toContain('help:public-routes');
    expect(releaseCandidateGenerator).toContain('help:android-worksheet');
    expect(releaseCandidateGenerator).toContain('help:external-worksheet');
    expect(releaseCandidateGenerator).toContain('help:support-cleanup');
    expect(releaseCandidateGenerator).toContain('help:support-lifecycle');
    expect(releaseCandidateGenerator).toContain('help:support-readiness');
    expect(releaseCandidateGenerator).toContain('help:visual-evidence');
    expect(releaseCandidateGenerator).toContain('help:visual-readiness');
    expect(releaseCandidateGenerator).toContain('help:visual-worksheet');
    expect(releaseCandidateGenerator).toContain('Approved to claim Help Center goal complete');
    expect(releasePassChecklistGenerator).toContain('Help Release Pass Checklist');
    expect(releasePassChecklistGenerator).toContain('release-pass-checklists');
    expect(releasePassChecklistGenerator).toContain('--dry-run');
    expect(releasePassChecklistGenerator).toContain('Phase 1 - Source And Build Checks');
    expect(releasePassChecklistGenerator).toContain('Phase 2 - Dry Run Evidence Commands');
    expect(releasePassChecklistGenerator).toContain('Phase 3 - Generate Evidence Artifacts');
    expect(releasePassChecklistGenerator).toContain('Status Validation Loop');
    expect(releasePassChecklistGenerator).toContain('help:coverage-approval');
    expect(releasePassChecklistGenerator).toContain('coverage-approvals');
    expect(releasePassChecklistGenerator).toContain('help:gate-closure');
    expect(releasePassChecklistGenerator).toContain('help:exception-decision');
    expect(releasePassChecklistGenerator).toContain('help:open-gate-handoff');
    expect(releasePassChecklistGenerator).toContain('help:open-gate-owners');
    expect(releasePassChecklistGenerator).toContain('help:release-evidence-status');
    expect(releasePassChecklistGenerator).toContain('help:release-evidence-binder');
    expect(releasePassChecklistGenerator).toContain('help:android-evidence');
    expect(releasePassChecklistGenerator).toContain('help:accessibility-verification');
    expect(releasePassChecklistGenerator).toContain('help:support-lifecycle');
    expect(releasePassChecklistGenerator).toContain('help:policy-approval');
    expect(releasePassChecklistGenerator).toContain('help:visual-evidence');
    expect(releasePassChecklistGenerator).toContain('help:analytics-approval');
    expect(releasePassChecklistGenerator).toContain(
      'Do not mark the Help Center goal complete from this checklist'
    );
    expect(releaseEvidenceBinderGenerator).toContain('Help Release Evidence Binder');
    expect(releaseEvidenceBinderGenerator).toContain('release-evidence-binders');
    expect(releaseEvidenceBinderGenerator).toContain('--dry-run');
    expect(releaseEvidenceBinderGenerator).toContain('Evidence Packet Index');
    expect(releaseEvidenceBinderGenerator).toContain('Gate Coverage Matrix');
    expect(releaseEvidenceBinderGenerator).toContain('Required Final Commands');
    expect(releaseEvidenceBinderGenerator).toContain('Final Open-Gate Decisions');
    expect(releaseEvidenceBinderGenerator).toContain('help:coverage-approval');
    expect(releaseEvidenceBinderGenerator).toContain('coverage-approvals');
    expect(releaseEvidenceBinderGenerator).toContain('help:gate-closure');
    expect(releaseEvidenceBinderGenerator).toContain('help:exception-decision');
    expect(releaseEvidenceBinderGenerator).toContain('help:open-gate-handoff');
    expect(releaseEvidenceBinderGenerator).toContain('help:open-gate-owners');
    expect(releaseEvidenceBinderGenerator).toContain('help:release-evidence-binder');
    expect(releaseEvidenceBinderGenerator).toContain('help:release-candidate');
    expect(releaseEvidenceBinderGenerator).toContain('help:android-evidence');
    expect(releaseEvidenceBinderGenerator).toContain('help:accessibility-verification');
    expect(releaseEvidenceBinderGenerator).toContain('help:support-lifecycle');
    expect(releaseEvidenceBinderGenerator).toContain('help:policy-approval');
    expect(releaseEvidenceBinderGenerator).toContain('help:visual-evidence');
    expect(releaseEvidenceBinderGenerator).toContain('help:analytics-approval');
    expect(releaseEvidenceBinderGenerator).toContain(
      'Do not mark the Help Center goal complete from this binder alone'
    );
    expect(releaseEvidenceStatusReporter).toContain('Lekhon Release Evidence Status');
    expect(releaseEvidenceStatusReporter).toContain('--json');
    expect(releaseEvidenceStatusReporter).toContain('release evidence artifacts missing');
    expect(releaseEvidenceStatusReporter).toContain('release evidence complete candidate');
    expect(releaseEvidenceStatusReporter).toContain('release-pass-checklists');
    expect(releaseEvidenceStatusReporter).toContain('release-evidence-binders');
    expect(releaseEvidenceStatusReporter).toContain('coverage-approvals');
    expect(releaseEvidenceStatusReporter).toContain('open-gate-owner-handoffs');
    expect(releaseEvidenceStatusReporter).toContain('release-exception-decisions');
    expect(releaseEvidenceStatusReporter).toContain('android-evidence');
    expect(releaseEvidenceStatusReporter).toContain('accessibility-verification');
    expect(releaseEvidenceStatusReporter).toContain('support-lifecycle');
    expect(releaseEvidenceStatusReporter).toContain('policy-approvals');
    expect(releaseEvidenceStatusReporter).toContain('visual-evidence-packets');
    expect(releaseEvidenceStatusReporter).toContain('analytics-approvals');
    expect(releaseEvidenceStatusReporter).toContain('openGatesWithoutApprovedExceptions');
    expect(releaseEvidenceStatusReporter).toContain('help:coverage-approval');
    expect(releaseEvidenceStatusReporter).toContain('help:exception-decision');
    expect(releaseEvidenceStatusReporter).toContain('help:open-gate-handoff');
    expect(releaseEvidenceStatusReporter).toContain(
      'Do not mark the Help Center goal complete until this command reports no missing evidence artifacts'
    );
    expect(openGateOwnerHandoffGenerator).toContain('Help Open Gate Owner Handoff');
    expect(openGateOwnerHandoffGenerator).toContain('open-gate-owner-handoffs');
    expect(openGateOwnerHandoffGenerator).toContain('--dry-run');
    expect(openGateOwnerHandoffGenerator).toContain('Owner Handoff Matrix');
    expect(openGateOwnerHandoffGenerator).toContain('Owner Evidence Collection Worksheets');
    expect(openGateOwnerHandoffGenerator).toContain('Release Evidence Record Updates');
    expect(openGateOwnerHandoffGenerator).toContain('Completion Boundary');
    expect(openGateOwnerHandoffGenerator).toContain('openGatesWithoutApprovedExceptions');
    expect(openGateOwnerHandoffGenerator).toContain(
      'Do not mark the Help Center goal complete from this owner handoff packet'
    );
    expect(openGateOwnerReporter).toContain('Lekhon Open Gate Owner Summary');
    expect(openGateOwnerReporter).toContain('--json');
    expect(openGateOwnerReporter).toContain('Owner Action Matrix');
    expect(openGateOwnerReporter).toContain('Open Gates Without Approved Exceptions');
    expect(openGateOwnerReporter).toContain('open release gates require owner evidence');
    expect(openGateOwnerReporter).toContain('openGatesWithoutApprovedExceptions');
    expect(openGateOwnerReporter).toContain(
      'Do not mark the Help Center goal complete from this owner summary'
    );
    expect(accessibilityReadinessReporter).toContain('Lekhon Accessibility Readiness Summary');
    expect(accessibilityReadinessReporter).toContain('--json');
    expect(accessibilityReadinessReporter).toContain(
      'source accessibility affordances ready; manual assistive-technology evidence required'
    );
    expect(accessibilityReadinessReporter).toContain('Remaining Manual Evidence');
    expect(accessibilityReadinessReporter).toContain('report-help-accessibility-environment.js');
    expect(accessibilityReadinessReporter).toContain('help:accessibility-environment');
    expect(accessibilityReadinessReporter).toContain('HelpCenter.css');
    expect(accessibilityReadinessReporter).toContain('PublicFooter.js');
    expect(accessibilityReadinessReporter).toContain(
      'Do not mark the manual screen-reader verification gate complete'
    );
    expect(accessibilityEnvironmentReporter).toContain('Lekhon Accessibility Environment Evidence');
    expect(accessibilityEnvironmentReporter).toContain('NVDA');
    expect(accessibilityEnvironmentReporter).toContain('TalkBack');
    expect(accessibilityEnvironmentReporter).toContain('--serial');
    expect(accessibilityEnvironmentReporter).toContain(
      'manual assistive-technology pass still required'
    );
    expect(accessibilityVerificationGenerator).toContain('Accessibility Verification Packet');
    expect(accessibilityVerificationGenerator).toContain('accessibility-verification');
    expect(accessibilityVerificationGenerator).toContain('--dry-run');
    expect(accessibilityVerificationGenerator).toContain('help:gate-closure');
    expect(accessibilityVerificationGenerator).toContain('Route And Workflow Manual Matrix');
    expect(accessibilityVerificationGenerator).toContain('buildReadiness');
    expect(accessibilityVerificationGenerator).toContain('Remaining manual evidence items');
    expect(accessibilityVerificationGenerator).toContain(
      'Do not mark the manual-screen-reader-verification gate complete'
    );
    expect(analyticsApprovalGenerator).toContain('Help Analytics Approval Packet');
    expect(analyticsApprovalGenerator).toContain('analytics-approvals');
    expect(analyticsApprovalGenerator).toContain('--dry-run');
    expect(analyticsApprovalGenerator).toContain('help:gate-closure');
    expect(analyticsApprovalGenerator).toContain('Production Decision Matrix');
    expect(analyticsApprovalGenerator).toContain('buildReadiness');
    expect(analyticsApprovalGenerator).toContain('Production decision blockers');
    expect(analyticsApprovalGenerator).toContain(
      'Do not mark the analytics-consent-operations gate complete'
    );
    expect(analyticsReadinessReporter).toContain('Lekhon Analytics Readiness Summary');
    expect(analyticsReadinessReporter).toContain('--json');
    expect(analyticsReadinessReporter).toContain(
      'local analytics safeguards ready; production analytics approval required'
    );
    expect(analyticsReadinessReporter).toContain('Production Decision Blockers');
    expect(analyticsReadinessReporter).toContain('HELP_SEARCH_REVIEW_SIGNALS');
    expect(analyticsReadinessReporter).toContain('lekhon-help-feedback:');
    expect(analyticsReadinessReporter).toContain('D-031');
    expect(analyticsReadinessReporter).toContain(
      'Do not mark the analytics-consent-operations gate complete'
    );
    expect(androidReadinessReporter).toContain('Lekhon Android Readiness Summary');
    expect(androidReadinessReporter).toContain('--json');
    expect(androidReadinessReporter).toContain(
      'android source readiness ready; physical-device evidence required'
    );
    expect(androidReadinessReporter).toContain('AndroidManifest.xml');
    expect(androidReadinessReporter).toContain('report-help-android-device-evidence.js');
    expect(androidReadinessReporter).toContain('help:android-device-evidence');
    expect(androidReadinessReporter).toContain("CapacitorApp.addListener('backButton'");
    expect(androidReadinessReporter).toContain('android-permissions-camera-microphone');
    expect(androidReadinessReporter).toContain(
      'Do not mark the physical Android, Android OAuth, or Android permissions gates complete'
    );
    expect(androidEvidenceGenerator).toContain('Android Evidence Packet');
    expect(androidEvidenceGenerator).toContain('android-evidence');
    expect(androidEvidenceGenerator).toContain('--dry-run');
    expect(androidEvidenceGenerator).toContain('help:gate-closure');
    expect(androidEvidenceGenerator).toContain('OAuth Provider Matrix');
    expect(androidEvidenceGenerator).toContain('Permission Matrix');
    expect(androidEvidenceGenerator).toContain('buildReadiness');
    expect(androidEvidenceGenerator).toContain(
      'Do not mark the physical Android, Android OAuth, or Android permissions gates complete'
    );
    expect(androidDeviceEvidenceReporter).toContain('Lekhon Android Device Evidence');
    expect(androidDeviceEvidenceReporter).toContain('adb');
    expect(androidDeviceEvidenceReporter).toContain('com.lekhon.app');
    expect(androidDeviceEvidenceReporter).toContain('--include-emulators');
    expect(androidDeviceEvidenceReporter).toContain(
      'manual route, provider, permission, and accessibility evidence'
    );
    expect(policyReadinessReporter).toContain('Lekhon Policy Readiness Summary');
    expect(policyReadinessReporter).toContain('--json');
    expect(policyReadinessReporter).toContain('binding publication blocked');
    expect(policyReadinessReporter).toContain('help:policy-approval');
    expect(policyReadinessReporter).toContain('POLICY_REQUIRED_APPROVALS');
    expect(policyReadinessReporter).toContain('Do not publish draft policy text as binding');
    expect(policyApprovalGenerator).toContain('Policy Approval Packet');
    expect(policyApprovalGenerator).toContain('policy-approvals');
    expect(policyApprovalGenerator).toContain('--dry-run');
    expect(policyApprovalGenerator).toContain('help:gate-closure');
    expect(policyApprovalGenerator).toContain('POLICY_REQUIRED_APPROVALS');
    expect(policyApprovalGenerator).toContain(
      'Do not mark `policy-specialist-approvals` complete'
    );
    expect(readinessReporter).toContain('Lekhon Help Readiness Summary');
    expect(readinessReporter).toContain('--json');
    expect(readinessReporter).toContain('HELP_RELEASE_EXCEPTIONS');
    expect(readinessReporter).toContain('openReleaseReadinessGates');
    expect(readinessReporter).toContain('openGatesWithoutApprovedExceptions');
    expect(readinessReporter).toContain('Open gates without approved exceptions');
    expect(readinessReporter).toContain('Counts By Exception Status');
    expect(readinessReporter).toContain('Worksheet Commands For Open Gates');
    expect(readinessReporter).toContain('Preparation Commands For Open Gates');
    expect(readinessReporter).toContain('preparationCommandsForOpenGates');
    expect(readinessReporter).toContain('help:exception-decision');
    expect(readinessReporter).toContain('help:exceptions');
    expect(readinessReporter).toContain('help:goal-audit');
    expect(readinessReporter).toContain('help:open-gate-handoff');
    expect(readinessReporter).toContain('help:open-gate-owners');
    expect(readinessReporter).toContain('help:accessibility-environment');
    expect(readinessReporter).toContain('help:android-device-evidence');
    expect(readinessReporter).toContain('help:android-evidence');
    expect(readinessReporter).toContain('help:coverage-approval');
    expect(readinessReporter).toContain('help:gate-closure');
    expect(readinessReporter).toContain('help:policy-approval');
    expect(readinessReporter).toContain('help:support-cleanup');
    expect(readinessReporter).toContain('help:support-lifecycle');
    expect(readinessReporter).toContain('help:visual-evidence');
    expect(readinessReporter).toContain('help:release-pass-checklist');
    expect(readinessReporter).toContain('help:release-evidence-binder');
    expect(readinessReporter).toContain('help:release-evidence-status');
    expect(readinessReporter).toContain('Completion Rule');
    expect(supportReadinessReporter).toContain('Lekhon Support Readiness Summary');
    expect(supportReadinessReporter).toContain('--json');
    expect(supportReadinessReporter).toContain('local support implementation ready; live lifecycle evidence required');
    expect(supportReadinessReporter).toContain('Remaining Live Evidence');
    expect(supportReadinessReporter).toContain('Cleanup Checks');
    expect(supportReadinessReporter).toContain('supportCleanupAudit.js');
    expect(supportReadinessReporter).toContain('dry-run cleanup audit');
    expect(supportReadinessReporter).toContain('help:support-cleanup');
    expect(supportReadinessReporter).toContain('Do not mark the live support, report, and appeal lifecycle gate complete');
    expect(supportLifecycleGenerator).toContain('Support Lifecycle Verification Packet');
    expect(supportLifecycleGenerator).toContain('support-lifecycle');
    expect(supportLifecycleGenerator).toContain('--dry-run');
    expect(supportLifecycleGenerator).toContain('help:gate-closure');
    expect(supportLifecycleGenerator).toContain('Submission Matrix');
    expect(supportLifecycleGenerator).toContain('buildReadiness');
    expect(supportLifecycleGenerator).toContain('Remaining live evidence items');
    expect(supportLifecycleGenerator).toContain(
      'Do not mark the live-support-report-appeal-lifecycle gate complete'
    );
    expect(supportCleanupScript).toContain('QA-CLEANUP');
    expect(supportCleanupScript).toContain('--execute');
    expect(supportCleanupScript).toContain('--confirm-delete-support-cleanup-records');
    expect(supportCleanupScript).toContain('Closing records requires --owner');
    expect(supportCleanupScript).toContain('maskEmail');
    expect(supportCleanupScript).toContain('subject: { $regex');
    expect(visualReadinessReporter).toContain('Lekhon Visual Readiness Summary');
    expect(visualReadinessReporter).toContain('--json');
    expect(visualReadinessReporter).toContain(
      'visual source registry ready; P0 visual evidence capture required'
    );
    expect(visualReadinessReporter).toContain('Open P0 Requirements');
    expect(visualReadinessReporter).toContain('HELP_VISUAL_REQUIREMENTS');
    expect(visualReadinessReporter).toContain('p0-visual-evidence-capture');
    expect(visualReadinessReporter).toContain(
      'Do not mark the p0-visual-evidence-capture gate complete'
    );
    expect(visualEvidenceGenerator).toContain('P0 Visual Evidence Packet');
    expect(visualEvidenceGenerator).toContain('visual-evidence-packets');
    expect(visualEvidenceGenerator).toContain('--dry-run');
    expect(visualEvidenceGenerator).toContain('help:gate-closure');
    expect(visualEvidenceGenerator).toContain('Open P0 Visual Requirements');
    expect(visualEvidenceGenerator).toContain('buildReadiness');
    expect(visualEvidenceGenerator).toContain('Owner Sign-Off Matrix');
    expect(visualEvidenceGenerator).toContain(
      'Do not mark the p0-visual-evidence-capture gate complete'
    );
    expect(visualWorksheetGenerator).toContain('visual-evidence');
    expect(visualWorksheetGenerator).toContain('--dry-run');
    expect(visualWorksheetGenerator).toContain('help:visual-evidence');
    expect(visualWorksheetGenerator).toContain('help:exceptions');
    expect(visualWorksheetGenerator).toContain('help:gate-closure');
    expect(visualWorksheetGenerator).toContain('help:goal-audit');
    expect(visualWorksheetGenerator).toContain('HELP_VISUAL_REQUIREMENTS');
    expect(visualWorksheetGenerator).toContain('P0 open requirements');
    expect(visualWorksheetGenerator).toContain('p0-visual-evidence-capture');
    expect(publicRoutesVerifier).toContain('publicRouteChecks');
    expect(publicRoutesVerifier).toContain('footerRequiredTargets');
    expect(publicRoutesVerifier).toContain('/help/article/:slug');
    expect(publicRoutesVerifier).toContain('/policies/:slug');
    expect(publicRoutesVerifier).toContain('Help public route verification passed.');

    const publicWebGate = HELP_RELEASE_READINESS_GATES.find(
      (gate) => gate.id === 'public-web-help-policy-safety'
    );
    expect(publicWebGate.evidence).toContain('npm run help:public-routes');
    expect(executionChecklist).toContain('npm run help:public-routes');
    const visualGate = HELP_RELEASE_READINESS_GATES.find(
      (gate) => gate.id === 'p0-visual-evidence-capture'
    );
    expect(visualGate.evidence).toContain('npm run help:visual-readiness');
    expect(visualGate.evidence).toContain(
      'npm run help:visual-evidence -- --name <visual-pass-name> --dry-run'
    );
    expect(visualGate.evidence).toContain(
      'npm run help:visual-worksheet -- --name <visual-pass-name> --dry-run'
    );
    const analyticsGate = HELP_RELEASE_READINESS_GATES.find(
      (gate) => gate.id === 'analytics-consent-operations'
    );
    expect(analyticsGate.evidence).toContain(
      'npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run'
    );
    expect(analyticsGate.evidence).toContain('npm run help:analytics-readiness');
    [
      ['manual-screen-reader-verification', 'npm run help:accessibility-readiness'],
      ['manual-screen-reader-verification', 'npm run help:accessibility-environment'],
      ['manual-screen-reader-verification', 'npm run help:accessibility-verification -- --name <accessibility-pass-name> --dry-run'],
      ['live-support-report-appeal-lifecycle', 'npm run help:support-readiness'],
      ['live-support-report-appeal-lifecycle', 'npm run help:support-cleanup'],
      ['live-support-report-appeal-lifecycle', 'npm run help:support-lifecycle -- --name <support-pass-name> --dry-run'],
      ['policy-specialist-approvals', 'npm run help:policy-approval -- --name <policy-pass-name> --dry-run'],
      ['policy-specialist-approvals', 'npm run help:policy-readiness'],
      ['p0-visual-evidence-capture', 'npm run help:visual-evidence -- --name <visual-pass-name> --dry-run'],
      ['p0-visual-evidence-capture', 'npm run help:visual-readiness'],
      ['analytics-consent-operations', 'npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run'],
      ['analytics-consent-operations', 'npm run help:analytics-readiness'],
    ].forEach(([gateId, command]) => {
      const gate = HELP_RELEASE_READINESS_GATES.find((entry) => entry.id === gateId);
      expect(gate.evidence).toContain(command);
    });
    [
      'physical-android-device',
      'android-oauth-provider-return',
      'android-permissions-camera-microphone',
    ].forEach((gateId) => {
      const gate = HELP_RELEASE_READINESS_GATES.find((entry) => entry.id === gateId);
      expect(gate.evidence).toContain('npm run help:android-readiness');
      expect(gate.evidence).toContain('npm run help:android-device-evidence');
      expect(gate.evidence).toContain(
        'npm run help:android-evidence -- --name <android-pass-name> --dry-run'
      );
      expect(gate.evidence).toContain(
        'npm run help:android-worksheet -- --name <android-pass-name> --dry-run'
      );
    });
    [
      'manual-screen-reader-verification',
      'live-support-report-appeal-lifecycle',
      'policy-specialist-approvals',
      'analytics-consent-operations',
    ].forEach((gateId) => {
      const gate = HELP_RELEASE_READINESS_GATES.find((entry) => entry.id === gateId);
      expect(gate.evidence).toContain(
        'npm run help:external-worksheet -- --name <external-pass-name> --dry-run'
      );
    });

    HELP_RELEASE_READINESS_GATES.forEach((gate) => {
      expect(gate.id.trim()).not.toBe('');
      expect(RELEASE_GATE_AREAS).toContain(gate.area);
      expect(gate.title.trim()).not.toBe('');
      expect(gate.owner.trim()).not.toBe('');
      expect(RELEASE_GATE_STATUSES).toContain(gate.status);
      expect(gate.evidence.length).toBeGreaterThan(0);
      expect(gate.protocol.trim()).not.toBe('');
      expect(fs.existsSync(path.join(planningDir, gate.protocol))).toBe(true);
      expect(gate.releaseImpact.trim()).not.toBe('');

      if (gate.status === 'verified-local') {
        expect(gate.blockers || []).toHaveLength(0);
      } else {
        expect(gate.blockers.length).toBeGreaterThan(0);
      }

      expect(executionChecklist).toContain(`### ${gate.id}`);
      expect(executionChecklist).toContain(`- Protocol: \`${gate.protocol}\``);
      expect(completionAudit).toContain(`\`${gate.id}\``);
    });

    RELEASE_CANDIDATE_CHECKLIST.forEach((item) => {
      const gate = HELP_RELEASE_READINESS_GATES.find((entry) => entry.id === item.gateId);

      expect(gate).toBeTruthy();
      expect(item.area).toBe(gate.area);
      expect(item.owner).toBe(gate.owner);
      expect(item.status).toBe(gate.status);
      expect(item.requiredEvidence).toEqual(gate.evidence);
      expect(item.protocol).toBe(gate.protocol);
      expect(item.releaseImpact).toBe(gate.releaseImpact);
      expect(item.decision.trim()).not.toBe('');
    });

    [
      'physical-android-device',
      'android-oauth-provider-return',
      'android-permissions-camera-microphone',
      'manual-screen-reader-verification',
      'live-support-report-appeal-lifecycle',
      'policy-specialist-approvals',
      'p0-visual-evidence-capture',
      'analytics-consent-operations',
    ].forEach((id) => {
      expect(openReleaseReadinessGates.map((gate) => gate.id)).toContain(id);
    });
  });

  test.each(
    HELP_SEARCH_REVIEW_SIGNALS.map(({ query, expectedSlug }) => [query, expectedSlug])
  )('search ranks %s to the expected guide', (query, expectedSlug) => {
    expect(searchHelpArticles(query)[0]?.slug).toBe(expectedSlug);
  });

  test('exact OAuth error stays focused and unrelated text returns no results', () => {
    expect(searchHelpArticles('redirect_uri is not allowed')).toHaveLength(1);
    expect(searchHelpArticles('quasar nebula trombone')).toHaveLength(0);
  });
});
