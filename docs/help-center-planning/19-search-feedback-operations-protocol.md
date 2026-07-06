# Search and Feedback Operations Protocol

Status: Active for local Help Center behavior; production analytics remain gated  
Last updated: June 27, 2026

## 1. Purpose

This protocol defines how Lekhon keeps Help Center search useful and how article feedback is reviewed without collecting sensitive data too early. It covers the search index, critical query checks, zero-result review, article helpfulness feedback, privacy limits, evidence, and release rules.

## 2. Current Implemented Behavior

- `/help` provides client-side search across article titles, summaries, categories, keywords, audiences, platforms, body sections, actions, notes, and warnings.
- The search box stores the current query in the `q` URL parameter so users and support can share the same result state.
- Search removes common filler words before scoring meaningful terms.
- Exact title, partial title, exact phrase, and term matches are weighted.
- Zero-result search shows recovery guidance and a Contact Support route.
- Help articles include a local helpful or not-helpful feedback control.
- Article feedback is stored only in device local storage with the article slug, selected value, and saved time.
- No Help search or feedback analytics are sent to a server until privacy, consent, retention, and ownership decisions are approved.

## 3. Owned Source Records

The source registry in `redirect/src/content/helpCenterContent.js` owns:

- `SEARCH_FILLER_WORDS`
- `HELP_SEARCH_REVIEW_SIGNALS`
- `searchHelpArticles`
- Article titles, summaries, keywords, categories, platforms, audiences, and body text used by search.

The article template in `redirect/src/pages/HelpArticle.jsx` owns:

- Local helpful or not-helpful selection.
- Per-article local storage key.
- Saved confirmation.
- Accessibility labels and pressed state.

The Help Center page in `redirect/src/pages/HelpCenter.jsx` owns:

- Search input label.
- URL query-state behavior.
- Search results rendering.
- Zero-result recovery language.
- Contact Support escalation.

## 4. Critical Query Set

`HELP_SEARCH_REVIEW_SIGNALS` must include the queries users are most likely to type when they are stuck. The active release-blocking set includes:

| Query | Expected guide |
|---|---|
| `redirect_uri is not allowed` | Sign in with Google, Facebook, X, or LinkedIn |
| `hacked account` | Secure an account you think was compromised |
| `report harassment threat` | Report abuse, fraud, or unsafe content |
| `appeal account suspension` | Appeal an enforcement or seller decision |
| `damaged item return` | Resolve an order, delivery, or return problem |
| `seller dashboard price change coupon` | Manage your seller dashboard on mobile and web |
| `seller payout` | Understand seller earnings and payouts |
| `android back button app minimizes` | Use Android back navigation and understand offline limits |
| `camera permission product image` | Add a product and save each section |
| `api key exposed` | Create and protect an API key |

Add a query when:

- A real user asks support the same question more than once.
- A zero-result search points to an existing guide.
- A new workflow, permission, payment state, seller action, policy, or Android behavior ships.
- The query contains an exact error message users can see.

Do not add:

- Passwords, private messages, payment identifiers, API keys, full order IDs, or personal report details.
- Internal admin-only terms unless the public user can see the same term.
- Provider secrets, callback tokens, or deployment-only configuration values.

## 5. Zero-Result Review Workflow

When analytics are approved, zero-result searches must be reviewed weekly. Until analytics are approved, support and QA should manually record only safe examples.

Review steps:

1. Remove sensitive data and normalize the user wording.
2. Check whether an existing guide should have matched.
3. If yes, update keywords, article text, or search weighting and add a regression query.
4. If no guide exists, create a content task and map the owner in the coverage matrix.
5. If the query is policy-sensitive, send it to the relevant policy owner before publication.
6. Re-run the Help test and record evidence in the implementation status.

Zero-result search must always offer:

- A shorter-query suggestion.
- Exact-error-message suggestion.
- Example related terms.
- Contact Support escalation.

## 6. Article Feedback Workflow

Current local behavior:

- Users can select Helpful or Not helpful on each Help article.
- The selected value is stored on the current device.
- The saved message disappears after a few seconds.
- The control works offline because it does not require the backend.

Future production behavior requires approval before implementation:

- Consent and privacy wording.
- Retention period.
- Aggregated article-level reporting.
- Abuse and spam limits.
- Admin-only access rules.
- Deletion or export handling if feedback becomes account-linked.

Operational use after approval:

1. Review low-helpfulness articles weekly.
2. Compare article feedback against support escalations after article view.
3. Confirm whether the problem is missing content, confusing wording, stale visuals, wrong policy, or broken product behavior.
4. Assign the article owner and update the review evidence.
5. Add a critical search query when feedback mentions language users typed into search.

## 7. Privacy and Data Handling

- Do not collect raw private form text through Help analytics.
- Do not collect passwords, one-time codes, full payment references, private messages, support evidence, or API keys.
- Do not tie helpfulness votes to a user account until privacy and retention rules are approved.
- Do not use feedback data for enforcement decisions.
- Do not expose feedback details in public pages.
- Use aggregate counts for reporting whenever possible.

## 8. Release Checks

Run `npm run help:analytics-readiness` from the repository root to summarize the current Help search signals, local feedback safeguards, privacy gates, D-031 approval blocker, and production analytics decision blockers.

Run `npm run help:analytics-approval -- --name <analytics-pass-name>` from the repository root to generate a dated analytics approval packet for consent wording, retention, storage, access control, deletion/export, owner cadence, monitoring thresholds, and final production analytics decisions. Use `--dry-run` first to confirm the target path and current source counts.

Run `npm run help:external-worksheet -- --name <external-pass-name>` from the repository root when a release candidate needs analytics, feedback, monitoring, consent, retention, or owner-cadence approval evidence. Use `--dry-run` first to confirm the target path and open gate counts.

Every release that touches Help content, Help search, article pages, footer links, contextual Help links, Android guidance, seller guidance, support forms, or policies must verify:

- `HELP_SEARCH_REVIEW_SIGNALS` still ranks each critical query to the expected guide.
- The analytics approval packet is generated or updated for the current release candidate before production analytics are enabled.
- Exact OAuth error search returns one focused result.
- Unrelated text returns zero results.
- `/help?q=...` preserves the query state.
- Zero-result UI still points to recovery guidance and Contact Support.
- Article feedback buttons are keyboard accessible and expose pressed state.
- Feedback remains local-only unless the approved production analytics work is shipped.
- No sensitive example query is committed.

## 9. Evidence Template

Record this evidence for every search or feedback change:

```text
Date:
Change owner:
Changed files:
Reason:
Critical query set updated: yes/no
New queries:
Removed queries:
Privacy review needed: yes/no
Commands run:
Results:
Follow-up tasks:
```

## 10. Release Rule

Do not claim Help search or article feedback is production analytics until consent, retention, backend storage, access control, and deletion/export behavior are approved and verified. The current implementation is a local article-feedback affordance plus source-level search governance.
