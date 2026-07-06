# Help Center Information Architecture

## 1. Experience Principles

- Start with user goals, not internal feature names.
- Separate "how to do it" from "what rules apply."
- Show platform-specific steps only when they differ.
- Put consequences before destructive actions.
- Use progressive disclosure: summary, steps, details, troubleshooting, related policy.
- Provide a direct support or report path when self-service is insufficient.
- Never hide safety, refund, account-deletion, or appeal information behind search alone.

## 2. Public Routes

Proposed route family:

```text
/help
/help/search
/help/category/:category
/help/article/:slug
/policies
/policies/:slug
/safety
/contact
/report
/appeals
/status
```

The final route names may change, but guides and policies should remain separate content types.

Current implemented route registration and deferred routes are tracked in `17-route-navigation-registry.md`.

## 3. Help Center Home

First viewport:

- Search field: "How can we help?"
- Quick actions based on common tasks.
- Platform selector when relevant: Web or Android.
- High-priority notices for outages or major policy changes.

Primary categories:

1. Getting Started
2. Account and Sign-In
3. Profile, Privacy, and Security
4. Writing and Publishing
5. Community, Messages, and Calls
6. AI Tools
7. Marketplace for Buyers
8. Selling on Lekhon
9. Payments, Orders, and Refunds
10. Android App
11. Developers and API
12. Safety, Rules, and Policies

Secondary surfaces:

- Popular articles.
- Recently updated articles.
- Contact support.
- Report a problem or abuse.
- Check service status.

Footer taxonomy is tracked separately in `13-footer-navigation-inventory.md` so Help, safety, policy, marketplace, Android, and developer destinations remain discoverable after route changes.

## 4. Category Structure

### Getting Started

- What Lekhon is.
- Create an account.
- Explore the home feed.
- Find writers and content.
- Choose web or Android.
- Guest accounts.
- Language and theme settings.

### Account and Sign-In

- Password login.
- Google, Facebook, X, and LinkedIn sign-in.
- OAuth troubleshooting.
- Verify email.
- Reset password.
- Connect/disconnect accounts.
- Change username.
- Suspended account.
- Delete account.
- Data access/export when implemented.

### Profile, Privacy, and Security

- Edit profile.
- Visibility settings.
- Social-link privacy.
- Message permissions.
- Email notifications.
- Block and mute.
- API-key security.
- Compromised account.

### Writing and Publishing

- Choose blogs, articles, shorts, or stories.
- Create and format content.
- Images/media.
- Drafts.
- Scheduling.
- Templates.
- Product tags and promotional disclosures.
- Edit, unpublish, or delete.
- Comments and moderation.
- Troubleshoot publishing.

### Community, Messages, and Calls

- Follow writers.
- Notifications.
- Direct chat.
- Files and voice notes.
- Groups and invites.
- Group administration.
- Calls.
- Message retention.
- Block, mute, and report.

### AI Tools

- Available AI tools.
- Responsible use.
- Protect sensitive information.
- Verify output.
- AI errors and limits.
- AI for product listings.
- AI Usage Policy.

### Marketplace for Buyers

- Product types.
- Search and recommendations.
- Cart and wishlist.
- Coupons.
- Checkout and payment.
- Physical delivery.
- Services.
- Digital downloads.
- External products.
- Orders.
- Cancellation, returns, refunds.
- Reviews.
- Buyer safety.

### Selling on Lekhon

- Eligibility and application.
- Verification.
- Seller Terms.
- Store setup.
- Add a product.
- Local working copy versus saved draft.
- Images and camera.
- Product-type guides.
- Pricing and price changes.
- Coupons.
- Order fulfillment.
- Earnings and fees.
- Payouts.
- Seller enforcement and appeals.

### Android App

- Install a testing build.
- Install from Play Store after release.
- Update the app.
- Permissions.
- Sign in with providers.
- Back navigation.
- Offline limitations.
- Clear storage/cache.
- Report an Android issue.

### Developers and API

- Generate and revoke API keys.
- Authentication.
- Blog endpoints.
- Errors and rate limits.
- Security.
- API Terms.
- Changelog.

### Safety, Rules, and Policies

- Community Guidelines.
- Report content, users, products, messages, or reviews.
- Copyright.
- Prohibited content.
- Prohibited products.
- Child/minor safety.
- Enforcement and appeals.
- Privacy.
- Terms.

## 5. Article Template

Every guide should use this structure where applicable:

1. Title stated as a user task.
2. One-sentence outcome.
3. Applies to: Web, Android, or both.
4. Before you begin.
5. Numbered steps.
6. What happens next.
7. Important consequences or limits.
8. Troubleshooting.
9. Related policies.
10. Related guides.
11. Last reviewed date and product version.
12. Internal owners and review triggers recorded in the content registry.

Article-page presentation, guide details, escalation paths, related-guide ranking, mobile reading behavior, and feedback placement are governed by `20-article-experience-quality-protocol.md`.

Policy pages should instead include:

1. Effective date and previous-version link.
2. Scope.
3. Definitions.
4. Rules and responsibilities.
5. Enforcement or remedies.
6. Exceptions.
7. Contact, report, dispute, or appeal process.
8. Change-notice method.

Policy publication state, draft labels, approval gates, blocking decisions, and promotion rules are governed by `22-policy-publication-safety-protocol.md`.

## 6. Visual Guidance

Use annotated screenshots when:

- A control is difficult to locate.
- Web and Android layouts differ.
- A multi-step form has important state.
- A permission prompt is involved.
- A destructive action has consequences.

Use a short clip when:

- Gesture, camera, scrolling, drag, or back-navigation behavior matters.
- OAuth moves between app and browser.
- The add-product local-save model needs demonstration.

Use a diagram when:

- Explaining OAuth.
- Explaining order/payment/refund states.
- Explaining seller earnings and payout holds.
- Explaining drafts versus local working copies.
- Explaining privacy audiences.

Visual rules:

- Redact personal data and order/payment identifiers.
- Use seeded test accounts.
- Record platform, app version, and capture date.
- Include text alternatives.
- Replace visuals when the relevant UI changes.
- Track required workflow strips, screenshots, diagrams, clips, owners, and replacement triggers in `11-visual-guidance-inventory.md`.
- Track source-level visual requirements and capture evidence using `21-visual-evidence-capture-protocol.md`.

## 7. Search Model

Search should index:

- Article title.
- Summary.
- Body.
- Synonyms.
- Error messages.
- Feature names.
- Policy terms.
- Platform.
- Audience.

Example synonyms:

- X, Twitter.
- Seller, creator store, merchant.
- Draft, saved work, unpublished.
- Refund, money back.
- Sign in, log in, login.
- Delete account, close account.

Search ranking:

1. Exact title/task match.
2. Exact error-message match.
3. Audience and current-page context.
4. Popular successful articles.
5. Recently reviewed content.

Zero-result behavior:

- Offer spelling correction.
- Show nearby categories.
- Offer contact/report options.
- Record the failed query for editorial review.

Critical query ownership, zero-result review, and article feedback rules are tracked in `19-search-feedback-operations-protocol.md`.

## 8. Contextual Help

Required placements:

- Login: provider-specific help.
- Registration: eligibility, verification, and privacy.
- Profile privacy: "What each setting means."
- Account deletion: deletion scope and consequences.
- Create content: formatting, media limits, drafts, scheduling.
- Chat: file limits, retention, block/report.
- Seller application: Seller Terms, verification, review timing.
- Add product: section-specific help and local-save explanation.
- Checkout: product-type terms, payment, cancellation/refund.
- Order detail: status explanation and next actions.
- Digital download: link expiry and download limit.
- Seller earnings: fees, holds, payout states.
- Admin actions: internal policy/checklist links.

Contextual help should open in a drawer or new route without destroying form state.

Article-level escalation should route the user to Contact Support, Report a Problem, or Appeal a Decision when the guide cannot resolve the issue through self-service.

## 9. Footer Taxonomy

Desktop:

### Explore Lekhon

- Home
- About
- Writers and Content
- Marketplace
- Android App

### Create and Connect

- Writing and Publishing
- AI Tools
- Messages and Groups
- Community Guidelines

### Buy and Sell

- Buyer Help
- Seller Help
- Seller Terms
- Payments and Payouts
- Returns and Refunds
- Prohibited Products

### Help and Safety

- Help Center
- Contact Support
- Report a Problem
- Report Abuse
- Account Security
- Accessibility
- Service Status

### Legal

- Terms of Service
- Privacy Policy
- Cookie and Local Storage Notice
- Copyright Policy
- AI Usage Policy
- API Terms

Mobile:

- Use accordion sections.
- Keep Help Center, Contact, Report, Privacy, and Terms directly visible.
- Do not display a large desktop-style link grid without collapsible grouping.

Footer rules:

- Hide or relabel unavailable destinations.
- Do not claim an iOS app until released.
- "Back to top" may be present but cannot replace primary navigation.
- Legal links must remain reachable without login.

## 10. Content Storage Recommendation

Initial recommendation:

- Store article metadata and content in version-controlled structured files.
- Render through reusable React article and policy layouts.
- Use stable slugs and redirects for renamed content.
- Add a content index for client-side search initially.
- Move to a CMS only when non-engineering editorial volume justifies it.

Minimum metadata:

```yaml
id:
slug:
title:
summary:
type:
category:
audiences:
platforms:
keywords:
related:
policy_dependencies:
owner:
reviewers:
last_reviewed:
next_review:
product_version:
status:
```

## 11. Accessibility

- Search, category navigation, drawers, and accordions must be keyboard accessible.
- Headings must be hierarchical.
- Focus must move predictably.
- Screenshots require meaningful alt text or adjacent text instructions.
- Videos require captions or transcripts.
- Color cannot be the only status indicator.
- Content must remain readable at mobile widths and text zoom.
- Policy text should use plain-language summaries without replacing the binding text.

## 12. Analytics

Track:

- Search queries and zero-result searches.
- Article views.
- Helpful/not-helpful votes.
- Contact-support escalation after article view.
- Report-flow completion.
- Broken links.
- Top exit points.
- Platform and app version.

Do not:

- Place sensitive form text, passwords, payment data, or private messages in analytics.
- use help analytics in ways that contradict privacy settings or policy.

Current article feedback is local-only until privacy, consent, retention, backend storage, access control, and deletion/export rules are approved.
