# Compliance and Platform Review Checklist

This is a planning checklist, not legal advice. Laws, regulations, and app-store policies change. The responsible legal, privacy, commerce, and mobile owners must verify the requirements current on the review date.

## 1. India Legal Review

### Privacy and Data Protection

Review:

- Applicable requirements under India's Digital Personal Data Protection framework and rules in force at launch.
- Notice, consent, legitimate uses, withdrawal, access/correction, deletion, grievance, and nomination requirements where applicable.
- Child/minor data rules.
- Security safeguards and breach response.
- Cross-border processing and subprocessors.
- Retention for account, content, messages, marketplace, payment, fraud, tax, and legal records.

Official starting point:

- [MeitY Data Protection Framework](https://www.meity.gov.in/data-protection-framework)

Lekhon dependencies:

- D-001 eligibility and minors.
- D-004 deletion scope.
- D-005 data access/export.
- D-007 personalization.
- D-017 message retention.
- D-018 AI provider data.

### Intermediary and User-Generated Content

Review:

- Due-diligence obligations applicable to the service.
- User rules and prohibited content.
- Grievance contact and response requirements.
- Takedown, preservation, disclosure, and law-enforcement processes.
- Repeat violations and account enforcement.
- Publisher/news implications, if any, for the news feature.

Lekhon dependencies:

- D-002 reporting.
- D-003 appeals.
- D-019 copyright.
- D-020 safety escalation.

### E-Commerce and Consumer Protection

Review:

- Marketplace disclosures.
- Seller identity and contact disclosures.
- Ranking/recommendation disclosures where applicable.
- Price, fee, refund, cancellation, return, delivery, warranty, and grievance information.
- Responsibility for physical, digital, service, and external products.
- Dark-pattern review of checkout, coupons, cancellation, and seller flows.

Lekhon dependencies:

- D-008 through D-016.

### Payments, Tax, and Seller Payouts

Review:

- Razorpay/RazorpayX terms and required disclosures.
- Marketplace payment flow and settlement responsibility.
- Refund and chargeback handling.
- Seller tax documentation, invoicing, withholding, and reporting.
- Financial-record retention.
- Fee-change notice.

Lekhon dependencies:

- D-009, D-010, and D-015.

## 2. Google Play Review

### User-Generated Content

Lekhon includes posts, comments, reviews, profiles, messages, groups, stories, media, and AI-generated content. Before Play Store release, verify:

- Users accept Terms/Community Guidelines before creating or uploading content.
- Prohibited content and behavior are defined.
- In-app reporting covers content and users.
- Blocking is available where users interact.
- Moderation is ongoing and effective.
- Contact information and escalation are available.

Official source:

- [Google Play User Generated Content policy](https://support.google.com/googleplay/android-developer/answer/9876937)

Current gap:

- Reporting is not implemented across the application.

### Account Deletion

Verify:

- There is an intuitive in-app deletion path.
- There is a public web deletion-request path for users who removed the app.
- Associated user data is deleted unless retention is justified and disclosed.
- Play Console Data safety answers match actual behavior.

Official source:

- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)

Current gap:

- In-app deletion exists, but a complete associated-data deletion audit and public web request path are required.

### Payments

Verify the policy current at release for:

- Digital goods downloadable or consumable in the Android app.
- Physical products.
- One-to-one and other services.
- Alternative billing programs applicable in India or other served regions.
- External product links.
- Consumption-only designs.

Official source:

- [Google Play Payments policy guidance](https://support.google.com/googleplay/android-developer/answer/10281818)

Current gap:

- Lekhon currently uses Razorpay checkout for mixed product types and has not documented a Play-compliant native billing strategy.

### AI-Generated Content

Verify:

- Restricted AI-generated content is prevented.
- Users can report or flag harmful AI output when required.
- AI is covered by UGC moderation when published.
- Safety tests exist for writing, chat, and product-listing tools.

Official sources:

- [Google Play AI-Generated Content policy](https://support.google.com/googleplay/android-developer/answer/13985936)
- [Google Play AI policy guidance](https://support.google.com/googleplay/android-developer/answer/14094294)

### Data Safety and Permissions

Inventory and declare:

- Account/profile data.
- User-generated content.
- Messages and files.
- Camera and microphone use.
- Payment and seller verification data.
- Diagnostics/Sentry.
- Personalization signals.
- AI inputs and outputs.
- Data shared with processors.
- Encryption, deletion, and optional/required collection.

The Android permission manifest and actual runtime requests must match the Play Console declaration and Privacy Policy.

### Store Listing

Verify:

- App description does not claim unavailable iOS, offline, refund, safety, or export behavior.
- Screenshots use test data.
- Content rating reflects UGC, chat, marketplace, and AI.
- Review credentials expose all relevant gated features.
- Support and privacy URLs are functional.

## 3. Apple App Store Future Review

No iOS project is currently verified. These items become release blockers when iOS work begins.

### User-Generated Content

Verify:

- Filtering or moderation of objectionable material.
- Reporting.
- Blocking.
- Published contact information.
- Clear action against abusive users.

Official source:

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Account Deletion

Verify:

- Users who can create accounts can initiate deletion in the app.
- Deactivation alone is not presented as deletion.
- Retention exceptions are disclosed.

Official source:

- [Apple guidance for offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

### Sign in with Apple

Before iOS release, review whether third-party/social login options trigger a Sign in with Apple requirement and implement it if required.

### In-App Purchase

Before iOS release, classify every product/service and verify whether Apple In-App Purchase is required for digital content or services consumed in the app.

### Privacy Nutrition Labels and Permissions

Map actual collection/sharing to App Store Connect privacy disclosures and iOS permission-purpose strings.

## 4. Accessibility Review

Choose and record the target standard. At minimum review:

- Keyboard and assistive-technology operation.
- Contrast and text scaling.
- Captions/transcripts.
- Form labels and errors.
- Focus management.
- Motion reduction.
- Touch target sizing.
- Android screen-reader behavior.

Use `14-accessibility-verification-protocol.md` to record the working target, route coverage, manual keyboard checks, NVDA checks, TalkBack checks, text zoom, contrast, motion, issue owners, and release exceptions.

## 5. Security and Trust Review

Verify:

- Authentication and account-recovery abuse controls.
- OAuth state and redirect validation.
- API-key storage and revocation.
- File malware/type validation.
- Private digital-download access.
- Seller payout-data encryption and access.
- Payment webhook validation.
- Rate limits and spam controls.
- Incident response.
- Vulnerability reporting contact.
- Security-log and evidence retention.

## 6. Release Evidence

For each external review, retain:

- Source URL.
- Review date.
- Policy/version date when available.
- Reviewer.
- Applicable Lekhon features.
- Required product changes.
- Required content changes.
- Approval or exception.
- Next review trigger.
