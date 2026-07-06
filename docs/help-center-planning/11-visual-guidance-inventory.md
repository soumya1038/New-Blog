# Visual Guidance Inventory

Last updated: June 27, 2026

## 1. Purpose

This inventory tracks every Help Center visual that explains a workflow, state transition, permission prompt, destructive action, or mobile behavior. It covers the visual workflow strips that already exist in article content and the screenshots, diagrams, or clips still required before release.

Structured visual requirements are also recorded in `HELP_VISUAL_REQUIREMENTS` inside `redirect/src/content/helpCenterContent.js`. Update this inventory and the source registry together.

Run `npm run help:visual-worksheet -- --name <visual-pass-name>` from the repository root to generate a dated capture worksheet under `docs/help-center-planning/visual-evidence/`. Use `--dry-run` first to confirm the target path and current P0 counts.

Run `npm run help:visual-readiness` from the repository root to summarize current visual requirement counts, open P0 blockers, owners, source checks, and release blockers without creating files.

Visual guidance is release-critical when text alone could cause a user to miss a control, misunderstand a consequence, lose local data, fail OAuth, submit the wrong report, or make a payment or payout decision with incomplete context.

## 2. Visual Types

| Type | Use when | Acceptance rule |
|---|---|---|
| Workflow strip | A small linear process can be explained as labeled steps inside an article | Steps are rendered from content, have accessible text, and remain useful on mobile |
| Annotated screenshot | A user must locate a control, status, table, form field, or warning | Uses seeded test data, redacts private data, and includes alt text |
| Short clip | Motion, gesture, Android back behavior, camera, OAuth handoff, or scrolling matters | Shows the exact behavior, has a text alternative, and avoids private data |
| Diagram | State transitions or responsibility boundaries are easier to understand visually | Labels match policy and product terminology |
| Empty-state image | A page needs to explain what to do when there is no data | Does not hide the next action behind decorative content |

## 3. Existing Workflow Strips

These flows are already represented in `redirect/src/content/helpCenterContent.js` and rendered by `redirect/src/pages/HelpArticle.jsx`.

| Article | Flow purpose | Platforms | Current state | Next visual need |
|---|---|---|---|---|
| `sign-in-with-social-account` | OAuth provider handoff and callback return | Web, Android | Implemented as workflow strip | Add Android OAuth short clip after physical-device provider setup is verified |
| `understand-drafts-and-local-saves` | Seller add-product local working copy behavior | Web, Android | Implemented as workflow strip | Add screenshot set showing section save, saved indicator, cancel warning, and one-hour expiry warning |
| `cancel-order-and-understand-refund` | Buyer cancellation and refund attempt sequence | Web, Android | Implemented as workflow strip | Add diagram after refund reconciliation decision is approved |
| `manage-your-seller-dashboard` | Order fulfillment to payout overview | Web, Android | Implemented as workflow strip | Add dashboard screenshot set for Overview, Products, Orders, Earnings, Coupons |
| `understand-seller-earnings-and-payouts` | Earnings hold and payout request sequence | Web, Android | Implemented as workflow strip | Add payout state diagram after fees, holds, and failed payout rules are approved |
| `secure-a-compromised-account` | Account recovery order of operations | Web, Android | Implemented as workflow strip | Add security checklist screenshot only if it uses test account data |
| `report-abuse-fraud-or-unsafe-content` | Central report submission path | Web, Android | Implemented as workflow strip | Add report-form screenshot and category selection image after report categories are approved |
| `appeal-an-enforcement-or-seller-decision` | Appeal submission path | Web, Android | Implemented as workflow strip | Add appeal-form screenshot after reason codes and appeal timelines are approved |

## 4. Required Screenshot and Clip Backlog

| Priority | Workflow | Visual type | Required platforms | Owner | Status | Blocker |
|---|---|---|---|---|---|---|
| P0 | Android OAuth with Google, Facebook, X, and LinkedIn | Short clip or step screenshots | Android physical device | Mobile + auth | Pending | Provider redirect/app-link verification |
| P0 | Report a user, content item, message, product, or review | Annotated screenshots | Web, Android | Safety + product | Pending | Unified report categories and direct report controls |
| P0 | Appeal account, content, seller, or marketplace decision | Annotated screenshots | Web, Android | Safety + legal | Pending | Appeal workflow, timelines, reason codes |
| P0 | Account deletion and data retention explanation | Diagram + screenshots | Web, Android | Privacy + engineering | Pending | Deletion scope and retained-record decisions |
| P0 | Checkout, payment, cancellation, refund, and failed refund | Diagram + screenshots | Web, Android | Commerce + finance | Pending | Refund reconciliation and Android payment model |
| P0 | Seller earnings, holds, payout request, and failed payout | Diagram + screenshots | Web, Android | Finance + commerce | Pending | Fee, hold, payout timing, and failure decisions |
| P0 | Add-product local save, saved draft, cancel, publish, expiry | Annotated screenshots + optional short clip | Web, Android | Seller product owner | Pending | Needs final UI screenshot capture from current build |
| P0 | Product image camera permission and denied-permission recovery | Short clip or screenshot sequence | Android, desktop web | Mobile + seller QA | Pending | Physical-device camera permission testing |
| P0 | Android back navigation across articles, orders, stores, seller dashboard | Short clip | Android physical device | Mobile + QA | Pending | Physical-device runtime verification |
| P1 | Mobile footer accordion and Help search | Screenshot sequence | Android, mobile web | QA + editorial | Pending | Current build capture |
| P1 | Privacy settings and message permissions | Annotated screenshots | Web, Android | Privacy + product | Pending | Friends-only definition |
| P1 | Admin support queue metrics and triage | Annotated screenshots | Web admin | Support operations | Pending | Seeded support records and cleanup method |
| P1 | Digital downloads and replacement/support path | Annotated screenshots | Web, Android | Commerce + support | Pending | Download reset/replacement rules |
| P1 | Service order fulfillment and dispute path | Diagram + screenshots | Web, Android | Commerce + legal | Pending | Service acceptance and dispute flow |
| P2 | API key creation and revocation | Annotated screenshots | Web | Engineering | Pending | API terms and quotas |

## 5. Capture Standard

Every visual must record:

- Source route.
- Browser, device, or emulator model.
- Viewport size or Android version.
- Build version or commit.
- Capture date.
- Test account or seeded data set used.
- Owner who approved that no private data is visible.
- Alt text or written equivalent.
- Replacement trigger.

Use `21-visual-evidence-capture-protocol.md` for the evidence-note format, file naming, privacy review, accessibility text, replacement review, and source-level verification rules.

## 6. Privacy and Safety Rules

- Use seeded accounts, orders, products, messages, reports, and payouts.
- Redact usernames only when the guide does not need a visible username reference.
- Never show email addresses, phone numbers, addresses, card/payment identifiers, payout details, access tokens, API keys, private messages, legal identity files, or sensitive report descriptions.
- Do not show real abuse, harassment, medical, financial, legal, or identity documents in examples.
- If a support/report/appeal screenshot shows a ticket number, confirm it belongs to test data and has a cleanup method.

## 7. Replacement Triggers

Replace or reapprove visuals when:

- The route, control name, field label, status name, or button changes.
- Android OAuth or App Links change.
- Camera, microphone, file, or storage permission behavior changes.
- Checkout, refund, payout, return, dispute, or cancellation logic changes.
- Report categories, appeal categories, or support request types change.
- Footer taxonomy, Help category names, or policy slugs change.
- A visual is older than six months and still used in a P0 or P1 guide.

## 8. Release Rule

A release can pass local Help verification with workflow strips only, but production readiness requires current screenshots, clips, or diagrams for every P0 visual backlog row that is not blocked by an explicitly recorded product or policy decision.
