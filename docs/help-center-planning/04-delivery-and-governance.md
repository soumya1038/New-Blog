# Delivery and Governance Workflow

## 1. Delivery Strategy

The work is divided into controlled phases. A later phase cannot begin until its gate is satisfied.

## 2. Phase 0 - Audit and Scope

Outputs:

- Application audit.
- Coverage matrix.
- Coverage approval packet generated with `npm run help:coverage-approval -- --name <coverage-pass-name>`.
- Information architecture.
- Decision register.
- Risk classification.

Gate:

- Product owner confirms that the inventory is complete enough to proceed.
- Program owner links the Help Coverage Approval Packet from release evidence before claiming the audit and matrix were approved.
- Missing product behavior is separated from missing documentation.

## 3. Phase 1 - Product and Policy Decisions

Resolve:

- Eligibility and minors.
- Report-abuse workflow.
- Appeals.
- Account deletion and retention.
- Data export.
- Returns and disputes.
- Refund exception handling.
- Marketplace responsibility by product type.
- Seller fulfillment duties.
- Fees, holds, payouts, and changes.
- Native digital-goods payment strategy.
- AI data and ownership position.
- Personalization controls.

Outputs:

- Approved decision records.
- Product tickets for missing workflows.
- Legal briefing package.

Gate:

- No P0 policy is drafted as final while its core behavior remains unresolved.

## 4. Phase 2 - Foundational Policy Drafts

Draft order:

1. Terms of Service.
2. Privacy Policy and retention schedule.
3. Community Guidelines and Acceptable Use.
4. Moderation, Enforcement, Reporting, and Appeals.
5. Copyright/IP.
6. AI Usage.
7. Marketplace Buyer Terms.
8. Seller Terms.
9. Prohibited Products and Services.
10. Cancellation, Returns, and Refunds.
11. Shipping, Digital Goods, Services, Payments, and Payouts.
12. Reviews, Guest Accounts, API Terms, Cookies/local storage, mobile permissions, accessibility.

Review:

- Product verifies behavior.
- Engineering verifies implementation claims.
- Legal reviews binding language.
- Finance reviews fees, refunds, payouts, and tax wording.
- Safety reviews prohibited conduct and escalation.
- Policy publication state, draft gates, and blocker mapping follow `22-policy-publication-safety-protocol.md`.

Gate:

- Each policy has approval, effective date, owner, and version.

## 5. Phase 3 - Help Content

Content waves:

### Wave A - Critical Self-Service

- Sign-in and recovery.
- Account deletion.
- Privacy and security.
- Report, block, and appeal.
- Checkout, payments, cancellation, refunds.
- Seller application, fulfillment, earnings, and payouts.
- Android OAuth and permissions.

### Wave B - Core Product Guidance

- Create/publish all content types.
- Drafts and scheduling.
- Chat, groups, and calls.
- Marketplace browsing and order management.
- Add-product workflow and product types.

### Wave C - Advanced Guidance

- Templates.
- AI tools.
- API.
- Personalization.
- Admin/internal runbooks.

Writing workflow:

1. Verify feature in code and running UI.
2. Draft article using the standard template.
3. Capture visuals on seeded test data.
4. Product and engineering review.
5. Accessibility and language review.
6. Publish to staging.
7. Validate links, search, and responsive rendering.
8. Approve production publication.

## 6. Phase 4 - Product Implementation

Build:

- Help Center routes and layouts.
- Article/policy content registry.
- Search and filters.
- Category pages.
- Related-content links.
- Article details panel and contextual escalation actions.
- Policy index and version history.
- Contact, report, and appeal entry points.
- Expanded responsive footer.
- Contextual help links/drawers.
- Local article feedback with privacy-gated helpful-vote analytics.
- Critical search query checks and zero-result review rules.
- Broken-link checker.

Implementation constraints:

- Existing routes must continue to work.
- Contextual help must preserve unsaved form state.
- Legal pages remain public.
- Android WebView navigation must be tested separately.
- Footer must be compact and usable on mobile.

## 7. Phase 5 - Verification

Content checks:

- Accuracy against current code.
- No unsupported promises.
- Consistent terminology.
- Effective dates and owners.
- Help article owners and review triggers follow `18-content-ownership-review-protocol.md`.
- Correct platform labels.
- No secrets or internal-only data.
- Required visual metadata and capture evidence follow `21-visual-evidence-capture-protocol.md`.

Functional checks:

- Every footer link.
- Footer taxonomy exposes Help, safety, report, appeal, policy, Android, buyer, seller, order, payout, AI, and API destinations.
- Route registration and public footer visibility match `17-route-navigation-registry.md`.
- Search exact match, synonyms, typo, and zero results.
- Critical search signals, local feedback behavior, and privacy gates using `19-search-feedback-operations-protocol.md`.
- Article facts, escalation paths, related guides, local feedback placement, and mobile article reading behavior using `20-article-experience-quality-protocol.md`.
- Deep links.
- Browser back behavior.
- Android back behavior.
- Android OAuth, permissions, app start route, packaged assets, and physical-device behavior using `16-android-oauth-permissions-verification-protocol.md`.
- Authentication boundaries.
- Contextual drawer state preservation.
- Contextual Help links in workflow screens route to registered Help articles or categories and preserve useful references.
- Contact, report, and appeal submissions.
- Support/report/appeal reference numbers, admin queue visibility, metrics, triage updates, and approved cleanup method.
- Policy version links.
- Policy publication states, draft gates, approval requirements, and blocking decision ids using `22-policy-publication-safety-protocol.md`.
- Source-owned release gate statuses, local/external evidence separation, and open blockers using `23-release-readiness-gate-protocol.md`.

Viewport checks:

- 360 x 800.
- 412 x 915.
- Tablet.
- Standard desktop.
- Wide desktop.

Accessibility checks:

- Keyboard navigation.
- Screen-reader landmarks and labels.
- Focus order and focus restoration.
- Text zoom.
- Contrast.
- Captions/transcripts.
- Use `14-accessibility-verification-protocol.md` for route coverage, evidence format, NVDA, TalkBack, reduced-motion, and release decisions.

Release gate:

- No P0 broken destination.
- No unresolved critical policy contradiction.
- No draft policy is presented as binding or effective.
- No sensitive data in screenshots or analytics.
- No P0 visual requirement is missing source metadata, evidence, or an approved blocker.
- Web and Android smoke tests pass.
- No required release gate remains open without an owner, blocker, and release impact.
- The current coverage approval packet is generated, reviewed, linked from release evidence, and does not override any still-open release gate.

## 8. Phase 6 - Launch

Launch sequence:

1. Publish policies with effective dates.
2. Publish Help Center.
3. Enable footer.
4. Enable contextual links.
5. Announce material policy changes.
6. Monitor search, support escalations, report volume, and errors.

Rollback:

- Content changes must be independently reversible.
- Stable slugs remain or redirect.
- A prior policy version remains archived.
- Critical wrong guidance is removed immediately and replaced with a notice.

## 9. Governance

Required roles:

| Role | Responsibility |
|---|---|
| Program owner | Scope, prioritization, approvals |
| Product owner | Behavior and UX accuracy |
| Engineering owner | Technical accuracy and change triggers |
| Legal reviewer | Binding policy review |
| Privacy owner | Data map, rights, retention, processors |
| Safety/moderation owner | Community rules, reports, appeals |
| Commerce owner | Orders, refunds, seller duties |
| Finance owner | Fees, earnings, payouts, reconciliation |
| Mobile owner | Android/iOS behavior and store requirements |
| Editorial owner | Style, taxonomy, search terms, maintenance |
| Accessibility reviewer | Inclusive content and UI verification |

## 10. Review Cadence

- P0 policies: every six months and after material change.
- Privacy/subprocessor information: every three months.
- Payment/refund/payout rules: every release that changes commerce behavior.
- Help articles: every six months or when their owning feature changes.
- Android articles: every app release.
- Screenshots/videos: whenever the relevant UI changes.
- Broken links: automated on every build and scheduled weekly.
- Search failures: reviewed monthly.
- Article helpfulness feedback: reviewed monthly after production analytics approval.

## 11. Documentation Change Trigger

Every feature ticket and pull request should answer:

```text
Documentation impact: none / update / new article / policy review
Affected audience:
Affected platforms:
Behavior or limitation changed:
Contextual help changed:
Policy owner notified:
```

A release cannot be considered complete when required documentation impact is unresolved.

## 12. Content Status Workflow

```text
proposed
  -> verified
  -> drafting
  -> product-review
  -> legal-or-specialist-review
  -> approved
  -> staged
  -> published
  -> scheduled-review
  -> archived
```

Emergency corrections may move from published to corrected immediately, but the change and reason must be recorded.

## 13. Quality Scorecard

Each article receives 0 or 1 for:

- Matches current behavior.
- States platform.
- States prerequisites.
- Uses clear steps.
- Explains outcome.
- Covers failure/recovery.
- Links applicable policy.
- Has current visuals when needed.
- Is accessible.
- Has owner and review date.

Publish threshold:

- P0 article: 10/10.
- P1 article: at least 9/10 with no accuracy, policy, or accessibility failure.
- P2 article: at least 8/10.

## 14. Success Metrics

- Reduced repeated support questions.
- Higher successful self-service rate.
- Lower zero-result search rate.
- Higher task completion after article view.
- Faster report and appeal handling.
- Lower checkout and seller-onboarding abandonment caused by confusion.
- Fewer policy contradictions.
- Documentation updates included in relevant releases.
