# Decision Register

Status values:

- **Open**: no approved decision.
- **Product work**: product behavior must be implemented or changed.
- **Legal review**: legal position is required.
- **Approved**: decision recorded and ready for content.

## 1. Blocking Decisions

| ID | Decision | Why it blocks content | Required owner | Status |
|---|---|---|---|---|
| D-001 | Minimum user age and minor-account rules | Registration, Terms, privacy, safety, store ratings | Product + legal | Open |
| D-002 | Unified report-abuse workflow and report categories | Community Guidelines, UGC store compliance, safety guides | Product + safety | Product work |
| D-003 | Appeal workflow for suspensions, removals, seller rejection, and seller revocation | Enforcement and appeals policy | Product + safety + legal | Product work |
| D-004 | Complete account-deletion scope and retained records | Privacy, deletion guide, app-store disclosures | Privacy + legal + engineering | Open |
| D-005 | Data access/export workflow | Public About claim and privacy rights guidance | Product + privacy + engineering | Product work |
| D-006 | Definition of "Friends Only" profile visibility | Privacy-setting guide and policy | Product | Open |
| D-007 | Marketplace personalization opt-out/reset | Privacy and recommendations explanation | Product + privacy | Open |
| D-008 | Return eligibility, windows, evidence, shipping cost, and outcomes | Returns/refunds policy; UI currently unconnected | Commerce + legal | Product work |
| D-009 | Refund-failure reconciliation and user communication | Paid cancellation can proceed without confirmed refund ID | Engineering + finance + support | Product work |
| D-010 | Native Android digital-goods payment model | Play Store distribution and buyer terms | Product + legal + mobile | Legal review |
| D-011 | Seller fulfillment service levels | Shipping/services policies and seller enforcement | Commerce | Open |
| D-012 | Service acceptance, revision, cancellation, and dispute flow | Service terms and order completion | Commerce + legal | Product work |
| D-013 | Digital-download reset/replacement rules | Digital Goods Policy and support operations | Commerce + legal | Open |
| D-014 | External-product responsibility and disclosure | External products leave Lekhon checkout | Legal + commerce | Open |
| D-015 | Seller fees, fee-change notice, taxes, hold, payout timing, failed payouts | Seller Terms and payout policy | Finance + legal | Open |
| D-016 | Product delete versus archive behavior | Current code permanently deletes despite archive wording | Product + engineering | Open |
| D-017 | Message-retention guarantee | UI claims automatic deletion after 30 days | Privacy + engineering | Open |
| D-018 | AI provider data handling, retention, ownership, and disclosure | AI Usage and Privacy Policy | Product + privacy + legal | Open |
| D-019 | Copyright notice, takedown, counter-notice, and repeat-infringer process | Copyright policy and moderation operations | Legal + safety | Open |
| D-020 | Emergency, harassment, impersonation, and illegal-content escalation | Safety Center and Community Guidelines | Safety + legal | Open |

## 2. Important Non-Blocking Decisions

| ID | Decision | Owner | Status |
|---|---|---|---|
| D-021 | Help content languages at launch | Product + editorial | Open |
| D-022 | Public service-status provider/page | Engineering + operations | Open |
| D-023 | Contact-support categories and expected response language | Support | Open |
| D-024 | Screenshot/video production standard and storage | Editorial + design | Open |
| D-025 | CMS threshold and editorial permissions | Engineering + editorial | Open |
| D-026 | Policy-change notice methods | Legal + product | Open |
| D-027 | Android test-build distribution method | Mobile | Open |
| D-028 | Android App Links timeline | Mobile | Open |
| D-029 | iOS roadmap and public wording | Product + mobile | Open |
| D-030 | Accessibility conformance target and audit process | Product + accessibility | Open |
| D-031 | Help analytics retention and consent | Privacy + analytics | Open |
| D-032 | Whether content-published emails remain mandatory | Product + privacy | Open |
| D-033 | Guest-to-account conversion | Product + engineering | Open |
| D-034 | API versioning, quotas, and deprecation notice | Engineering + product | Open |

## 3. Decision Record Template

```markdown
## D-XXX - Decision title

Status:
Date:
Owners:
Reviewers:

### Context

### Options Considered

### Decision

### User Impact

### Product Changes Required

### Documentation and Policy Impact

### Effective Date

### Review Trigger
```

## 4. Publication Rule

- An article may describe current limitations while its decision is open.
- A binding policy must not invent the outcome of an open decision.
- Any temporary manual process must identify its owner and escalation path.
- Product UI must not link to a nonexistent process such as returns, reporting, appeals, or data export.
