# Release Readiness Gate Protocol

Status: Active for local source governance; external release gates remain open  
Last updated: June 28, 2026

## 1. Purpose

This protocol defines the final release-readiness gate model for the Lekhon Help Center program. It makes clear which gates are already verified locally and which gates still require external evidence, specialist approval, physical-device testing, production-like lifecycle testing, or operational decisions.

## 2. Source Registry

Release gate state is recorded in `redirect/src/content/releaseReadiness.js`.

The registry exports:

- `RELEASE_GATE_STATUSES`
- `RELEASE_GATE_AREAS`
- `HELP_RELEASE_READINESS_GATES`
- `HELP_RELEASE_EXCEPTIONS`
- `approvedReleaseReadinessExceptions`
- `openReleaseReadinessGates`
- `verifiedLocalReleaseReadinessGates`
- `openGatesWithoutApprovedExceptions`
- `RELEASE_CANDIDATE_CHECKLIST`

Run `npm run help:governance` from the repository root to verify that the planning pack, execution checklist, completion audit, public-route verifier, release-candidate generator, and source-owned gate registry still agree.

Run `npm run help:release-pass-checklist -- --name <release-pass-name>` to create a release-specific command checklist for source checks, evidence dry runs, generated packet files, expected paths, and status validation.

Run `npm run help:release-candidate -- --name <release-candidate-name>` to create a release-specific evidence worksheet generated from the current gate registry.

Run `npm run help:coverage-approval -- --name <coverage-pass-name>` to create a dated Help Coverage Approval Packet for application-audit and coverage-matrix signoff. The packet can approve coverage scope, but it cannot close any open external release gate by itself.

Run `npm run help:release-evidence-binder -- --name <binder-name>` to create a release-specific master evidence index for all generated packets, owners, open gates, packet paths, and final gate decisions.

Run `npm run help:release-record-audit -- --json` to verify that `09-release-evidence-record.md` has no placeholders, pending rows, missing command coverage, missing artifact folders, missing open gate ids, or missing completion-boundary text before it is treated as final.

Run `npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD>` after generating evidence packets to verify that required packet files exist, existing packet files are linked from `09-release-evidence-record.md`, and unresolved gates are still reported.

Run `npm run help:readiness` to print the current gate counts, open gate ids, local preparation commands, worksheet commands, owners, blockers, and completion rule without creating files.

Run `npm run help:open-gate-owners -- --json` to group open gates by owner, evidence needed, command hints, blockers, protocol, release impact, and unresolved exception status before assigning follow-up work.

Run `npm run help:open-gate-handoff -- --name <handoff-name>` to create a dated owner handoff packet with one evidence collection worksheet per open gate owner.

Run `npm run help:accessibility-environment` before manual accessibility testing to record OS, browser, NVDA, adb, physical-device, and TalkBack environment identity.

Run `npm run help:exceptions` to print source-owned release exception counts, validation results, open gates without valid approved exceptions, and the exception completion rule.

Run `npm run help:gate-closure` to print each gate's closure state before source promotion. A gate must not be treated as closed unless it is source-verified locally with current release evidence or has a valid approved exception with owner, risk, evidence, expiration, decision record, and next review.

Run `npm run help:exception-decision -- --name <exception-pass-name>` to create a dated exception decision packet before approving, rejecting, or deferring a release-gate exception.

Run `npm run help:goal-audit` to map the full Help Center objective to current source evidence, requirement status, controlling release gates, and the overall completion result.

Run `npm run help:policy-readiness` to print the current policy publication blockers, decision statuses, approval tracker rows, and binding-publication rule.

Run `npm run help:policy-approval -- --name <policy-pass-name>` to generate a dated policy approval packet for specialist review, blocker resolution, product-behavior evidence, effective dates, and final publication decisions.

Run `npm run help:support-readiness` to print the current support/report/appeal source readiness, admin operation checks, metrics coverage, and remaining live lifecycle evidence.

Run `npm run help:support-cleanup` before and after support lifecycle testing to dry-run the cleanup audit for `QA-CLEANUP` support/report/appeal records.

Run `npm run help:support-lifecycle -- --name <support-pass-name>` to generate a dated support lifecycle verification packet for public submissions, references, admin queue evidence, metrics, assignment, status, priority, notes, resolution, cleanup, and final support operations decisions.

Run `npm run help:accessibility-readiness` to print the current source-level accessibility affordances and the remaining keyboard, NVDA, TalkBack, text zoom, contrast, and reduced-motion evidence.

Run `npm run help:accessibility-verification -- --name <accessibility-pass-name>` to generate a dated manual accessibility verification packet for keyboard, NVDA, TalkBack, text zoom, contrast, focus/back behavior, reduced-motion, environment identity, and final manual accessibility decisions.

Run `npm run help:analytics-readiness` to print the current Help search, local feedback, privacy-gate, decision-register, and analytics-operations blockers.

Run `npm run help:analytics-approval -- --name <analytics-pass-name>` to generate a dated analytics approval packet for consent, retention, storage, access control, deletion/export, owner cadence, monitoring, D-031 approval, and the final production analytics decision.

Run `npm run help:visual-readiness` to print the current Help visual requirement counts, open P0 blockers, owners, source checks, and production visual-evidence blockers.

Run `npm run help:visual-evidence -- --name <visual-pass-name>` to generate a dated P0 visual evidence packet for screenshots, clips, diagrams, privacy review, accessibility text, replacement-trigger review, owner sign-off, and final visual release decisions.

Run `npm run help:android-readiness` to print the current Capacitor configuration, Android manifest, native routing, OAuth callback routes, Android Help article, Android release gate, and remaining physical-device evidence status.

Run `npm run help:android-device-evidence` after connecting a physical Android phone to capture adb, device identity, installed package, version, target SDK, and runtime permission snapshot evidence.

Run `npm run help:android-evidence -- --name <android-pass-name>` to generate a dated Android evidence packet for device/package evidence, install, navigation, OAuth provider return, permissions, TalkBack, artifact identity, and final Android decisions.

Run `npm run help:external-worksheet -- --name <external-pass-name>` when a release candidate needs manual accessibility, support lifecycle, policy approval, or analytics/privacy operations evidence.

Each gate must include:

- Stable `id`.
- `area`.
- `title`.
- `owner`.
- `status`.
- `evidence`.
- `protocol`.
- `releaseImpact`.
- `blockers` when status is not `verified-local`.

## 3. Gate Statuses

| Status | Meaning |
|---|---|
| `verified-local` | Current local checks or local browser/emulator evidence have passed |
| `pending-external` | Evidence must be gathered from a real device, live backend, assistive technology, provider console, or production-like environment |
| `blocked-approval` | A privacy, legal, finance, policy, analytics, or specialist decision is missing |
| `blocked-production` | The system can continue local work, but production readiness is blocked until evidence or decisions are complete |

## 4. Gate Areas

| Area | Examples |
|---|---|
| `automated` | Help tests, production build, backend syntax checks |
| `public-web` | Help, policy, safety, footer, support route rendering |
| `support-operations` | Support/report/appeal lifecycle, admin queue, metrics, cleanup |
| `android` | Physical install, WebView routes, OAuth, permissions, back navigation |
| `accessibility` | Keyboard, NVDA, TalkBack, text zoom, focus restoration |
| `policy` | Binding publication, approval tracker, decision register |
| `visual-guidance` | P0 screenshots, clips, diagrams, privacy review, alt text |
| `analytics-operations` | Consent, retention, monitoring cadence, owner assignment |

## 5. Currently Verified Local Gates

The registry may mark a gate `verified-local` only when current local evidence exists. Current local gates include:

- Help registry and source governance test.
- Frontend production build.
- Support backend syntax checks.
- Public web Help/policy/safety/footer source smoke verification with `npm run help:public-routes`.
- Android debug APK packaging and emulator runtime smoke test.

Local verification does not prove production release readiness when the gate requires physical devices, provider consoles, live backend records, screen readers, or specialist approval.

## 6. Open Release Gates

The Help Center program remains open while these gates are not verified:

- Physical Android device install, route, back-navigation, and local-save behavior.
- Android OAuth provider return for Google, Facebook, X/Twitter, and LinkedIn.
- Android camera, microphone, file, and denied-permission recovery.
- Manual NVDA and TalkBack verification.
- Live or production-like support, report, appeal, admin queue, metrics, and cleanup lifecycle.
- Legal, privacy, finance, safety, commerce, mobile, and accessibility policy approvals.
- P0 visual evidence capture and approval.
- Help analytics consent, retention, backend storage, access control, deletion/export, monitoring, and owner cadence.

## 7. Promotion Rules

A gate can move to `verified-local` only when:

1. The evidence was gathered from the current release candidate.
2. The evidence matches the protocol named on the gate.
3. The owner is recorded.
4. Any blockers have been resolved or removed with a documented exception.
5. The implementation status and release evidence record are updated.

A gate can move from `blocked-approval` only when the relevant decision register item, approval tracker item, or privacy/legal/finance/safety/mobile/accessibility decision is recorded.

An open gate can be treated as release-acceptable only when either current evidence satisfies the gate or `HELP_RELEASE_EXCEPTIONS` contains a valid, approved, unexpired exception with owner, risk, scope, evidence, decision record, expiration, and next review date. Draft, expired, rejected, or invalid exceptions do not satisfy a gate.

## 8. Release Evidence Relationship

`09-release-evidence-record.md` is the release evidence record.  
`24-release-candidate-execution-checklist.md` is the gate-by-gate reviewer execution checklist.  
`releaseReadiness.js` is the source-owned gate registry.  
`26-release-exception-register.md` records the exception model and current approved-exception state.  
`RELEASE_CANDIDATE_CHECKLIST` is derived from the gate registry so reviewers can see one checklist item per gate.
All three must agree before production readiness can be claimed.

When a release candidate is created:

1. Fill the execution checklist for the release candidate.
2. Copy evidence links and decisions into the release evidence record.
3. Run local automated gates.
4. Gather required external evidence.
5. Update gate statuses only after evidence exists.
6. Keep unresolved gates open with owner, blocker, and release impact.

## 9. Completion Rule

The full Help Center objective is not complete while any required gate remains `pending-external`, `blocked-approval`, or `blocked-production` without a valid approved exception.

Do not mark the Help Center program complete based only on passing local tests, a successful production build, emulator checks, draft policy pages, or an unapproved exception. Completion requires current evidence or a valid approved exception for every required gate and approval for every policy or operational claim that depends on specialist review.
