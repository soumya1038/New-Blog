# Visual Evidence Capture Protocol

Status: Active for structured visual requirements; visual assets remain pending or blocked where noted  
Last updated: June 27, 2026

## 1. Purpose

This protocol defines how Lekhon captures, reviews, stores, and replaces screenshots, diagrams, clips, and workflow strips for Help Center articles. It connects the visual backlog in `11-visual-guidance-inventory.md` to the structured article metadata in `redirect/src/content/helpCenterContent.js`.

## 2. Source Registry

The Help content registry owns:

- `HELP_VISUAL_STATUSES`
- `HELP_VISUAL_REQUIREMENTS`
- `article.visualRequirements`

Run `npm run help:visual-readiness` from the repository root to summarize current visual requirement counts, open P0 blockers, owners, source checks, and release blockers without creating files.

Run `npm run help:visual-evidence -- --name <visual-pass-name>` from the repository root to generate a dated P0 visual evidence packet for screenshots, clips, diagrams, privacy review, accessibility text, replacement-trigger review, owner sign-off, and final visual release decisions. Use `--dry-run` first to confirm the target path and current source counts.

Run `npm run help:visual-worksheet -- --name <visual-pass-name>` from the repository root to generate a dated capture worksheet from the current source registry. Use `--dry-run` before writing a worksheet.

Each visual requirement must include:

- Stable `id`.
- `articleSlug`.
- `priority`.
- `visualType`.
- Required `platforms`.
- `owner`.
- `status`.
- `purpose`.
- `nextStep`.
- `replacementTriggers`.
- `evidence` when implemented.
- `blocker` when pending or blocked.

## 3. Visual Statuses

| Status | Meaning | Release use |
|---|---|---|
| `implemented` | The visual exists in the product or article today, such as a rendered workflow strip | Can count for local Help verification |
| `pending` | The visual can be captured from the current product after seeded data or QA setup | Blocks production readiness when priority is P0 |
| `blocked` | A product, policy, legal, privacy, finance, mobile, or data-cleanup decision is missing | Must be listed as a release blocker unless explicitly waived |

## 4. Capture Order

Capture P0 visuals first:

1. Android OAuth provider handoff.
2. Report submission path.
3. Appeal submission path.
4. Account deletion and retention explanation.
5. Checkout, payment, cancellation, refund, and failed-refund states.
6. Seller earnings, holds, payout request, and failed-payout states.
7. Add-product local save, saved draft, cancel, publish, and expiry behavior.
8. Product camera permission and denied-permission recovery.
9. Android back navigation across article, order, store, seller dashboard, and app-root paths.

Capture P1 visuals after P0:

- Mobile footer accordion and Help search.
- Privacy settings and message permissions.
- Admin support queue metrics and triage.
- Digital download support path.
- Service order dispute path.

Capture P2 visuals last:

- API key creation and revocation.

## 5. Capture Package

Every captured visual must be stored with a small evidence note:

```text
Visual requirement id:
Article slug:
Route:
Visual type:
Platform:
Device/browser:
Viewport or Android version:
Build or commit:
Capture date:
Seeded account/data:
Private-data review owner:
Alt text or transcript:
Replacement triggers reviewed:
Approval:
```

## 6. File Naming

Use stable, searchable filenames:

```text
help-visual-<requirement-id>-<platform>-<yyyy-mm-dd>.<ext>
help-visual-<requirement-id>-transcript-<yyyy-mm-dd>.md
help-visual-<requirement-id>-evidence-<yyyy-mm-dd>.md
```

Examples:

```text
help-visual-visual-add-product-local-save-screenshots-android-2026-06-26.png
help-visual-visual-android-oauth-provider-clip-android-2026-06-26.mp4
help-visual-visual-seller-payout-state-diagram-web-2026-06-26.png
```

## 7. Privacy Review

Before approving a visual, confirm it does not show:

- Email addresses.
- Phone numbers.
- Address or delivery details.
- Card, bank, payment, payout, or tax identifiers.
- Access tokens, API keys, OAuth codes, or one-time codes.
- Private messages or call details.
- Legal identity files.
- Sensitive report descriptions.
- Real abuse, medical, legal, financial, or identity documents.

Use seeded data. If a username, product name, ticket number, or order number is shown, confirm it belongs to seeded test data and has a cleanup method when the record is backend-backed.

## 8. Accessibility Review

Every visual must have:

- Alt text for screenshots and diagrams.
- Text equivalent for workflow strips.
- Transcript or step list for clips.
- Caption or adjacent text when audio appears.
- Clear labels that match article and policy terminology.
- No dependence on color alone.

## 9. Replacement Review

Replace or reapprove a visual when any listed replacement trigger fires. The reviewer must check:

- Route still exists.
- UI labels still match.
- Article text still describes the same behavior.
- Policy wording still matches.
- Android behavior still matches the current APK.
- Screenshot or clip still avoids private data.

## 10. Source-Level Verification

The Help content test must verify:

- Each visual requirement has a unique id.
- Each visual requirement points to an existing article.
- Every requirement has status, owner, purpose, next step, and replacement triggers.
- Implemented workflow-strip requirements point to articles that actually contain a flow.
- Pending or blocked requirements have a blocker.
- Critical P0 article slugs remain represented.

## 11. Release Rule

A release can pass local Help tests with structured visual requirements and implemented workflow strips. Production readiness still requires current visual assets, evidence notes, privacy review, accessibility text, and approval for every unblocked P0 visual requirement.
