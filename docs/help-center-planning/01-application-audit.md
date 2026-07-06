# Application Audit

## 1. Audit Method

This audit uses the current frontend routes, backend routes, models, controllers, platform configuration, and visible settings as the source of truth. Existing planning documents are treated as historical context only.

Confidence labels:

- **Confirmed**: directly supported by current code.
- **Partial**: some workflow exists, but important behavior or UI is incomplete.
- **Missing**: expected support, safety, policy, or user guidance is not implemented.
- **Decision required**: behavior exists but a governing rule has not been formally chosen.

## 2. User Contexts

| Context | Confirmed capabilities | Documentation need |
|---|---|---|
| Public visitor | Landing page, home/feed browsing, public content, marketplace browsing, public stores, legal pages | Getting started, browsing, accessibility, privacy summary |
| Guest user | Temporary username account with 12-hour expiry | Guest limitations, expiry, deletion, conversion path |
| Registered user | Profile, publishing, drafts, social activity, notifications, chat, calls, AI, marketplace | Full user guide and account policies |
| Writer/creator | Blogs, articles, short posts, stories/statuses, templates, scheduling, media, AI assistance | Creation guides, content rules, copyright, AI disclosure |
| Buyer | Cart, wishlist, coupons, checkout, orders, reviews, digital downloads | Buyer terms, payments, cancellation, delivery, reviews |
| Seller | Application, store, products, orders, price changes, coupons, earnings, payouts | Seller handbook and binding seller policies |
| Co-admin | Operational visibility and selected review access | Internal role handbook and least-privilege rules |
| Admin | User/content actions, seller approval, payouts, price changes, monitoring | Internal moderation and operations runbooks |
| Android user | Capacitor app using the web application bundle | Installation, updates, permissions, OAuth, navigation, troubleshooting |
| iOS user | No verified iOS project in the repository | Do not claim availability; create later after implementation |

## 3. Public Navigation and Discovery

Confirmed:

- Desktop/web landing page at `/`; native Android opens `/home`.
- Home/feed, search, public profiles, blogs, articles, short content, news, marketplace, stores.
- About, Privacy, and Terms pages.
- Public footer currently links only Home, About, Privacy, and Terms.
- Social links are present in the public footer.
- SEO routes include robots, sitemap, and feed XML.

Gaps:

- No Help Center route or searchable documentation experience.
- No structured footer for account help, creators, marketplace, sellers, safety, developers, or legal policies.
- Existing About page contains technical and product claims that need ongoing verification.
- Existing Privacy and Terms pages are summaries, not complete policy sets.
- Some text contains encoding defects.

## 4. Account and Authentication

Confirmed:

- Username/password registration and login.
- Email verification.
- Password reset and authenticated password change flows.
- Google, Facebook, X/Twitter, and LinkedIn sign-in.
- Social account connection and disconnection.
- Guest login with a unique username.
- Account deletion requires password and a six-digit email code that expires after two minutes.
- API key creation, listing, and revocation.
- Username changes.
- Login protections include rate limiting and human-verification steps.
- Suspended accounts are prevented from signing in until suspension ends.

Important exact behavior:

- Guest accounts expire after 12 hours.
- Guest cleanup removes guest blogs, shorts, comments, notifications, messages, and the guest user.
- Account deletion currently deletes the user, blogs, articles, notifications, and profile image.

Risks and gaps:

- Account deletion does not visibly remove every associated collection such as messages, comments, groups, marketplace records, seller data, orders, reviews, or uploaded product assets. This requires product and legal review.
- "Data export support" is claimed on the About page, but no matching export workflow was found.
- No age or minimum-eligibility rule is enforced during registration.
- OAuth mobile behavior depends on HTTPS callback routes hosted by the deployed frontend; native App Links/Universal Links are not implemented.
- No complete OAuth troubleshooting or provider-data explanation exists.

Required documentation:

- Create and verify an account.
- Sign in with each provider.
- Connect or disconnect a social account.
- Recover or change a password.
- Guest account lifecycle.
- Delete an account and understand what is removed or retained.
- API key safety and API terms.
- Suspensions and appeals.

## 5. Profiles, Privacy, and Notifications

Confirmed:

- Profile visibility: public, friends, or private.
- Email and phone visibility controls.
- Per-provider/custom social-link visibility.
- Direct-message permission control.
- Email preferences for followers, messages, missed calls, comments, and reactions.
- Content-published email is system-managed and always enabled.
- Profile image, personal details, bio, description, signature, social links, and marketplace signals.
- Block and mute controls exist in messaging.
- Story mute and hide preferences exist.

Gaps:

- "Friends Only" is ambiguous because the product model uses followers/following rather than a confirmed mutual-friend contract.
- No consolidated privacy dashboard explains each setting's audience effect.
- No public retention schedule exists.
- No cookie/local-storage explanation exists.
- Marketplace personalization signals are collected but not explained to users.

## 6. Publishing and Content Creation

Confirmed content types:

- Blogs.
- Long-form articles.
- Short posts.
- Stories/statuses.
- Drafts and scheduled publication.
- Cover images and media uploads.
- Markdown editing and previews.
- Built-in and custom article templates.
- Product tagging and promotional product cards.
- Likes, views, comments, replies, reactions, hearts, pinning, editing, and deletion.

Stories/statuses:

- Text, image, and video story modes.
- Public, followers, and private audiences.
- Music references, stickers, positioning, colors, fonts, and duration.
- Duration range is 3 to 30 seconds.
- Up to five active statuses are exposed in the profile UI.
- Expiring status behavior is implemented.

Content protection currently confirmed:

- Comment maximum defaults to 4,000 characters.
- Comment rate limit defaults to six per minute.
- Link and duplicate-comment controls exist.
- Basic keyword/repeated-character spam checks exist.

Gaps:

- No user-facing report flow for content, users, reviews, messages, or products was found.
- No Community Guidelines, Content Policy, prohibited-content policy, copyright process, or appeals process.
- Blocking is primarily available through chat, not consistently from profiles/content.
- No transparent explanation of view counts, likes, scheduling failures, or draft recovery.
- Creator-facing media limits are not collected in one place.

## 7. Messaging, Groups, and Calls

Confirmed:

- Direct and group conversations.
- Text, files, images, voice notes, reactions, pinned messages, deletion, clearing, read state, and last seen.
- User blocking, unblocking, muting, and unmuting.
- Group creation, updates, icons, membership, co-admins, invites, invite regeneration, leaving, and read state.
- One-to-one audio/video call records.
- LiveKit-backed group call start, join, end, active-state, and history flows.
- Chat copy states that messages are automatically deleted after 30 days.

Upload limits:

- Chat files: up to 50 MB; common images, documents, spreadsheets, presentations, ZIP, and RAR.
- Voice messages: up to 10 MB; WebM, OGG, MP3, or WAV.
- Group icon: up to 5 MB.

Gaps:

- No messaging safety guide.
- No report-abuse workflow.
- Retention claims need verification for database deletion as well as Cloudinary cleanup.
- No emergency, harassment, impersonation, or prohibited-conduct guidance.
- Group admin responsibilities are undocumented.

## 8. AI Features

Confirmed:

- Blog generation.
- Bio and description generation.
- Content improvement.
- Title and tag generation.
- Product-listing assistance.
- Quick-chat and message enhancement.
- Summarization.
- Chatbot assistance.
- Current backend integrations include Gemini/Groq-style fallbacks and OpenAI/Groq dependencies.

Required disclosures and guidance:

- What user inputs may be sent to AI providers.
- Whether content is stored by Lekhon or providers.
- Users must verify accuracy, rights, prices, claims, and safety.
- AI output can be wrong, incomplete, biased, or unsuitable.
- Prohibited use cases.
- Ownership and licensing position.
- Seller responsibility for AI-generated listings.
- How to identify or disclose AI-generated content, if required by product policy.

Gap:

- No dedicated AI Usage Policy or AI privacy notice exists.

## 9. Marketplace Buyer Workflows

Confirmed:

- Browse, search, filter, suggestions, personalization, and product-view signals.
- Product types: digital, physical, service, and external.
- Cart, guest-local cart, wishlist, coupons, checkout, and order history.
- Razorpay payment and free orders.
- Minimum payable amount is INR 1.
- Free-shipping threshold defaults to INR 1,000.
- Current prices and stock are revalidated by the backend at checkout.
- Shipping address is collected for applicable orders.
- Verified-purchase reviews are available after delivered/completed status, one review per order/product.
- Review image limit: four images, each limited by the product image uploader to 4 MB.

Cancellation and refund behavior:

- Buyers can cancel pending-payment, failed, paid, or processing orders.
- Shipped, delivered, completed, refunded, or already cancelled orders cannot be cancelled through the standard endpoint.
- Paid cancellations attempt a Razorpay refund.
- UI/backend message states refunds may take 5-7 business days when successfully initiated.
- Razorpay webhooks can mark orders refunded and reverse seller earnings.
- Return-request buttons currently state that return support is not connected.

Digital products:

- Seller upload limit is 500 MB.
- Default maximum downloads is five.
- Download links expire after 15 minutes.
- Downloads require paid, delivered, or completed order status.

Major gaps:

- No complete returns workflow.
- Refund failure handling can cancel an order even when the gateway refund did not produce an ID; operational resolution must be defined.
- No buyer protection policy.
- No clear responsibility split between Lekhon and external-product platforms.
- No shipping, service fulfillment, digital goods, or dispute policy.
- App-store billing implications for digital goods in native apps require product/legal review before store release.

## 10. Seller Workflows

Confirmed:

- Seller applications for individual/company contexts.
- PAN, contact, location, UPI or bank details.
- Manual or Razorpay-assisted verification.
- Admin review, approval, rejection, withdrawal, and reapplication.
- Seller store name, bio, and banner.
- Dashboard sections for overview, products, price changes, orders, coupons, earnings/payouts, and settings.
- Product statuses: draft, active, paused, archived.
- Product images: up to eight, 4 MB each.
- Camera capture and local-device image selection in add-product flow.
- Background removal and retry.
- Digital file upload.
- Physical inventory, MOQ, SKU, weight, dimensions, shipping zones, fee, delivery estimate, and variants.
- Service delivery time, revisions, inclusions, exclusions, and requirements.
- External products for Amazon, Etsy, Gumroad, Flipkart, and other platforms.
- SEO, badges, promo banner, FAQs, and testimonials.
- Coupons and price-change approval workflows.
- Physical shipping requires courier and tracking.
- Service delivery can be marked by sellers.

Add-product local working copy:

- Each section is saved only when the user presses Save.
- Saved sections are restored from the device.
- Unsaved changes in the current section are not restored.
- The local working copy expires after one hour.
- Cancel clears local saved information after a custom confirmation.
- Publishing or saving a backend draft is separate from the local working copy.

Financial behavior:

- Default seller earning hold is seven days.
- Default order auto-completion is seven days after physical shipment.
- Auto-completion and earning-release work runs every six hours.
- Gateway fee defaults to 2.36%.
- Platform commission is environment-configured and currently defaults to 0%.
- Minimum payout is INR 10.
- Payout can be automatic through RazorpayX or queued for manual admin processing.
- Cancellation/refund reverses pending or available earnings.

Critical gaps:

- Seller onboarding requires agreement to Seller Terms, but no dedicated Seller Terms document exists.
- No prohibited-products policy.
- No seller service-level expectations.
- No payout timing guarantee, failed-payout process, tax explanation, chargeback/dispute process, or seller appeal process.
- Product deletion is implemented as actual deletion despite a controller comment describing soft archive; documentation must follow verified behavior or product behavior must change.

## 11. Admin and Moderation

Confirmed:

- Metrics, alerts, users, guests, content, seller applications, payouts, and price changes.
- Admin can delete content or users, suspend/unsuspend, verify/unverify, change roles, send warning emails, approve/reject sellers, mark payouts paid, approve/reject price changes, and revoke seller status.
- Co-admin has selected read/review access; destructive actions are reserved for admin routes.

Gaps:

- No formal moderation standards.
- No evidence/evaluation checklist.
- No appeal intake or review workflow.
- No retention/audit-log policy for moderation decisions.
- No internal incident escalation or law-enforcement request process.
- No reason codes standardized across actions.

## 12. Mobile Platform

Confirmed Android configuration:

- Capacitor application ID: `com.lekhon.app`.
- Android scheme: HTTPS.
- Native app skips the web landing page and opens `/home`.
- Android back-button handling exists.
- Camera access is used for product images and media.
- OAuth callbacks currently return through hosted HTTPS frontend callback pages.

Required Android guidance:

- Install test builds and understand updates.
- Permissions for camera, microphone, photos/files, and notifications where applicable.
- OAuth app-to-browser-to-app behavior.
- Back navigation.
- Offline/local product working copies.
- Clearing app storage and its effects.
- Network and backend availability troubleshooting.
- App version and support information.

Not confirmed:

- Production Play Store release.
- Android App Links.
- Push notification permission and delivery.
- iOS project, build, permissions, Universal Links, or App Store release.

## 13. Integrations and Data Processors

Confirmed or referenced:

- MongoDB.
- Cloudinary.
- Razorpay and optional RazorpayX.
- LiveKit.
- Sentry.
- Email delivery provider configuration.
- Google, Facebook, X/Twitter, and LinkedIn OAuth.
- AI model providers.
- News provider/API.
- Render backend and Netlify frontend in current deployment history.

Documentation impact:

- Privacy Policy must accurately name categories of processors and purposes.
- Data-location, retention, and provider-contract details require owner confirmation.
- Subprocessor changes must trigger a privacy-policy review.

## 14. Current Policy Inventory

Existing:

- Privacy Policy: high-level only.
- Terms of Service: high-level only.

Missing or materially incomplete:

- Community Guidelines.
- Content and Acceptable Use Policy.
- Copyright/IP and takedown policy.
- AI Usage Policy.
- Marketplace Buyer Terms.
- Seller Terms.
- Prohibited Products and Services Policy.
- Returns, Refunds, and Cancellation Policy.
- Shipping and Delivery Policy.
- Digital Goods Policy.
- Services Fulfillment and Revisions Policy.
- Payments and Payouts Policy.
- Reviews Policy.
- Moderation, Suspension, and Appeals Policy.
- Guest Account Policy.
- API Terms and developer guide.
- Cookie/local-storage notice.
- Data retention and deletion explanation.
- Safety and reporting guide.
- Accessibility statement.
- Mobile permissions and platform notice.

## 15. Highest-Risk Findings

1. No report-abuse workflow despite user-generated content and communication features.
2. No dedicated Seller Terms although seller acceptance is required.
3. Incomplete account-deletion scope and no data-export implementation despite a public claim.
4. Returns are presented in the UI but the return workflow is not connected.
5. Native-app digital-goods payment model needs app-store policy review.
6. No age/child eligibility rule.
7. Message-retention claims require end-to-end verification.
8. Financial, refund, payout, and marketplace responsibilities are not governed by complete policies.
9. Policy enforcement exists without a user appeal path.
10. Existing legal copy is too general for the actual product surface.
