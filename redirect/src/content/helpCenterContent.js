export const HELP_LAST_REVIEWED = 'June 25, 2026';

export const helpCategoryOwners = {
  'getting-started': ['Product', 'Editorial'],
  'account-access': ['Product', 'Security', 'Support'],
  'privacy-security': ['Privacy', 'Security', 'Product'],
  'writing-publishing': ['Product', 'Editorial'],
  'community-messaging': ['Product', 'Safety'],
  'ai-tools': ['AI Product', 'Privacy', 'Legal'],
  'marketplace-buyers': ['Commerce', 'Support', 'Legal'],
  selling: ['Commerce', 'Finance', 'Support'],
  android: ['Mobile', 'Support'],
  developers: ['Engineering', 'Security'],
};

export const HELP_REVIEW_TRIGGERS = [
  'Feature behavior changes',
  'Broken link, search failure, or repeated support question',
  'Policy, safety, privacy, payment, or Android release impact',
  'Six-month scheduled review',
];

export const HELP_VISUAL_STATUSES = ['implemented', 'pending', 'blocked'];

export const HELP_VISUAL_REQUIREMENTS = [
  {
    id: 'visual-oauth-workflow-strip',
    articleSlug: 'sign-in-with-social-account',
    priority: 'P0',
    visualType: 'workflow-strip',
    platforms: ['Web', 'Android'],
    owner: 'Mobile + auth',
    status: 'implemented',
    purpose: 'Explain provider authorization and callback return.',
    evidence: 'Rendered from article flow steps.',
    nextStep: 'Capture Android provider handoff after physical-device OAuth verification.',
    replacementTriggers: ['OAuth route change', 'Provider callback change', 'Android App Links change'],
  },
  {
    id: 'visual-android-oauth-provider-clip',
    articleSlug: 'sign-in-with-social-account',
    priority: 'P0',
    visualType: 'short-clip',
    platforms: ['Android physical device'],
    owner: 'Mobile + auth',
    status: 'blocked',
    purpose: 'Show Google, Facebook, X, and LinkedIn authorization handoff and return.',
    blocker: 'Provider redirect and app-link verification is not complete on a physical device.',
    nextStep: 'Record provider handoff with seeded accounts after provider setup is approved.',
    replacementTriggers: ['OAuth provider setup change', 'Android package signing change', 'Frontend callback URL change'],
  },
  {
    id: 'visual-local-save-workflow-strip',
    articleSlug: 'understand-drafts-and-local-saves',
    priority: 'P0',
    visualType: 'workflow-strip',
    platforms: ['Web', 'Android'],
    owner: 'Seller product owner',
    status: 'implemented',
    purpose: 'Explain temporary local working copy behavior.',
    evidence: 'Rendered from article flow steps.',
    nextStep: 'Capture section-save screenshots from the current add-product UI.',
    replacementTriggers: ['Add-product step change', 'Local-save expiry change', 'Draft behavior change'],
  },
  {
    id: 'visual-add-product-local-save-screenshots',
    articleSlug: 'add-and-save-product',
    priority: 'P0',
    visualType: 'annotated-screenshot',
    platforms: ['Web', 'Android'],
    owner: 'Seller product owner',
    status: 'pending',
    purpose: 'Show section save, saved indicator, cancel warning, publish, and one-hour expiry behavior.',
    blocker: 'Needs final UI screenshot capture from the current build.',
    nextStep: 'Capture seeded add-product screenshots for each form stage.',
    replacementTriggers: ['Add-product form layout change', 'Save button behavior change', 'Cancel confirmation change'],
  },
  {
    id: 'visual-product-camera-permission-clip',
    articleSlug: 'add-and-save-product',
    priority: 'P0',
    visualType: 'short-clip',
    platforms: ['Android', 'Desktop web'],
    owner: 'Mobile + seller QA',
    status: 'blocked',
    purpose: 'Show product image camera capture and denied-permission recovery.',
    blocker: 'Physical-device camera permission testing is still required.',
    nextStep: 'Record allow and deny paths after Android device testing is available.',
    replacementTriggers: ['Camera picker change', 'Permission prompt change', 'Image upload limit change'],
  },
  {
    id: 'visual-refund-workflow-strip',
    articleSlug: 'cancel-order-and-understand-refund',
    priority: 'P0',
    visualType: 'workflow-strip',
    platforms: ['Web', 'Android'],
    owner: 'Commerce + finance',
    status: 'implemented',
    purpose: 'Explain paid cancellation and refund attempt sequence.',
    evidence: 'Rendered from article flow steps.',
    nextStep: 'Add refund-state diagram after reconciliation rules are approved.',
    replacementTriggers: ['Cancellation state change', 'Refund provider change', 'Return policy change'],
  },
  {
    id: 'visual-checkout-refund-diagram',
    articleSlug: 'checkout-and-payment',
    priority: 'P0',
    visualType: 'diagram',
    platforms: ['Web', 'Android'],
    owner: 'Commerce + finance',
    status: 'blocked',
    purpose: 'Explain checkout, payment, cancellation, refund, and failed-refund states.',
    blocker: 'Refund reconciliation and Android payment model decisions are not approved.',
    nextStep: 'Create state diagram after commerce and finance decisions are recorded.',
    replacementTriggers: ['Payment provider change', 'Refund state change', 'Android payment model change'],
  },
  {
    id: 'visual-seller-dashboard-workflow-strip',
    articleSlug: 'manage-your-seller-dashboard',
    priority: 'P0',
    visualType: 'workflow-strip',
    platforms: ['Web', 'Android'],
    owner: 'Commerce + support',
    status: 'implemented',
    purpose: 'Explain the seller dashboard path from orders to earnings.',
    evidence: 'Rendered from article flow steps.',
    nextStep: 'Capture dashboard screenshots for Overview, Products, Orders, Earnings, and Coupons.',
    replacementTriggers: ['Seller dashboard tab change', 'Order action change', 'Mobile table behavior change'],
  },
  {
    id: 'visual-seller-dashboard-screenshots',
    articleSlug: 'manage-your-seller-dashboard',
    priority: 'P0',
    visualType: 'annotated-screenshot',
    platforms: ['Web', 'Android'],
    owner: 'Commerce + support',
    status: 'pending',
    purpose: 'Show seller dashboard tabs, horizontal tables, product picker, orders, earnings, and coupons.',
    blocker: 'Needs seeded seller account screenshots from the current build.',
    nextStep: 'Capture seeded dashboard screenshots after seller test data is refreshed.',
    replacementTriggers: ['Seller dashboard layout change', 'Table column change', 'Product picker behavior change'],
  },
  {
    id: 'visual-seller-payout-workflow-strip',
    articleSlug: 'understand-seller-earnings-and-payouts',
    priority: 'P0',
    visualType: 'workflow-strip',
    platforms: ['Web', 'Android'],
    owner: 'Finance + commerce',
    status: 'implemented',
    purpose: 'Explain earning hold and payout request sequence.',
    evidence: 'Rendered from article flow steps.',
    nextStep: 'Add payout-state diagram after fee and failed-payout rules are approved.',
    replacementTriggers: ['Fee rule change', 'Hold period change', 'Payout state change'],
  },
  {
    id: 'visual-seller-payout-state-diagram',
    articleSlug: 'understand-seller-earnings-and-payouts',
    priority: 'P0',
    visualType: 'diagram',
    platforms: ['Web', 'Android'],
    owner: 'Finance + commerce',
    status: 'blocked',
    purpose: 'Explain pending, available, processing, paid, failed, and reversed payout states.',
    blocker: 'Fee, hold, payout timing, and failed-payout rules are not approved.',
    nextStep: 'Create payout state diagram after finance decisions are recorded.',
    replacementTriggers: ['Fee rule change', 'Hold period change', 'Payout provider change'],
  },
  {
    id: 'visual-account-security-workflow-strip',
    articleSlug: 'secure-a-compromised-account',
    priority: 'P0',
    visualType: 'workflow-strip',
    platforms: ['Web', 'Android'],
    owner: 'Security + support',
    status: 'implemented',
    purpose: 'Explain the order for securing a compromised account.',
    evidence: 'Rendered from article flow steps.',
    nextStep: 'Capture a safe security checklist screenshot only with seeded account data.',
    replacementTriggers: ['Password reset change', 'Connected account change', 'Security checklist change'],
  },
  {
    id: 'visual-account-deletion-diagram',
    articleSlug: 'delete-your-account',
    priority: 'P0',
    visualType: 'diagram',
    platforms: ['Web', 'Android'],
    owner: 'Privacy + engineering',
    status: 'blocked',
    purpose: 'Explain deletion scope, retained records, and recovery limits.',
    blocker: 'Deletion scope, retention, and data export decisions are not approved.',
    nextStep: 'Create deletion and retention diagram after privacy decisions are recorded.',
    replacementTriggers: ['Deletion workflow change', 'Retention decision change', 'Data export workflow change'],
  },
  {
    id: 'visual-report-workflow-strip',
    articleSlug: 'report-abuse-fraud-or-unsafe-content',
    priority: 'P0',
    visualType: 'workflow-strip',
    platforms: ['Web', 'Android'],
    owner: 'Safety + product',
    status: 'implemented',
    purpose: 'Explain central report submission path.',
    evidence: 'Rendered from article flow steps.',
    nextStep: 'Add report-form screenshot set after categories and direct report controls are approved.',
    replacementTriggers: ['Report category change', 'Report form change', 'Safety escalation change'],
  },
  {
    id: 'visual-report-form-screenshots',
    articleSlug: 'report-abuse-fraud-or-unsafe-content',
    priority: 'P0',
    visualType: 'annotated-screenshot',
    platforms: ['Web', 'Android'],
    owner: 'Safety + product',
    status: 'blocked',
    purpose: 'Show report category selection, evidence warning, reference preservation, and ticket number.',
    blocker: 'Unified report categories and direct report controls are still under review.',
    nextStep: 'Capture seeded report screenshots after safety categories are approved.',
    replacementTriggers: ['Report category change', 'Report form change', 'Reference number behavior change'],
  },
  {
    id: 'visual-appeal-workflow-strip',
    articleSlug: 'appeal-an-enforcement-or-seller-decision',
    priority: 'P0',
    visualType: 'workflow-strip',
    platforms: ['Web', 'Android'],
    owner: 'Safety + legal',
    status: 'implemented',
    purpose: 'Explain appeal submission path.',
    evidence: 'Rendered from article flow steps.',
    nextStep: 'Add appeal-form screenshots after reason codes and timelines are approved.',
    replacementTriggers: ['Appeal category change', 'Decision type change', 'Appeal timeline change'],
  },
  {
    id: 'visual-appeal-form-screenshots',
    articleSlug: 'appeal-an-enforcement-or-seller-decision',
    priority: 'P0',
    visualType: 'annotated-screenshot',
    platforms: ['Web', 'Android'],
    owner: 'Safety + legal',
    status: 'blocked',
    purpose: 'Show appeal decision type, explanation, decision reference, and ticket number.',
    blocker: 'Appeal workflow, reason codes, and appeal timelines are still under review.',
    nextStep: 'Capture seeded appeal screenshots after legal and safety approval.',
    replacementTriggers: ['Appeal category change', 'Appeal form change', 'Appeal timeline change'],
  },
  {
    id: 'visual-android-back-navigation-clip',
    articleSlug: 'android-navigation-and-offline-limits',
    priority: 'P0',
    visualType: 'short-clip',
    platforms: ['Android physical device'],
    owner: 'Mobile + QA',
    status: 'blocked',
    purpose: 'Show Android back navigation across articles, orders, stores, seller dashboard, and app root.',
    blocker: 'Physical-device runtime verification is still required.',
    nextStep: 'Record navigation paths after installing the current APK on a physical phone.',
    replacementTriggers: ['Android back handling change', 'Route history change', 'Capacitor version change'],
  },
  {
    id: 'visual-mobile-footer-help-search-screenshots',
    articleSlug: 'choose-how-to-use-lekhon',
    priority: 'P1',
    visualType: 'screenshot-sequence',
    platforms: ['Android', 'Mobile web'],
    owner: 'QA + editorial',
    status: 'pending',
    purpose: 'Show mobile footer accordion and Help search discovery path.',
    blocker: 'Needs current build capture.',
    nextStep: 'Capture 360 x 800 and 412 x 915 screenshots after the next visual QA pass.',
    replacementTriggers: ['Footer taxonomy change', 'Help search layout change', 'Mobile breakpoint change'],
  },
  {
    id: 'visual-privacy-settings-screenshots',
    articleSlug: 'manage-profile-privacy',
    priority: 'P1',
    visualType: 'annotated-screenshot',
    platforms: ['Web', 'Android'],
    owner: 'Privacy + product',
    status: 'blocked',
    purpose: 'Show profile visibility, message permissions, social-link privacy, and email settings.',
    blocker: 'Friends-only definition and privacy setting semantics are not approved.',
    nextStep: 'Capture privacy settings after privacy semantics are finalized.',
    replacementTriggers: ['Privacy setting change', 'Message permission change', 'Social-link visibility change'],
  },
  {
    id: 'visual-admin-support-queue-screenshots',
    articleSlug: 'report-abuse-fraud-or-unsafe-content',
    priority: 'P1',
    visualType: 'annotated-screenshot',
    platforms: ['Web admin'],
    owner: 'Support operations',
    status: 'blocked',
    purpose: 'Show support operations metrics, triage, assignment, status, priority, and admin notes.',
    blocker: 'Seeded support records and cleanup method must be approved.',
    nextStep: 'Capture admin queue with seeded records after cleanup protocol is approved for the run.',
    replacementTriggers: ['Support metric change', 'Admin queue layout change', 'Status or priority rule change'],
  },
  {
    id: 'visual-digital-download-support-screenshots',
    articleSlug: 'download-digital-product',
    priority: 'P1',
    visualType: 'annotated-screenshot',
    platforms: ['Web', 'Android'],
    owner: 'Commerce + support',
    status: 'blocked',
    purpose: 'Show digital download count, expired download support path, and replacement guidance.',
    blocker: 'Download reset and replacement rules are not approved.',
    nextStep: 'Capture download path after replacement rules are approved.',
    replacementTriggers: ['Download count change', 'Download reset rule change', 'Order detail layout change'],
  },
  {
    id: 'visual-service-order-dispute-diagram',
    articleSlug: 'fulfill-physical-or-service-order',
    priority: 'P1',
    visualType: 'diagram',
    platforms: ['Web', 'Android'],
    owner: 'Commerce + legal',
    status: 'blocked',
    purpose: 'Explain service delivery, acceptance, revision, cancellation, and dispute path.',
    blocker: 'Service acceptance and dispute flow is not approved.',
    nextStep: 'Create service order state diagram after commerce and legal decisions are recorded.',
    replacementTriggers: ['Service completion rule change', 'Dispute rule change', 'Order status change'],
  },
  {
    id: 'visual-api-key-screenshots',
    articleSlug: 'create-and-protect-api-key',
    priority: 'P2',
    visualType: 'annotated-screenshot',
    platforms: ['Web'],
    owner: 'Engineering',
    status: 'blocked',
    purpose: 'Show API key creation, copy warning, and revocation path.',
    blocker: 'API terms and quotas are not approved.',
    nextStep: 'Capture API key screenshots after developer terms are approved.',
    replacementTriggers: ['API key UI change', 'API terms change', 'Quota rule change'],
  },
];

export const helpCategories = [
  {
    id: 'getting-started',
    title: 'Getting started',
    summary: 'Learn what Lekhon offers and find your way around the web and Android app.',
    icon: 'compass',
    owners: helpCategoryOwners['getting-started'],
  },
  {
    id: 'account-access',
    title: 'Account and sign-in',
    summary: 'Create, verify, recover, connect, secure, or close your account.',
    icon: 'account',
    owners: helpCategoryOwners['account-access'],
  },
  {
    id: 'privacy-security',
    title: 'Privacy and security',
    summary: 'Control profile visibility, messages, email preferences, blocking, and API keys.',
    icon: 'shield',
    owners: helpCategoryOwners['privacy-security'],
  },
  {
    id: 'writing-publishing',
    title: 'Writing and publishing',
    summary: 'Create blogs, articles, shorts, stories, drafts, schedules, templates, and media.',
    icon: 'write',
    owners: helpCategoryOwners['writing-publishing'],
  },
  {
    id: 'community-messaging',
    title: 'Community, messages, and calls',
    summary: 'Follow people, comment, chat, share files, manage groups, and use calls safely.',
    icon: 'community',
    owners: helpCategoryOwners['community-messaging'],
  },
  {
    id: 'ai-tools',
    title: 'AI tools',
    summary: 'Use writing, listing, summary, and message assistance responsibly.',
    icon: 'ai',
    owners: helpCategoryOwners['ai-tools'],
  },
  {
    id: 'marketplace-buyers',
    title: 'Marketplace for buyers',
    summary: 'Understand products, checkout, orders, delivery, downloads, cancellation, and reviews.',
    icon: 'cart',
    owners: helpCategoryOwners['marketplace-buyers'],
  },
  {
    id: 'selling',
    title: 'Selling on Lekhon',
    summary: 'Apply as a seller, build a store, list products, fulfill orders, and receive payouts.',
    icon: 'store',
    owners: helpCategoryOwners.selling,
  },
  {
    id: 'android',
    title: 'Android app',
    summary: 'Install, update, grant permissions, sign in, navigate, and troubleshoot the app.',
    icon: 'mobile',
    owners: helpCategoryOwners.android,
  },
  {
    id: 'developers',
    title: 'Developers and API',
    summary: 'Create API keys and work with the current blog API safely.',
    icon: 'code',
    owners: helpCategoryOwners.developers,
  },
];

const article = ({
  slug,
  title,
  summary,
  category,
  platforms = ['Web', 'Android'],
  audiences = ['All users'],
  keywords = [],
  featured = false,
  owners = helpCategoryOwners[category] || ['Product', 'Editorial'],
  reviewTriggers = HELP_REVIEW_TRIGGERS,
  visualRequirements = HELP_VISUAL_REQUIREMENTS.filter((requirement) => requirement.articleSlug === slug),
  sections,
}) => ({
  slug,
  title,
  summary,
  category,
  platforms,
  audiences,
  keywords,
  featured,
  owners,
  lastReviewed: HELP_LAST_REVIEWED,
  reviewTriggers,
  visualRequirements,
  sections,
});

export const helpArticles = [
  article({
    slug: 'choose-how-to-use-lekhon',
    title: 'Choose how to use Lekhon',
    summary: 'Understand the main experiences available to visitors, writers, buyers, and sellers.',
    category: 'getting-started',
    audiences: ['Visitors', 'New users'],
    keywords: ['overview', 'home', 'writer', 'buyer', 'seller', 'guest'],
    featured: true,
    sections: [
      {
        heading: 'Browse without starting a workflow',
        paragraphs: [
          'You can explore public writing, creator profiles, marketplace products, and public stores before deciding what you want to do.',
        ],
      },
      {
        heading: 'Create and connect',
        bullets: [
          'Publish blogs, long-form articles, short posts, and time-limited stories.',
          'Follow writers, react, comment, send messages, join groups, and use supported calls.',
          'Use optional AI tools for drafting, editing, summaries, messages, and product listings.',
        ],
      },
      {
        heading: 'Buy or sell',
        bullets: [
          'Buy digital, physical, and service products through Lekhon checkout.',
          'Open external products on their named third-party platform.',
          'Apply as a seller to create a store and manage products, orders, coupons, earnings, and payouts.',
        ],
      },
      {
        heading: 'Web and Android',
        paragraphs: [
          'The Android app uses the same Lekhon account and most of the same features as the website. The Android app opens on Home instead of showing the public landing page.',
        ],
      },
    ],
  }),
  article({
    slug: 'use-a-guest-account',
    title: 'Use a guest account',
    summary: 'Create a temporary guest identity and understand its 12-hour lifetime.',
    category: 'getting-started',
    audiences: ['Visitors'],
    keywords: ['temporary', 'guest login', '12 hours', 'expired', 'username'],
    sections: [
      {
        heading: 'What a guest account is',
        paragraphs: [
          'A guest account lets you try supported features with a unique username. It is temporary and is not a replacement for a registered account.',
        ],
      },
      {
        heading: 'Create one',
        steps: [
          'Choose the guest option from the sign-in experience.',
          'Enter a username with at least three letters, numbers, or underscores.',
          'Complete the displayed verification check.',
          'Continue into Lekhon.',
        ],
      },
      {
        heading: 'Expiry and deletion',
        warning:
          'A guest account expires 12 hours after creation. Guest blogs, shorts, comments, notifications, messages, and the guest user record are removed by the cleanup process.',
      },
      {
        heading: 'Keep your work',
        paragraphs: [
          'Create a registered account before the guest session expires if you need a permanent identity. Lekhon does not currently provide an automatic guest-to-account conversion workflow.',
        ],
      },
    ],
  }),
  article({
    slug: 'create-and-verify-account',
    title: 'Create and verify your account',
    summary: 'Register with a username, email, and password, then complete email verification.',
    category: 'account-access',
    audiences: ['New users'],
    keywords: ['register', 'sign up', 'verification code', 'email', 'captcha'],
    featured: true,
    sections: [
      {
        heading: 'Create the account',
        steps: [
          'Open Register.',
          'Choose an available username and provide your email address.',
          'Create a password with at least six characters.',
          'Complete the human-verification step.',
          'Submit the registration form.',
        ],
      },
      {
        heading: 'Verify your email',
        steps: [
          'Open the verification message sent to your email address.',
          'Enter the verification code or use the verification link, depending on the message.',
          'Return to Lekhon and sign in.',
        ],
      },
      {
        heading: 'If the message is missing',
        bullets: [
          'Check spam, promotions, and filtered folders.',
          'Confirm that the email address is correct.',
          'Request a new code after the current code expires.',
        ],
      },
    ],
  }),
  article({
    slug: 'sign-in-with-social-account',
    title: 'Sign in with Google, Facebook, X, or LinkedIn',
    summary: 'Understand the browser-based OAuth flow used by both the website and Android app.',
    category: 'account-access',
    audiences: ['All users'],
    keywords: [
      'oauth',
      'continue with google',
      'continue with facebook',
      'continue with twitter',
      'continue with x',
      'continue with linkedin',
      'redirect uri',
      'callback',
    ],
    featured: true,
    sections: [
      {
        heading: 'How sign-in works',
        paragraphs: [
          'Lekhon sends you to the provider authorization page. The provider may open its installed app or a browser. After you approve access, it returns to a secure Lekhon callback page, which exchanges the authorization result for your Lekhon session.',
        ],
        flow: [
          'Select a provider in Lekhon',
          'Approve access with the provider',
          'Return through the Lekhon callback',
          'Open the authenticated Lekhon session',
        ],
      },
      {
        heading: 'On Android',
        paragraphs: [
          'The authorization screen can open outside the Lekhon app. Complete the provider prompt and allow it to return to the hosted Lekhon callback page. Keep the Lekhon app installed and do not close the authorization screen before it finishes.',
        ],
      },
      {
        heading: 'If sign-in fails',
        bullets: [
          'Confirm that the phone has an internet connection.',
          'Try again and complete the provider prompt without using an old browser tab.',
          'If you see "redirect_uri is not allowed," the deployed frontend callback and provider configuration do not match.',
          'If a social account is already linked to another Lekhon account, sign in to that account instead of creating a duplicate.',
          'If the provider rejects the request, verify that the provider account is active and permitted to share the required account information.',
        ],
      },
      {
        heading: 'Information used',
        paragraphs: [
          'Depending on the provider and your approval, Lekhon may receive an account identifier, name, email address, and profile image for authentication and profile setup.',
        ],
      },
    ],
  }),
  article({
    slug: 'reset-or-change-password',
    title: 'Reset or change your password',
    summary: 'Recover a forgotten password or securely replace your current password.',
    category: 'account-access',
    audiences: ['Registered users'],
    keywords: ['forgot password', 'reset code', 'change password', 'temporary password'],
    sections: [
      {
        heading: 'Forgotten password',
        steps: [
          'Open Login and choose the password recovery option.',
          'Enter the email associated with the account.',
          'Enter the code sent by email before it expires.',
          'Choose a new password and confirm the change.',
        ],
      },
      {
        heading: 'Change while signed in',
        steps: [
          'Open Profile.',
          'Find Password & Security.',
          'Enter the current password and request the confirmation code.',
          'Enter the code and the new password.',
        ],
      },
      {
        heading: 'Social sign-in accounts',
        paragraphs: [
          'A newly created social-login account may receive a temporary password workflow. Follow the welcome message and replace the temporary password promptly.',
        ],
      },
    ],
  }),
  article({
    slug: 'delete-your-account',
    title: 'Delete your Lekhon account',
    summary: 'Request account deletion and confirm it with the short-lived email code.',
    category: 'account-access',
    audiences: ['Registered users'],
    keywords: ['close account', 'remove account', 'delete data', 'confirmation code'],
    featured: true,
    sections: [
      {
        heading: 'Before you delete',
        warning:
          'Account deletion is permanent. The current product does not provide an undo or account-restoration process.',
      },
      {
        heading: 'Delete the account',
        steps: [
          'Open Profile and find the account deletion control.',
          'Enter your password to request deletion.',
          'Open the confirmation email.',
          'Enter the six-digit confirmation code within two minutes.',
          'Confirm deletion.',
        ],
      },
      {
        heading: 'Current deletion scope',
        paragraphs: [
          'The current deletion workflow removes the user record, authored blogs, authored articles, related notifications, and the profile image. Lekhon is reviewing the treatment of other associated records such as marketplace transactions, messages, comments, and legally required financial records.',
        ],
        note:
          'This article states the currently verified behavior. The Privacy Policy and deletion workflow will be updated when the full retention decision is approved.',
      },
    ],
  }),
  article({
    slug: 'manage-profile-privacy',
    title: 'Manage profile and message privacy',
    summary: 'Choose who can see profile details and whether people can message you.',
    category: 'privacy-security',
    audiences: ['Registered users'],
    keywords: ['profile visibility', 'show email', 'show phone', 'social links', 'allow messages'],
    featured: true,
    sections: [
      {
        heading: 'Open privacy settings',
        steps: [
          'Open Profile.',
          'Expand Privacy Settings.',
          'Choose the profile visibility and detail-level controls you want.',
          'Select Save Settings.',
        ],
      },
      {
        heading: 'Available controls',
        bullets: [
          'Profile visibility: public, friends, or private.',
          'Show or hide your email address.',
          'Show or hide your phone number.',
          'Show or hide individual connected social-link types.',
          'Allow or prevent new direct messages.',
        ],
      },
      {
        heading: 'Important limitation',
        note:
          'The exact "Friends Only" audience definition is under product review because Lekhon currently models followers and following rather than a separate friendship contract.',
      },
    ],
  }),
  article({
    slug: 'block-or-mute-a-user',
    title: 'Block or mute a user',
    summary: 'Stop messages from a user or silence their conversation notifications.',
    category: 'privacy-security',
    audiences: ['Registered users'],
    keywords: ['harassment', 'block', 'unblock', 'mute', 'unmute', 'messages'],
    sections: [
      {
        heading: 'Block from chat',
        steps: [
          'Open Chat and select the conversation.',
          'Open the conversation menu or information panel.',
          'Select Block.',
          'Confirm the warning.',
        ],
      },
      {
        heading: 'What blocking does',
        paragraphs: [
          'A blocked user cannot send you messages. You can return to the conversation menu and select Unblock later.',
        ],
      },
      {
        heading: 'Mute instead',
        paragraphs: [
          'Muting keeps the conversation available but silences its notification behavior. Select Unmute to restore notifications.',
        ],
      },
      {
        heading: 'Safety',
        warning:
          'Blocking is not an emergency service. Preserve relevant evidence and use the Lekhon report form for abuse, threats, impersonation, illegal content, or marketplace fraud.',
      },
    ],
  }),
  article({
    slug: 'manage-email-notifications',
    title: 'Manage email notifications',
    summary: 'Choose which social and messaging events send email.',
    category: 'privacy-security',
    audiences: ['Registered users'],
    keywords: ['email settings', 'followers', 'messages', 'missed calls', 'comments', 'reactions'],
    sections: [
      {
        heading: 'Change preferences',
        steps: [
          'Open Profile.',
          'Expand Email Notifications.',
          'Turn optional email types on or off.',
          'Select Save Email Preferences.',
        ],
      },
      {
        heading: 'Optional email types',
        bullets: [
          'New follower.',
          'New direct message.',
          'Missed call.',
          'New comment.',
          'New reaction.',
        ],
      },
      {
        heading: 'System-managed email',
        paragraphs: [
          'The current product keeps the content-published email enabled. Account verification, recovery, deletion, security, payment, order, and enforcement messages may also be sent when needed to operate the service.',
        ],
      },
    ],
  }),
  article({
    slug: 'create-publish-and-schedule-content',
    title: 'Create, publish, or schedule content',
    summary: 'Choose the right content type, complete the editor, and decide when it becomes public.',
    category: 'writing-publishing',
    audiences: ['Writers'],
    keywords: ['blog', 'article', 'short', 'story', 'publish', 'schedule', 'draft'],
    featured: true,
    sections: [
      {
        heading: 'Choose a content type',
        bullets: [
          'Blog for standard posts.',
          'Article for long-form, template-driven reading experiences.',
          'Short for compact posts of up to 700 characters.',
          'Story/status for temporary text, image, or video updates.',
        ],
      },
      {
        heading: 'Create the content',
        steps: [
          'Open the New Article/Create experience.',
          'Choose the content type.',
          'Add the required title, body, and other fields.',
          'Add media, tags, templates, or product references where applicable.',
          'Preview the result.',
          'Save a draft, publish now, or choose a supported schedule.',
        ],
      },
      {
        heading: 'Before publishing',
        bullets: [
          'Confirm that you have permission to use all text and media.',
          'Check facts, links, product claims, and AI-generated wording.',
          'Do not include private information you are not authorized to publish.',
        ],
      },
    ],
  }),
  article({
    slug: 'understand-drafts-and-local-saves',
    title: 'Understand drafts, local saves, and unsaved changes',
    summary: 'Know which work is stored on the server, on the current device, or not saved at all.',
    category: 'writing-publishing',
    audiences: ['Writers', 'Sellers'],
    keywords: ['autosave', 'draft', 'local storage', 'working copy', 'offline', 'one hour'],
    sections: [
      {
        heading: 'Content drafts',
        paragraphs: [
          'A published-content draft is stored through the Lekhon account workflow and appears in Drafts. It is different from temporary browser or device form state.',
        ],
      },
      {
        heading: 'Seller add-product working copy',
        paragraphs: [
          'The add-product form saves one section at a time only when you select Save. Saved sections are stored on the current device for up to one hour.',
        ],
        flow: [
          'Complete one section',
          'Select Save',
          'Store that section on this device',
          'Restore only saved sections when reopened',
        ],
        bullets: [
          'Unsaved changes in the current section are not restored.',
          'Saving a later section does not automatically save an earlier changed section.',
          'Cancel clears the local working copy after confirmation.',
          'Publishing or saving as a backend draft is separate from the temporary working copy.',
        ],
      },
      {
        heading: 'Offline use',
        paragraphs: [
          'The local product working copy can be saved without an internet connection when the browser storage API is available. Publishing, account drafts, uploads, and server features still require connectivity.',
        ],
      },
    ],
  }),
  article({
    slug: 'media-upload-limits',
    title: 'Check image, video, file, and voice upload limits',
    summary: 'Use the correct file type and size for the feature you are using.',
    category: 'writing-publishing',
    audiences: ['Writers', 'Sellers', 'Chat users'],
    keywords: ['file too large', 'unsupported file', 'upload failed', 'image limit', 'voice limit'],
    sections: [
      {
        heading: 'Current verified limits',
        bullets: [
          'Blog/editor image: up to 5 MB.',
          'Product image: up to 4 MB each, with up to eight product images.',
          'Review images: up to four images, using the 4 MB image uploader.',
          'Profile image: JPEG or PNG, up to 5 MB.',
          'Story/status media: supported JPEG, PNG, MP4, QuickTime, or WebM, up to 25 MB.',
          'Chat file: up to 50 MB for supported image, document, archive, spreadsheet, or presentation types.',
          'Voice message: WebM, OGG, MP3, or WAV, up to 10 MB.',
          'Digital product file: up to 500 MB.',
        ],
      },
      {
        heading: 'If an upload fails',
        bullets: [
          'Check the file size and type.',
          'Rename unusual filenames and try again.',
          'Keep the app open until the upload finishes.',
          'Try a stable network or smaller file.',
          'Confirm camera, photo, microphone, or file permission when using Android.',
        ],
      },
    ],
  }),
  article({
    slug: 'message-file-group-and-call-basics',
    title: 'Use messages, files, groups, and calls',
    summary: 'Start conversations, share supported files, create groups, and use audio or video calls.',
    category: 'community-messaging',
    audiences: ['Registered users'],
    keywords: ['chat', 'voice note', 'group', 'invite', 'video call', 'audio call', 'livekit'],
    featured: true,
    sections: [
      {
        heading: 'Direct conversations',
        bullets: [
          'Search for a user and open a conversation.',
          'Send text, supported files, images, or voice notes.',
          'React to, pin, or delete supported messages.',
          'Use the conversation menu to mute, block, clear, or delete.',
        ],
      },
      {
        heading: 'Groups',
        bullets: [
          'Create a group and invite members.',
          'Update group details and icon.',
          'Assign or remove supported co-admins.',
          'Regenerate an invite when an old link should no longer be used.',
          'Leave a group when you no longer want to participate.',
        ],
      },
      {
        heading: 'Calls',
        paragraphs: [
          'Supported conversations can use audio or video calls. Group calls use the LiveKit-backed room flow. Camera and microphone permission are required for the corresponding media.',
        ],
      },
      {
        heading: 'Retention notice',
        note:
          'The chat interface states that messages are automatically deleted after 30 days. Lekhon is completing an end-to-end retention verification for message records and uploaded files.',
      },
    ],
  }),
  article({
    slug: 'use-ai-tools-responsibly',
    title: 'Use Lekhon AI tools responsibly',
    summary: 'Protect sensitive information and review every generated result before using it.',
    category: 'ai-tools',
    audiences: ['Writers', 'Sellers', 'Chat users'],
    keywords: ['generate blog', 'improve content', 'AI listing', 'summarize', 'enhance message', 'wrong output'],
    featured: true,
    sections: [
      {
        heading: 'Available assistance',
        bullets: [
          'Draft blogs, titles, tags, bios, and descriptions.',
          'Improve or summarize text.',
          'Draft product-listing fields.',
          'Create quick supportive chat responses or enhance a message.',
          'Ask the in-app assistant for feature guidance.',
        ],
      },
      {
        heading: 'Your responsibility',
        warning:
          'AI output can be inaccurate, incomplete, biased, outdated, or legally unsafe. You are responsible for reviewing facts, rights, prices, claims, instructions, and tone before publishing or sending it.',
      },
      {
        heading: 'Do not submit',
        bullets: [
          'Passwords, API keys, payment credentials, or authentication codes.',
          'Private messages or personal data you are not authorized to process.',
          'Confidential business, medical, legal, or financial information that requires professional handling.',
          "Content intended to deceive, harass, exploit, impersonate, or violate another person's rights.",
        ],
      },
      {
        heading: 'Provider notice',
        paragraphs: [
          'AI requests may be processed by configured model providers. The final Privacy Policy and AI Usage Policy will name the applicable data categories and approved provider handling once the provider review is complete.',
        ],
      },
    ],
  }),
  article({
    slug: 'understand-marketplace-product-types',
    title: 'Understand marketplace product types',
    summary: 'Know what happens when you buy digital, physical, service, or external products.',
    category: 'marketplace-buyers',
    audiences: ['Buyers'],
    keywords: ['digital', 'physical', 'service', 'external', 'amazon', 'gumroad'],
    sections: [
      {
        heading: 'Digital',
        paragraphs: [
          'Digital products are delivered through protected download access after a qualifying paid order. Download limits and file availability apply.',
        ],
      },
      {
        heading: 'Physical',
        paragraphs: [
          'Physical products use stock, quantity, shipping-address, courier, tracking, and delivery-status information.',
        ],
      },
      {
        heading: 'Service',
        paragraphs: [
          'Services describe an estimated delivery time, revisions, included work, exclusions, and buyer requirements. The seller marks the service delivered.',
        ],
      },
      {
        heading: 'External',
        warning:
          'External products open another platform such as Amazon, Etsy, Gumroad, or Flipkart. Payment, delivery, cancellation, refund, and support are then governed by that external platform and seller, not Lekhon checkout.',
      },
    ],
  }),
  article({
    slug: 'checkout-and-payment',
    title: 'Checkout and complete payment',
    summary: 'Review current prices, discounts, shipping, and Razorpay payment before placing an order.',
    category: 'marketplace-buyers',
    audiences: ['Buyers'],
    keywords: ['razorpay', 'checkout', 'payment failed', 'coupon', 'shipping fee', 'minimum payment'],
    featured: true,
    sections: [
      {
        heading: 'Before payment',
        paragraphs: [
          'Lekhon rechecks product status, current price, quantity limits, and physical stock on the backend. The final amount can differ from an older cart display if a listing changed.',
        ],
      },
      {
        heading: 'Complete checkout',
        steps: [
          'Review every item and quantity.',
          'Apply a valid coupon if available.',
          'Provide the shipping address when the order includes a physical product.',
          'Review subtotal, discount, shipping, platform fee, and total.',
          'Use the payment control and complete Razorpay authorization.',
          'Wait for Lekhon to verify payment and show the order result.',
        ],
      },
      {
        heading: 'Current rules',
        bullets: [
          'The default free-shipping threshold is INR 1,000 when applicable.',
          'The minimum non-zero payment is INR 1.',
          'A fully discounted free order skips Razorpay.',
        ],
      },
      {
        heading: 'If payment fails',
        bullets: [
          'Do not repeatedly pay from multiple tabs.',
          'Check My Orders for a paid, pending, or failed order.',
          'If money was debited but the order is not paid, contact support with the order number and payment reference.',
        ],
      },
    ],
  }),
  article({
    slug: 'cancel-order-and-understand-refund',
    title: 'Cancel an order and understand the refund',
    summary: 'Check whether the order can still be cancelled and what happens to an eligible payment.',
    category: 'marketplace-buyers',
    audiences: ['Buyers'],
    keywords: ['cancel order', 'refund', '5-7 business days', 'return', 'money back'],
    featured: true,
    sections: [
      {
        heading: 'Cancellable statuses',
        paragraphs: [
          'The current standard cancellation flow accepts orders in pending payment, failed, paid, or processing status.',
        ],
      },
      {
        heading: 'Cannot cancel through the standard flow',
        bullets: [
          'Shipped.',
          'Delivered.',
          'Completed.',
          'Already refunded.',
          'Already cancelled.',
        ],
      },
      {
        heading: 'Cancel',
        steps: [
          'Open My Orders.',
          'Open the order.',
          'Select Cancel when the action is available.',
          'Provide the reason and confirm.',
          'Keep the order number and refund message.',
        ],
        flow: [
          'Eligible order status',
          'Buyer confirms cancellation',
          'Order and seller earnings are reversed',
          'Razorpay refund is attempted when paid',
        ],
      },
      {
        heading: 'Refund timing',
        paragraphs: [
          'When Razorpay accepts the refund request, the current confirmation states that the refund may take 5-7 business days. Bank or payment-provider timing can vary.',
        ],
        warning:
          'The self-service return workflow is not yet connected. For shipped or delivered product problems, contact support instead of relying on the inactive Return control.',
      },
    ],
  }),
  article({
    slug: 'download-digital-product',
    title: 'Download a digital product',
    summary: 'Use the protected order download while the link and download allowance are valid.',
    category: 'marketplace-buyers',
    audiences: ['Buyers'],
    keywords: ['download limit', 'file not found', 'signed url', '15 minutes', 'five downloads'],
    sections: [
      {
        heading: 'Download',
        steps: [
          'Open My Orders.',
          'Open the paid, delivered, or completed order.',
          'Find the digital item.',
          'Select Download.',
          'Save the file before the link expires.',
        ],
      },
      {
        heading: 'Current limits',
        bullets: [
          'The default allowance is five downloads per product unless the product uses a different configured limit.',
          'Each generated download link expires after 15 minutes.',
          'A missing seller file or exhausted allowance prevents a new download.',
        ],
      },
      {
        heading: 'Troubleshooting',
        paragraphs: [
          'If the file is missing, damaged, or the allowance is exhausted unexpectedly, contact support with the order number and product title.',
        ],
      },
    ],
  }),
  article({
    slug: 'write-a-verified-purchase-review',
    title: 'Write a verified-purchase review',
    summary: 'Review a product after the qualifying order is delivered or completed.',
    category: 'marketplace-buyers',
    audiences: ['Buyers'],
    keywords: ['rating', 'review images', 'seller reply', 'already reviewed'],
    sections: [
      {
        heading: 'Eligibility',
        paragraphs: [
          'You can review a product only when it appears in your delivered or completed order. One review is allowed for that product in that order.',
        ],
      },
      {
        heading: 'Write the review',
        steps: [
          'Open the product or qualifying order review action.',
          'Choose a rating from one to five.',
          'Add an accurate title and description.',
          'Optionally attach up to four supported images.',
          'Submit the review.',
        ],
      },
      {
        heading: 'Keep reviews useful',
        bullets: [
          'Describe your own purchase and experience.',
          'Do not include private payment, contact, or delivery information.',
          'Do not accept compensation for a misleading rating.',
          'Do not threaten, harass, impersonate, or publish unrelated content.',
        ],
      },
    ],
  }),
  article({
    slug: 'apply-to-become-seller',
    title: 'Apply to become a seller',
    summary: 'Prepare identity, contact, business, and payout information for seller review.',
    category: 'selling',
    audiences: ['Seller applicants'],
    keywords: ['seller application', 'pan', 'upi', 'bank', 'razorpay verification', 'rejected'],
    featured: true,
    sections: [
      {
        heading: 'Before you apply',
        bullets: [
          'Use a permanent registered account.',
          'Prepare accurate contact and location details.',
          'Prepare PAN and the required individual or company information.',
          'Choose UPI or bank payout details.',
          'Read the seller rules shown in the application.',
        ],
      },
      {
        heading: 'Apply',
        steps: [
          'Open Become a Seller.',
          'Choose the seller type and complete all required details.',
          'Complete manual or Razorpay-assisted verification as offered.',
          'Confirm the seller agreement.',
          'Submit the application for review.',
        ],
      },
      {
        heading: 'Review outcomes',
        paragraphs: [
          'The application can remain pending, be approved, or be rejected with an available review note. You can withdraw a pending application. Reapplication availability depends on the current application state.',
        ],
        note:
          'A dedicated Seller Terms document is being prepared. Until it is approved, the application must not imply terms beyond the rules actually displayed and accepted in the flow.',
      },
    ],
  }),
  article({
    slug: 'manage-your-seller-dashboard',
    title: 'Manage your Seller Dashboard',
    summary: 'Use each dashboard section to manage listings, orders, price changes, coupons, earnings, and your store.',
    category: 'selling',
    audiences: ['Sellers'],
    keywords: [
      'seller dashboard',
      'seller overview',
      'manage products',
      'price change token',
      'seller orders',
      'seller coupons',
      'store settings',
    ],
    featured: true,
    sections: [
      {
        heading: 'Choose the right section',
        bullets: [
          'Overview summarizes revenue, order counts, active products, and recent orders.',
          'Products lets you review, edit, pause, activate, archive, restock, or request a price increase for a listing.',
          'Price Changes tracks requests to increase a published product price.',
          'Orders contains physical and service fulfillment actions.',
          'Earnings opens balances, earning history, and payout requests.',
          'Coupons creates and manages seller offers.',
          'Store updates the public store name, description, and social links.',
        ],
      },
      {
        heading: 'Understand product states',
        bullets: [
          'Active products are published and visible to buyers.',
          'Draft products are saved but not published.',
          'Paused products remain in your records but are not actively offered.',
          'Archived products are removed from normal seller management without breaking historical orders.',
        ],
      },
      {
        heading: 'Request a price increase',
        steps: [
          'Open Price Changes.',
          'Select Choose Product. Only your published products are available.',
          'Choose the product, enter the requested price, and explain the reason.',
          'Submit the request and keep its token for reference.',
          'Track whether the request is pending, approved, rejected, cancelled, or expired.',
        ],
      },
      {
        heading: 'Manage orders and payouts',
        flow: [
          'Review a paid or processing order',
          'Ship the physical item or deliver the service',
          'Order completes',
          'Earnings pass through the hold period',
          'Request an eligible payout',
        ],
        paragraphs: [
          'Use the order number when contacting support. Earnings and payout timing are explained separately in the seller earnings guide.',
        ],
        actions: [
          {
            label: 'Read the fulfillment guide',
            to: '/help/article/fulfill-physical-or-service-order',
          },
          {
            label: 'Understand earnings and payouts',
            to: '/help/article/understand-seller-earnings-and-payouts',
          },
        ],
      },
      {
        heading: 'Use the dashboard on a phone',
        paragraphs: [
          'Wide tables scroll horizontally without a visible scrollbar. Swipe left or right inside a table to see the remaining columns; vertical page scrolling continues normally.',
        ],
      },
    ],
  }),
  article({
    slug: 'add-and-save-product',
    title: 'Add a product and save each section',
    summary: 'Use the multi-step product form without losing completed sections.',
    category: 'selling',
    audiences: ['Sellers'],
    keywords: ['add product', 'save section', 'green tick', 'camera', 'save draft', 'publish'],
    featured: true,
    sections: [
      {
        heading: 'Complete the form',
        bullets: [
          'Basic information.',
          'Product images.',
          'Product-type details.',
          'Pricing.',
          'Marketing and SEO.',
          'Review and publish.',
        ],
      },
      {
        heading: 'Save deliberately',
        steps: [
          'Complete the current section.',
          'Select Save.',
          'Wait for the loading state and successful check mark.',
          'Move to the next section.',
          'Repeat for every section you want restored later.',
        ],
        warning:
          "Moving away without selecting Save does not preserve the current section's new changes.",
      },
      {
        heading: 'Images and camera',
        paragraphs: [
          'Select files from the device or open the camera. Allow camera permission when prompted. Product listings support up to eight images, limited to 4 MB each.',
        ],
      },
      {
        heading: 'Finish',
        bullets: [
          'Save as draft stores the product as a backend draft.',
          'Publish makes an active product visible when the required listing information is valid.',
          'Cancel clears the temporary local working copy after confirmation.',
        ],
      },
    ],
  }),
  article({
    slug: 'fulfill-physical-or-service-order',
    title: 'Fulfill a physical or service order',
    summary: 'Ship physical products with tracking or mark completed service work delivered.',
    category: 'selling',
    audiences: ['Sellers'],
    keywords: ['seller orders', 'ship', 'courier', 'tracking', 'deliver service', 'restock'],
    sections: [
      {
        heading: 'Physical order',
        steps: [
          'Open Seller Dashboard and Orders.',
          'Open an eligible paid or processing order.',
          'Prepare the item according to the listing.',
          'Enter the courier and tracking number.',
          'Mark the order shipped.',
        ],
      },
      {
        heading: 'Service order',
        steps: [
          'Complete the service according to the listing and buyer requirements.',
          'Open the eligible order.',
          'Add a delivery note when useful.',
          'Mark the service delivered.',
        ],
      },
      {
        heading: 'Order completion',
        paragraphs: [
          'A buyer can complete a shipped or delivered order. A shipped physical order is also automatically completed after the configured period, currently seven days after shipment, when the scheduled job runs.',
        ],
      },
    ],
  }),
  article({
    slug: 'understand-seller-earnings-and-payouts',
    title: 'Understand seller earnings and payouts',
    summary: 'Read pending, available, processing, paid, and reversed earning states.',
    category: 'selling',
    audiences: ['Sellers'],
    keywords: ['commission', 'gateway fee', 'hold period', 'minimum payout', 'upi payout', 'bank payout'],
    featured: true,
    sections: [
      {
        heading: 'Earning calculation',
        paragraphs: [
          'Lekhon creates seller earnings from paid order items. Net earnings subtract the configured platform commission and gateway fee from gross item value.',
        ],
        bullets: [
          'Current default platform commission: 0%, unless deployment configuration changes it.',
          'Current default gateway fee estimate: 2.36%.',
          'Current default earning hold: seven days.',
        ],
      },
      {
        heading: 'Statuses',
        bullets: [
          'Pending: still in the hold period.',
          'Available: eligible for payout.',
          'Processing: included in a payout request.',
          'Paid out: confirmed transferred.',
          'Reversed: cancelled or refunded before payout.',
        ],
        flow: [
          'Paid order creates pending earnings',
          'Hold period completes',
          'Seller requests available earnings',
          'Payout is processed or queued for review',
        ],
      },
      {
        heading: 'Request payout',
        steps: [
          'Confirm that available net earnings total at least INR 10.',
          'Confirm that an approved seller application has a payout method.',
          'Open Seller Earnings.',
          'Request payout.',
          'Track whether it is queued, processing, processed, failed, or reversed.',
        ],
      },
      {
        heading: 'Processing',
        paragraphs: [
          'If RazorpayX automatic payouts are unavailable or fail, the payout is queued for manual administrator processing. Lekhon has not yet approved a guaranteed payout completion time.',
        ],
      },
    ],
  }),
  article({
    slug: 'install-and-update-android-test-app',
    title: 'Install and update the Android testing app',
    summary: 'Install a development APK on a phone and replace it after each new build.',
    category: 'android',
    platforms: ['Android'],
    audiences: ['Testers', 'Developers'],
    keywords: ['apk', 'install unknown apps', 'adb', 'android studio', 'reinstall', 'testing'],
    featured: true,
    sections: [
      {
        heading: 'Install from Android Studio',
        steps: [
          'Enable Developer options and USB debugging on the phone.',
          'Connect the phone to the development computer and approve the USB debugging prompt.',
          'Open the Android project from the frontend Capacitor project.',
          'Choose the connected phone as the run target.',
          'Run the app.',
        ],
      },
      {
        heading: 'Install an APK manually',
        steps: [
          'Build or generate the APK in Android Studio.',
          'Move the APK to the phone.',
          'Allow "Install unknown apps" for the file-opening app when Android asks.',
          'Open the APK and install it.',
        ],
      },
      {
        heading: 'Test a new version',
        paragraphs: [
          'Build and install the new APK over the existing app when the application ID and signing setup are compatible. Uninstalling first clears app storage, authentication, and device-only working copies.',
        ],
        warning:
          'An app installed directly from Android Studio or an APK is a development/testing installation. It is not a Play Store production release.',
      },
    ],
  }),
  article({
    slug: 'android-permissions-and-oauth',
    title: 'Use Android permissions and social sign-in',
    summary: 'Allow only the permissions needed for camera, media, voice, and calls.',
    category: 'android',
    platforms: ['Android'],
    audiences: ['Android users'],
    keywords: ['camera permission', 'microphone permission', 'oauth browser', 'photos', 'files'],
    sections: [
      {
        heading: 'Permissions',
        bullets: [
          'Camera: taking product or story images and using video calls.',
          'Microphone: voice notes and audio/video calls.',
          'Photos/files: selecting supported media or documents.',
        ],
      },
      {
        heading: 'If permission was denied',
        steps: [
          'Open Android Settings.',
          'Open Apps and choose Lekhon.',
          'Open Permissions.',
          'Allow the permission needed for the feature.',
          'Return to Lekhon and try again.',
        ],
      },
      {
        heading: 'Social sign-in',
        paragraphs: [
          'Google, Facebook, X, or LinkedIn may open its installed app or a browser. Approve the request and allow the hosted Lekhon callback page to finish. The current Android app does not yet use verified Android App Links for every provider return path.',
        ],
      },
    ],
  }),
  article({
    slug: 'android-navigation-and-offline-limits',
    title: 'Use Android back navigation and understand offline limits',
    summary: 'Return to previous Lekhon pages without losing track of what is stored locally.',
    category: 'android',
    platforms: ['Android'],
    audiences: ['Android users'],
    keywords: ['back button', 'app minimizes', 'offline', 'clear storage', 'cache'],
    sections: [
      {
        heading: 'Back navigation',
        paragraphs: [
          'On a content, marketplace, store, or dashboard page, the Android back button should return to the previous Lekhon history entry. At the app root, it minimizes the app.',
        ],
      },
      {
        heading: 'If the app minimizes too early',
        bullets: [
          'Reopen the app and reproduce the exact path.',
          'Record the starting page, destination page, and which back action failed.',
          'Submit the details through Report a Problem.',
        ],
      },
      {
        heading: 'Offline limits',
        paragraphs: [
          'Most Lekhon features require the deployed backend. A saved add-product section can use device storage for up to one hour, but publishing, account drafts, uploads, search, chat, payments, and server data require connectivity.',
        ],
      },
      {
        heading: 'Clear app storage carefully',
        warning:
          'Clearing app storage signs you out and removes device-only data such as unsent local working copies. It does not delete your registered Lekhon account or server-stored content.',
      },
    ],
  }),
  article({
    slug: 'create-and-protect-api-key',
    title: 'Create and protect an API key',
    summary: 'Generate a named key for supported blog API actions and revoke it when necessary.',
    category: 'developers',
    platforms: ['Web'],
    audiences: ['Developers'],
    keywords: ['x-api-key', 'external api', 'revoke key', 'blog api'],
    sections: [
      {
        heading: 'Create a key',
        steps: [
          'Open Profile.',
          'Open the developer/API key section.',
          'Enter a descriptive key name.',
          'Generate the key.',
          'Store it in a secret manager or protected environment variable.',
        ],
      },
      {
        heading: 'Use it',
        paragraphs: [
          'Send the key using the `x-api-key` request header to supported external blog API routes. Public read routes do not require the key; create, update, and delete actions do.',
        ],
      },
      {
        heading: 'Security',
        warning:
          'Never place an API key in public frontend code, screenshots, posts, chat messages, repositories, or mobile app bundles. Revoke a key immediately if it may have been exposed.',
      },
    ],
  }),
  article({
    slug: 'secure-a-compromised-account',
    title: 'Secure an account you think was compromised',
    summary: 'Reset access, protect connected accounts, and send support the details needed to investigate.',
    category: 'account-access',
    audiences: ['Account owners'],
    keywords: [
      'hacked',
      'compromised',
      'stolen account',
      'unknown login',
      'phishing',
      'security incident',
    ],
    featured: true,
    sections: [
      {
        heading: 'Act in this order',
        flow: [
          'Protect your email',
          'Reset Lekhon password',
          'Review connected accounts',
          'Contact support',
        ],
        steps: [
          'Secure the email account connected to Lekhon, including its password and multi-factor authentication.',
          'Use Forgot Password on the Lekhon sign-in page and complete both emailed verification steps.',
          'After signing in, change the password again from account settings if you reused it anywhere else.',
          'Review connected Google, Facebook, X, and LinkedIn accounts and remove access you do not recognize.',
          'Review your profile, published content, messages, products, orders, and payout details for changes you did not make.',
        ],
      },
      {
        heading: 'What to send support',
        bullets: [
          'Your Lekhon username and the response email you still control.',
          'The approximate date and time you first noticed the problem.',
          'Unexpected profile, content, message, seller, order, or payout activity.',
          'Screenshots that do not expose passwords, one-time codes, API keys, or full payment credentials.',
        ],
        actions: [
          {
            label: 'Contact account support',
            to: '/contact?category=Account%20and%20sign-in',
          },
        ],
      },
      {
        heading: 'If you cannot sign in',
        paragraphs: [
          'Use Forgot Password first. If the account email, username, or connected sign-in method appears to have changed, contact support and provide the last account details you know were correct.',
        ],
        warning:
          'Lekhon support should never ask for your password, one-time code, private API key, or full payment credentials.',
      },
    ],
  }),
  article({
    slug: 'report-abuse-fraud-or-unsafe-content',
    title: 'Report abuse, fraud, or unsafe content',
    summary: 'Preserve useful evidence and submit the central report form with the correct object and category.',
    category: 'community-messaging',
    audiences: ['All users'],
    keywords: [
      'report',
      'abuse',
      'fraud',
      'harassment',
      'threat',
      'impersonation',
      'scam',
      'unsafe content',
    ],
    featured: true,
    sections: [
      {
        heading: 'Respond to immediate danger first',
        warning:
          'If someone may be in immediate physical danger, contact local emergency services. Lekhon support is not an emergency response service.',
      },
      {
        heading: 'Preserve the useful evidence',
        steps: [
          'Record the username, URL, content ID, message, group, product, review, store, or order involved.',
          'Capture the relevant date, time, and screenshots.',
          'Keep payment references for suspected marketplace fraud.',
          'Do not publish private evidence publicly or continue a threatening conversation only to collect more evidence.',
        ],
      },
      {
        heading: 'Submit the central report',
        flow: ['Choose category', 'Describe incident', 'Add reference', 'Receive ticket number'],
        paragraphs: [
          'Direct report controls are not yet available on every content and communication surface. Use the central report form and select the closest category.',
        ],
        actions: [
          {
            label: 'Open the report form',
            to: '/report',
          },
          {
            label: 'Open the Safety Center',
            to: '/safety',
          },
        ],
      },
      {
        heading: 'After submission',
        paragraphs: [
          'The form records a ticket reference for review. Keep that reference when contacting support about the same incident.',
        ],
        note:
          'A submission does not guarantee a specific enforcement action or response time. Final moderation standards and appeal timelines remain under product and specialist review.',
      },
    ],
  }),
  article({
    slug: 'appeal-an-enforcement-or-seller-decision',
    title: 'Appeal an enforcement or seller decision',
    summary: 'Request a review of a warning, suspension, removal, seller rejection, revocation, or product action.',
    category: 'account-access',
    audiences: ['Affected users', 'Seller applicants', 'Sellers'],
    keywords: [
      'appeal',
      'suspended',
      'warning',
      'content removed',
      'seller rejected',
      'seller revoked',
      'product action',
    ],
    sections: [
      {
        heading: 'Decisions supported by the form',
        bullets: [
          'Account warning or suspension.',
          'Content removal.',
          'Seller application rejection or seller-status revocation.',
          'Product action.',
          'Another enforcement action that identifies the affected account or object.',
        ],
      },
      {
        heading: 'Prepare the appeal',
        steps: [
          'Record the exact decision, date, account, content, product, or seller application involved.',
          'Explain why you believe the decision should be reviewed.',
          'Add new context or evidence that was not available during the original decision.',
          'Avoid repeated duplicate submissions for the same decision.',
        ],
      },
      {
        heading: 'Submit and retain the reference',
        flow: ['Select decision type', 'Explain review request', 'Add decision reference', 'Receive ticket number'],
        actions: [
          {
            label: 'Open the appeal form',
            to: '/appeals',
          },
        ],
      },
      {
        heading: 'Current limitation',
        note:
          'Lekhon records appeals in the central support queue. Formal eligibility rules, review independence, response targets, and final outcome notices are still under product, safety, and legal review.',
      },
    ],
  }),
  article({
    slug: 'resolve-an-order-delivery-or-return-problem',
    title: 'Resolve an order, delivery, download, or return problem',
    summary: 'Use the order status and reference to choose cancellation, download, delivery confirmation, or support.',
    category: 'marketplace-buyers',
    audiences: ['Buyers'],
    keywords: [
      'order problem',
      'return',
      'late delivery',
      'wrong item',
      'damaged item',
      'service dispute',
      'download problem',
      'refund missing',
    ],
    featured: true,
    sections: [
      {
        heading: 'Check the order before contacting support',
        steps: [
          'Open My Orders and select the order.',
          'Record the order number and current status.',
          'For physical products, check the courier and tracking details when present.',
          'For digital products, check the available download count and try the download action.',
          'For services, review the delivery note and do not confirm completion until you have reviewed the delivered work.',
        ],
      },
      {
        heading: 'Cancellation',
        paragraphs: [
          'The current buyer cancellation action is available while an order is pending payment, failed, paid, or processing. Orders that are shipped, delivered, completed, refunded, or already cancelled require support instead of the cancellation action.',
        ],
        warning:
          'A paid cancellation may start a payment-provider refund. Keep the order number and payment reference if the refund is not confirmed.',
      },
      {
        heading: 'Returns and disputes',
        paragraphs: [
          'Lekhon does not yet provide a complete self-service return workflow. Use Marketplace order or payment support and include the order number, item or service, problem, date, and useful evidence.',
        ],
        actions: [
          {
            label: 'Contact marketplace support',
            to: '/contact?category=Marketplace%20order%20or%20payment',
          },
          {
            label: 'Read cancellation and refund guidance',
            to: '/help/article/cancel-order-and-understand-refund',
          },
        ],
        note:
          'Return eligibility, evidence requirements, shipping responsibility, service revisions, disputes, and final refund outcomes are still under commerce and legal review.',
      },
    ],
  }),];

export const getCategory = (categoryId) =>
  helpCategories.find((category) => category.id === categoryId);

export const getArticle = (slug) =>
  helpArticles.find((item) => item.slug === slug);

export const getCategoryArticles = (categoryId) =>
  helpArticles.filter((item) => item.category === categoryId);

export const SEARCH_FILLER_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'at',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'my',
  'not',
  'of',
  'on',
  'or',
  'the',
  'this',
  'to',
  'was',
  'what',
  'when',
  'where',
  'with',
  'you',
  'your',
]);

export const HELP_SEARCH_REVIEW_SIGNALS = [
  {
    query: 'redirect_uri is not allowed',
    expectedSlug: 'sign-in-with-social-account',
  },
  {
    query: 'hacked account',
    expectedSlug: 'secure-a-compromised-account',
  },
  {
    query: 'report harassment threat',
    expectedSlug: 'report-abuse-fraud-or-unsafe-content',
  },
  {
    query: 'appeal account suspension',
    expectedSlug: 'appeal-an-enforcement-or-seller-decision',
  },
  {
    query: 'damaged item return',
    expectedSlug: 'resolve-an-order-delivery-or-return-problem',
  },
  {
    query: 'seller dashboard price change coupon',
    expectedSlug: 'manage-your-seller-dashboard',
  },
  {
    query: 'seller payout',
    expectedSlug: 'understand-seller-earnings-and-payouts',
  },
  {
    query: 'android back button app minimizes',
    expectedSlug: 'android-navigation-and-offline-limits',
  },
  {
    query: 'camera permission product image',
    expectedSlug: 'add-and-save-product',
  },
  {
    query: 'api key exposed',
    expectedSlug: 'create-and-protect-api-key',
  },
];

const normalizeSearch = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const buildSearchText = (item) =>
  normalizeSearch([
    item.title,
    item.summary,
    item.category,
    ...(item.keywords || []),
    ...(item.audiences || []),
    ...(item.platforms || []),
    ...(item.sections || []).flatMap((section) => [
      section.heading,
      ...(section.paragraphs || []),
      ...(section.bullets || []),
      ...(section.steps || []),
      ...(section.flow || []),
      ...(section.actions || []).map((action) => action.label),
      section.note,
      section.warning,
    ]),
  ].filter(Boolean).join(' '));

const indexedArticles = helpArticles.map((item) => ({
  item,
  searchText: buildSearchText(item),
  normalizedTitle: normalizeSearch(item.title),
}));

export const searchHelpArticles = (query) => {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];

  const allTerms = normalized.split(' ').filter(Boolean);
  const meaningfulTerms = allTerms.filter((term) => !SEARCH_FILLER_WORDS.has(term));
  const terms = meaningfulTerms.length ? meaningfulTerms : allTerms;
  const minimumScore = terms.length > 1 ? 6 : 3;

  return indexedArticles
    .map(({ item, searchText, normalizedTitle }) => {
      let score = 0;
      if (normalizedTitle === normalized) score += 100;
      if (normalizedTitle.includes(normalized)) score += 40;
      if (searchText.includes(normalized)) score += 80;
      terms.forEach((term) => {
        if (normalizedTitle.includes(term)) score += 12;
        if (searchText.includes(term)) score += 3;
      });
      return { item, score };
    })
    .filter(({ score }) => score >= minimumScore)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .map(({ item }) => item);
};
