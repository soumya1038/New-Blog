# Help Center Release Evidence Record

Last updated: June 28, 2026

## 1. Purpose

Use this record before any web, Android, or future iOS release that changes Lekhon Help Center, policies, footer navigation, contextual help, support/report/appeal flows, marketplace guidance, or mobile behavior.

The release is not ready until every required row has current evidence, an owner, and a pass/exception decision. Evidence must come from the current build or production-like environment, not from memory of an earlier test.

Source-owned release gates are tracked in `redirect/src/content/releaseReadiness.js` and governed by `23-release-readiness-gate-protocol.md`. The release evidence record and release gate registry must agree before production readiness can be claimed.

`RELEASE_CANDIDATE_CHECKLIST` is derived from the source gate registry. Use `24-release-candidate-execution-checklist.md` as the reviewer working copy, then copy final evidence links and decisions into this record.

Run `npm run help:release-pass-checklist -- --name <release-pass-name>` from the repository root to generate a dated command checklist under `docs/help-center-planning/release-pass-checklists/`. Use it to keep every generated evidence artifact on the same release name and date.

Run `npm run help:release-candidate -- --name <release-candidate-name>` from the repository root to generate a dated working evidence file under `docs/help-center-planning/release-candidates/`. Use `--dry-run` first when checking the target path or gate counts.

Run `npm run help:release-evidence-binder -- --name <binder-name>` from the repository root to generate a dated master evidence index under `docs/help-center-planning/release-evidence-binders/`. Use `--dry-run` first to confirm packet coverage, open gates, and unresolved gate counts.

Run `npm run help:release-record-audit -- --json` from the repository root before treating this record as final. It checks `09-release-evidence-record.md` for `TBD`, pending rows, required release commands, generated artifact folders, current open gate ids, and completion-blocking text.

Run `npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD>` from the repository root after generating evidence packets to confirm every expected packet exists, every existing packet is linked from this release evidence record, and unresolved open gates are still visible.

The release evidence status and release record audit commands expect evidence artifacts to be generated under `docs/help-center-planning/release-pass-checklists/`, `docs/help-center-planning/release-evidence-binders/`, `docs/help-center-planning/release-candidates/`, `docs/help-center-planning/coverage-approvals/`, `docs/help-center-planning/open-gate-owner-handoffs/`, `docs/help-center-planning/release-exception-decisions/`, `docs/help-center-planning/android-evidence/`, `docs/help-center-planning/android-verification/`, `docs/help-center-planning/accessibility-verification/`, `docs/help-center-planning/external-verification/`, `docs/help-center-planning/support-lifecycle/`, `docs/help-center-planning/policy-approvals/`, `docs/help-center-planning/visual-evidence-packets/`, `docs/help-center-planning/visual-evidence/`, and `docs/help-center-planning/analytics-approvals/`.

Run `npm run help:readiness` from the repository root to print the current release gate counts, open gate ids, local preparation commands, worksheet commands, owners, blockers, and completion rule without creating any files.

Run `npm run help:open-gate-owners` from the repository root to group every open release gate by owner, required evidence, command hints, blockers, protocols, release impact, and unresolved exception status before assigning release follow-up.

Run `npm run help:open-gate-handoff -- --name <handoff-name>` from the repository root to create a dated owner evidence handoff packet under `docs/help-center-planning/open-gate-owner-handoffs/`. Use it when assigning evidence collection to mobile, accessibility, support, policy, visual, analytics, or release owners.

Run `npm run help:coverage-approval -- --name <coverage-pass-name>` from the repository root to create a dated Help Coverage Approval Packet under `docs/help-center-planning/coverage-approvals/`. Use it to record application-audit and coverage-matrix signoff before claiming the coverage plan is approved.

Run `npm run help:exceptions` from the repository root to print source-owned release exception counts, validation results, open gates without valid approved exceptions, and the exception completion rule.

Run `npm run help:gate-closure` from the repository root to print each release gate's closure state, source-record problems, approved-exception readiness, blockers, evidence commands, and next actions before promoting any gate.

Run `npm run help:exception-decision -- --name <exception-pass-name>` from the repository root to create a dated exception decision packet under `docs/help-center-planning/release-exception-decisions/` when an open gate needs a formal approve, reject, or defer decision instead of immediate evidence.

Run `npm run help:goal-audit` from the repository root to map the full Help Center objective to current source evidence, controlling release gates, open blockers, and the completion decision.

Run `npm run help:policy-readiness` from the repository root to print current draft policy blockers, decision statuses, approval tracker rows, required reviewers, and the binding-publication completion rule.

Run `npm run help:policy-approval -- --name <policy-pass-name>` from the repository root when collecting specialist policy approvals, product-behavior verification, effective dates, and binding-publication decisions. Use `--dry-run` first.

Run `npm run help:support-readiness` from the repository root to print current support/report/appeal source readiness, admin operation checks, metrics coverage, and remaining live lifecycle evidence.

Run `npm run help:support-cleanup` from the repository root before and after support lifecycle testing to dry-run the cleanup audit for `QA-CLEANUP` support/report/appeal records.

Run `npm run help:support-lifecycle -- --name <support-pass-name>` from the repository root to create a dated support lifecycle verification packet for public submissions, admin queue checks, metrics, assignment, status, priority, notes, resolution, cleanup, and final support operations decisions.

Run `npm run help:visual-readiness` from the repository root to print current visual requirement counts, open P0 blockers, owners, source checks, and production visual-evidence blockers.

Run `npm run help:visual-evidence -- --name <visual-pass-name>` from the repository root to create a dated P0 visual evidence packet for screenshots, clips, diagrams, privacy review, accessibility text, replacement-trigger review, owner sign-off, and final visual release decisions.

Run `npm run help:accessibility-readiness` from the repository root to print current source-level accessibility affordances and the remaining keyboard, NVDA, TalkBack, text zoom, contrast, and reduced-motion evidence.

Run `npm run help:accessibility-environment` from the repository root before manual keyboard, NVDA, and TalkBack testing to record OS, browser, NVDA, adb, device, and TalkBack environment identity.

Run `npm run help:accessibility-verification -- --name <accessibility-pass-name>` from the repository root to create a dated manual accessibility verification packet for keyboard, NVDA, TalkBack, text zoom, contrast, focus/back behavior, reduced-motion, environment identity, and final manual accessibility decisions.

Run `npm run help:analytics-readiness` from the repository root to print current Help search, local feedback, privacy-gate, decision-register, and analytics-operations blockers.

Run `npm run help:analytics-approval -- --name <analytics-pass-name>` from the repository root to create a dated analytics approval packet for privacy, analytics, operations, consent, retention, storage, access, deletion/export, cadence, monitoring, and final production analytics decisions.

Run `npm run help:android-readiness` from the repository root to print current Capacitor configuration, Android manifest, native routing, OAuth callback, Android Help article, release gate, and remaining physical-device evidence status.

Run `npm run help:android-device-evidence` from the repository root after connecting the physical Android phone to record adb, device identity, installed package, version, target SDK, and runtime permission snapshot evidence.

Run `npm run help:android-evidence -- --name <android-pass-name>` from the repository root to create a dated Android evidence packet for device/package evidence, install, navigation, OAuth provider return, permissions, TalkBack, artifact identity, and final Android decisions.

Run `npm run help:external-worksheet -- --name <external-pass-name>` from the repository root when collecting manual accessibility, support lifecycle, policy approval, or analytics/privacy operations evidence for the release candidate.

## 2. Release Identity

| Field | Value |
|---|---|
| Release candidate | TBD |
| Branch or commit | TBD |
| Frontend build | TBD |
| Backend build | TBD |
| Android artifact | TBD |
| Reviewer | TBD |
| Review date | TBD |
| Production backend URL | TBD |
| Production frontend URL | TBD |
| Test-data cleanup owner | TBD |

## 3. Required Automated Gates

| Gate | Command or evidence | Owner | Status | Notes |
|---|---|---|---|---|
| Help content registry | `npm run test:help -- --runInBand` from `redirect` | Engineering | Pending | Must pass when Help, policy, footer, or contextual links changed |
| Public Help route source smoke | `npm run help:public-routes` from repository root or `redirect` | QA + Engineering | Pending | Verifies public route registration, footer visibility, page affordances, and footer targets |
| Frontend production build | `npm run build` from `redirect` | Engineering | Pending | Record warnings separately from failures |
| Support backend syntax | `node --check backend/controllers/supportController.js` | Engineering | Pending | Required when support routes or models changed |
| Support routes syntax | `node --check backend/routes/supportRoutes.js` | Engineering | Pending | Required when support endpoints changed |
| Support model syntax | `node --check backend/models/SupportRequest.js` | Engineering | Pending | Required when support persistence changed |
| Release exception audit | `npm run help:exceptions` from repository root | Program owner + Engineering | Pending | Must pass before any approved exception is used in a release decision |
| Gate closure readiness | `npm run help:gate-closure -- --json` from repository root | Program owner + release owners | Pending | Must report no invalid source records and no not-closable gates before any completion claim |
| Release exception decision packet | `npm run help:exception-decision -- --name <exception-pass-name>` from repository root | Program owner + risk approvers | Pending | Required before adding any approved exception to source; must record scope, risk, evidence, expiration, decision record, and next review |
| Help goal audit | `npm run help:goal-audit` from repository root | Program owner + Engineering | Pending | Must report no source gaps and list current open gates before any completion claim |
| Open gate owner summary | `npm run help:open-gate-owners -- --json` from repository root | Program owner + release owners | Pending | Must group every open gate by owner, evidence, blocker, protocol, release impact, and unresolved exception state before assigning follow-up |
| Open gate owner handoff | `npm run help:open-gate-handoff -- --name <handoff-name>` from repository root | Program owner + release owners | Pending | Must create the dated owner evidence worksheets used for external gate follow-up |
| Coverage approval packet | `npm run help:coverage-approval -- --name <coverage-pass-name>` from repository root | Program owner + product owners | Pending | Must approve or request changes to the application audit, coverage matrix, route registry, and completion boundary without closing external gates |
| Release pass checklist | `npm run help:release-pass-checklist -- --name <release-pass-name>` from repository root | Program owner + release owners | Pending | Must list ordered source checks, dry runs, create commands, expected packet paths, and status validation |
| Release evidence binder | `npm run help:release-evidence-binder -- --name <binder-name>` from repository root | Program owner + release owners | Pending | Must index every generated evidence packet, packet owner, open gate, and final decision |
| Release evidence record audit | `npm run help:release-record-audit -- --json` from repository root | Program owner + release owners | Pending | Must report no placeholders, pending rows, missing command coverage, missing artifact folders, missing open gate ids, or missing completion-boundary text before completion claim |
| Release evidence status | `npm run help:release-evidence-status -- --name <release-pass-name> --date <YYYY-MM-DD>` from repository root | Program owner + release owners | Pending | Must show no missing packet files and no unlinked existing packet files before completion claim |
| Android sync | `npx cap sync android` from `redirect` | Mobile | Pending | Required when mobile bundle, permissions, or routes changed |
| Android debug build | `gradlew assembleDebug` from `redirect/android` with Android Studio JBR | Mobile | Pending | Debug APK only; production signing is separate |
| APK signature check | `apksigner verify --verbose <apk>` | Mobile | Pending | Record signing scheme and certificate type |

## 3A. Current Open Source Gate IDs

These ids come from `HELP_RELEASE_READINESS_GATES` and must stay visible until current evidence or an approved exception closes them:

- `physical-android-device`
- `android-oauth-provider-return`
- `android-permissions-camera-microphone`
- `manual-screen-reader-verification`
- `live-support-report-appeal-lifecycle`
- `policy-specialist-approvals`
- `p0-visual-evidence-capture`
- `analytics-consent-operations`

## 4. Public Web Verification

| Area | Evidence required | Owner | Status | Notes |
|---|---|---|---|---|
| Help Center index | `/help` renders with categories, search, and footer | QA | Pending | Desktop and mobile |
| Help articles | Critical guides render with breadcrumbs, actions, visuals, related guides, and platform labels | QA | Pending | Include OAuth, order, report, payout, add-product guides |
| Visual evidence packet | `npm run help:visual-evidence -- --name <visual-pass-name>` output and generated packet | QA + feature owners | Pending | Required before claiming P0 visual readiness |
| Visual evidence worksheet | `npm run help:visual-worksheet -- --name <visual-pass-name>` output and generated worksheet | QA + feature owners | Pending | Required when P0 evidence needs owner-by-owner capture before packet signoff |
| Search | Exact phrase, synonym, typo, and zero-result cases behave correctly | QA | Pending | Record test queries |
| Policy directory | Published and draft policies remain visually and semantically distinct | Legal + QA | Pending | Drafts must not appear effective |
| Safety Center | Report, appeal, contact, blocking, and urgent-safety routes are findable | Safety + QA | Pending | Use public, unauthenticated browser |
| Footer desktop | All columns and links are visible and route correctly | QA | Pending | Standard and wide desktop |
| Footer mobile | Accordions open, links route correctly, and no horizontal overflow appears | QA | Pending | 360 x 800 and 412 x 915 |
| Contextual help | Seller, buyer, checkout, chat, privacy, login, order, and admin surfaces link to the right guides | Product + QA | Pending | Preserve relevant references such as order ID or username |

## 5. Authenticated Workflow Verification

| Workflow | Evidence required | Owner | Status | Notes |
|---|---|---|---|---|
| Admin support queue | Queue loads with real or seeded records | Support ops | Pending | Avoid production-like records without cleanup |
| Admin metrics | Active, urgent, stale, unassigned, waiting, status, type, and priority counts load | Support ops | Pending | Compare visible queue with metrics |
| Assignment | Admin can assign or reassign a request | Support ops | Pending | Record admin role used |
| Status update | Admin can move a request through approved statuses | Support ops | Pending | Confirm user-facing meaning |
| Priority update | Admin can change priority and metrics refresh | Support ops | Pending | Urgent cases require same-day review |
| Admin notes | Notes save and remain admin-only | Support ops | Pending | Do not include sensitive details in screenshots |
| Support form | Contact-support submission creates a reference number | Support ops | Pending | Record cleanup method |
| Report form | Report submission creates a reference number and correct category | Safety | Pending | Use test content/user |
| Appeal form | Appeal submission creates a reference number and correct appeal type | Safety + legal | Pending | Use test account only |
| Support lifecycle packet | `npm run help:support-lifecycle -- --name <support-pass-name>` output and generated packet | Support ops + Safety | Pending | Use before creating production-like records |
| Cleanup audit | `npm run help:support-cleanup` dry-run captured before and after lifecycle testing | Support ops + Engineering | Pending | Must match only intended `QA-CLEANUP` records |

Use `15-support-lifecycle-cleanup-protocol.md` before creating production-like support, report, or appeal test records. Record the cleanup owner and method before submission.

## 6. Android Physical-Device Verification

| Area | Evidence required | Owner | Status | Notes |
|---|---|---|---|---|
| Install | APK or internal-test build installs on a real Android phone | Mobile | Pending | Record device model and Android version |
| Device/package evidence | `npm run help:android-device-evidence` output records the physical phone and installed Lekhon package | Mobile | Pending | Must use physical device unless clearly marked emulator rehearsal |
| Android evidence packet | `npm run help:android-evidence -- --name <android-pass-name>` output and generated packet | Mobile + QA | Pending | Required before Android gate completion claim |
| Android verification worksheet | `npm run help:android-worksheet -- --name <android-pass-name>` output and generated worksheet | Mobile + QA | Pending | Required when physical-device evidence needs step-by-step collection before packet signoff |
| Start route | App opens to the expected packaged route | Mobile | Pending | Confirm no failed-content screen |
| Android back | Back button navigates within Help, article, store, dashboard, order, and support flows before minimizing | Mobile + QA | Pending | Include marketplace and seller dashboard |
| OAuth Google | Continue with Google completes or returns a clear approved error | Mobile + auth | Pending | Record provider redirect URL used |
| OAuth Facebook | Continue with Facebook completes or returns a clear approved error | Mobile + auth | Pending | Confirm app/browser handoff behavior |
| OAuth X/Twitter | Continue with X/Twitter completes or returns a clear approved error | Mobile + auth | Pending | Confirm email fallback behavior |
| OAuth LinkedIn | Continue with LinkedIn completes or returns a clear approved error | Mobile + auth | Pending | Confirm callback handling |
| Camera permission | Add-product image flow requests permission and handles allow/deny | Mobile + seller QA | Pending | Required if camera feature is enabled |
| Microphone permission | Voice/call flow requests permission and handles allow/deny | Mobile + chat QA | Pending | Required if call/voice feature is enabled |
| Offline/local save | Add-product local save behavior matches documented limits | Mobile + seller QA | Pending | Include one-hour expiry rule if still implemented |
| Clear storage warning | User guidance explains data loss before clearing app storage/cache | Product + mobile | Pending | Verify Help article destination |

Use `16-android-oauth-permissions-verification-protocol.md` for detailed build, physical-device, OAuth, permission, TalkBack, and Android evidence capture.

## 7. Accessibility Verification

| Area | Evidence required | Owner | Status | Notes |
|---|---|---|---|---|
| Keyboard desktop | Public Help, policy, safety, and support forms work by keyboard | Accessibility | Pending | Include visible focus |
| Accessibility verification packet | `npm run help:accessibility-verification -- --name <accessibility-pass-name>` output and generated packet | Accessibility + mobile | Pending | Use with environment evidence and route pass |
| Accessibility environment | `npm run help:accessibility-environment` output records browser, NVDA, Android device, and TalkBack context | Accessibility + mobile | Pending | Does not replace manual route pass |
| NVDA desktop | Landmarks, headings, labels, errors, and dialogs are understandable | Accessibility | Pending | Record browser used |
| TalkBack Android | Help, footer accordions, support/report/appeal forms, OAuth handoff, and dialogs are usable | Accessibility + mobile | Pending | Real device required |
| Focus restoration | Back navigation and dialogs return focus predictably | Accessibility | Pending | Include cancel/confirm dialogs |
| Text zoom | 200% text zoom has no clipped controls or horizontal overflow | Accessibility | Pending | Public and authenticated surfaces |
| Reduced motion | Motion-sensitive users receive static or reduced alternatives | Accessibility | Pending | Include landing page and post-login animation |

Use `14-accessibility-verification-protocol.md` for the detailed route list, manual keyboard script, NVDA script, TalkBack script, text zoom checks, contrast checks, reduced-motion checks, and evidence template.

## 8. Policy Approval Evidence

| Policy area | Required evidence | Owner | Status | Notes |
|---|---|---|---|---|
| Terms and eligibility | Age/minor decision approved | Product + legal | Pending | Blocks binding Terms |
| Policy approval packet | Dated `npm run help:policy-approval` packet links source policies, blockers, reviewers, behavior checks, and final decisions | Program owner + specialist reviewers | Pending | Required before binding publication claim |
| Privacy and deletion | Data map, retention, deletion, export, processors approved | Privacy + legal | Pending | Blocks Privacy finalization |
| Community and safety | Report, moderation, appeal, escalation rules approved | Safety + legal | Pending | Blocks UGC compliance |
| Marketplace buyer terms | Product type responsibility, cancellation, returns, refunds, disputes approved | Commerce + legal | Pending | Blocks marketplace policy |
| Seller terms | Fees, holds, payout timing, fulfillment, revocation, appeals approved | Finance + commerce + legal | Pending | Blocks seller policy |
| Android payments | Play billing classification and permitted payment flow approved | Product + legal + mobile | Pending | Blocks Play Store release |
| AI usage | Provider processing, retention, ownership, safety, disclosure approved | Product + privacy + legal | Pending | Blocks AI policy |
| Copyright/IP | Notice, takedown, counter-notice, repeat-infringer process approved | Legal + safety | Pending | Blocks IP policy |
| Accessibility statement | Target standard, audit process, contact route approved | Accessibility + legal | Pending | Blocks public conformance claim |

## 9. Cleanup and Evidence Rules

- Use seeded or clearly tagged test accounts whenever possible.
- Do not submit production-like support/report/appeal records unless a cleanup owner and method are recorded first.
- Capture `npm run help:support-cleanup` before and after support lifecycle testing; do not execute close or delete mode unless the matched records are expected.
- Do not include private message text, payment data, access tokens, API keys, legal identity files, or sensitive report details in screenshots.
- Store screenshots and logs in a release-specific folder, then link the folder from this record.
- If a test cannot be run, mark it as an exception with owner, reason, risk, and next review date.
- If an exception is approved, record it in `HELP_RELEASE_EXCEPTIONS`, verify it with `npm run help:exceptions`, and link its decision record here.
- A local debug APK is not a Play Store production artifact.

## 10. Release Decision

| Decision | Owner | Date | Notes |
|---|---|---|---|
| Approved for web release | TBD | TBD | TBD |
| Approved for Android internal testing | TBD | TBD | TBD |
| Approved for Play Store production | TBD | TBD | TBD |
| Approved to publish binding policies | TBD | TBD | TBD |

The release must remain blocked if required evidence is missing, draft policies are still unapproved, production support paths are not functional, or Android app-store requirements are unresolved.

Do not mark the overall Help Center objective complete while any required release gate remains `pending-external`, `blocked-approval`, or `blocked-production`.

Do not treat the release evidence record as final while `npm run help:release-record-audit -- --json` reports placeholders, pending rows, missing command coverage, missing artifact folders, missing open gate ids, missing completion boundary text, or open gates without approved exceptions.
