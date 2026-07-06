# Help Center Operations Runbook

Last updated: June 26, 2026

## 1. Purpose

This runbook keeps the Help Center, footer, policy pages, contextual help, and support queue from becoming one-time launch work. It defines who owns the system, what signals must be watched, when content must be reviewed, and what evidence is needed before a web or Android release can claim the documentation system is ready.

## 2. Operational Surfaces

| Surface | Primary owner | Backup owner | Review trigger |
|---|---|---|---|
| Help Center articles | Editorial owner | Product owner | Feature behavior changes, broken links, search failures, six-month review |
| Policy directory | Legal reviewer | Program owner | Product, privacy, payment, marketplace, AI, safety, or account changes |
| Policy publication state | Legal reviewer | Product owner | Draft promotion, effective-date change, blocker resolution, footer legal-link change, or policy route change |
| Safety Center | Safety owner | Legal reviewer | New report type, appeal rule, enforcement rule, abuse pattern, or app-store review issue |
| Footer navigation | Product owner | Engineering owner | New public route, renamed category, legal page change, mobile layout change |
| Contextual help links | Feature owner | Engineering owner | Any UX change to seller, order, checkout, chat, privacy, login, or support workflows |
| Help search and feedback | Editorial owner | Product owner | Repeated zero-result searches, low helpfulness, search ranking regression, or privacy/consent change |
| Help article experience | Editorial owner | Product owner | Article template, related-guide ranking, escalation path, support category, report category, appeal category, or mobile layout change |
| Visual evidence | QA owner | Feature owner | P0/P1 visual requirement, UI label change, mobile behavior change, permission prompt change, or replacement trigger |
| Release readiness gates | Program owner | Engineering owner | Every release candidate, external evidence update, approval decision, or production-readiness claim |
| Support queue | Support operations owner | Program owner | Daily triage, incident review, stale case alert, urgent case alert |
| Android Help behavior | Mobile owner | Engineering owner | Every APK build, OAuth change, permission change, WebView navigation change |
| Accessibility evidence | Accessibility reviewer | Product owner | New page template, modal/dialog change, mobile navigation change, release gate |

## 3. Support Queue Signals

The admin support dashboard reads aggregate queue health from `GET /api/support/admin/metrics`.

| Signal | Meaning | Action |
|---|---|---|
| `activeTotal` | Open or reviewing requests | Track workload and staffing |
| `urgentActive` | Open or reviewing urgent requests | Same-day owner review is required |
| `highOrUrgentActive` | Active high-priority or urgent requests | Review during daily triage |
| `staleActive` | Active requests older than 72 hours | Escalate owner and add admin note |
| `unassignedActive` | Active requests without an assigned admin | Assign before the end of the triage pass |
| `createdLast24h` | New support/report/appeal intake | Compare against normal volume |
| `waitingForUser` | Requests paused for user response | Review weekly and close only under the approved policy |
| `oldestActive` | Oldest open or reviewing case | Use as a first-check escalation target |

## 4. Alert Rules

| Condition | Severity | Required response |
|---|---|---|
| `urgentActive > 0` | P0 | Safety/support owner reviews the case the same day and records an admin note |
| `staleActive > 0` | P1 | Program owner checks why the case exceeded 72 hours and assigns an owner |
| `unassignedActive > 0` | P1 | Triage owner assigns each active case before ending the daily review |
| `createdLast24h` is meaningfully above normal | P1 | Check for incident, broken workflow, spam, or confusing guidance |
| `waitingForUser` grows for two reviews | P2 | Confirm follow-up language and closure rules are approved |
| Search failures or repeated support questions point to one task | P2 | Create or update the relevant guide and contextual link |
| Article feedback shows repeated not-helpful votes after analytics approval | P2 | Review the article for missing steps, stale visuals, wrong policy, or broken product behavior |

## 5. Review Cadence

| Cadence | Required work |
|---|---|
| Daily | Review support metrics, assign unowned active cases, handle urgent and stale cases |
| Weekly | Review search failures, broken links, repeated support categories, report volume, and unresolved waiting-for-user items |
| Monthly | Review Help article freshness, policy-draft status, footer taxonomy, and high-volume support topics |
| Every release | Run Help tests, production build, Android packaging when mobile is affected, and documentation-impact review |
| Every app-store submission | Verify Android OAuth return, permissions, privacy disclosures, support contact path, and app version guidance |
| Every material policy change | Record owner, approval, effective date, user notice need, and related product behavior verification |

## 6. Release Evidence Checklist

Before a release claims the Help Center system is ready, collect current evidence for:

- `npm run test:help -- --runInBand`
- `npm run build`
- Support, report, and appeal backend syntax checks.
- Public Help, policy, safety, contact, report, and appeal route rendering.
- Footer links on desktop and mobile.
- Search exact match, synonym, and zero-result behavior.
- Critical search signals, local article feedback, and privacy gates using `19-search-feedback-operations-protocol.md`.
- Article facts, escalation paths, related guide ranking, and mobile article reading checks using `20-article-experience-quality-protocol.md`.
- Structured visual requirements, capture evidence, privacy review, accessibility text, and replacement checks using `21-visual-evidence-capture-protocol.md`.
- Contextual Help links from seller, buyer, order, checkout, chat, login, and privacy surfaces.
- Android WebView start route, Help navigation, Android back behavior, OAuth return, and permission prompts.
- Admin support queue load, metrics load, assignment, status update, priority update, and notes save.
- Manual screen-reader pass with NVDA and TalkBack for public Help and support forms.
- Evidence that production-like test records were removed or tagged with an approved cleanup method.
- Policy publication states, approval gates, blocking decisions, and draft labels using `22-policy-publication-safety-protocol.md`.
- Release gate registry status, open blockers, owners, and release impact using `23-release-readiness-gate-protocol.md`.

Record the current release evidence in `09-release-evidence-record.md`. A release can use a copied, dated version of that record so the permanent planning pack stays clean while each candidate has its own proof.

Use `15-support-lifecycle-cleanup-protocol.md` before submitting any live or production-like support, report, or appeal test records.

## 7. Data Handling Rules

- Do not place passwords, payment credentials, private message text, API keys, or sensitive report details in screenshots, analytics labels, filenames, or public documentation.
- Support metrics must remain aggregate unless an authenticated admin is reviewing a specific request.
- Production support/report/appeal tests require an agreed cleanup plan before submission.
- Draft policies must not be presented as effective merely because their routes exist.
- Any analytics or helpful-vote collection must follow the privacy and consent decision register before launch.
- Current Help article feedback remains local-only until approved production analytics work is shipped.

## 8. Documentation Change Trigger

Every product change that touches a user workflow must answer:

```text
Documentation impact: none / update / new article / policy review
Affected audience:
Affected platforms:
Behavior or limitation changed:
Contextual help changed:
Support or report category changed:
Policy owner notified:
Release evidence required:
```

The release is not complete if a required documentation update, policy review, support-path change, or Android-specific instruction is unresolved.

Use `18-content-ownership-review-protocol.md` when assigning or reviewing Help article ownership and review triggers.

Use `19-search-feedback-operations-protocol.md` when changing Help search ranking, critical query signals, zero-result behavior, article feedback, or analytics collection.

Use `20-article-experience-quality-protocol.md` when changing article layout, guide details, related-guide ranking, escalation routing, or article-level mobile behavior.

Use `21-visual-evidence-capture-protocol.md` when adding, replacing, approving, or blocking a Help screenshot, diagram, clip, or workflow-strip requirement.

Use `22-policy-publication-safety-protocol.md` when changing a policy state, policy route, effective date, footer policy link, approval blocker, or draft/published label.

Use `23-release-readiness-gate-protocol.md` before claiming the Help Center, Android app, support operations, policy system, visual guidance, accessibility, or analytics governance is release-ready.
