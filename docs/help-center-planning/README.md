# Lekhon Help Center Program

Status: Implementation and controlled verification  
Planning baseline: June 24, 2026  
Implementation gate: Open for verified guidance and support workflows; binding policy publication remains gated by open decisions and specialist approval

## Objective

Create a professional, maintainable support system for Lekhon that covers:

- Product guidance for web and Android users.
- Clear policies for publishing, messaging, AI, marketplace, sellers, payments, and safety.
- Contextual help inside important workflows.
- A searchable Help Center with visual instructions where text is insufficient.
- A complete public footer that routes users to the correct guidance or policy.
- Internal ownership and review rules so documentation stays accurate when the product changes.

## Planning Pack

1. [Application Audit](./01-application-audit.md)  
   Verified feature, role, workflow, data, platform, and support-gap inventory.
2. [Coverage Matrix](./02-coverage-matrix.md)  
   Maps each product area to required guides, policies, visuals, contextual help, and owners.
3. [Information Architecture](./03-information-architecture.md)  
   Defines Help Center categories, article structure, search, footer taxonomy, and in-app entry points.
4. [Delivery and Governance](./04-delivery-and-governance.md)  
   Defines phases, quality gates, testing, review, publishing, and maintenance.
5. [Decision Register](./05-decision-register.md)  
   Lists product and policy questions that must be resolved before related content is published.
6. [Compliance Review Checklist](./06-compliance-review-checklist.md)  
   Tracks external legal and app-store areas that require specialist verification.
7. [Implementation Status](./07-implementation-status.md)  
   Records implemented routes, contextual links, automated gates, verified behavior, and remaining release blockers.
8. [Help Center Operations Runbook](./08-operations-runbook.md)  
   Defines ownership, support queue signals, alert rules, cadence, release evidence, and documentation-change triggers.
9. [Release Evidence Record](./09-release-evidence-record.md)  
   Provides the required web, Android, support, accessibility, cleanup, and policy evidence checklist for each release.
10. [Policy Approval Tracker](./10-policy-approval-tracker.md)  
   Maps draft policies to blocking decisions, required reviewers, approval states, effective dates, and publication rules.
11. [Visual Guidance Inventory](./11-visual-guidance-inventory.md)  
   Tracks workflow strips, screenshots, diagrams, clips, capture standards, privacy rules, and replacement triggers.
12. [Contextual Help Inventory](./12-contextual-help-inventory.md)  
   Tracks point-of-use Help links, preserved references, missing workflow links, acceptance rules, and drift verification.
13. [Footer Navigation Inventory](./13-footer-navigation-inventory.md)  
   Defines the shared footer taxonomy, mobile behavior, policy safety, social-link rules, and regression checks.
14. [Accessibility Verification Protocol](./14-accessibility-verification-protocol.md)  
   Defines keyboard, NVDA, TalkBack, text zoom, contrast, motion, evidence, and release rules for Help surfaces.
15. [Support Lifecycle and Cleanup Protocol](./15-support-lifecycle-cleanup-protocol.md)  
   Defines support/report/appeal intake, admin triage, metrics, production-like test records, cleanup, and evidence.
16. [Android OAuth and Permissions Verification Protocol](./16-android-oauth-permissions-verification-protocol.md)  
   Defines Capacitor build checks, physical-device testing, OAuth, permissions, TalkBack, evidence, and release rules.
17. [Route and Navigation Registry](./17-route-navigation-registry.md)  
   Defines public route registration, footer visibility, Android/OAuth paths, deferred routes, and route-change rules.
18. [Content Ownership and Review Protocol](./18-content-ownership-review-protocol.md)  
   Defines Help article owners, review triggers, review evidence, source checks, and release rules.
19. [Search and Feedback Operations Protocol](./19-search-feedback-operations-protocol.md)  
   Defines critical search queries, zero-result review, local article feedback, privacy rules, evidence, and release gates.
20. [Article Experience Quality Protocol](./20-article-experience-quality-protocol.md)  
   Defines article facts, escalation paths, related-guide ranking, mobile reading, accessibility, and release checks.
21. [Visual Evidence Capture Protocol](./21-visual-evidence-capture-protocol.md)  
   Defines structured visual requirements, capture order, evidence notes, privacy review, accessibility text, replacement review, and release rules.
22. [Policy Publication Safety Protocol](./22-policy-publication-safety-protocol.md)  
   Defines policy publication states, draft safety, approval gates, blocker mapping, UI rules, promotion workflow, and release checks.
23. [Release Readiness Gate Protocol](./23-release-readiness-gate-protocol.md)  
   Defines source-owned release gates, local versus external evidence, blocker statuses, promotion rules, and completion criteria.
24. [Release Candidate Execution Checklist](./24-release-candidate-execution-checklist.md)  
   Provides a gate-by-gate reviewer checklist derived from the source-owned release readiness registry.
25. [Help Center Goal Completion Audit](./25-goal-completion-audit.md)  
   Maps the full objective to current evidence, incomplete gates, the `npm run help:goal-audit` command, and the decision rule for claiming completion.
26. [Release Exception Register](./26-release-exception-register.md)  
   Defines source-owned release exceptions, validation fields, limits, current exception state, and the `npm run help:exceptions` command.

## Non-Negotiable Rules

- Documentation must describe implemented behavior, not intended behavior.
- Policies must not promise unavailable rights, workflows, response times, or refunds.
- Legal and financial policies require qualified review before production publication.
- Android and web differences must be stated explicitly.
- iOS must be marked planned or unavailable until an iOS build exists and is verified.
- Every user-facing feature must have an accountable owner and review trigger.
- Safety-critical workflows must be available from the relevant screen, not only from the footer.
- Changes to product behavior must include a documentation-impact check before release.

## Program Gates

| Gate | Required evidence | Status |
|---|---|---|
| G0 - Audit complete | Routes, UI, backend rules, roles, integrations, and gaps inventoried | Complete |
| G1 - Coverage approved | Every feature mapped to guidance and policy requirements | Baseline accepted for implementation |
| G2 - Decisions resolved | Blocking product and policy questions answered | In progress; blocking decisions remain open |
| G3 - Content approved | Drafts pass product, legal, safety, and accessibility review | Verified guides published locally; accessibility protocol and policy publication safeguards added; binding policy drafts remain in review |
| G4 - Experience implemented | Help Center, footer, search, feedback, article experience, visual requirements, and contextual links built | Core experience complete; article facts, contextual escalation, local article feedback, structured visual requirements, visual inventory, contextual inventory, and footer inventory added; screenshot, clip, and remaining point-of-use capture remains |
| G5 - Release verified | Web and Android workflows tested; links and search validated | Public web, seeded authenticated, Android emulator, APK packaging, release gate registry, and Android verification protocol pass locally; physical-device and live-backend release checks remain |
| G6 - Governance active | Owners, review dates, analytics, and release checks operational | Help owners/review triggers, critical search signals, local feedback rules, policy publication states, release readiness gates, support queue metrics, operations runbook, release evidence record, policy approval tracker, and support cleanup protocol added locally; live owner assignment, production monitoring, and analytics-consent decisions remain |

## Definition of Done

The program is complete only when:

- All matrix rows marked required have published destinations.
- All footer links resolve to useful pages.
- Users can find guidance by browsing, searching, and contextual links.
- Help articles give users a clear next action when self-service is not enough.
- Required visuals are represented in source metadata and backed by evidence before production readiness is claimed.
- Users can signal whether article guidance helped, with approved privacy handling.
- Policies are versioned and show effective dates.
- Draft policies cannot be presented as binding or effective.
- Support and reporting paths are functional.
- Mobile instructions are tested on an actual Android device.
- Product claims match current implementation.
- Legal and financial documents have recorded approval.
- Documentation ownership and update triggers are active.
- Required release gates are verified with current evidence, not only documented.
- Any release exception is source-owned, approved, unexpired, scoped, and backed by evidence.
- `npm run help:goal-audit` reports no source gaps and no open release gates for the current release candidate.
