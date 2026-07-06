# Release Candidate Execution Checklist

Status: Active checklist template; fill for each release candidate  
Last updated: June 28, 2026

## 1. Purpose

Use this checklist when preparing a Lekhon Help Center, policy, footer, contextual Help, support, Android, or documentation release candidate. It mirrors the source-owned release gates in `redirect/src/content/releaseReadiness.js` and the derived `RELEASE_CANDIDATE_CHECKLIST` export.

For a release-specific working file, run `npm run help:release-candidate -- --name <release-candidate-name>` from the repository root. Use `--dry-run` first to confirm the target path and current gate counts.

For the ordered release-pass command plan, run `npm run help:release-pass-checklist -- --name <release-pass-name>` from the repository root. Use `--dry-run` first to confirm expected artifact counts and open gate counts.

For application-audit and coverage-matrix signoff, run `npm run help:coverage-approval -- --name <coverage-pass-name>` from the repository root. Use `--dry-run` first to confirm source document counts, objective rows, and open gate counts.

For the master evidence index, run `npm run help:release-evidence-binder -- --name <binder-name>` from the repository root. Use `--dry-run` first to confirm packet coverage and unresolved gate counts.

Before treating `09-release-evidence-record.md` as final, run `npm run help:release-record-audit -- --json` from the repository root and resolve placeholders, pending rows, missing command coverage, missing artifact folders, missing open gate ids, and missing completion-boundary text.

After generating release evidence packets, run `npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD>` from the repository root to confirm every expected packet exists and every existing packet is linked from the release evidence record.

Before assigning unresolved gate follow-up, run `npm run help:open-gate-owners -- --json` from the repository root and confirm every open owner has evidence, blocker, protocol, and next-command coverage.

When the release needs owner follow-up, run `npm run help:open-gate-handoff -- --name <handoff-name>` from the repository root to create dated evidence collection worksheets for each open owner.

When a release owner requests an exception for an unresolved gate, run `npm run help:exception-decision -- --name <exception-pass-name>` from the repository root before updating `HELP_RELEASE_EXCEPTIONS`.

Before promoting any gate or claiming completion, run `npm run help:gate-closure -- --json` from the repository root and confirm there are no invalid source records and no `not-closable` gates.

Do not mark a release candidate ready until every gate below has one of these outcomes:

- Pass with current evidence.
- Approved exception with owner, risk, and next review date.
- Blocked with owner and required next action.

## 2. Release Candidate Identity

```text
Release candidate:
Branch:
Commit:
Frontend build:
Backend build:
Android artifact:
Production frontend URL:
Production backend URL:
Reviewer:
Review date:
Evidence folder:
Cleanup owner:
```

## 3. Local Automated Gates

### automated-help-registry

- Owner: Engineering
- Status source: `verified-local`
- Required evidence: `npm run test:help -- --runInBand`
- Protocol: `09-release-evidence-record.md`
- Reviewer action: confirm the command passed for this release candidate.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### frontend-production-build

- Owner: Engineering
- Status source: `verified-local`
- Required evidence: `npm run build`
- Protocol: `09-release-evidence-record.md`
- Reviewer action: confirm the build passed and record warnings separately from failures.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### support-backend-syntax

- Owner: Engineering
- Status source: `verified-local`
- Required evidence:
  - `node --check backend/controllers/supportController.js`
  - `node --check backend/routes/supportRoutes.js`
  - `node --check backend/models/SupportRequest.js`
- Protocol: `15-support-lifecycle-cleanup-protocol.md`
- Reviewer action: confirm support backend syntax checks passed when support code changed.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### help-goal-audit

- Owner: Program owner + Engineering
- Status source: derived from source files and release gates
- Required evidence: `npm run help:goal-audit`
- Protocol: `25-goal-completion-audit.md`
- Reviewer action: confirm the audit reports no source gaps, lists the same open gates as `npm run help:readiness`, and does not claim complete while any required gate is open.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### open-gate-owner-summary

- Owner: Program owner + release owners
- Status source: derived from `openReleaseReadinessGates`
- Required evidence: `npm run help:open-gate-owners -- --json`
- Protocol: `23-release-readiness-gate-protocol.md`
- Reviewer action: confirm every open gate is grouped by owner with evidence, blocker, protocol, release impact, and unresolved exception status before assigning follow-up.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### open-gate-owner-handoff

- Owner: Program owner + release owners
- Status source: generated from `openReleaseReadinessGates`
- Required evidence: `npm run help:open-gate-handoff -- --name <handoff-name>`
- Protocol: `23-release-readiness-gate-protocol.md`
- Reviewer action: confirm the handoff packet exists for the release candidate and every open owner has a worksheet for evidence links, command output, blocker decisions, and final owner result.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### coverage-approval-packet

- Owner: Program owner + product owners
- Status source: generated from planning documents and release gates
- Required evidence: `npm run help:coverage-approval -- --name <coverage-pass-name>`
- Protocol: `02-coverage-matrix.md`
- Reviewer action: confirm the packet approves or requests changes to the application audit, coverage matrix, route registry, information architecture, and completion boundary without claiming external gates are closed.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### release-exception-audit

- Owner: Program owner + Engineering
- Status source: derived from `HELP_RELEASE_EXCEPTIONS`
- Required evidence: `npm run help:exceptions`
- Protocol: `26-release-exception-register.md`
- Reviewer action: confirm any approved exception is valid, unexpired, scoped to the current release claim, and linked from the release evidence record. If no exception is approved, confirm open gates still require evidence.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### gate-closure-readiness

- Owner: Program owner + release owners
- Status source: derived from `HELP_RELEASE_READINESS_GATES` and `HELP_RELEASE_EXCEPTIONS`
- Required evidence: `npm run help:gate-closure -- --json`
- Protocol: `23-release-readiness-gate-protocol.md`
- Reviewer action: confirm no source gate has an invalid record and no gate remains `not-closable` before any source promotion or completion claim.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### release-evidence-record-audit

- Owner: Program owner + release owners
- Status source: `09-release-evidence-record.md` plus `HELP_RELEASE_READINESS_GATES`
- Required evidence: `npm run help:release-record-audit -- --json`
- Protocol: `09-release-evidence-record.md`
- Reviewer action: confirm no placeholders, pending rows, missing command coverage, missing artifact folders, missing open gate ids, or missing completion-boundary text remain before treating the record as final.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### release-exception-decision-packet

- Owner: Program owner + risk approvers
- Status source: generated from `openGatesWithoutApprovedExceptions`
- Required evidence: `npm run help:exception-decision -- --name <exception-pass-name>`
- Protocol: `26-release-exception-register.md`
- Reviewer action: confirm every requested exception decision includes owner, scope, risk, evidence, approval decision, expiration, decision record, and next review before any source exception is added.
- Result: pass / exception / blocked
- Evidence:
- Notes:

## 4. Public Web Gates

### public-web-help-policy-safety

- Owner: QA
- Status source: `verified-local`
- Required evidence:
  - `npm run help:public-routes`
  - desktop and mobile public-route browser verification
- Protocol: `09-release-evidence-record.md`
- Reviewer action: verify Help, policy, safety, contact, report, appeal, and footer routes on the current build.
- Result: pass / exception / blocked
- Evidence:
- Notes:

## 5. Android Gates

### android-debug-packaging-emulator

- Owner: Mobile
- Status source: `verified-local`
- Required evidence:
  - `npx cap sync android`
  - `gradlew assembleDebug`
  - APK signature verification
  - Emulator WebView route checks
- Protocol: `16-android-oauth-permissions-verification-protocol.md`
- Reviewer action: confirm the debug APK packages current web assets and emulator smoke checks pass.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### physical-android-device

- Owner: Mobile + QA
- Status source: `pending-external`
- Required evidence:
  - `npm run help:android-readiness`
  - `npm run help:android-device-evidence`
  - `npm run help:android-evidence -- --name <android-pass-name> --dry-run`
  - `npm run help:android-worksheet -- --name <android-pass-name> --dry-run`
  - Android evidence packet path and final decision
  - physical phone install, start route, back navigation, seller/dashboard back path, order/help back path, clear-storage behavior, and add-product local-save behavior
- Protocol: `16-android-oauth-permissions-verification-protocol.md`
- Reviewer action: install the current APK or internal-test build on a real Android phone, run the device evidence command, and record device model, Android version, APK identity, route results, and screenshots or clips.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### android-oauth-provider-return

- Owner: Mobile + auth
- Status source: `pending-external`
- Required evidence:
  - `npm run help:android-readiness`
  - `npm run help:android-device-evidence`
  - `npm run help:android-evidence -- --name <android-pass-name> --dry-run`
  - `npm run help:android-worksheet -- --name <android-pass-name> --dry-run`
  - Android evidence packet path and final decision
  - provider start URL, redirect URI, installed app or browser handoff, callback domain, final app state, and error text if failure occurs
- Protocol: `16-android-oauth-permissions-verification-protocol.md`
- Reviewer action: test Google, Facebook, X/Twitter, and LinkedIn on a physical phone with deployed frontend and backend URLs.
- Result: pass / exception / blocked
- Evidence:
- Notes:

### android-permissions-camera-microphone

- Owner: Mobile + seller QA + chat QA
- Status source: `pending-external`
- Required evidence:
  - `npm run help:android-readiness`
  - `npm run help:android-device-evidence`
  - `npm run help:android-evidence -- --name <android-pass-name> --dry-run`
  - `npm run help:android-worksheet -- --name <android-pass-name> --dry-run`
  - Android evidence packet path and final decision
  - camera allow and deny path, microphone allow and deny path, file/photo handling where available, and Help recovery route
- Protocol: `16-android-oauth-permissions-verification-protocol.md`
- Reviewer action: test runtime permission prompts on a physical Android phone and confirm denied-permission recovery is understandable.
- Result: pass / exception / blocked
- Evidence:
- Notes:

## 6. Accessibility Gates

### manual-screen-reader-verification

- Owner: Accessibility + mobile
- Status source: `pending-external`
- Required evidence:
  - `npm run help:accessibility-readiness`
  - `npm run help:accessibility-environment`
  - `npm run help:accessibility-verification -- --name <accessibility-pass-name> --dry-run`
  - `npm run help:external-worksheet -- --name <external-pass-name> --dry-run`
  - accessibility verification packet path and final decision
  - environment identity, NVDA desktop evidence, TalkBack physical-device evidence, focus restoration notes, text zoom checks, and reduced-motion checks
- Protocol: `14-accessibility-verification-protocol.md`
- Reviewer action: generate or update the accessibility verification packet, capture environment identity, then run manual assistive-technology checks on the current release candidate.
- Result: pass / exception / blocked
- Evidence:
- Notes:

## 7. Support Operations Gates

### live-support-report-appeal-lifecycle

- Owner: Support operations + Safety
- Status source: `pending-external`
- Required evidence:
  - `npm run help:support-readiness`
  - `npm run help:support-cleanup`
  - `npm run help:support-lifecycle -- --name <support-pass-name> --dry-run`
  - `npm run help:external-worksheet -- --name <external-pass-name> --dry-run`
  - support lifecycle packet path and final decision
  - support reference, report reference, appeal reference, admin queue evidence, metrics evidence, assignment/status/priority/note evidence, dry-run cleanup audit evidence, and cleanup evidence
- Protocol: `15-support-lifecycle-cleanup-protocol.md`
- Reviewer action: generate or update the support lifecycle packet, approve cleanup before creating production-like records, run the cleanup audit before and after testing, then verify public intake and admin lifecycle.
- Result: pass / exception / blocked
- Evidence:
- Notes:

## 8. Policy Gates

### policy-specialist-approvals

- Owner: Program owner + specialist reviewers
- Status source: `blocked-approval`
- Required evidence:
  - `npm run help:policy-readiness`
  - `npm run help:policy-approval -- --name <policy-pass-name> --dry-run`
  - `npm run help:external-worksheet -- --name <external-pass-name> --dry-run`
  - approval packet, approval tracker entries, resolved decision register items, effective dates, product behavior evidence, and specialist approvals
- Protocol: `22-policy-publication-safety-protocol.md`
- Reviewer action: generate the policy approval packet and do not publish binding policy text until every blocker is resolved or scoped with an approved exception.
- Result: pass / exception / blocked
- Evidence:
- Notes:

## 9. Visual Guidance Gates

### p0-visual-evidence-capture

- Owner: QA + feature owners
- Status source: `blocked-production`
- Required evidence:
  - `npm run help:visual-readiness`
  - `npm run help:visual-evidence -- --name <visual-pass-name> --dry-run`
  - `npm run help:visual-worksheet -- --name <visual-pass-name> --dry-run`
  - visual evidence packet path and final decision
  - visual evidence notes for every unblocked P0 visual requirement
- Protocol: `21-visual-evidence-capture-protocol.md`
- Reviewer action: generate or update the visual evidence packet, then capture screenshots, clips, diagrams, alt text, transcripts, privacy review, and accessibility text for unblocked P0 visual requirements.
- Result: pass / exception / blocked
- Evidence:
- Notes:

## 10. Analytics and Operations Gates

### analytics-consent-operations

- Owner: Privacy + analytics + operations
- Status source: `blocked-approval`
- Required evidence:
  - `npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run`
  - `npm run help:analytics-readiness`
  - `npm run help:external-worksheet -- --name <external-pass-name> --dry-run`
  - analytics approval packet path and final decision
  - consent decision, retention rule, backend storage rule, access control, deletion/export handling, owner cadence, and monitoring evidence
- Protocol: `19-search-feedback-operations-protocol.md`
- Reviewer action: generate or update the analytics approval packet and keep Help feedback local-only until privacy and analytics decisions are approved.
- Result: pass / exception / blocked
- Evidence:
- Notes:

## 11. Final Decision

```text
Approved for web release: yes/no
Approved for Android internal testing: yes/no
Approved for Play Store production: yes/no
Approved to publish binding policies: yes/no
Approved to claim Help Center goal complete: yes/no

Open blockers:
Approved exceptions:
Next review date:
Decision owner:
```

## 12. Completion Rule

Do not mark the overall Help Center goal complete while any required gate remains pending, blocked, or missing current evidence.
