# Content Ownership and Review Protocol

Last updated: June 26, 2026

## 1. Purpose

This protocol defines who owns Lekhon Help Center guidance, when content must be reviewed, and what evidence is required before a guide, policy, contextual Help link, footer entry, or visual instruction can be treated as current.

The Help Center must not become static launch content. Every user-facing guide needs accountable owners, a last-reviewed date, and review triggers tied to product changes, policy decisions, support volume, Android changes, and accessibility findings.

## 2. Help Category Owners

| Category | Owners | Primary review responsibility |
|---|---|---|
| Getting started | Product, Editorial | Product overview, onboarding, web/Android positioning |
| Account and sign-in | Product, Security, Support | Registration, verification, OAuth, recovery, suspensions, deletion |
| Privacy and security | Privacy, Security, Product | Visibility, blocking, API-key safety, compromised-account guidance |
| Writing and publishing | Product, Editorial | Blogs, articles, shorts, stories, drafts, scheduling, media |
| Community, messages, and calls | Product, Safety | Chat, groups, calls, blocking, reporting, retention limitations |
| AI tools | AI Product, Privacy, Legal | AI use, sensitive input warnings, provider/privacy disclosures |
| Marketplace for buyers | Commerce, Support, Legal | Product types, checkout, order issues, downloads, refunds, reviews |
| Selling on Lekhon | Commerce, Finance, Support | Seller application, products, orders, earnings, payouts |
| Android app | Mobile, Support | APK install, OAuth handoff, permissions, back navigation, offline limits |
| Developers and API | Engineering, Security | API keys, supported endpoints, security, quotas, deprecation |

These owners are recorded in `redirect/src/content/helpCenterContent.js` through `helpCategoryOwners`. Each Help article inherits its category owners unless explicitly overridden.

## 3. Required Article Metadata

Every Help article must have:

- Stable slug.
- Category.
- Platforms.
- Audiences.
- Owners.
- Last reviewed date.
- Review triggers.
- At least one content section.

Policy documents already carry owners and review metadata in `redirect/src/content/policyContent.js`. Binding policy publication still follows `10-policy-approval-tracker.md`.

## 4. Default Review Triggers

Every Help article must be reviewed when:

- Feature behavior changes.
- A Help link, route, search query, or contextual entry point breaks.
- Repeated support requests show confusion about the task.
- Policy, safety, privacy, payment, marketplace, AI, Android, or accessibility decisions change the guidance.
- A six-month scheduled review is due.

More specific triggers can be added to individual articles when a workflow has higher risk.

## 5. Review Workflow

1. Identify the changed workflow, route, support issue, policy decision, or Android behavior.
2. Find the affected category owner and article owners.
3. Verify current behavior in code and, when needed, in the running app.
4. Update Help article text, actions, visuals, search terms, footer links, contextual Help links, and policy references together.
5. Update the last-reviewed date or record why the article did not need a content change.
6. Run `npm run test:help -- --runInBand`.
7. Run `npm run build` when user-facing Help, policy, footer, support, or route behavior changed.
8. Record release evidence in `09-release-evidence-record.md` when the change affects release readiness.

## 6. Review Evidence Template

```markdown
## Help content review evidence

Article:
Category:
Owners:
Trigger:
Reviewed behavior:
Code or route evidence:
Visual evidence:
Policy impact:
Contextual Help impact:
Footer impact:
Android impact:
Accessibility impact:
Reviewer:
Date:
Decision: unchanged / updated / blocked
```

## 7. Source-Level Verification

`redirect/src/content/helpCenterContent.test.js` verifies that:

- Every category has owners.
- Every article has owners and review triggers.
- Every article's owners inherit from a known owner set or are explicitly present.
- Every article has a valid last-reviewed date.
- Policy documents keep owner metadata and publication-safe status rules.

Run from `redirect`:

```text
npm run test:help -- --runInBand
```

## 8. Release Rule

The Help Center governance layer is not release-complete if:

- A required article has no owner.
- A required article has no review trigger.
- A product change ships without a documentation-impact check.
- A policy decision changes user obligations but the related guide is not reviewed.
- Support volume shows repeated confusion and no owner is assigned to update guidance.
- Android behavior changes without review by Mobile and Support owners.
