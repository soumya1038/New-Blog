# Policy Approval Tracker

Last updated: June 26, 2026

## 1. Purpose

This tracker turns the open decision register into a release-safe approval workflow. It is intentionally strict: a policy may be drafted, routed, and reviewed while decisions are open, but it cannot be presented as binding or effective until the required approvals and product behavior checks are recorded here.

The source policy registry in `redirect/src/content/policyContent.js` must match this tracker. Use `22-policy-publication-safety-protocol.md` before changing any policy publication state, effective date, blocker, route, footer link, or draft/published label.

## 2. Approval States

| State | Meaning |
|---|---|
| Drafting | Content can be edited, but is not ready for review |
| Product review | Product owner is checking behavior, limits, and user promises |
| Engineering review | Engineering owner is checking implementation accuracy |
| Specialist review | Legal, privacy, finance, safety, accessibility, or mobile owner is reviewing |
| Approved | Required owners approved and effective date can be assigned |
| Effective | Published as binding user-facing policy with version and effective date |
| Blocked | Required decision, workflow, or approval is missing |

## 3. Policy Approval Matrix

| Policy | Blocking decisions | Required reviewers | Current state | Effective date | Notes |
|---|---|---|---|---|---|
| Terms of Service | D-001, D-003, D-019, D-020 | Product, engineering, legal, safety | Blocked | TBD | Eligibility, enforcement, appeals, and IP process remain open |
| Privacy Policy | D-004, D-005, D-007, D-017, D-018, D-031 | Privacy, engineering, legal | Blocked | TBD | Data map, export, deletion, retention, analytics consent, and AI processing remain open |
| Community Guidelines | D-002, D-003, D-019, D-020 | Product, safety, legal | Blocked | TBD | Reporting, appeals, emergency escalation, copyright process remain open |
| Content and Acceptable Use | D-002, D-019, D-020 | Safety, legal, product | Blocked | TBD | Requires clear prohibited-content and repeat-violation rules |
| Copyright and IP | D-019 | Legal, safety, engineering | Blocked | TBD | Requires notice, counter-notice, evidence, and repeat-infringer workflow |
| AI Usage Policy | D-018 | Product, privacy, legal, safety | Blocked | TBD | Requires provider processing, retention, ownership, disclosure, and safety rules |
| Marketplace Buyer Terms | D-008, D-009, D-010, D-012, D-013, D-014 | Commerce, finance, legal, mobile | Blocked | TBD | Returns, refunds, disputes, digital goods, services, and external products remain unresolved |
| Seller Terms | D-003, D-011, D-012, D-015, D-016 | Commerce, finance, legal, safety | Blocked | TBD | Fulfillment, fees, holds, payouts, deletion/archive, and revocation appeals remain unresolved |
| Prohibited Products and Services | D-002, D-014, D-020 | Commerce, safety, legal | Blocked | TBD | Needs marketplace moderation and external-product responsibility decisions |
| Cancellation, Return, and Refund Policy | D-008, D-009, D-012, D-013 | Commerce, finance, legal, support | Blocked | TBD | Requires implemented return/dispute/reconciliation flow or clear limitation language |
| Shipping and Delivery Policy | D-008, D-011 | Commerce, support, legal | Blocked | TBD | Seller SLA and evidence expectations remain open |
| Digital Goods Policy | D-010, D-013 | Commerce, legal, mobile | Blocked | TBD | Requires Play billing classification and download replacement/reset rules |
| Services Fulfillment Policy | D-012 | Commerce, legal, support | Blocked | TBD | Requires acceptance, revision, cancellation, and dispute flow |
| Payments and Payouts Policy | D-009, D-010, D-015 | Finance, legal, commerce, mobile | Blocked | TBD | Requires failed-refund operations, fee, hold, tax, and payout decisions |
| Reviews Policy | D-002, D-019, D-020 | Safety, commerce, legal | Blocked | TBD | Requires report/moderation standards for reviews |
| Moderation and Appeals Policy | D-002, D-003, D-020 | Safety, legal, product, support | Blocked | TBD | Requires reason codes, appeal scope, timelines, and escalation |
| Guest Account Policy | D-033, D-004 | Product, privacy, legal | Blocked | TBD | Conversion and deletion consequences remain open |
| API Terms | D-034 | Engineering, product, legal | Blocked | TBD | Requires quotas, scopes, suspension, and deprecation rules |
| Cookie and Local Storage Notice | D-031 | Privacy, engineering, legal | Blocked | TBD | Requires analytics/local storage consent model |
| Mobile Permissions Notice | D-010, D-027, D-028 | Mobile, privacy, legal | Blocked | TBD | Requires Android distribution, payment, App Links, and permission evidence |
| Accessibility Statement | D-030 | Accessibility, product, legal | Blocked | TBD | Requires target standard and audit process |

## 4. Approval Record Template

Copy this template under the relevant policy before marking a policy Approved or Effective.

```markdown
### Policy:

Version:
Effective date:
Previous version:
Owner:
Reviewers:

#### Decisions resolved

- D-XXX:

#### Product behavior verified

- Route or workflow:
- Evidence:

#### Specialist approval

- Legal:
- Privacy:
- Safety:
- Finance:
- Mobile:
- Accessibility:

#### User notice

- Notice required: yes/no
- Notice channel:
- Notice date:

#### Release evidence

- Test/build:
- Browser/mobile evidence:
- Support or cleanup notes:

#### Review trigger

- Next scheduled review:
- Event-based triggers:
```

## 5. Binding Publication Rule

A policy can move to **Effective** only when all of the following are true:

- All blocking decisions are approved or explicitly scoped out with an approved exception.
- Product behavior matches the policy text.
- Required reviewers are recorded with dates.
- Version and effective date are visible to users.
- Previous effective version is retained or archived.
- Public Help and contextual links point to the correct current policy.
- Release evidence is recorded in the Help Center Release Evidence Record.

If any item is missing, the route may exist only as draft or guidance, not binding policy.

## 6. Source Registry Checks

Before a policy is promoted:

- The policy has state `draft-review` until every blocker is resolved.
- `isBinding` remains `false` until the effective published route exists.
- Draft `effectiveDate` remains `Not yet effective`.
- Draft `href` remains empty.
- Draft `blockingDecisionIds` match this tracker and the decision register.
- Draft detail pages show a publication gate and decision-required callouts.
- Published policies link to registered public routes and do not render draft sections from the registry.
