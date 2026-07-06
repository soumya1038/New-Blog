# Release Exception Register

Status: Active register; no approved exceptions are recorded  
Last updated: June 28, 2026

## 1. Purpose

This register defines how Lekhon can record a controlled, time-limited exception for a Help Center release gate when the program owner accepts a documented risk instead of waiting for full evidence.

Exceptions are source-owned in `HELP_RELEASE_EXCEPTIONS` inside `redirect/src/content/releaseReadiness.js`.

Run `npm run help:exceptions` from the repository root or `redirect` to print current exception counts, validation results, open gates without valid approved exceptions, and the completion rule.

Run `npm run help:exception-decision -- --name <exception-pass-name>` from the repository root or `redirect` to create a dated exception decision packet before any approved exception is added to `HELP_RELEASE_EXCEPTIONS`.

## 2. Current Result

Current approved exceptions: none.

The Help Center goal remains not complete because the current open gates do not have approved exceptions and still require current evidence or specialist approval.

## 3. Exception Statuses

| Status | Meaning |
|---|---|
| `draft` | Proposed exception that cannot satisfy a gate |
| `approved` | Time-limited exception with all required owner, risk, evidence, decision, expiration, and next-review fields |
| `expired` | Exception that no longer applies |
| `rejected` | Exception request that was denied |

## 4. Required Exception Fields

Every exception must include:

- `id`
- `gateId`
- `status`
- `owner`
- `scope`
- `risk`
- `nextReviewDate`
- `evidence`

An approved exception must also include:

- `approvedBy`
- `approvedDate`
- `expiresOn`
- `decisionRecord`

## 5. Current Open Gates Without Approved Exceptions

| Gate id | Current status | Exception status |
|---|---|---|
| `physical-android-device` | Pending external | None |
| `android-oauth-provider-return` | Pending external | None |
| `android-permissions-camera-microphone` | Pending external | None |
| `manual-screen-reader-verification` | Pending external | None |
| `live-support-report-appeal-lifecycle` | Pending external | None |
| `policy-specialist-approvals` | Blocked approval | None |
| `p0-visual-evidence-capture` | Blocked production | None |
| `analytics-consent-operations` | Blocked approval | None |

## 6. Exception Limits

- An exception does not publish draft policy text as binding.
- An exception does not replace required legal, privacy, finance, safety, commerce, mobile, or accessibility approval unless the named approver owns that decision.
- An exception does not turn debug Android evidence into Play Store production evidence.
- An exception must be release-candidate specific.
- An exception must expire and must have a next review date.
- An exception must include enough evidence for a reviewer to understand the accepted risk.

## 7. Release Use

Before using an exception in a release decision:

1. Run `npm run help:exception-decision -- --name <exception-pass-name>` and fill the decision packet.
2. Add the approved exception to `HELP_RELEASE_EXCEPTIONS` only after approval.
3. Run `npm run help:exceptions`.
4. Confirm the exception validates successfully.
5. Confirm it is not expired.
6. Confirm it points to a known release gate.
7. Confirm the release evidence record links the decision packet and decision record.
8. Confirm the scope matches the exact release claim being made.

## 8. Completion Rule

Do not mark the Help Center goal complete when an open gate lacks current evidence and lacks a valid approved exception. Do not use expired, draft, or rejected exceptions to complete a gate.
