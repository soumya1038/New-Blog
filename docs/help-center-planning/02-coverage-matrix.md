# Feature-to-Documentation Coverage Matrix

## 1. Content Types

| Code | Type | Purpose |
|---|---|---|
| G | Guide | Step-by-step task instructions |
| E | Explanation | Concept, status, or system behavior |
| T | Troubleshooting | Diagnosis and recovery |
| P | Policy | Binding user-facing rules |
| S | Safety | Abuse prevention, reporting, or protection |
| V | Visual | Annotated screenshot, diagram, or short clip |
| C | Contextual | Link or guidance shown inside the workflow |
| O | Operations | Internal staff runbook |

Priority:

- **P0**: Required before public marketplace/native-store expansion.
- **P1**: Required for a professional Help Center launch.
- **P2**: Important optimization or advanced guidance.

Coverage approval:

- Run `npm run help:coverage-approval -- --name <coverage-pass-name>` to generate a dated Help Coverage Approval Packet under `docs/help-center-planning/coverage-approvals/`.
- The packet reviews the application audit, this matrix, information architecture, delivery governance, route registry, and completion audit as one approval surface.
- Coverage approval does not close Android, accessibility, support lifecycle, policy, visual, analytics, or other open release gates by itself.

## 2. Account and Access

| Feature/workflow | Audience | Required coverage | Visual/context | Priority | Blocking issue |
|---|---|---|---|---|---|
| Registration and email verification | New users | G, T, P | V, C | P1 | Eligibility age not decided |
| Password login | Users | G, T, S | C | P1 | None |
| Google sign-in | Users | G, T, P | V, C | P1 | Mobile callback UX needs final model |
| Facebook sign-in | Users | G, T, P | V, C | P1 | Provider review/data-deletion details |
| X/Twitter sign-in | Users | G, T, P | V, C | P1 | Provider scopes and email fallback |
| LinkedIn sign-in | Users | G, T, P | V, C | P1 | Provider review requirements |
| Connect/disconnect accounts | Users | G, E, S | V, C | P1 | Account-recovery consequences |
| Password recovery | Users | G, T, S | V, C | P1 | None |
| Guest accounts | Visitors | G, E, P | C | P1 | Conversion path not defined |
| Account deletion | Users | G, E, P, T | V, C | P0 | Deletion scope incomplete |
| Data access/export | Users | G, P | C | P0 | Feature not implemented |
| Suspensions | Users | E, P, T | C | P0 | Appeal path missing |
| API keys | Developers | G, S, P | V, C | P1 | Scope/rate-limit terms needed |

## 3. Profile, Privacy, and Notifications

| Feature/workflow | Audience | Required coverage | Visual/context | Priority | Blocking issue |
|---|---|---|---|---|---|
| Edit profile | Users | G, T | V, C | P1 | None |
| Profile visibility | Users | G, E, P | V, C | P0 | "Friends" definition unclear |
| Email/phone visibility | Users | G, E, P | V, C | P1 | Default visibility review |
| Social-link visibility | Users | G, E | V, C | P1 | None |
| Message permissions | Users | G, S | V, C | P1 | Enforcement scope review |
| Email preferences | Users | G, E | V, C | P1 | Mandatory published email rationale |
| Marketplace personalization | Buyers | E, P | C | P0 | Opt-out not implemented |
| Block/mute controls | Users | G, S, T | V, C | P0 | Not consistently available outside chat |

## 4. Create and Publish

| Feature/workflow | Audience | Required coverage | Visual/context | Priority | Blocking issue |
|---|---|---|---|---|---|
| Blogs | Writers | G, T, P | V, C | P1 | None |
| Articles | Writers | G, T, P | V, C | P1 | Template complexity |
| Short posts | Writers | G, T, P | V, C | P1 | Character limits should be surfaced |
| Stories/statuses | Users | G, T, P, S | V, C | P1 | Expiry/visibility explanation |
| Drafts | Writers | G, E, T | V, C | P1 | Local vs server draft distinctions |
| Scheduled publishing | Writers | G, E, T | V, C | P1 | Failure/retry behavior |
| Media uploads | Writers | G, T, P | V, C | P1 | Limits vary by feature |
| Templates | Writers | G, E, T | V, C | P2 | Custom-template support scope |
| Product tags/promotions | Writers/sellers | G, P | V, C | P1 | Advertising/disclosure rules |
| Comments/reactions | Community | G, P, S | C | P0 | Reporting workflow missing |
| Content deletion | Creators | G, E, P | C | P1 | Retention/cache consequences |

## 5. Community, Messaging, and Calls

| Feature/workflow | Audience | Required coverage | Visual/context | Priority | Blocking issue |
|---|---|---|---|---|---|
| Follow/unfollow | Users | G, E | C | P2 | None |
| Notifications | Users | G, T | V, C | P2 | None |
| Direct messages | Users | G, P, S, T | V, C | P0 | Abuse reporting missing |
| File sharing | Users | G, P, S, T | C | P0 | Malware/liability policy |
| Voice notes | Users | G, P, T | V, C | P1 | Retention and permission details |
| Groups | Users/admins | G, P, S | V, C | P0 | Group-admin responsibilities |
| Invites | Users | G, S, T | V, C | P1 | Invite misuse |
| Audio/video calls | Users | G, P, S, T | V, C | P0 | Consent and recording rule |
| Message deletion/retention | Users | E, P, T | C | P0 | 30-day claim verification |
| Blocking/muting | Users | G, S | V, C | P0 | None |
| Report abuse | All | G, P, S, O | V, C | P0 | Product feature missing |

## 6. AI

| Feature/workflow | Audience | Required coverage | Visual/context | Priority | Blocking issue |
|---|---|---|---|---|---|
| AI writing tools | Writers | G, E, P, T | V, C | P0 | Provider/data disclosures |
| AI product listing | Sellers | G, P, T | V, C | P0 | Seller accuracy responsibility |
| AI chat assistance | Users | G, E, P | C | P1 | Scope and safety limitations |
| Message enhancement | Users | G, P | C | P1 | Sensitive/private input warning |
| AI summarization | Readers/writers | G, E, P | C | P1 | Copyright and accuracy |

## 7. Marketplace Buyer

| Feature/workflow | Audience | Required coverage | Visual/context | Priority | Blocking issue |
|---|---|---|---|---|---|
| Browse/search/filter | Buyers | G, E | V | P2 | None |
| Personalized suggestions | Buyers | E, P | C | P0 | Opt-out decision |
| Product types | Buyers | E, P | V, C | P1 | Responsibility differs by type |
| Cart/wishlist | Buyers | G, T | V, C | P1 | Guest-cart migration |
| Coupons | Buyers | G, E, T, P | C | P1 | Coupon precedence |
| Checkout | Buyers | G, T, P, S | V, C | P0 | Native digital-goods billing |
| Payments | Buyers | G, E, T, P | V, C | P0 | Failed/refund reconciliation |
| Physical shipping | Buyers | G, E, P, T | V, C | P0 | Seller SLA not defined |
| Service delivery | Buyers | G, E, P, T | V, C | P0 | Acceptance/dispute workflow |
| Digital downloads | Buyers | G, E, P, T | V, C | P0 | Replacement/reset rules |
| External products | Buyers | E, P, S | C | P0 | Liability and external checkout |
| Cancellation | Buyers | G, E, P, T | V, C | P0 | Status rules need policy approval |
| Returns | Buyers | G, P, T | V, C | P0 | Workflow not implemented |
| Refunds | Buyers | G, E, P, T | V, C | P0 | Failed refund operations |
| Reviews | Buyers | G, P, S | V, C | P0 | Review moderation/reporting |
| Order completion | Buyers | G, E, P | C | P1 | Auto-complete consequences |

## 8. Seller

| Feature/workflow | Audience | Required coverage | Visual/context | Priority | Blocking issue |
|---|---|---|---|---|---|
| Seller application | Applicants | G, E, P, T | V, C | P0 | Seller Terms missing |
| Identity/payout verification | Applicants | G, E, P, S | V, C | P0 | Data-handling details |
| Application review/rejection | Applicants | E, P, T | C | P0 | Appeal/reapply standards |
| Store settings | Sellers | G, T | V, C | P1 | None |
| Add product | Sellers | G, T, P | V, C | P1 | Required-field matrix |
| Local working copy | Sellers | G, E, T | V, C | P1 | Browser/app storage caveats |
| Product images/camera | Sellers | G, T, P | V, C | P1 | Permission and content rights |
| Digital files | Sellers | G, P, T | V, C | P0 | Malware/IP/availability |
| Physical products | Sellers | G, P, T | V, C | P0 | Shipping and return duties |
| Services | Sellers | G, P, T | V, C | P0 | Delivery/revision/dispute rules |
| External products | Sellers | G, P | V, C | P0 | Affiliate/disclosure policy |
| Publish/draft/pause/delete | Sellers | G, E, P | V, C | P1 | Delete vs archive conflict |
| Price changes | Sellers | G, E, P, T | V, C | P1 | Approval criteria |
| Coupons | Sellers | G, E, P, T | V, C | P1 | Limits and misuse |
| Fulfill orders | Sellers | G, P, T | V, C | P0 | SLA and evidence |
| Earnings | Sellers | G, E, P | V, C | P0 | Fee/hold changes |
| Payouts | Sellers | G, E, P, T | V, C | P0 | Processing time and failures |
| Seller suspension/revocation | Sellers | E, P, T | C | P0 | Appeal path |

## 9. Admin and Internal Operations

| Workflow | Required coverage | Priority | Blocking issue |
|---|---|---|---|
| User warning/suspension/deletion | P, O, S | P0 | Standards and appeals missing |
| Content removal | P, O, S | P0 | Reason codes/evidence rules |
| Seller review | P, O | P0 | Approval checklist |
| Seller rejection/revocation | P, O | P0 | Reapply/appeal rules |
| Price-change review | P, O | P1 | Approval criteria |
| Payout processing | P, O, S | P0 | Reconciliation and dual control |
| Refund exceptions | P, O, S | P0 | Manual escalation |
| Security incident | O, S | P0 | Incident-response owner |
| Legal requests | O, P | P0 | Legal owner and preservation |
| Documentation release review | O | P1 | Owners to assign |

## 10. Mobile

| Feature/workflow | Required coverage | Visual/context | Priority | Blocking issue |
|---|---|---|---|---|
| Install test APK | G, T, S | V | P1 | Distribution method |
| Production Play Store install | G, P | V | P0 | Not released |
| App updates | G, E, T | V, C | P1 | Version/update strategy |
| Camera/photos/files | G, E, P, T | V, C | P0 | Permission declarations |
| Microphone/calls | G, E, P, T | V, C | P0 | Permission declarations |
| OAuth in Android | G, E, T | V, C | P0 | App Links not implemented |
| Back navigation | G, T | V | P1 | Regression testing |
| Offline behavior | G, E, T | V, C | P1 | Only selected local saves |
| Clear storage/cache | G, E, T | V | P1 | Data-loss warnings |
| iOS | Future G/P/T | Future V | P2 | No project exists |

## 11. Required Policy Set

| Policy | Priority | Product dependencies | Review |
|---|---|---|---|
| Terms of Service | P0 | Eligibility, liability, enforcement | Legal |
| Privacy Policy | P0 | Data map, processors, retention, rights | Legal/privacy |
| Community Guidelines | P0 | Reporting and moderation | Safety/legal |
| Content and Acceptable Use | P0 | Prohibited content, spam, impersonation | Safety/legal |
| Copyright and IP | P0 | Takedown and counter-notice workflow | Legal |
| AI Usage Policy | P0 | Provider/data/ownership decisions | Legal/product |
| Marketplace Buyer Terms | P0 | Responsibility and dispute model | Legal/commerce |
| Seller Terms | P0 | Fees, fulfillment, content, enforcement | Legal/finance |
| Prohibited Products and Services | P0 | Marketplace moderation | Legal/safety |
| Cancellation, Return, and Refund | P0 | Return workflow and refund operations | Legal/commerce |
| Shipping and Delivery | P0 | Seller SLA and tracking | Commerce |
| Digital Goods | P0 | Download limits and replacements | Legal/commerce |
| Services Fulfillment | P0 | Revisions, acceptance, disputes | Legal/commerce |
| Payments and Payouts | P0 | Fees, holds, timelines, failures | Legal/finance |
| Reviews Policy | P0 | Moderation/reporting | Safety/commerce |
| Moderation and Appeals | P0 | Appeal product flow | Safety/legal |
| Guest Account Policy | P1 | Conversion and deletion | Product/privacy |
| API Terms | P1 | Scope, limits, suspension | Legal/engineering |
| Cookie and Local Storage Notice | P1 | Storage inventory/consent model | Privacy |
| Mobile Permissions Notice | P1 | Final manifests | Privacy/mobile |
| Accessibility Statement | P1 | Audit and contact process | Accessibility/legal |

## 12. Approval Rule

A row is complete only when:

- The destination article/policy exists.
- The described behavior is verified.
- Required visuals are current.
- Contextual links are implemented where marked.
- Product and legal dependencies are resolved.
- Owner and review date are recorded.
