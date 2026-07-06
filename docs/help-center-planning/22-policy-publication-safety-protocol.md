# Policy Publication Safety Protocol

Status: Active for policy registry, policy directory, and draft policy pages  
Last updated: June 26, 2026

## 1. Purpose

This protocol prevents Lekhon from accidentally presenting draft, incomplete, or unapproved policy text as binding user-facing policy. It connects the policy content registry, policy pages, decision register, approval tracker, footer links, and release evidence.

## 2. Source Registry

Policy publication state is owned by `redirect/src/content/policyContent.js`.

The registry must define:

- `POLICY_PUBLICATION_STATES`
- `POLICY_REQUIRED_APPROVALS`
- `POLICY_PUBLICATION_RULES`
- `policyDocuments`

Every policy record must include:

- Stable `slug`.
- `title`.
- `summary`.
- `owners`.
- `state`.
- `status`.
- `isBinding`.
- `publicLabel`.
- `actionLabel`.
- `notice`.
- `effectiveDate`.
- `lastReviewed`.
- `href`.
- `approvalRequirements`.
- `blockingDecisionIds`.
- `sections`.

## 3. Publication States

| State | Binding | Meaning |
|---|---|---|
| `published` | Yes | Effective policy text lives at the linked public route, such as `/terms` or `/privacy` |
| `draft-review` | No | Draft text is shown for transparency only and cannot be treated as final or effective |

No other state should be introduced without updating tests, policy pages, and this protocol.

## 4. Published Policy Rules

A published policy must:

- Have `isBinding: true`.
- Have state `published`.
- Have status `Published`.
- Have an effective date that is not `Not yet effective`.
- Link to a registered public route.
- Have no draft sections in `policyDocuments`.
- Have no unresolved blocking decision ids in the active registry.
- Be represented in the policy approval tracker or legacy public route evidence.

Current published policies:

- Terms of Service at `/terms`.
- Privacy Policy at `/privacy`.

## 5. Draft Policy Rules

A draft policy must:

- Have `isBinding: false`.
- Have state `draft-review`.
- Have an effective date of `Not yet effective`.
- Have an empty `href`.
- Render through `/policies/:slug`.
- Show a non-binding notice.
- Show a publication gate.
- List approval requirements.
- List blocking decision ids.
- Include at least one visible `Decision required` callout.

Draft policy action text must not say `Read policy`, `Effective`, `Published`, or any similar final-language phrase.

## 6. Approval Requirements

The default approval gate is:

- Product behavior verified.
- Owner approval recorded.
- Legal or specialist review recorded.
- Effective date assigned.

Specialist review means the relevant owner group for that policy, such as legal, privacy, finance, commerce, safety, accessibility, mobile, engineering, or support.

## 7. Blocking Decision Rules

Every draft policy must reference at least one decision id from `05-decision-register.md`.

Every referenced decision id must:

- Exist in the decision register.
- Be relevant to the policy text.
- Stay listed until the decision is approved or explicitly scoped out.

If a new blocker is discovered, add it to the decision register first, then reference it from the policy registry and approval tracker.

## 8. UI Rules

The policy directory must show:

- Public label.
- Effective date.
- Approval blocker count for drafts.
- Action label that separates published policies from draft review pages.

Draft detail pages must show:

- Publication state.
- Effective date.
- Owner list.
- Non-binding notice.
- Publication gate.
- Approval requirements.
- Blocking decisions.
- Decision-required callouts in the body.

## 9. Footer and Link Rules

- Footer links can point to `/terms`, `/privacy`, `/policies`, or draft policy detail routes only when the destination clearly labels draft status.
- Legal footer links must remain reachable without login.
- A draft policy route must not replace an existing published policy route.
- A contextual Help link may point to a draft policy only if the article makes clear that final approval remains pending.

## 10. Release Checks

Run `npm run help:external-worksheet -- --name <external-pass-name>` from the repository root when a release candidate needs policy approval, blocker, product-behavior, specialist-review, or effective-date evidence. Use `--dry-run` first to confirm the target path and current draft-policy blocker counts.

Run `npm run help:policy-readiness` from the repository root to summarize the current source policy records, decision-register blocker statuses, approval tracker rows, required reviewers, and binding-publication result.

Run `npm run help:policy-approval -- --name <policy-pass-name>` from the repository root to generate a dated policy approval packet under `docs/help-center-planning/policy-approvals/`. Use `--dry-run` first to confirm the target path, draft policy count, blocker count, and approval tracker count.

Every release that touches policies, footer links, Help articles, marketplace wording, seller wording, payments, payouts, AI, privacy, safety, Android, or support workflows must verify:

- `npm run test:help -- --runInBand`
- Published policies remain binding only through registered public routes.
- Draft policies remain non-binding and not effective.
- Every draft policy has approval requirements and blocking decision ids.
- Every blocking decision id exists in the decision register.
- Every draft policy page shows a publication gate.
- Every draft policy has at least one visible decision-required body callout.
- Footer and contextual links do not imply that a draft is final.
- No unresolved policy promise is presented as an implemented right or guaranteed response.

## 11. Promotion Workflow

Before moving a draft policy to published:

1. Resolve or scope every blocking decision.
2. Verify product behavior against the policy text.
3. Record owner approval.
4. Record required specialist approvals.
5. Generate or update the policy approval packet.
6. Assign version and effective date.
7. Add or update the published public route.
8. Preserve or archive any previous effective version.
9. Update footer and contextual links.
10. Run release checks.
11. Record evidence in the release evidence record.

## 12. Release Rule

Do not publish, link, announce, or rely on draft policy text as binding policy until the registry state, approval tracker, policy approval packet, product behavior evidence, specialist approval, version, effective date, and release evidence all agree.
