export const POLICY_REVIEW_DATE = 'June 24, 2026';

export const POLICY_PUBLICATION_STATES = ['published', 'draft-review'];

export const POLICY_REQUIRED_APPROVALS = [
  'Product behavior verified',
  'Owner approval recorded',
  'Legal or specialist review recorded',
  'Effective date assigned',
];

export const POLICY_PUBLICATION_RULES = {
  published: {
    state: 'published',
    status: 'Published',
    isBinding: true,
    publicLabel: 'Published policy',
    actionLabel: 'Read published policy',
    notice:
      'This policy is currently published. Read the linked policy page for the binding text.',
  },
  'draft-review': {
    state: 'draft-review',
    status: 'Draft for product and specialist review',
    isBinding: false,
    publicLabel: 'Draft in review',
    actionLabel: 'Review non-effective draft',
    effectiveDate: 'Not yet effective',
    notice:
      'This draft is provided for transparency only. It is not binding and is not effective until required approvals and an effective date are recorded.',
  },
};

const publishedPolicy = ({ slug, title, summary, href, owners, effectiveDate, lastReviewed }) => ({
  slug,
  title,
  summary,
  owners,
  ...POLICY_PUBLICATION_RULES.published,
  effectiveDate,
  lastReviewed,
  href,
  approvalRequirements: [],
  blockingDecisionIds: [],
  sections: [],
});

const draftPolicy = ({
  slug,
  title,
  summary,
  owners,
  blockingDecisionIds = [],
  approvalRequirements = POLICY_REQUIRED_APPROVALS,
  sections,
}) => ({
  slug,
  title,
  summary,
  owners,
  ...POLICY_PUBLICATION_RULES['draft-review'],
  lastReviewed: POLICY_REVIEW_DATE,
  href: '',
  approvalRequirements,
  blockingDecisionIds,
  sections,
});

export const policyDocuments = [
  publishedPolicy({
    slug: 'terms',
    title: 'Terms of Service',
    summary: 'The currently published general terms for using Lekhon.',
    effectiveDate: 'May 23, 2026',
    lastReviewed: 'May 23, 2026',
    href: '/terms',
    owners: ['Legal', 'Product'],
  }),
  publishedPolicy({
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: 'The currently published high-level information and privacy notice.',
    effectiveDate: 'May 23, 2026',
    lastReviewed: 'May 23, 2026',
    href: '/privacy',
    owners: ['Privacy', 'Legal'],
  }),
  draftPolicy({
    slug: 'community-guidelines',
    title: 'Community Guidelines',
    summary: 'Rules for public content, comments, messages, groups, calls, stories, products, and reviews.',
    owners: ['Safety', 'Legal', 'Product'],
    blockingDecisionIds: ['D-002', 'D-003', 'D-020'],
    sections: [
      {
        heading: 'Purpose and scope',
        paragraphs: [
          'These draft guidelines describe the behavior Lekhon intends to require wherever people publish, communicate, review products, operate stores, or interact with another person.',
        ],
      },
      {
        heading: 'Expected behavior',
        bullets: [
          'Be truthful about identity, content, products, services, and transactions.',
          'Respect privacy, consent, intellectual property, and personal boundaries.',
          'Use comments, messages, groups, and calls for lawful, relevant communication.',
          'Disclose material commercial relationships and avoid manipulated reviews.',
        ],
      },
      {
        heading: 'Not allowed',
        bullets: [
          'Threats, targeted harassment, hate, exploitation, or encouragement of violence.',
          'Impersonation, fraud, scams, phishing, spam, or deceptive engagement.',
          'Non-consensual intimate material, sexual exploitation, or child sexual abuse material.',
          'Malware, credential theft, payment theft, or instructions designed to compromise accounts.',
          'Illegal goods, services, content, or conduct.',
        ],
      },
      {
        heading: 'Reporting and enforcement',
        paragraphs: [
          'Users can use the central report form while direct report controls are being added. Lekhon may restrict reach, remove content, limit features, suspend accounts, revoke seller access, or preserve information when required for safety or law.',
        ],
        unresolved:
          'Final report response standards, enforcement reason codes, and appeal timelines require approval.',
      },
    ],
  }),
  draftPolicy({
    slug: 'acceptable-use',
    title: 'Content and Acceptable Use Policy',
    summary: 'Detailed prohibited-use rules for accounts, content, messaging, uploads, APIs, and platform systems.',
    owners: ['Safety', 'Security', 'Legal'],
    blockingDecisionIds: ['D-002', 'D-020'],
    sections: [
      {
        heading: 'Platform integrity',
        bullets: [
          'Do not bypass access controls, probe systems without permission, or interfere with service operation.',
          'Do not automate abusive traffic, scrape protected information, or evade rate limits.',
          'Do not distribute malicious files, links, code, or deceptive authentication prompts.',
        ],
      },
      {
        heading: 'Content integrity',
        bullets: [
          'Do not publish unlawful, infringing, fraudulent, or deliberately misleading content.',
          'Do not artificially manipulate views, likes, follows, comments, reviews, sales, or recommendations.',
          "Do not expose another person's sensitive data without authorization.",
        ],
      },
      {
        heading: 'Commercial integrity',
        bullets: [
          'Do not list products or services you cannot legally provide.',
          'Do not misstate price, condition, origin, delivery, rights, or included work.',
          'Do not route buyers away from Lekhon to evade applicable rules when the listing uses Lekhon checkout.',
        ],
      },
      {
        heading: 'Required decisions',
        unresolved:
          'Final report categories, emergency escalation, impersonation handling, and illegal-content escalation standards require safety and legal approval.',
      },
    ],
  }),
  draftPolicy({
    slug: 'ai-usage',
    title: 'AI Usage Policy',
    summary: 'Rules and responsibilities for AI writing, summaries, chat assistance, and product listings.',
    owners: ['AI Product', 'Privacy', 'Legal', 'Safety'],
    blockingDecisionIds: ['D-018'],
    sections: [
      {
        heading: 'User responsibility',
        paragraphs: [
          'AI output is a draft. The user remains responsible for accuracy, rights, safety, product claims, prices, instructions, disclosures, and the decision to publish or send it.',
        ],
      },
      {
        heading: 'Sensitive information',
        bullets: [
          'Do not submit passwords, one-time codes, API keys, full payment credentials, or private authentication data.',
          'Do not submit confidential or personal information unless you are authorized and understand the processing involved.',
          'Do not use AI to infer or expose highly sensitive traits about another person.',
        ],
      },
      {
        heading: 'Prohibited AI uses',
        bullets: [
          'Fraud, impersonation, phishing, harassment, exploitation, or evasion of platform enforcement.',
          'Unsafe instructions intended to facilitate serious harm or illegal activity.',
          'Misleading product descriptions, fake reviews, fabricated evidence, or deceptive identity material.',
        ],
      },
      {
        heading: 'Provider processing',
        paragraphs: [
          'AI requests may be sent to configured model providers. The final policy must identify approved data categories, retention expectations, subprocessors, and user controls.',
        ],
        unresolved:
          'Provider-by-provider retention, training, regional processing, and generated-content disclosure rules require final review.',
      },
    ],
  }),
  draftPolicy({
    slug: 'marketplace-buyer-terms',
    title: 'Marketplace Buyer Terms',
    summary: 'Buyer responsibilities and the current product-type, checkout, order, delivery, and review model.',
    owners: ['Commerce', 'Legal', 'Product'],
    blockingDecisionIds: ['D-008', 'D-009', 'D-010', 'D-012', 'D-013'],
    sections: [
      {
        heading: 'Product types',
        bullets: [
          'Digital products use protected download access after qualifying payment.',
          'Physical products use stock, address, courier, tracking, and delivery states.',
          'Services use seller-defined delivery, revision, inclusion, exclusion, and requirement information.',
          'External products leave Lekhon and are governed by the external platform and seller.',
        ],
      },
      {
        heading: 'Checkout',
        paragraphs: [
          'Buyers must review the final price, quantity, discount, shipping, fee, and product details. Lekhon revalidates current listing information and stock during checkout.',
        ],
      },
      {
        heading: 'Orders and reviews',
        bullets: [
          'Buyers should keep the order number and payment reference.',
          'Verified-purchase reviews require a delivered or completed qualifying order.',
          "Reviews must describe the buyer's own experience and must not manipulate ratings.",
        ],
      },
      {
        heading: 'Disputes',
        unresolved:
          'Buyer protection, service acceptance, return eligibility, evidence, and dispute-resolution rules are not final.',
      },
    ],
  }),
  draftPolicy({
    slug: 'seller-terms',
    title: 'Seller Terms',
    summary: 'Draft rules for seller eligibility, listings, fulfillment, fees, payouts, and enforcement.',
    owners: ['Commerce', 'Finance', 'Legal', 'Safety'],
    blockingDecisionIds: ['D-010', 'D-011', 'D-012', 'D-014', 'D-015'],
    sections: [
      {
        heading: 'Eligibility and verification',
        bullets: [
          'Seller information, identity, contact, PAN, and payout details must be accurate and current.',
          'Approval is not guaranteed and may require manual or provider-assisted verification.',
          'Seller status can be reviewed or revoked for risk, fraud, non-fulfillment, or policy violations.',
        ],
      },
      {
        heading: 'Listings',
        bullets: [
          'A seller must own or have permission to sell every product, file, image, service, and claim.',
          'Descriptions, prices, stock, delivery, revisions, limitations, and external links must be accurate.',
          'Prohibited products, deceptive testimonials, fake scarcity, and manipulated reviews are not allowed.',
        ],
      },
      {
        heading: 'Fulfillment',
        bullets: [
          'Physical orders require valid shipment and tracking information.',
          'Services must be delivered according to the listing and buyer requirements.',
          'Digital files must remain usable, lawful, and available within the stated download terms.',
        ],
      },
      {
        heading: 'Fees and payouts',
        paragraphs: [
          'Current deployment defaults include a 0% platform commission, an estimated 2.36% gateway fee, a seven-day earnings hold, and a minimum INR 10 payout. Deployment configuration can change these values.',
        ],
        unresolved:
          'Fee-change notice, taxes, payout timing, failed payouts, chargebacks, reserves, and seller appeal standards require final approval.',
      },
    ],
  }),
  draftPolicy({
    slug: 'prohibited-products',
    title: 'Prohibited Products and Services Policy',
    summary: 'Categories that should not be listed or linked through Lekhon marketplace.',
    owners: ['Commerce', 'Safety', 'Legal'],
    blockingDecisionIds: ['D-020'],
    sections: [
      {
        heading: 'Always prohibited',
        bullets: [
          'Illegal goods or services.',
          'Stolen goods, credentials, financial information, or personal data.',
          'Malware, phishing kits, exploit services, or unauthorized access tools intended for abuse.',
          'Child sexual abuse material or exploitative sexual content.',
          'Non-consensual intimate material.',
          'Fraudulent documents, impersonation services, or fake reviews.',
        ],
      },
      {
        heading: 'Restricted categories',
        paragraphs: [
          'Regulated goods, financial products, medical claims, weapons, controlled substances, gambling, adult content, and age-restricted products require a jurisdiction-specific decision before they can be permitted.',
        ],
      },
      {
        heading: 'External links',
        paragraphs: [
          'A prohibited item cannot be listed as an external product merely because another platform hosts the checkout.',
        ],
      },
      {
        heading: 'Required decisions',
        unresolved:
          'Jurisdiction-specific restricted categories, escalation standards, and external-link responsibility rules require commerce, safety, and legal approval.',
      },
    ],
  }),
  draftPolicy({
    slug: 'cancellations-returns-refunds',
    title: 'Cancellation, Return, and Refund Policy',
    summary: 'Current cancellation behavior and the unresolved return and refund rules.',
    owners: ['Commerce', 'Finance', 'Legal', 'Support'],
    blockingDecisionIds: ['D-008', 'D-009', 'D-012', 'D-013'],
    sections: [
      {
        heading: 'Current cancellation behavior',
        paragraphs: [
          'The standard buyer cancellation endpoint accepts pending-payment, failed, paid, or processing orders. Shipped, delivered, completed, refunded, or cancelled orders require another support path.',
        ],
      },
      {
        heading: 'Current refund behavior',
        paragraphs: [
          'For a paid eligible cancellation, Lekhon attempts a Razorpay refund. When the request is accepted, the product message states that completion may take 5-7 business days.',
        ],
      },
      {
        heading: 'Returns',
        paragraphs: [
          'The current return button is not connected to a full return workflow. Buyers are directed to support for shipped or delivered product concerns.',
        ],
      },
      {
        heading: 'Required decisions',
        unresolved:
          'Return windows, eligible reasons, item condition, evidence, return shipping cost, service disputes, digital goods, partial refunds, failed gateway refunds, and appeal rights must be approved before this policy becomes effective.',
      },
    ],
  }),
  draftPolicy({
    slug: 'shipping-digital-services',
    title: 'Shipping, Digital Goods, and Services Policy',
    summary: 'Delivery rules for physical, downloadable, and service products.',
    owners: ['Commerce', 'Legal', 'Support'],
    blockingDecisionIds: ['D-012', 'D-013'],
    sections: [
      {
        heading: 'Physical products',
        bullets: [
          'Sellers provide stock, shipping fee, estimated delivery, courier, and tracking information.',
          'A shipped order can be completed by the buyer or automatically after the configured completion period.',
          'Tracking does not by itself resolve loss, damage, wrong item, or delivery disputes.',
        ],
      },
      {
        heading: 'Digital products',
        bullets: [
          'The current default is five downloads per purchased product.',
          'Generated links expire after 15 minutes.',
          'The seller must keep the purchased file available and lawful.',
        ],
      },
      {
        heading: 'Services',
        bullets: [
          'The listing should state delivery time, revisions, included work, exclusions, and requirements.',
          'The seller can mark an eligible service order delivered.',
        ],
      },
      {
        heading: 'Required decisions',
        unresolved:
          'Shipping service levels, lost/damaged item handling, digital replacement rights, service acceptance, revisions, missed deadlines, and dispute evidence require approval.',
      },
    ],
  }),
  draftPolicy({
    slug: 'payments-payouts',
    title: 'Payments, Fees, Earnings, and Payouts Policy',
    summary: 'How buyer payments and seller earnings currently move through Lekhon.',
    owners: ['Finance', 'Commerce', 'Legal', 'Engineering'],
    blockingDecisionIds: ['D-009', 'D-014', 'D-015'],
    sections: [
      {
        heading: 'Buyer payment',
        paragraphs: [
          'Lekhon uses Razorpay for non-zero marketplace payments. A fully discounted order can be created as a free order. The current minimum non-zero payable amount is INR 1.',
        ],
      },
      {
        heading: 'Seller earnings',
        paragraphs: [
          'Earnings are created per seller from paid order items. Net earnings subtract configured platform and gateway fees and remain pending through the configured hold.',
        ],
      },
      {
        heading: 'Payout',
        paragraphs: [
          'Available earnings totaling at least INR 10 can be requested to the approved seller payout method. A payout can be processed through RazorpayX or queued for manual administrator processing.',
        ],
      },
      {
        heading: 'Required decisions',
        unresolved:
          'Guaranteed processing time, taxes, withholding, reserves, chargebacks, failed transfers, payout corrections, fee-change notice, and reconciliation escalation require approval.',
      },
    ],
  }),
  draftPolicy({
    slug: 'reviews',
    title: 'Reviews Policy',
    summary: 'Rules for verified-purchase reviews and seller replies.',
    owners: ['Commerce', 'Safety', 'Legal'],
    blockingDecisionIds: ['D-002', 'D-020'],
    sections: [
      {
        heading: 'Eligibility',
        paragraphs: [
          'The current product allows one review for a product in a delivered or completed order purchased by the reviewer.',
        ],
      },
      {
        heading: 'Review integrity',
        bullets: [
          "Describe the reviewer's own experience.",
          'Do not trade compensation for a required rating.',
          'Do not disclose private payment, contact, or delivery information.',
          'Do not threaten, harass, impersonate, spam, or post unrelated material.',
        ],
      },
      {
        heading: 'Seller replies',
        paragraphs: [
          "A seller can reply to a review on the seller's product. The reply must follow the same conduct standards.",
        ],
      },
      {
        heading: 'Moderation',
        unresolved:
          'Review reporting, removal reasons, evidence, editing, and appeal standards require final approval.',
      },
    ],
  }),
  draftPolicy({
    slug: 'moderation-appeals',
    title: 'Moderation, Enforcement, and Appeals Policy',
    summary: 'How Lekhon intends to review violations and reconsider enforcement decisions.',
    owners: ['Safety', 'Legal', 'Operations'],
    blockingDecisionIds: ['D-002', 'D-003'],
    sections: [
      {
        heading: 'Possible actions',
        bullets: [
          'Warning.',
          'Content or product removal.',
          'Feature limitation.',
          'Temporary account suspension.',
          'Account deletion or termination.',
          'Seller rejection or revocation.',
          'Preservation or disclosure when legally required.',
        ],
      },
      {
        heading: 'Review factors',
        bullets: [
          'Severity and immediacy of harm.',
          'Evidence and context.',
          'Intent, repetition, and evasion.',
          'Impact on users, buyers, sellers, and platform integrity.',
          'Legal or payment-provider requirements.',
        ],
      },
      {
        heading: 'Appeals',
        paragraphs: [
          'The central appeal form records the decision reference, user explanation, and new evidence. It does not guarantee reversal.',
        ],
        unresolved:
          'Appeal eligibility, deadlines, independent review, response targets, and final-decision rules require approval.',
      },
    ],
  }),
  draftPolicy({
    slug: 'copyright',
    title: 'Copyright and Intellectual Property Policy',
    summary: 'Rights, permissions, notices, removals, and repeat infringement.',
    owners: ['Legal', 'Safety'],
    blockingDecisionIds: ['D-019'],
    sections: [
      {
        heading: 'User responsibility',
        paragraphs: [
          'Users and sellers must own or have permission to use text, images, video, audio, files, templates, branding, and product material they upload or sell.',
        ],
      },
      {
        heading: 'Reporting infringement',
        paragraphs: [
          'The central report form can record the protected work, allegedly infringing material, ownership basis, contact information, and requested action while a dedicated legal notice process is prepared.',
        ],
      },
      {
        heading: 'Counter-notice and repeat infringement',
        unresolved:
          'Formal notice requirements, counter-notice procedure, repeat-infringer criteria, restoration, and jurisdiction-specific legal language require qualified legal review.',
      },
    ],
  }),
  draftPolicy({
    slug: 'guest-accounts',
    title: 'Guest Account Policy',
    summary: 'Temporary guest identity, expiry, and cleanup.',
    owners: ['Product', 'Privacy'],
    blockingDecisionIds: ['D-004', 'D-033'],
    sections: [
      {
        heading: 'Temporary account',
        paragraphs: [
          'A guest account uses an available username and expires 12 hours after creation.',
        ],
      },
      {
        heading: 'Cleanup',
        paragraphs: [
          "The guest cleanup process removes the expired guest's blogs, shorts, comments, notifications, messages, and user record.",
        ],
      },
      {
        heading: 'Limitations',
        paragraphs: [
          'Guest work should not be treated as permanent. Lekhon does not currently provide an automatic guest-to-registered-account conversion workflow.',
        ],
      },
      {
        heading: 'Required decisions',
        unresolved:
          'Guest-to-account conversion, deletion scope, retained records, and cleanup evidence require product, privacy, and engineering approval.',
      },
    ],
  }),
  draftPolicy({
    slug: 'api-terms',
    title: 'API Terms',
    summary: 'Rules for API keys and supported external blog access.',
    owners: ['Engineering', 'Security', 'Legal'],
    blockingDecisionIds: ['D-034'],
    sections: [
      {
        heading: 'Key security',
        bullets: [
          'Keep keys secret and revoke exposed keys.',
          'Do not embed private keys in public client code or mobile bundles.',
          'The account owner is responsible for actions performed with the key until it is revoked.',
        ],
      },
      {
        heading: 'Permitted use',
        paragraphs: [
          'Use supported API routes to read public blogs or create, update, and delete content owned by the authenticated account.',
        ],
      },
      {
        heading: 'Limits and changes',
        unresolved:
          'Formal quotas, versioning, deprecation notice, bulk export, commercial use, and suspension standards require approval.',
      },
    ],
  }),
  draftPolicy({
    slug: 'cookies-local-storage',
    title: 'Cookie and Local Storage Notice',
    summary: 'Browser and device storage currently used to operate Lekhon.',
    owners: ['Privacy', 'Engineering', 'Legal'],
    blockingDecisionIds: ['D-004', 'D-006', 'D-031'],
    sections: [
      {
        heading: 'Authentication and preferences',
        paragraphs: [
          'Lekhon uses browser or app storage for authentication tokens, remember-me state, theme or interface preferences, and selected session behavior.',
        ],
      },
      {
        heading: 'Marketplace and forms',
        bullets: [
          'Guest marketplace cart.',
          'Saved checkout addresses on the current device.',
          'Seller add-product working copy with a one-hour expiry.',
          'Dismissed interface notices and selected temporary state.',
        ],
      },
      {
        heading: 'Controls',
        paragraphs: [
          'Clearing site or app storage signs the user out and removes device-only data. It does not delete the registered account or server-stored content.',
        ],
        unresolved:
          'A complete storage inventory, analytics consent model, and retention table require final privacy review.',
      },
    ],
  }),
  draftPolicy({
    slug: 'accessibility',
    title: 'Accessibility Statement',
    summary: "Lekhon's intended accessibility commitment and issue-reporting path.",
    owners: ['Product', 'Accessibility', 'Engineering'],
    blockingDecisionIds: ['D-030'],
    sections: [
      {
        heading: 'Commitment',
        paragraphs: [
          'Lekhon intends to make core reading, writing, communication, marketplace, account, policy, and support workflows usable with keyboard and assistive technology.',
        ],
      },
      {
        heading: 'Current support goals',
        bullets: [
          'Clear headings and labels.',
          'Keyboard-operable controls.',
          'Visible focus.',
          'Text scaling and responsive layouts.',
          'Color-independent status meaning.',
          'Captions or transcripts for instructional video.',
        ],
      },
      {
        heading: 'Report a barrier',
        paragraphs: [
          'Use Contact Support, choose Other, and include the page, device, browser or app version, assistive technology, expected result, and actual result.',
        ],
        unresolved:
          'The formal conformance target and independent audit schedule require approval.',
      },
    ],
  }),
];

export const getPolicyDocument = (slug) =>
  policyDocuments.find((policy) => policy.slug === slug);
