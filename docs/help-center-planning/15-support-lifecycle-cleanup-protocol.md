# Support Lifecycle and Cleanup Protocol

Last updated: June 26, 2026

## 1. Purpose

This protocol defines how Lekhon handles public support requests, safety reports, appeals, admin triage, metrics, testing, and cleanup evidence.

It exists because support/report/appeal forms are live operational surfaces. They create records, send admin notifications, may contain sensitive safety or marketplace information, and can affect user trust if test data is mixed with real user records.

## 2. Current Implemented Lifecycle

| Stage | Current implementation | Evidence source |
|---|---|---|
| Intake routes | `/contact`, `/report`, and `/appeals` render the shared support form | `redirect/src/pages/SupportRequest.jsx` |
| Request types | `support`, `report`, and `appeal` are accepted | `backend/controllers/supportController.js` |
| Categories | Each mode has a separate category list | `redirect/src/pages/SupportRequest.jsx` |
| Optional auth | Public users can submit; authenticated users attach user ID and username | `backend/routes/supportRoutes.js` |
| Validation | Type, category, email, subject, and description are validated | `backend/controllers/supportController.js` |
| Reference number | Successful submission returns `LEK-YYYYMMDD-...` | `backend/controllers/supportController.js` |
| Notification | Admin notification email is attempted after database creation | `backend/controllers/supportController.js` |
| User success state | User sees a success message and reference number | `redirect/src/pages/SupportRequest.jsx` |
| Admin queue | Admin/co-admin can load request list; admin can update request | `backend/routes/supportRoutes.js`, `redirect/src/components/AdminSupportRequests.jsx` |
| Metrics | Admin/co-admin can load active, urgent, stale, unassigned, and aggregate metrics | `backend/controllers/supportController.js` |
| Assignment | Admin can assign to self or unassign | `backend/controllers/supportController.js` |
| Status | `open`, `reviewing`, `waiting_for_user`, `resolved`, and `closed` | `backend/models/SupportRequest.js` |
| Priority | `normal`, `high`, and `urgent` | `backend/models/SupportRequest.js` |
| Admin notes | Admin-only notes are stored separately from public request text | `backend/models/SupportRequest.js` |

## 3. Request Types and Categories

| Type | Public route | Current category examples | Intended use |
|---|---|---|---|
| `support` | `/contact` | Account and sign-in, Publishing, Marketplace order or payment, Seller account or payout, Android app, Privacy request | General help and account/product support |
| `report` | `/report` | Harassment or threat, Impersonation, Spam or scam, Product or seller fraud, Child safety concern, Other illegal or unsafe activity | Safety, abuse, fraud, content, product, seller, review, and legal concerns |
| `appeal` | `/appeals` | Account warning, Account suspension, Content removal, Seller application rejection, Seller status revocation, Product action | User or seller request for review of an enforcement or marketplace decision |

Category wording must stay aligned with Help articles, Safety Center wording, footer labels, and policy approval decisions.

## 4. Priority Rules

Current automatic priority behavior:

- `urgent`: category includes child safety, threat, or illegal.
- `high`: request type is `report`, or category includes payment or fraud.
- `normal`: all other requests.

Release checks must confirm urgent and high-priority records appear correctly in admin metrics and queue filters. The priority rules are operational triage helpers, not final legal or safety classifications.

## 5. Admin Triage Rules

Daily triage should follow this order:

1. Review urgent active requests.
2. Review stale active requests older than 72 hours.
3. Assign unassigned active requests.
4. Check new requests from the last 24 hours.
5. Move records to `reviewing` when an owner starts investigation.
6. Move records to `waiting_for_user` only when a user response is required.
7. Move records to `resolved` when the operational action is complete.
8. Move records to `closed` only when approved closure criteria are met.

Admins must not place passwords, payment credentials, full private messages, API keys, legal identity documents, or unnecessary sensitive safety details in admin notes.

## 6. Production-Like Test Data Rule

Do not submit support/report/appeal records to a live or production-like backend unless all of the following are recorded first:

- Test owner.
- Test account or public email used.
- Route tested.
- Category used.
- Subject prefix.
- Expected reference number capture location.
- Admin owner who will triage the record.
- Cleanup method.
- Cleanup deadline.

Recommended subject prefix:

```text
QA-CLEANUP YYYY-MM-DD - <workflow>
```

If the cleanup method is not approved, use a local or seeded staging backend instead.

## 7. Cleanup Options

| Cleanup option | Use when | Requirements |
|---|---|---|
| Resolve and close | The record should remain as test evidence | Admin note must say it is test data and include release candidate |
| Database cleanup | The record must not remain in the environment | Requires database owner, query, backup/restore awareness, and confirmation |
| Tagged retention | The record is useful for ongoing QA | Subject or admin note must include release candidate and cleanup owner |
| Abandon submission | Cleanup is not approved | Do not submit live production-like test records |

There is no public self-service deletion endpoint for support records in the current implementation. Cleanup is an admin or database-owner responsibility.

## 8. Release Verification Script

Run `npm run help:external-worksheet -- --name <external-pass-name>` from the repository root before creating production-like support, report, or appeal records. Use `--dry-run` first to confirm the target path and open gate counts.

Run `npm run help:support-readiness` from the repository root to summarize the current source-level support routes, request types, categories, statuses, priorities, metrics, admin operations, and remaining live lifecycle evidence.

Run `npm run help:support-cleanup` from the repository root to dry-run the cleanup audit for records whose subject begins with `QA-CLEANUP`. Capture this output before and after support lifecycle testing.

Run `npm run help:support-lifecycle -- --name <support-pass-name>` from the repository root to generate a dated support lifecycle verification packet for public submissions, reference numbers, admin queue evidence, metrics, assignment, status, priority, admin notes, resolution, cleanup method, and final support operations decisions. Use `--dry-run` first to confirm the target path and current source counts.

The cleanup command is dry-run by default. Closing records requires `--execute --mode close --owner <owner>`. Database deletion requires `--execute --mode delete --confirm-delete-support-cleanup-records`.

For a release candidate, verify:

1. Submit a support request from `/contact` with a test category.
2. Submit a report from `/report` with a safety or fraud category.
3. Submit an appeal from `/appeals` with a decision reference.
4. Confirm each success state shows a reference number.
5. Confirm each record appears in the admin queue.
6. Confirm metrics reflect active, urgent/high, unassigned, and created-last-24h counts.
7. Assign one record to the admin.
8. Change status through `reviewing`, `waiting_for_user`, and `resolved`.
9. Change priority and confirm metrics/list refresh.
10. Add admin notes without sensitive details.
11. Run the cleanup audit in dry-run mode and confirm it matches only intended `QA-CLEANUP` records.
12. Complete the approved cleanup method.
13. Run the cleanup audit again and record final cleanup evidence in `09-release-evidence-record.md`.

## 9. Failure Handling

| Failure | Required action |
|---|---|
| Public form validation fails incorrectly | Block release until validation is corrected or documented |
| Database record is created but email notification fails | Record as operational risk; admin queue must still show the record |
| Reference number is missing | Block release for support/report/appeal workflows |
| Admin queue does not load | Block release for support operations |
| Metrics do not load | Do not block public Help launch alone, but block operations-readiness claim |
| Admin cannot update status or priority | Block support operations release |
| Cleanup audit matches unexpected records | Do not execute cleanup; narrow the prefix, type, status, or release-candidate filter |
| Cleanup cannot be completed | Do not create more live test records; assign database owner |

## 10. Evidence Template

```markdown
## Support lifecycle evidence

Release:
Environment:
Backend URL:
Frontend URL:
Tester:
Date:

### Submissions

- Support reference:
- Report reference:
- Appeal reference:

### Admin queue

- Queue loaded:
- Metrics loaded:
- Assignment checked:
- Status update checked:
- Priority update checked:
- Admin note checked:

### Cleanup

- Dry-run command:
- Dry-run matched records:
- Method:
- Owner:
- Completed at:
- Evidence:

### Issues

- Issue:
- Severity:
- Owner:
- Release decision:
```

## 11. Release Rule

The Help Center support system is not release-complete if:

- Contact, report, or appeal submissions fail without clear user guidance.
- A successful submission does not return a reference number.
- Admins cannot find, assign, triage, or update records.
- Urgent, stale, or unassigned metrics are unavailable but the release claims support operations are ready.
- Production-like test records are created without an approved cleanup method.
- Report or appeal policy text promises response timelines or outcomes that are not approved.
